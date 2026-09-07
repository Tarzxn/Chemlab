"""
Generates data/chemicals.json — the 100-item store cupboard.
Run once: python generate_chemicals.py
"""
import json

# Activity series rank: lower = more reactive. Roughly standard reactivity series,
# with Hydrogen anchored at 6.5 so "rank <= 6" reacts with dilute non-oxidizing acids.
METALS = [
    {"id":"k","name":"Potassium","formula":"K","rank":1,"color":"#c9c9cf","hazard":"Extremely reactive with water/air — violent reaction."},
    {"id":"na","name":"Sodium","formula":"Na","rank":2,"color":"#d3d3d8","hazard":"Reacts violently with water."},
    {"id":"ca","name":"Calcium","formula":"Ca","rank":3,"color":"#d9d9d2","hazard":"Reacts with water/acids, releasing heat."},
    {"id":"mg","name":"Magnesium","formula":"Mg","rank":4,"color":"#c7cbd1","hazard":"Flammable as powder/ribbon; burns with brilliant white light."},
    {"id":"al","name":"Aluminium","formula":"Al","rank":5,"color":"#c9ccd1","hazard":"Oxide layer must dissolve before reacting."},
    {"id":"zn","name":"Zinc","formula":"Zn","rank":6,"color":"#b7bcc2","hazard":"Low hazard; standard lab metal."},
    {"id":"fe","name":"Iron","formula":"Fe","rank":7,"color":"#8b8f94","hazard":"Low hazard; rusts in moist air."},
    {"id":"pb","name":"Lead","formula":"Pb","rank":8,"color":"#7c7f85","hazard":"Toxic — avoid ingestion/inhalation of dust."},
    {"id":"cu","name":"Copper","formula":"Cu","rank":9,"color":"#c77b4b","hazard":"Low hazard."},
    {"id":"ag","name":"Silver","formula":"Ag","rank":10,"color":"#d8d8da","hazard":"Low hazard; tarnishes with sulfides."},
    {"id":"au","name":"Gold","formula":"Au","rank":11,"color":"#d4af37","hazard":"Chemically inert; essentially unreactive."},
]

ACIDS = [
    {"id":"hcl","name":"Hydrochloric Acid","formula":"HCl","strength":"strong","color":"#e8f4fb","oxidizing":False,"hazard":"Corrosive."},
    {"id":"h2so4","name":"Sulfuric Acid","formula":"H2SO4","strength":"strong","color":"#f3f0e6","oxidizing":True,"hazard":"Highly corrosive; concentrated form is a strong oxidizer/dehydrator."},
    {"id":"hno3","name":"Nitric Acid","formula":"HNO3","strength":"strong","color":"#eef7ee","oxidizing":True,"hazard":"Corrosive and a strong oxidizer; releases NOx with metals."},
    {"id":"h3po4","name":"Phosphoric Acid","formula":"H3PO4","strength":"weak","color":"#eef4f2","oxidizing":False,"hazard":"Corrosive in concentrated form."},
    {"id":"acetic","name":"Acetic Acid (Vinegar)","formula":"CH3COOH","strength":"weak","color":"#f7f6ea","oxidizing":False,"hazard":"Mild irritant; low hazard when dilute."},
    {"id":"citric","name":"Citric Acid","formula":"C6H8O7","strength":"weak","color":"#f7f7e8","oxidizing":False,"hazard":"Low hazard."},
    {"id":"carbonic","name":"Carbonic Acid","formula":"H2CO3","strength":"weak","color":"#eef7f9","oxidizing":False,"hazard":"Low hazard; unstable, decomposes to CO2/water."},
    {"id":"oxalic","name":"Oxalic Acid","formula":"H2C2O4","strength":"weak","color":"#f2f2ea","oxidizing":False,"hazard":"Toxic in quantity; irritant."},
]

BASES = [
    {"id":"naoh","name":"Sodium Hydroxide","formula":"NaOH","strength":"strong","color":"#eef2fb","hazard":"Highly caustic."},
    {"id":"koh","name":"Potassium Hydroxide","formula":"KOH","strength":"strong","color":"#eef2fb","hazard":"Highly caustic."},
    {"id":"caoh2","name":"Calcium Hydroxide (Limewater)","formula":"Ca(OH)2","strength":"weak","color":"#f3f7f3","hazard":"Irritant."},
    {"id":"nh3","name":"Ammonia Solution","formula":"NH3(aq)","strength":"weak","color":"#eefaf5","hazard":"Irritating fumes."},
    {"id":"mgoh2","name":"Magnesium Hydroxide","formula":"Mg(OH)2","strength":"weak","color":"#f4f6f4","hazard":"Low hazard; used as antacid."},
    {"id":"baoh2","name":"Barium Hydroxide","formula":"Ba(OH)2","strength":"strong","color":"#f0f0ec","hazard":"Toxic if ingested; caustic."},
]

INDICATORS = [
    {"id":"universal","name":"Universal Indicator","formula":"U.I.","color":"#7cb342",
     "bands":{"acidic":"#e74c3c","neutral":"#2ecc71","basic":"#8e44ad"}},
    {"id":"phenol","name":"Phenolphthalein","formula":"C20H14O4","color":"#f7f5fa",
     "bands":{"acidic":"#f7f5fa","neutral":"#f7f5fa","basic":"#e91e8c"}},
    {"id":"methylorange","name":"Methyl Orange","formula":"C14H14N3NaO3S","color":"#f5a623",
     "bands":{"acidic":"#e74c3c","neutral":"#f5a623","basic":"#f5c400"}},
    {"id":"litmus","name":"Litmus Solution","formula":"—","color":"#8e5fa8",
     "bands":{"acidic":"#e05a5a","neutral":"#8e5fa8","basic":"#4361c9"}},
    {"id":"bromothymol","name":"Bromothymol Blue","formula":"C27H28Br2O5S","color":"#e8c15a",
     "bands":{"acidic":"#e8c15a","neutral":"#3fae5c","basic":"#2255cc"}},
    {"id":"methylred","name":"Methyl Red","formula":"C15H15N3O2","color":"#e0475a",
     "bands":{"acidic":"#e0475a","neutral":"#e8a23c","basic":"#e8d23c"}},
]

# Salts: (name, formula, cation, anion, color)
SALT_DEFS = [
    ("Sodium Chloride","NaCl","Na+","Cl-","#f2f2f2"),
    ("Sodium Sulfate","Na2SO4","Na+","SO4^2-","#f2f2ee"),
    ("Sodium Carbonate","Na2CO3","Na+","CO3^2-","#f0f4f0"),
    ("Sodium Bicarbonate","NaHCO3","Na+","HCO3-","#f5f5f0"),
    ("Sodium Nitrate","NaNO3","Na+","NO3-","#f2f2ee"),
    ("Sodium Phosphate","Na3PO4","Na+","PO4^3-","#f2f2ee"),
    ("Sodium Sulfite","Na2SO3","Na+","SO3^2-","#f2f2ee"),
    ("Sodium Iodide","NaI","Na+","I-","#f2f2ee"),
    ("Sodium Thiosulfate","Na2S2O3","Na+","S2O3^2-","#f2f2ee"),
    ("Potassium Chloride","KCl","K+","Cl-","#f2f2f2"),
    ("Potassium Iodide","KI","K+","I-","#f2f2ee"),
    ("Potassium Bromide","KBr","K+","Br-","#f2f2ee"),
    ("Potassium Nitrate","KNO3","K+","NO3-","#f2f2ee"),
    ("Potassium Carbonate","K2CO3","K+","CO3^2-","#f0f4f0"),
    ("Potassium Permanganate","KMnO4","K+","MnO4-","#7b2d8e"),
    ("Potassium Dichromate","K2Cr2O7","K+","Cr2O7^2-","#e8a23c"),
    ("Calcium Carbonate","CaCO3","Ca2+","CO3^2-","#f0efe9"),
    ("Calcium Chloride","CaCl2","Ca2+","Cl-","#f2f2ee"),
    ("Calcium Sulfate","CaSO4","Ca2+","SO4^2-","#f0f0ec"),
    ("Calcium Nitrate","Ca(NO3)2","Ca2+","NO3-","#f2f2ee"),
    ("Magnesium Chloride","MgCl2","Mg2+","Cl-","#f2f2ee"),
    ("Magnesium Sulfate","MgSO4","Mg2+","SO4^2-","#f0f0ec"),
    ("Magnesium Carbonate","MgCO3","Mg2+","CO3^2-","#f0efe9"),
    ("Barium Chloride","BaCl2","Ba2+","Cl-","#f2f2ee"),
    ("Barium Nitrate","Ba(NO3)2","Ba2+","NO3-","#f2f2ee"),
    ("Copper(II) Sulfate","CuSO4","Cu2+","SO4^2-","#3aa0d8"),
    ("Copper(II) Chloride","CuCl2","Cu2+","Cl-","#3f9fce"),
    ("Copper(II) Nitrate","Cu(NO3)2","Cu2+","NO3-","#4aa8d6"),
    ("Copper(II) Carbonate","CuCO3","Cu2+","CO3^2-","#3f8f8a"),
    ("Iron(II) Sulfate","FeSO4","Fe2+","SO4^2-","#bcd98f"),
    ("Iron(III) Chloride","FeCl3","Fe3+","Cl-","#c9862f"),
    ("Iron(III) Nitrate","Fe(NO3)3","Fe3+","NO3-","#c9862f"),
    ("Iron(II) Chloride","FeCl2","Fe2+","Cl-","#cde0b0"),
    ("Silver Nitrate","AgNO3","Ag+","NO3-","#f5f5f0"),
    ("Lead(II) Nitrate","Pb(NO3)2","Pb2+","NO3-","#f2f2ee"),
    ("Lead(II) Acetate","Pb(CH3COO)2","Pb2+","CH3COO-","#f2f2ee"),
    ("Zinc Sulfate","ZnSO4","Zn2+","SO4^2-","#f0f0ec"),
    ("Zinc Chloride","ZnCl2","Zn2+","Cl-","#f2f2ee"),
    ("Zinc Nitrate","Zn(NO3)2","Zn2+","NO3-","#f2f2ee"),
    ("Ammonium Chloride","NH4Cl","NH4+","Cl-","#f4f4ee"),
    ("Ammonium Sulfate","(NH4)2SO4","NH4+","SO4^2-","#f2f2ee"),
    ("Ammonium Nitrate","NH4NO3","NH4+","NO3-","#f2f2ee"),
    ("Ammonium Carbonate","(NH4)2CO3","NH4+","CO3^2-","#f0f4f0"),
    ("Aluminium Sulfate","Al2(SO4)3","Al3+","SO4^2-","#f0f0ec"),
    ("Aluminium Chloride","AlCl3","Al3+","Cl-","#f2f2ee"),
    ("Manganese(II) Sulfate","MnSO4","Mn2+","SO4^2-","#f5e0ea"),
    ("Manganese Dioxide","MnO2","Mn4+","O2-","#3b3b3d"),
    ("Nickel(II) Sulfate","NiSO4","Ni2+","SO4^2-","#a8d99a"),
    ("Cobalt(II) Chloride","CoCl2","Co2+","Cl-","#d98fa0"),
    ("Tin(II) Chloride","SnCl2","Sn2+","Cl-","#f2f2ee"),
    ("Chromium(III) Chloride","CrCl3","Cr3+","Cl-","#6fae5c"),
    ("Sodium Fluoride","NaF","Na+","F-","#f2f2ee"),
    ("Potassium Sulfate","K2SO4","K+","SO4^2-","#f2f2ee"),
    ("Ammonium Phosphate","(NH4)3PO4","NH4+","PO4^3-","#f2f2ee"),
]

HALOGENS = [
    {"id":"cl2","name":"Chlorine Water","formula":"Cl2(aq)","rank":1,"color":"#e8f0d8","hazard":"Toxic gas dissolved in water; strong oxidizer."},
    {"id":"bromine","name":"Bromine Water","formula":"Br2(aq)","rank":2,"color":"#a35c1f","hazard":"Corrosive and toxic."},
    {"id":"iodine","name":"Iodine Solution","formula":"I2(aq)","rank":3,"color":"#8a5a2b","hazard":"Stains skin/fabric; toxic in quantity."},
]

OXIDIZERS_MISC = [
    {"id":"h2o2","name":"Hydrogen Peroxide","formula":"H2O2","color":"#f3f9fb","hazard":"Bleaching agent; irritant at high concentration."},
]

ORGANICS = [
    {"id":"ethanol","name":"Ethanol","formula":"C2H5OH","color":"#eef7f9","hazard":"Flammable."},
    {"id":"methanol","name":"Methanol","formula":"CH3OH","color":"#eef7f9","hazard":"Flammable and toxic."},
    {"id":"propanol","name":"Propan-1-ol","formula":"C3H7OH","color":"#eef7f9","hazard":"Flammable."},
    {"id":"acetone","name":"Acetone","formula":"C3H6O","color":"#eef7f9","hazard":"Highly flammable; volatile."},
    {"id":"glycerol","name":"Glycerol","formula":"C3H8O3","color":"#f5f7ee","hazard":"Low hazard."},
    {"id":"hexane","name":"Hexane","formula":"C6H14","color":"#f5f7f9","hazard":"Highly flammable; immiscible with water."},
    {"id":"starch","name":"Starch Solution","formula":"(C6H10O5)n","color":"#f5f5f0","hazard":"Low hazard."},
    {"id":"glucose","name":"Glucose Solution","formula":"C6H12O6","color":"#f7f7ec","hazard":"Low hazard."},
]

GASES = [
    {"id":"co2gas","name":"Carbon Dioxide Gas","formula":"CO2","color":"#eef2ee","hazard":"Asphyxiant in high concentration; heavier than air."},
    {"id":"o2gas","name":"Oxygen Gas","formula":"O2","color":"#eef4fb","hazard":"Supports combustion vigorously."},
    {"id":"h2gas","name":"Hydrogen Gas","formula":"H2","color":"#f2f7fb","hazard":"Highly flammable, explosive in air."},
    {"id":"n2gas","name":"Nitrogen Gas","formula":"N2","color":"#f0f4f2","hazard":"Inert; asphyxiant in high concentration."},
    {"id":"cl2gas","name":"Chlorine Gas","formula":"Cl2","color":"#e8f0d0","hazard":"Toxic — corrosive to lungs."},
    {"id":"nh3gas","name":"Ammonia Gas","formula":"NH3","color":"#f2f7f0","hazard":"Toxic, pungent, and corrosive to eyes/lungs."},
    {"id":"so2gas","name":"Sulfur Dioxide Gas","formula":"SO2","color":"#f2f0e0","hazard":"Toxic, irritating gas."},
]

EXTRA_SOLIDS = [
    {"id":"sulfur","name":"Sulfur (Powder)","formula":"S8","color":"#f2e14c","hazard":"Low hazard; flammable as fine dust."},
    {"id":"carbon","name":"Carbon (Charcoal)","formula":"C","color":"#2b2b2d","hazard":"Low hazard; combustible."},
    {"id":"sio2","name":"Silicon Dioxide (Sand)","formula":"SiO2","color":"#e8dcc0","hazard":"Low hazard; avoid inhaling fine dust."},
    {"id":"cuo","name":"Copper(II) Oxide","formula":"CuO","color":"#2b2320","hazard":"Low hazard; harmful if ingested."},
    {"id":"fe2o3","name":"Iron(III) Oxide (Rust)","formula":"Fe2O3","color":"#8a3b1f","hazard":"Low hazard."},
    {"id":"mgo","name":"Magnesium Oxide","formula":"MgO","color":"#f5f5f2","hazard":"Low hazard; mild irritant as dust."},
    {"id":"zno","name":"Zinc Oxide","formula":"ZnO","color":"#f7f7f0","hazard":"Low hazard; common in sunscreen/ointments."},
    {"id":"nano2ex","name":"Sodium Acetate","formula":"CH3COONa","color":"#f2f2ea","hazard":"Low hazard."},
    {"id":"kclo3","name":"Potassium Chlorate","formula":"KClO3","color":"#f2f2ee","hazard":"Strong oxidizer — keep away from combustibles."},
    {"id":"nh4no3s","name":"Ammonium Dichromate","formula":"(NH4)2Cr2O7","color":"#c9601f","hazard":"Toxic and a strong oxidizer."},
]

EXTRA_ACIDS = [
    {"id":"boric","name":"Boric Acid","formula":"H3BO3","strength":"weak","color":"#f5f5f0","oxidizing":False,"hazard":"Low hazard in dilute form."},
]
EXTRA_BASES = [
    {"id":"naco3sol","name":"Sodium Bicarbonate Solution","formula":"NaHCO3(aq)","strength":"weak","color":"#f2f4f0","hazard":"Low hazard; mild antacid."},
]

OTHER = [
    {"id":"water","name":"Distilled Water","formula":"H2O","color":"#eaf6fb","hazard":"None."},
    {"id":"limewater_co2","name":"Sodium Chloride Brine","formula":"NaCl(aq) conc.","color":"#eef6f9","hazard":"Low hazard."},
]

def build():
    items = []

    for m in METALS:
        items.append({
            "id": m["id"], "name": m["name"], "formula": m["formula"],
            "category": "metal", "state": "solid", "color": m["color"],
            "reactivity_rank": m["rank"], "hazard": m["hazard"]
        })

    for a in ACIDS:
        items.append({
            "id": a["id"], "name": a["name"], "formula": a["formula"],
            "category": "acid", "state": "aqueous", "color": a["color"],
            "strength": a["strength"], "oxidizing": a["oxidizing"], "hazard": a["hazard"],
            "cation": "H+"
        })

    for b in BASES:
        items.append({
            "id": b["id"], "name": b["name"], "formula": b["formula"],
            "category": "base", "state": "aqueous", "color": b["color"],
            "strength": b["strength"], "hazard": b["hazard"], "anion": "OH-"
        })

    for i in INDICATORS:
        items.append({
            "id": i["id"], "name": i["name"], "formula": i["formula"],
            "category": "indicator", "state": "aqueous", "color": i["color"],
            "bands": i["bands"], "hazard": "Low hazard; used in small quantities."
        })

    for name, formula, cation, anion, color in SALT_DEFS:
        _id = "".join(ch for ch in formula.lower() if ch.isalnum())
        items.append({
            "id": _id, "name": name, "formula": formula,
            "category": "salt", "state": "aqueous", "color": color,
            "cation": cation, "anion": anion, "hazard": "See standard MSDS; assume moderate hazard for heavy-metal salts."
        })

    for h in HALOGENS:
        items.append({
            "id": h["id"], "name": h["name"], "formula": h["formula"],
            "category": "halogen", "state": "aqueous", "color": h["color"],
            "halogen_rank": h["rank"], "hazard": h["hazard"]
        })

    for o in OXIDIZERS_MISC:
        items.append({
            "id": o["id"], "name": o["name"], "formula": o["formula"],
            "category": "oxidizer", "state": "aqueous", "color": o["color"], "hazard": o["hazard"]
        })
    items.append({"id":"mno2_cat","name":"Manganese Dioxide (Catalyst)","formula":"MnO2","category":"catalyst","state":"solid","color":"#3b3b3d","hazard":"Low hazard; used in small amounts as a catalyst."})

    for org in ORGANICS:
        items.append({
            "id": org["id"], "name": org["name"], "formula": org["formula"],
            "category": "organic", "state": "liquid" if org["id"] not in ("starch","glucose") else "aqueous",
            "color": org["color"], "hazard": org["hazard"]
        })

    for o in OTHER:
        items.append({
            "id": o["id"], "name": o["name"], "formula": o["formula"],
            "category": "other", "state": "liquid", "color": o["color"], "hazard": o["hazard"]
        })

    for a in EXTRA_ACIDS:
        items.append({
            "id": a["id"], "name": a["name"], "formula": a["formula"],
            "category": "acid", "state": "aqueous", "color": a["color"],
            "strength": a["strength"], "oxidizing": a["oxidizing"], "hazard": a["hazard"], "cation": "H+"
        })

    for b in EXTRA_BASES:
        items.append({
            "id": b["id"], "name": b["name"], "formula": b["formula"],
            "category": "base", "state": "aqueous", "color": b["color"],
            "strength": b["strength"], "hazard": b["hazard"], "anion": "OH-"
        })

    for s in EXTRA_SOLIDS:
        items.append({
            "id": s["id"], "name": s["name"], "formula": s["formula"],
            "category": "other", "state": "solid", "color": s["color"], "hazard": s["hazard"]
        })

    for g in GASES:
        items.append({
            "id": g["id"], "name": g["name"], "formula": g["formula"],
            "category": "gas", "state": "gas", "color": g["color"], "hazard": g["hazard"]
        })

    # de-duplicate ids just in case
    seen = set()
    unique = []
    for it in items:
        if it["id"] in seen:
            continue
        seen.add(it["id"])
        unique.append(it)

    return unique

if __name__ == "__main__":
    data = build()
    with open("data/chemicals.json", "w") as f:
        json.dump(data, f, indent=2)
    print(f"Wrote {len(data)} chemicals to data/chemicals.json")
