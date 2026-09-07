# ChemLab — Virtual Chemistry Lab Sandbox (Flask Edition)

A free-form chemistry sandbox with 119 chemicals, exact salt-naming chemistry,
proper (non-emoji) apparatus, and real heating/evaporation physics. No AI
calls — every reaction is computed instantly by a rules engine (activity
series, solubility rules, acid/base strength for pH, halogen displacement,
plus charge-balanced salt naming so you always see exactly what compound
formed, e.g. "Sodium Chloride (NaCl)" rather than "a salt").

## Setup

```bash
pip install -r requirements.txt
python app.py
```

Open **http://localhost:5050** (or your machine's LAN IP on that port from
Safari on iPad).

## How to use the sandbox

1. Switch the left sidebar to the **Apparatus** tab.
2. Drag a **Beaker**, **Conical Flask**, **Test Tube**, or **Evaporating Dish**
   onto the (large, scrollable) bench.
3. Switch back to **Chemicals** — now grouped into **Solids**, **Liquids &
   Aqueous Solutions**, and **Gases** — drag one onto your vessel, pick a
   volume, and pour it in. Solid chemicals render as chunky irregular chips
   sitting at the bottom, not a flat liquid fill, until they react or dissolve.
4. Add a second chemical to trigger a reaction — the vessel updates to show
   the *exact* compound formed (e.g. mixing HCl + NaOH shows "Sodium Chloride
   (NaCl) + Water", not the leftover ingredient names).
5. Drag a **Bunsen Burner** onto the bench and tap it to light it (proper
   barrel/collar/base illustration with a blue-and-orange flame — no emoji).
   Drag a vessel near the flame and its temperature badge climbs. Past 100°C,
   aqueous contents evaporate (steam + shrinking liquid level). Boil a
   dissolved salt dry and it's left behind as solid crystal chips in the
   vessel, labeled "Dry residue: [salt name]".
6. Drag a **Burette** onto the bench — it's a proper graduated tube with a
   stopcock on a retort-stand clamp. Drag a chemical onto it to load it,
   position it above a vessel, and tap **+1 mL drop** to titrate (drop
   detection finds the nearest vessel within range, so it doesn't need
   pixel-perfect placement).
7. Tripod & Gauze, Retort Stand, Test Tube Rack, and Funnel & Filter are
   decorative apparatus (line-art icons, no emoji) for bench dressing — flagged
   here honestly since they carry no functional chemistry.
8. Tap any vessel to select it (a small "SELECTED" tag appears — no more
   blue ring around the glass) and see its reaction info on the right.
   Switch to **Lab Notes** any time to jot observations (autosaved locally).

## What's inside

- `app.py` — Flask routes: serves the page, `/api/chemicals`, `/api/react`
- `reaction_engine.py` — the chemistry rules engine, including the
  charge-balancing salt-naming system (`build_salt`, `CATIONS`, `ANIONS`)
- `data/chemicals.json` — the 119-item store cupboard (solids/liquids/gases)
- `generate_chemicals.py` — regenerate/extend the chemical database
- `templates/index.html`, `static/css/style.css`, `static/js/app.js` — the
  sandbox UI

## Reaction engine coverage

- Acid + base neutralization — now names the **exact salt** via charge-balanced
  formula construction (Na+ + Cl- → NaCl "Sodium Chloride"; Ca2+ + SO4^2- →
  CaSO4; Al3+ + SO4^2- → Al2(SO4)3, etc.)
- Metal + acid displacement, gated by the real reactivity series, also naming
  the exact metal salt formed
- Acid + carbonate/bicarbonate → CO2 fizzing, exact salt named
- Metal + salt displacement (activity series)
- Salt + salt double displacement — solubility rules decide which product
  precipitates, and both the precipitate and the soluble byproduct are named
  exactly (e.g. AgNO3 + NaCl → "Silver Chloride (AgCl) + Sodium Nitrate
  (NaNO3)")
- Base + salt → metal hydroxide precipitate, exact hydroxide + byproduct named
  (e.g. NaOH + CuSO4 → "Copper(II) Hydroxide (Cu(OH)2) + Sodium Sulfate
  (Na2SO4)")
- Halogen displacement, catalytic decomposition (H2O2 + MnO2), and a handful
  of named special reactions (disappearing cross, permanganate decolorization,
  starch-iodine)

## Extending

Add chemicals in `data/chemicals.json` (or `generate_chemicals.py`, then
re-run it) — give salts a `cation`/`anion` pair from the `CATIONS`/`ANIONS`
maps in `reaction_engine.py` (add new entries there if needed) and the exact
salt-naming system picks them up automatically. Add named special-case
reactions to `SPECIAL_CASES` in `reaction_engine.py`.

## pH modeling (added)

`compute_ph` in `reaction_engine.py` now does a real mole-balance calculation
instead of fixed buckets: it tracks total H+ vs OH- equivalents (accounting
for polyprotic acids/bases like H2SO4 or Ca(OH)2) against total aqueous
volume, so pH moves smoothly and continuously as you titrate — including the
correct sharp swing through the equivalence point — rather than jumping
between fixed values.

## Saving your work

- **Lab Notes tab**: bigger textarea, explicit **Save Notes (.txt)** button —
  downloads your notes as a plain, timestamped `.txt` file whenever you want.
- **Header 💾 (Save Workspace)**: downloads a full session file (`.json`) —
  every vessel's shape/position/exact chemical volumes/temperature/dry-residue
  state, every burner's position and lit state, every burette's position,
  loaded chemical, remaining volume and snapped vessel, decorative apparatus,
  and your lab notes, all bundled together.
- **Header 📂 (Open Workspace)**: reopens a previously saved workspace file
  and rebuilds the entire bench exactly as it was, including notes.

(Notes save as `.txt` for quick human-readable export as requested; the full
workspace save uses `.json` instead of `.txt` because it's structured data —
positions, per-chemical volumes, temperatures, attachment states — that needs
to be parsed back precisely to reconstruct the bench. Flagging that choice
here in case a single-format save is preferred instead.)

## Evaporation-residue fix

Evaporating a *computed reaction product* (e.g. titrating HCl + NaOH to form
NaCl) now correctly leaves solid residue behind. Previously the evaporation
check only looked at the raw ingredients you poured in (HCl is an "acid",
NaOH is a "base" — neither is categorized as a "salt"), so it never noticed
that a real salt had actually formed. The reaction engine now returns a
`formed_salt` field whenever a neutralization/acid-metal/acid-carbonate
reaction produces a named salt, and evaporation prefers that over guessing
from the original ingredients.

## Pouring between vessels

Drag one vessel close to another (the same way a burette snaps to a vessel)
and, if the vessel you're moving has something in it, it snaps into place
next to the target and a transfer panel pops up — choose **Percentage** (of
the source vessel's contents) or **Exact Volume** (mL), then confirm to pour.
The transfer preserves the exact ratio of whatever's mixed in the source
vessel, merges into the target's existing contents, and both vessels
recompute their reactions afterward.

## Compact vessel cards + floating island

Vessel cards on the bench now hug just the glassware itself — no wide info
box. All the descriptive text (name, status, temperature, volume, contents)
lives in the **Reaction Info** panel on the right, live-updating for
whichever vessel is currently selected.

If you'd rather see temperature and volume right on the bench without
checking the side panel, tap 🌡️ in the header — it toggles a small floating
"island" pill that hovers just above each vessel (same badge shapes/sizes as
before) and moves with it wherever you drag it, since it's part of the same
draggable element.

## Turning this into a real desktop app

### Quick way — run it as a desktop window
```bash
pip install -r requirements.txt
python desktop_app.py
```
This starts the Flask backend in the background and opens ChemLab in its own
native window (via `pywebview`) instead of a browser tab — no address bar, no
terminal window staying open in the foreground once launched, no "localhost"
anywhere in sight. This is the same app, just running as a windowed
application instead of a page in Safari/Chrome.

### Making it double-clickable (a real standalone app, no Python required)
Package it with PyInstaller so it becomes a single executable/app bundle that
runs on a machine without Python installed:

```bash
pip install pyinstaller
pyinstaller --onefile --windowed --name ChemLab \
  --add-data "templates:templates" \
  --add-data "static:static" \
  --add-data "data:data" \
  --hidden-import=reaction_engine \
  desktop_app.py
```
(On Windows, use `;` instead of `:` in the `--add-data` paths, e.g.
`"templates;templates"`.)

This produces `dist/ChemLab` (or `dist/ChemLab.exe` on Windows, `dist/ChemLab.app`
on macOS with `--windowed`) — a real double-clickable app you can put on the
Desktop, put in your Applications folder, or hand to someone else entirely
without them installing anything.

**Note on Flask's `app.py`**: PyInstaller bundles files relative to the
executable, so if `app.py`'s data loading (`data/chemicals.json`) or
`render_template`/`static` lookups ever complain about paths once packaged,
switch those to resolve via `sys._MEIPASS` (PyInstaller's runtime unpack
folder) — a common one-line fix, happy to add it if you hit that.

**Platform-native window chrome**: `pywebview` uses each OS's real WebView
(WebKit on macOS, Edge WebView2 on Windows, GTK WebKit on Linux) — so the app
looks and feels native, not like an embedded Chrome instance.
