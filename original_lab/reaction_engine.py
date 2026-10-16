"""
Rule-based reaction engine.
No AI calls — reactions are derived from real chemistry "laws":
  - The activity (reactivity) series for metal displacement / metal+acid
  - Standard solubility rules for predicting precipitates in double displacement
  - Acid/base strength for a rough pH estimate on neutralization
  - The halogen reactivity series for halogen displacement
  - A short list of "named" catalytic / special redox reactions layered on top
"""
import json
import os

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(_BASE_DIR, "data", "chemicals.json")) as f:
    CHEMICALS = {c["id"]: c for c in json.load(f)}

# ---------------------------------------------------------------------------
# Solubility rules (simplified standard set — the "AASWABAWCAWCS"-style rules
# taught in intro chemistry). Returns True if a compound with this cation+anion
# is soluble in water.
# ---------------------------------------------------------------------------
ALWAYS_SOLUBLE_CATIONS = {"Na+", "K+", "NH4+"}
INSOLUBLE_EXCEPTIONS = {
    # anion -> cations that make it insoluble despite the anion's general rule
    "Cl-":  {"Ag+", "Pb2+"},
    "Br-":  {"Ag+", "Pb2+"},
    "I-":   {"Ag+", "Pb2+"},
    "SO4^2-": {"Ba2+", "Pb2+", "Ca2+", "Sr2+"},
}
GENERALLY_INSOLUBLE_ANIONS = {"CO3^2-", "PO4^3-", "OH-", "S2-", "SO3^2-", "CrO4^2-"}
GENERALLY_SOLUBLE_ANIONS = {"NO3-", "Cl-", "Br-", "I-", "SO4^2-", "CH3COO-", "F-", "S2O3^2-"}

def is_soluble(cation, anion):
    if cation is None or anion is None:
        return True
    if cation in ALWAYS_SOLUBLE_CATIONS or cation == "H+":
        return True
    if anion in GENERALLY_INSOLUBLE_ANIONS:
        return False
    if anion in INSOLUBLE_EXCEPTIONS and cation in INSOLUBLE_EXCEPTIONS[anion]:
        return False
    if anion in GENERALLY_SOLUBLE_ANIONS:
        return True
    return True

PRECIP_COLORS = {
    ("Ag+", "Cl-"): "#ffffff", ("Ag+", "Br-"): "#f0e6a0", ("Ag+", "I-"): "#f2c94c",
    ("Pb2+", "Cl-"): "#ffffff", ("Pb2+", "I-"): "#f2c94c", ("Pb2+", "SO4^2-"): "#ffffff",
    ("Pb2+", "CO3^2-"): "#eeeeee", ("Ba2+", "SO4^2-"): "#ffffff",
    ("Ca2+", "CO3^2-"): "#f0efe9", ("Cu2+", "OH-"): "#3f7fbf", ("Fe2+", "OH-"): "#7c9a52",
    ("Fe3+", "OH-"): "#9c5a1f", ("Pb2+", "OH-"): "#e4e4de", ("Mg2+", "OH-"): "#e8ebe4",
    ("Al3+", "OH-"): "#eef0ea", ("Ni2+", "OH-"): "#8fbf7a", ("Co2+", "OH-"): "#c98fae",
}

# ---------------------------------------------------------------------------
# Named / special-case reactions — a handful of well-known, visually distinct
# reactions that deserve custom flavor text beyond the generic engine.
# Keyed by frozenset of the two chemical ids involved.
# ---------------------------------------------------------------------------
def _k(a, b):
    return frozenset((a, b))

SPECIAL_CASES = {
    _k("h2o2", "mno2_cat"): dict(
        type="Catalytic Decomposition", products="Water + Oxygen gas",
        equation="2H2O2 --(MnO2 catalyst)--> 2H2O + O2", ionic="—",
        color="#eaf6fb", gas=True, precipitate=False, temp="exo", ph=7.0,
        explanation="Manganese dioxide catalyzes rapid decomposition of hydrogen peroxide into water and oxygen without being consumed itself.",
        observations="Vigorous fizzing and foaming as oxygen gas is released.",
        safety="Reaction can be vigorous — keep away from flammable material."),
    _k("h2o2", "ki2" ): None,  # placeholder, real KI id resolved below
    _k("kmno4", "h2o2"): dict(
        type="Redox (Decolorization)", products="Manganese(II) ions + Oxygen gas + Water",
        equation="2KMnO4 + 5H2O2 + 3H2SO4 -> 2MnSO4 + 5O2 + K2SO4 + 8H2O",
        ionic="2MnO4- + 5H2O2 + 6H+ -> 2Mn2+ + 5O2 + 8H2O",
        color="#e9d9ee", gas=True, precipitate=False, temp="exo", ph=5.0,
        explanation="Hydrogen peroxide reduces deep-purple permanganate ions to nearly colorless manganese(II) ions while itself being oxidized to oxygen gas.",
        observations="The vivid purple color fades rapidly with vigorous bubbling.",
        safety="KMnO4 stains skin and is a strong oxidizer."),
    _k("kmno4", "feso4"): dict(
        type="Redox (Decolorization)", products="Manganese(II) ions + Iron(III) ions",
        equation="MnO4- + 5Fe2+ + 8H+ -> Mn2+ + 5Fe3+ + 4H2O", ionic="MnO4- + 5Fe2+ + 8H+ -> Mn2+ + 5Fe3+ + 4H2O",
        color="#d8c8a0", gas=False, precipitate=False, temp="exo", ph=5.0,
        explanation="Permanganate oxidizes iron(II) to iron(III) and is itself reduced, causing the purple color to fade to pale amber.",
        observations="The purple color disappears as the solution turns pale amber.",
        safety="KMnO4 is a strong oxidizer — avoid skin contact."),
    _k("na2s2o3", "hcl"): dict(
        type="Redox — the \"Disappearing Cross\"", products="Sodium chloride + Sulfur dioxide + Sulfur + Water",
        equation="Na2S2O3 + 2HCl -> 2NaCl + SO2 + S + H2O", ionic="S2O3^2- + 2H+ -> SO2 + S + H2O",
        color="#f5f2e6", gas=True, precipitate=True, precipitate_color="#f7f0c8", temp="endo", ph=3.0,
        explanation="Acid decomposes thiosulfate into sulfur dioxide gas and a pale-yellow sulfur precipitate — the classic timed 'disappearing cross' reaction.",
        observations="The mixture slowly clouds pale yellow, with a faint sharp smell of SO2.",
        safety="SO2 gas is irritating — ensure ventilation."),
    _k("starch", "iodine"): dict(
        type="Indicator Complex Formation", products="Starch-Iodine Complex",
        equation="Starch + I2 -> Starch-I2 complex (blue-black)", ionic="—",
        color="#1c1c2e", gas=False, precipitate=False, temp="none", ph=7.0,
        explanation="Iodine molecules slot into the helical structure of starch, forming an intensely colored blue-black complex — the classic starch-iodine test.",
        observations="The mixture instantly turns deep blue-black.",
        safety="Iodine can stain skin and fabric."),
}
# resolve the ki placeholder properly (kept out of dict literal above to avoid typo risk)
SPECIAL_CASES[_k("h2o2", "ki")] = dict(
    type="Catalytic Decomposition (Redox)", products="Water + Oxygen gas + Iodine",
    equation="H2O2 + 2KI -> I2 + 2KOH + 1/2 O2", ionic="H2O2 + 2I- -> I2 + 2OH-",
    color="#8a5a2b", gas=True, precipitate=False, temp="exo", ph=8.0,
    explanation="Iodide ions catalyze peroxide decomposition while some iodide is oxidized to iodine, turning the mixture amber.",
    observations="Fizzing with a color change from colorless to amber/brown.",
    safety="Foaming reaction — avoid skin/eye contact.")
del SPECIAL_CASES[_k("h2o2", "ki2")]

ACID_PH = {"strong": 1.5, "weak": 4.5}
BASE_PH = {"strong": 13.0, "weak": 9.5}

# ---------------------------------------------------------------------------
# Real salt naming: combine a cation and anion with correct charge-balanced
# subscripts, e.g. Ca2+ + Cl- -> CaCl2 "Calcium Chloride", Na+ + SO4^2- ->
# Na2SO4 "Sodium Sulfate". This is what lets the engine report the *exact*
# salt produced instead of a generic "a salt".
# ---------------------------------------------------------------------------
import math

CATIONS = {
    # symbol: (formula_stub, charge, display_name)
    "Na+": ("Na", 1, "Sodium"), "K+": ("K", 1, "Potassium"), "Ca2+": ("Ca", 2, "Calcium"),
    "Mg2+": ("Mg", 2, "Magnesium"), "Ba2+": ("Ba", 2, "Barium"), "NH4+": ("NH4", 1, "Ammonium"),
    "Al3+": ("Al", 3, "Aluminium"), "Zn2+": ("Zn", 2, "Zinc"), "Fe2+": ("Fe", 2, "Iron(II)"),
    "Fe3+": ("Fe", 3, "Iron(III)"), "Cu2+": ("Cu", 2, "Copper(II)"), "Ag+": ("Ag", 1, "Silver"),
    "Pb2+": ("Pb", 2, "Lead(II)"), "H+": ("H", 1, "Hydrogen"), "K1+": ("K", 1, "Potassium"),
}
ANIONS = {
    # symbol: (formula_stub, charge, display_name, needs_parens_if_multiple, anion_written_first)
    "Cl-": ("Cl", 1, "Chloride", False, False), "Br-": ("Br", 1, "Bromide", False, False), "I-": ("I", 1, "Iodide", False, False),
    "F-": ("F", 1, "Fluoride", False, False), "NO3-": ("NO3", 1, "Nitrate", True, False),
    "SO4^2-": ("SO4", 2, "Sulfate", True, False), "SO3^2-": ("SO3", 2, "Sulfite", True, False),
    "CO3^2-": ("CO3", 2, "Carbonate", True, False), "HCO3-": ("HCO3", 1, "Bicarbonate", True, False),
    "PO4^3-": ("PO4", 3, "Phosphate", True, False), "CH3COO-": ("CH3COO", 1, "Acetate", True, True),
    "C2O4^2-": ("C2O4", 2, "Oxalate", True, False), "OH-": ("OH", 1, "Hydroxide", True, False),
    "S2O3^2-": ("S2O3", 2, "Thiosulfate", True, False), "MnO4-": ("MnO4", 1, "Permanganate", True, False),
    "Cr2O7^2-": ("Cr2O7", 2, "Dichromate", True, False), "CrO4^2-": ("CrO4", 2, "Chromate", True, False),
    "S2-": ("S", 2, "Sulfide", False, False), "C6H5O7^3-": ("C6H5O7", 3, "Citrate", True, True),
}
# Which anion a given acid releases, and which cation a given base releases —
# this is what lets neutralization/carbonate reactions name the exact salt.
ACID_ANION = {
    "hcl": "Cl-", "h2so4": "SO4^2-", "hno3": "NO3-", "h3po4": "PO4^3-",
    "acetic": "CH3COO-", "citric": "C6H5O7^3-", "carbonic": "CO3^2-", "oxalic": "C2O4^2-",
}
BASE_CATION = {
    "naoh": "Na+", "koh": "K+", "caoh2": "Ca2+", "nh3": "NH4+", "mgoh2": "Mg2+", "baoh2": "Ba2+",
}
METAL_CATION = {
    "k": "Na+".replace("Na", "K"), "na": "Na+", "ca": "Ca2+", "mg": "Mg2+", "al": "Al3+",
    "zn": "Zn2+", "fe": "Fe2+", "pb": "Pb2+", "cu": "Cu2+", "ag": "Ag+",
}

def find_salt_color(formula):
    """If this exact salt already exists in the store cupboard, reuse its real
    color (e.g. copper salts are blue); otherwise fall back to a generic pale
    solid color. Used so evaporating a computed reaction product (like NaCl
    formed by neutralizing HCl+NaOH) leaves behind a believable residue."""
    norm = (formula or "").replace(" ", "")
    for c in CHEMICALS.values():
        if c.get("formula", "").replace(" ", "") == norm:
            return c.get("color", "#f0f0ea")
    return "#f0f0ea"


def build_salt(cation_sym, anion_sym):
    """Returns {'formula':..., 'name':...} for a charge-balanced salt, or None."""
    if cation_sym not in CATIONS or anion_sym not in ANIONS:
        return None
    cformula, ccharge, cname = CATIONS[cation_sym]
    aformula, acharge, aname, parens, anion_first = ANIONS[anion_sym]
    g = math.gcd(ccharge, acharge)
    n_cation = acharge // g
    n_anion = ccharge // g
    cation_part = cformula + (str(n_cation) if n_cation > 1 else "")
    if n_anion > 1 and parens:
        anion_part = f"({aformula}){n_anion}"
    else:
        anion_part = aformula + (str(n_anion) if n_anion > 1 else "")
    formula = (anion_part + cation_part) if anion_first else (cation_part + anion_part)
    return {"formula": formula, "name": f"{cname} {aname}"}


def blend_hex(hex_a, hex_b, w_a, w_b):
    def to_rgb(h):
        h = h.lstrip("#")
        return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
    ra, ga, ba = to_rgb(hex_a)
    rb, gb, bb = to_rgb(hex_b)
    t = w_b / max(1e-6, (w_a + w_b))
    r = round(ra + (rb - ra) * t)
    g = round(ga + (gb - ga) * t)
    b = round(ba + (bb - ba) * t)
    return f"#{r:02x}{g:02x}{b:02x}"


# Universal Indicator is a genuine multi-dye blend that shows the *whole*
# rainbow across the pH scale (unlike single-transition dyes such as
# phenolphthalein or methyl orange, which really only have 2-3 states in
# reality). These stops match a standard universal indicator color chart.
UNIVERSAL_INDICATOR_STOPS = [
    (0.0, (0xb7, 0x1c, 0x1c)),   # deep red   (very strongly acidic)
    (2.0, (0xe5, 0x39, 0x35)),   # red
    (4.0, (0xfb, 0x8c, 0x00)),   # orange
    (5.0, (0xfd, 0xd8, 0x35)),   # yellow
    (6.0, (0xc0, 0xca, 0x33)),   # yellow-green
    (7.0, (0x43, 0xa0, 0x47)),   # green      (neutral)
    (8.0, (0x00, 0x89, 0x7b)),   # teal
    (9.0, (0x02, 0x77, 0xbd)),   # blue
    (10.0, (0x39, 0x49, 0xab)),  # indigo
    (12.0, (0x6a, 0x1b, 0x9a)),  # purple
    (14.0, (0x4a, 0x14, 0x8c)),  # deep purple (very strongly basic)
]

def universal_indicator_color(ph):
    ph = max(0.0, min(14.0, ph))
    stops = UNIVERSAL_INDICATOR_STOPS
    for i in range(len(stops) - 1):
        p0, c0 = stops[i]
        p1, c1 = stops[i + 1]
        if p0 <= ph <= p1:
            t = (ph - p0) / (p1 - p0) if p1 > p0 else 0.0
            r = round(c0[0] + (c1[0] - c0[0]) * t)
            g = round(c0[1] + (c1[1] - c0[1]) * t)
            b = round(c0[2] + (c1[2] - c0[2]) * t)
            return f"#{r:02x}{g:02x}{b:02x}"
    return "#{:02x}{:02x}{:02x}".format(*stops[-1][1])

def indicator_color(indicator, ph):
    if indicator.get("id") == "universal":
        return universal_indicator_color(ph)
    bands = indicator.get("bands", {})
    if ph < 6.5:
        return bands.get("acidic", indicator["color"])
    if ph > 7.5:
        return bands.get("basic", indicator["color"])
    return bands.get("neutral", indicator["color"])


# Number of H+ / OH- equivalents released per mole of each acid/base — needed
# for a real mole-balance pH calculation (e.g. H2SO4 releases 2 H+ per mole).
ACID_EQUIV = {"hcl": 1, "h2so4": 2, "hno3": 1, "h3po4": 3, "acetic": 1, "citric": 3, "carbonic": 2, "oxalic": 2, "boric": 1}
BASE_EQUIV = {"naoh": 1, "koh": 1, "caoh2": 2, "nh3": 1, "mgoh2": 2, "baoh2": 2}
# Effective molarity used for the pH model. Weak acids/bases are modeled at a
# lower effective concentration (partial dissociation) rather than full
# equilibrium/Ka math — enough to give a realistic, smooth titration curve.
STRONG_CONC = 1.0
WEAK_CONC = 0.1

def compute_ph(components):
    """
    Mole-balance titration pH that moves gradually toward neutral as you
    titrate, rather than staying flat until the last drop and then jumping.

    Instead of computing pH directly from the tiny net H+/OH- excess (which
    is mathematically correct for an idealised strong-acid/strong-base
    titration but produces an almost-vertical jump right at the equivalence
    point), this computes the pH the solution *would* have if it were purely
    acidic (pH_acid_end) and purely basic (pH_base_end) at the current
    concentrations, then blends between those two smoothly as the acid/base
    ratio shifts. This lands on exactly the same values at the extremes and
    exactly pH 7 at true equivalence, but creeps there gradually instead of
    jumping in the last drop.
    """
    total_vol_ml = sum(ml for c, ml in components if c.get("state") in ("aqueous", "liquid"))
    if total_vol_ml <= 0:
        return 7.0
    total_vol_l = total_vol_ml / 1000.0

    h_moles = 0.0
    oh_moles = 0.0
    for c, ml in components:
        vol_l = ml / 1000.0
        if c["category"] == "acid":
            conc = STRONG_CONC if c.get("strength") == "strong" else WEAK_CONC
            eq = ACID_EQUIV.get(c["id"], 1)
            h_moles += conc * eq * vol_l
        elif c["category"] == "base":
            conc = STRONG_CONC if c.get("strength") == "strong" else WEAK_CONC
            eq = BASE_EQUIV.get(c["id"], 1)
            oh_moles += conc * eq * vol_l

    if h_moles == 0 and oh_moles == 0:
        return 7.0

    ph_acid_end = -math.log10(max(h_moles / total_vol_l, 1e-14)) if h_moles > 0 else 0.0
    ph_base_end = 14.0 - (-math.log10(max(oh_moles / total_vol_l, 1e-14))) if oh_moles > 0 else 14.0

    scale = h_moles + oh_moles
    frac = (h_moles - oh_moles) / scale if scale > 0 else 0.0  # +1 = pure acid, -1 = pure base, 0 = equivalence
    t = (1.0 - frac) / 2.0  # 0 at pure acid, 1 at pure base

    ph = ph_acid_end + (ph_base_end - ph_acid_end) * t
    return max(0.0, min(14.0, ph))


def react(mixture, heated=False):
    """
    mixture: list of {"id": chem_id, "ml": volume}
    Returns a dict describing the resulting state of the beaker.
    """
    components = []
    for item in mixture:
        chem = CHEMICALS.get(item["id"])
        if chem:
            components.append((chem, item.get("ml", 0)))

    if not components:
        return {"empty": True}

    if len(components) == 1:
        chem, ml = components[0]
        return {
            "empty": False, "singleChemical": True,
            "products": chem["name"], "color": chem["color"],
            "type": "No reaction yet", "gas": False, "precipitate": False,
            "explanation": "Only one substance is present — add another to see a reaction.",
            "observations": f"{ml} mL of {chem['name']} sits in the vessel.",
            "safety": chem.get("hazard", "Standard handling precautions apply."),
            "equation": "—", "ionic": "—", "ph": None
        }

    ids = [c["id"] for c, ml in components]
    cats = {c["id"]: c["category"] for c, ml in components}
    by_id = {c["id"]: (c, ml) for c, ml in components}

    # 1. Check special named reactions first (any pair present in the mixture)
    for i in range(len(components)):
        for j in range(i + 1, len(components)):
            key = _k(ids[i], ids[j])
            if key in SPECIAL_CASES:
                result = dict(SPECIAL_CASES[key])
                result["empty"] = False
                result["resultColor"] = result.pop("color")
                if heated:
                    result["observations"] += " (Heating visibly speeds up the reaction.)"
                result["ph"] = result.get("ph", 7.0)
                return _finalize(result, components)

    acids = [(c, ml) for c, ml in components if c["category"] == "acid"]
    bases = [(c, ml) for c, ml in components if c["category"] == "base"]
    metals = [(c, ml) for c, ml in components if c["category"] == "metal"]
    salts = [(c, ml) for c, ml in components if c["category"] == "salt"]
    halogens = [(c, ml) for c, ml in components if c["category"] == "halogen"]
    indicators_present = [(c, ml) for c, ml in components if c["category"] == "indicator"]
    catalysts = [(c, ml) for c, ml in components if c["category"] == "catalyst"]
    oxidizers = [(c, ml) for c, ml in components if c["category"] == "oxidizer"]

    carbonate_salts = [(c, ml) for c, ml in salts if c.get("anion") in ("CO3^2-", "HCO3-")]
    result = None

    # 2. Acid + carbonate -> CO2 gas (checked before generic neutralization for flavor)
    if acids and carbonate_salts:
        acid, aml = max(acids, key=lambda x: x[1])
        carb, cml = max(carbonate_salts, key=lambda x: x[1])
        salt = build_salt(carb.get("cation"), ACID_ANION.get(acid["id"])) if carb.get("cation") else None
        salt_label = f"{salt['name']} ({salt['formula']})" if salt else "a soluble salt"
        result = dict(
            type="Acid–Carbonate", products=f"{salt_label} + Water + Carbon dioxide",
            equation=f"{carb['formula']} + {acid['formula']} -> {salt['formula'] if salt else 'salt'} + H2O + CO2",
            ionic="CO3^2- + 2H+ -> H2O + CO2  (or HCO3- + H+ -> H2O + CO2)",
            resultColor=blend_hex(acid["color"], carb["color"], aml, cml),
            gas=True, precipitate=False, temp="exo",
            explanation=f"Acids react with carbonates/bicarbonates to release carbon dioxide gas, leaving {salt_label} dissolved in solution — a classic test for both acids and carbonates.",
            observations="Brisk fizzing as CO2 gas escapes; the solid gradually dissolves." + (" Heating makes this fizz noticeably faster." if heated else ""),
            safety="Ensure ventilation — CO2 can build up in enclosed spaces.",
            ph=max(2.0, compute_ph(components) if bases else 4.0),
            formed_salt=({"name": salt["name"], "formula": salt["formula"], "color": find_salt_color(salt["formula"])} if salt else None)
        )

    # 3. Acid + metal
    elif acids and metals:
        acid, aml = max(acids, key=lambda x: x[1])
        metal, mml = max(metals, key=lambda x: x[1])
        metal_cation = METAL_CATION.get(metal["id"])
        salt = build_salt(metal_cation, ACID_ANION.get(acid["id"])) if metal_cation else None
        salt_label = f"{salt['name']} ({salt['formula']})" if salt else f"{metal['name']} salt"
        if metal["reactivity_rank"] <= 6:
            result = dict(
                type="Metal–Acid (Single Displacement)", products=f"{salt_label} + Hydrogen gas",
                equation=f"{metal['formula']} + {acid['formula']} -> {salt['formula'] if salt else 'salt'} + H2",
                ionic=f"{metal['formula']} + nH+ -> {metal_cation or metal['formula']} + H2",
                resultColor=blend_hex(acid["color"], "#eef4f7", aml, mml),
                gas=True, precipitate=False, temp="exo",
                explanation=f"{metal['name']} is reactive enough to displace hydrogen from this acid, dissolving into solution as {salt_label} while hydrogen gas bubbles off.",
                observations="Steady to vigorous bubbling depending on metal reactivity; the metal gradually disappears." + (" Heating speeds the reaction up considerably." if heated else ""),
                safety="Hydrogen gas is flammable — keep away from open flames.",
                ph=max(1.5, compute_ph(components) - 0.5),
                formed_salt=({"name": salt["name"], "formula": salt["formula"], "color": find_salt_color(salt["formula"])} if salt else None)
            )
        elif acid.get("oxidizing"):
            result = dict(
                type="Metal–Acid (Redox, Oxidizing Acid)", products=f"{salt_label} + Nitrogen/Sulfur oxide gas + Water",
                equation=f"{metal['formula']} + oxidizing acid -> {salt['formula'] if salt else 'salt'} + NOx/SO2 + H2O", ionic="—",
                resultColor=blend_hex(acid["color"], metal["color"], aml, mml),
                gas=True, precipitate=False, temp="exo",
                explanation=f"{metal['name']} normally resists acids, but this is a strong oxidizing acid, which attacks the metal directly to form {salt_label} and releases a toxic gas instead of hydrogen.",
                observations="Colored fumes appear (brown for nitric acid, or a sharp smell for hot concentrated sulfuric acid) as the metal slowly dissolves.",
                safety="Toxic fumes produced — requires a fume hood in real life.",
                ph=max(1.0, compute_ph(components) - 0.5),
                formed_salt=({"name": salt["name"], "formula": salt["formula"], "color": find_salt_color(salt["formula"])} if salt else None)
            )
        else:
            result = dict(
                type="No Reaction", products="No visible reaction",
                equation="No reaction occurs", ionic="—",
                resultColor=blend_hex(acid["color"], metal["color"], aml, mml),
                gas=False, precipitate=False, temp="none",
                explanation=f"{metal['name']} is below hydrogen in the reactivity series and this acid isn't a strong oxidizer, so no reaction takes place.",
                observations="No bubbling, no color change — the metal remains unreacted.",
                safety=metal.get("hazard", "Standard handling."),
                ph=compute_ph(components)
            )

    # 4. Metal + salt (displacement, based on activity series)
    elif metals and salts:
        metal, mml = max(metals, key=lambda x: x[1])
        # find a salt whose cation is a metal we have reactivity data on & metal is more reactive
        candidate = None
        for s, sml in salts:
            cat_symbol = s.get("cation", "")
            other_rank = _rank_for_cation(cat_symbol)
            if other_rank is not None and metal["reactivity_rank"] < other_rank:
                candidate = (s, sml, other_rank)
                break
        if candidate:
            salt, sml, other_rank = candidate
            deposited_metal = _metal_name_for_cation(salt.get("cation"))
            result = dict(
                type="Single Displacement (Redox)", products=f"{deposited_metal} metal + new {metal['name']} salt",
                equation=f"{metal['formula']} + {salt['formula']} -> new salt + {deposited_metal}",
                ionic=f"{metal['formula']} + {salt.get('cation')} -> {metal['formula']}n+ + {deposited_metal}",
                resultColor=blend_hex(salt["color"], "#eef4f7", sml, mml),
                gas=False, precipitate=True, precipitate_color="#c77b4b" if deposited_metal == "Copper" else "#d8d8da",
                temp="exo",
                explanation=f"{metal['name']} is higher in the reactivity series than {deposited_metal}, so it displaces it from solution, coating itself in the newly deposited metal.",
                observations=f"A visible {deposited_metal.lower()} coating forms; the solution's original color fades as its metal ion is used up.",
                safety="No major hazard beyond standard metal/salt handling.",
                ph=7.0
            )
        else:
            salt, sml = max(salts, key=lambda x: x[1])
            result = dict(
                type="No Reaction", products="No visible reaction", equation="No reaction occurs", ionic="—",
                resultColor=blend_hex(salt["color"], metal["color"], sml, mml),
                gas=False, precipitate=False, temp="none",
                explanation=f"{metal['name']} is not more reactive than the metal already in this salt, so no displacement occurs.",
                observations="No visible change.", safety=metal.get("hazard", "Standard handling."),
                ph=7.0
            )

    # 5. Halogen displacement
    elif halogens and salts:
        halide_salts = [(s, sml) for s, sml in salts if s.get("anion") in ("Cl-", "Br-", "I-")]
        if halide_salts:
            hal, hml = max(halogens, key=lambda x: x[1])
            hsalt, hsml = max(halide_salts, key=lambda x: x[1])
            target_rank = {"Cl-": 1, "Br-": 2, "I-": 3}.get(hsalt.get("anion"))
            if target_rank is not None and hal["halogen_rank"] < target_rank:
                result = dict(
                    type="Halogen Displacement (Redox)", products="New halide salt + displaced halogen",
                    equation=f"{hal['formula']} + {hsalt['formula']} -> new halide + halogen",
                    ionic="X2 + 2Y- -> 2X- + Y2 (X more reactive halogen)",
                    resultColor=blend_hex(hal["color"], hsalt["color"], hml, hsml),
                    gas=False, precipitate=False, temp="none",
                    explanation=f"{hal['name']} is more reactive than the halogen already combined in this salt, so it displaces it, releasing the less reactive halogen into solution.",
                    observations="A color shift appears as the displaced halogen tints the solution.",
                    safety="Halogens are corrosive/toxic — handle with care.", ph=7.0
                )

    # 6. Double displacement between two salts -> check solubility rules for a precipitate
    elif len(salts) >= 2:
        s1, ml1 = salts[0]
        s2, ml2 = salts[1]
        c1, a1 = s1.get("cation"), s1.get("anion")
        c2, a2 = s2.get("cation"), s2.get("anion")
        combo1_soluble = is_soluble(c1, a2)
        combo2_soluble = is_soluble(c2, a1)
        if not combo1_soluble or not combo2_soluble:
            precip_pair = (c1, a2) if not combo1_soluble else (c2, a1)
            soluble_pair = (c2, a1) if not combo1_soluble else (c1, a2)
            pcolor = PRECIP_COLORS.get(precip_pair, "#eeeeee")
            precip_salt = build_salt(*precip_pair)
            soluble_salt = build_salt(*soluble_pair)
            precip_label = f"{precip_salt['name']} ({precip_salt['formula']})" if precip_salt else "an insoluble salt"
            soluble_label = f"{soluble_salt['name']} ({soluble_salt['formula']})" if soluble_salt else "a soluble salt"
            result = dict(
                type="Precipitation (Double Displacement)", products=f"{precip_label} + {soluble_label}",
                equation=f"{s1['formula']} + {s2['formula']} -> {precip_salt['formula'] if precip_salt else 'precipitate'} + {soluble_salt['formula'] if soluble_salt else 'salt'}",
                ionic=f"{precip_pair[0]} + {precip_pair[1]} -> {precip_salt['formula'] if precip_salt else 'precipitate'}",
                resultColor=blend_hex(s1["color"], s2["color"], ml1, ml2),
                gas=False, precipitate=True, precipitate_color=pcolor, temp="none",
                explanation=f"Swapping partners between these two salts forms {precip_label}, which solubility rules predict is insoluble, so it precipitates out of solution, leaving {soluble_label} dissolved.",
                observations="A precipitate forms and begins to settle at the bottom of the vessel.",
                safety="Some heavy-metal precipitates (lead, silver, barium, chromium) are toxic — avoid contact.",
                ph=7.0
            )
        else:
            result = dict(
                type="No Reaction", products="No visible reaction (both possible products are soluble)",
                equation="No net reaction", ionic="—",
                resultColor=blend_hex(s1["color"], s2["color"], ml1, ml2),
                gas=False, precipitate=False, temp="none",
                explanation="Solubility rules predict that both possible recombination products would stay dissolved, so no precipitate forms and no net reaction occurs.",
                observations="The solutions simply mix; no cloudiness or color-shift precipitate appears.",
                safety="Standard handling.", ph=7.0
            )

    # 6b. Base + salt -> metal hydroxide precipitate (e.g. NaOH + CuSO4 -> Cu(OH)2)
    elif bases and salts and not acids:
        base, bml = max(bases, key=lambda x: x[1])
        salt, sml = max(salts, key=lambda x: x[1])
        salt_cation = salt.get("cation")
        base_cation = BASE_CATION.get(base["id"])
        if salt_cation not in ("Na+", "K+", "NH4+") and is_soluble(salt_cation, "OH-") is False:
            pcolor = PRECIP_COLORS.get((salt_cation, "OH-"), "#eeeeee")
            hydroxide_salt = build_salt(salt_cation, "OH-")
            byproduct_salt = build_salt(base_cation, salt.get("anion")) if base_cation and salt.get("anion") else None
            hydroxide_label = f"{hydroxide_salt['name']} ({hydroxide_salt['formula']})" if hydroxide_salt else "a metal hydroxide precipitate"
            byproduct_label = f"{byproduct_salt['name']} ({byproduct_salt['formula']})" if byproduct_salt else "a soluble salt"
            result = dict(
                type="Precipitation (Base + Salt)", products=f"{hydroxide_label} + {byproduct_label}",
                equation=f"{salt['formula']} + {base['formula']} -> {hydroxide_salt['formula'] if hydroxide_salt else 'hydroxide'} + {byproduct_salt['formula'] if byproduct_salt else 'salt'}",
                ionic=f"{salt_cation} + OH- -> {hydroxide_salt['formula'] if hydroxide_salt else 'hydroxide precipitate'}",
                resultColor=blend_hex(salt["color"], base["color"], sml, bml),
                gas=False, precipitate=True, precipitate_color=pcolor, temp="none",
                explanation=f"Hydroxide ions from {base['name']} combine with the metal ion in {salt['name']} to form insoluble {hydroxide_label}, leaving {byproduct_label} dissolved.",
                observations="A precipitate forms and clouds the solution, settling over time.",
                safety="Standard base handling — may be caustic.",
                ph=12.0
            )
        else:
            result = dict(
                type="No Reaction", products="No visible reaction (hydroxide stays soluble)",
                equation="No net reaction", ionic="—",
                resultColor=blend_hex(salt["color"], base["color"], sml, bml),
                gas=False, precipitate=False, temp="none",
                explanation="This metal's hydroxide is soluble, so no precipitate forms when the base is added.",
                observations="The solutions simply mix.", safety="Standard handling.", ph=12.0
            )

    # 7. Acid + base -> neutralization
    if result is None and acids and bases:
        acid, aml = max(acids, key=lambda x: x[1])
        base, bml = max(bases, key=lambda x: x[1])
        ph = compute_ph(components)
        base_cation = BASE_CATION.get(base["id"])
        salt = build_salt(base_cation, ACID_ANION.get(acid["id"])) if base_cation else None
        salt_label = f"{salt['name']} ({salt['formula']})" if salt else "a soluble salt"
        result = dict(
            type="Neutralization", products=f"{salt_label} + Water",
            equation=f"{acid['formula']} + {base['formula']} -> {salt['formula'] if salt else 'salt'} + H2O",
            ionic="H+ + OH- -> H2O",
            resultColor="#eef2f5",
            gas=False, precipitate=False, temp="exo",
            explanation=f"A classic acid-base neutralization: the H+ from {acid['name']} and OH- from {base['name']} combine to form water, leaving {salt_label} dissolved behind, and releasing heat.",
            observations=f"Estimated resulting pH ≈ {ph:.1f}. Solution warms noticeably.",
            safety="Both reactants may be corrosive/caustic — handle with care.",
            ph=ph,
            formed_salt=({"name": salt["name"], "formula": salt["formula"], "color": find_salt_color(salt["formula"])} if salt else None)
        )

    # 7b. Indicator + acid/base only, with no other chemistry happening — give
    # this its own clear "Indicator Response" result instead of falling
    # through to a generic "no reaction" message.
    if result is None and indicators_present and (acids or bases) and not (salts or metals or halogens or carbonate_salts):
        ph = compute_ph(components)
        ind, iml = max(indicators_present, key=lambda x: x[1])
        partner = acids[0][0]["name"] if acids else bases[0][0]["name"]
        result = dict(
            type="Indicator Response", products=f"{ind['name']} — solution reads pH ≈ {ph:.1f}",
            equation="No reaction — the indicator dye changes color with pH", ionic="—",
            resultColor=indicator_color(ind, ph), gas=False, precipitate=False, temp="none",
            explanation=f"{ind['name']} doesn't react chemically with {partner} — it's a dye that changes color depending on the solution's pH, which is currently about {ph:.1f}.",
            observations=f"The solution takes on the color that {ind['name']} shows at pH {ph:.1f}.",
            safety="Indicators are used in tiny quantities and are generally low hazard.",
            ph=ph
        )

    # 8. Fallback: nothing matched -> simple mix, blended color
    if result is None:
        base_chem, base_ml = max(components, key=lambda x: x[1])
        blended = base_chem["color"]
        for c, ml in components:
            if c is not base_chem:
                blended = blend_hex(blended, c["color"], base_ml, ml)
        result = dict(
            type="No Known Reaction", products="Mixture (no visible reaction)",
            equation="No reaction", ionic="—",
            resultColor=blended, gas=False, precipitate=False, temp="none",
            explanation="These substances don't correspond to a known reaction pathway in the engine's rule set — they've simply mixed together.",
            observations="No fizzing, color change, or precipitate observed.",
            safety="Standard handling precautions apply.",
            ph=compute_ph(components)
        )

    # 9. Indicators tint the final displayed color regardless of the underlying reaction
    if indicators_present and result.get("type") != "Indicator Response":
        ind, iml = max(indicators_present, key=lambda x: x[1])
        ph = result.get("ph")
        if ph is None:
            ph = compute_ph(components)
        ind_color = indicator_color(ind, ph)
        if not result.get("precipitate"):
            result["resultColor"] = ind_color
        result["observations"] = result.get("observations", "") + f" {ind['name']} tints the solution to show a pH of roughly {ph:.1f}."

    return _finalize(result, components)


def _finalize(result, components):
    result["empty"] = False
    result.setdefault("precipitate", False)
    result.setdefault("gas", False)
    result.setdefault("temp", "none")
    result.setdefault("ph", 7.0)
    result.setdefault("formed_salt", None)
    result["totalVolume"] = sum(ml for c, ml in components)
    result["ingredients"] = [c["name"] for c, ml in components]
    return result


def _swap_salt_name(carbonate_salt, acid):
    return "a new salt"


_METAL_BY_CATION = {
    "Na+": ("Sodium", 2), "K+": ("Potassium", 1), "Ca2+": ("Calcium", 3), "Mg2+": ("Magnesium", 4),
    "Al3+": ("Aluminium", 5), "Zn2+": ("Zinc", 6), "Fe2+": ("Iron", 7), "Fe3+": ("Iron", 7),
    "Pb2+": ("Lead", 8), "Cu2+": ("Copper", 9), "Ag+": ("Silver", 10),
}

def _rank_for_cation(cation):
    entry = _METAL_BY_CATION.get(cation)
    return entry[1] if entry else None

def _metal_name_for_cation(cation):
    entry = _METAL_BY_CATION.get(cation)
    return entry[0] if entry else "metal"
