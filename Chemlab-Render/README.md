# Chemlab Studio 2.2 — Render edition

**Deploying to Render? Start with [RENDER.md](RENDER.md).** This edition adds RevisionCore-style sign-up and login with **separate Chemlab accounts**, plus a freely arranged sandbox bench. It retains the practicals, revision, calculations and translucent interface from the Render rebuild.

A substantial rebuild of the supplied Chemlab project for Edexcel International GCSE Chemistry, linear **4CH1**, with an Apple-inspired translucent interface. Independent educational software; not affiliated with Apple or Pearson.

## Open it

**Double-click `dist/Chemlab.html`.** It contains the complete app, styling and data. Choose **Open offline lab** to use a guest workspace. No installation, API key, server or internet connection is required for offline chemistry; accounts require the Python server. Keep using the same browser and file location for consistent local storage. Use **Settings → Export workspace** to keep a backup or move between devices, browsers, the offline app and a hosted copy.

To run a local web server, use Python:

```sh
python app.py
```

Open `http://127.0.0.1:5050`. The local server uses only the Python standard library and creates its own ignored `data/chemlab_users.json` account file when you sign up. Render uses Gunicorn and durable GitHub Gist account storage with the settings in [RENDER.md](RENDER.md). Chemistry runs in the browser; the old `/api/react` endpoint is not used by this app.

## What is included

- **Sandbox bench:** freely position up to 24 vessels and 30 apparatus items; pan, zoom, centre the scene, move objects by pointer or keyboard, and save their arrangement. Search 122 reagents; drag a reagent onto a vessel to measure a dose, or into empty space to create a new beaker. Four glassware shapes retain capacity checks, named products, balanced equations, limiting amounts, observations and gas tests.
- **Connected apparatus:** load a 50 mL burette and dispense 0.1, 1 or 5 mL into a receiver; mount it on a movable stand. Link burners for heating over time, a gas syringe for cumulative model gas, a thermometer for live temperature, a balance for solid sample mass, and a filter funnel for separation. Start, pause and reset stopwatches. Apparatus controls explain each model.
- **Separate accounts:** username/password sign-up, sign-in, restored sessions and sign-out follow RevisionCore’s system. Chemlab has its own cookie and account file. Passwords use salted scrypt hashes; only session-token hashes are stored. Render account persistence uses GitHub Gist.
- **Functional operations:** controlled heating, stirred-mixture transfer, filtration with residue and filtrate, water evaporation, dry salt residue and redissolving, crystal recovery, rename/remove/empty, history, undo and notebook capture.
- **18 practical workspaces:** all 12 explicitly named practical investigations in 4CH1 plus titration, qualitative analysis, flame tests, equilibrium, particles and organic reactions. Live controls, assumptions, methods, variables, graphs where appropriate, pinned graph comparisons, recorded trials, CSV downloads and notebook reports.
- **Course-wide revision:** 34 original topic summaries covering the four strands, retrieval questions, flashcards, ten-question practice sessions, explanations and device-local progress.
- **118-element periodic table:** search, family filtering, atomic data and first-20 shell configurations.
- **Calculations:** equation balancing, hydrate formula masses, percentage composition, moles, concentrations, gas volumes, yields, calorimetry, enthalpy, empirical ratios, Rf, bond energies, isotope averages, titration concentrations and repeated-result means/spread. A bonding viewer illustrates single, double and triple covalent bonds and two ionic examples.
- **Notebook and persistence:** editable entries, autosave, plain-text export, printing, workspace JSON backup and validated restore, including apparatus positions, practical input settings and trials. Workspaces save separately for each username in this browser; account storage holds credentials and sessions, not experiment data. Signing in on another device does not sync a workspace. Export/import to move it. Existing guest saves remain in the offline guest workspace and are not automatically copied into a new account.
- **Interface:** translucent panels, original SVG glassware, responsive navigation, dark mode, keyboard controls, visible focus, labelled fields and reduced-motion support. No external fonts or analytics. Hosted authentication uses the configured GitHub Gist service.

## Practical coverage

| Specification | Workspace |
| --- | --- |
| 1.7C | Solubility investigation |
| 1.13 | Paper chromatography |
| 1.36 | Formula of a metal oxide |
| 1.60C | Electrolysis |
| 2.14 | Oxygen in air |
| 2.21 | Metals and dilute acids |
| 2.42 | Hydrated copper sulfate crystals |
| 2.43C | Lead(II) sulfate precipitation |
| 3.8 | Temperature changes: neutralisation, displacement, dissolving, combustion |
| 3.15 | Marble surface area and acid concentration |
| 3.16 | Catalytic decomposition of peroxide |
| 4.43C | Ester preparation |

Content organisation was checked against [Pearson's 4CH1 specification, Issue 3, September 2024](https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Chemistry/2017/specification-and-sample-assessments/international-gcse-chemistry-2017-specification.pdf). The notes are original summaries, not a replacement for every individual specification statement or official assessment materials. The modular 4XCH1 course is not separately mapped.

## Chemistry model boundaries

Chemlab is an educational model, not a universal chemistry solver. The catalogue is broader than the supported reaction rules. Unrecognised combinations remain in the mixture without a reaction prediction. Specialised organic chemistry, electrolysis and physical models use the dedicated workspaces.

The bench uses balanced stoichiometry and resolves supported reactions to completion rather than simulating their kinetics. It includes selected acid/base/oxide/carbonate chemistry, precipitation and redissolving, metal and halogen displacement, Group 1/calcium plus water, peroxide with manganese dioxide, warmed ammonium tests and simplified carbonate decomposition. Reaction selection in complex multicomponent mixtures is rule-ordered; competing equilibria and every possible secondary reaction are outside the model.

pH uses ideal charge balance at 25°C, including ethanoic-acid/ethanoate and ammonia/ammonium equilibria. Sulfuric acid is approximated as fully providing two proton equivalents. Transition-metal hydrolysis, most polyprotic systems, activities and temperature corrections are not modelled. Unsupported compositions show “—”. Insoluble hydroxides/carbonates use school solubility rules rather than Ksp calculations. Gases use approximately 24 dm³/mol at RTP. Aqueous solvent is approximated as water; organic phase behaviour is outside scope.

Rate constants, visual movement, the synthetic model-solute curve, fixed decomposition threshold and adjustable crystal recovery are explicitly illustrative. Calorimetry uses fixed representative enthalpies and a chosen heat-retention factor. Esterification uses a stated ideal teaching equilibrium constant. Equilibrium pressure/temperature predictions are qualitative and considered independently. The electrolysis charge calculation is an extension and assumes 100% current efficiency. Evaporation does not predict thermal decomposition, boiling mixtures or hydrated-salt dehydration. These limits are also explained inside the app.

## Source and checks

`dist/` is the complete static website. `chemistry.js` contains the reaction engine; `simulations.js` contains the practical calculations; `curriculum.js` contains the educational material; `app.js` controls the interface. `data.js` includes the corrected and extended original catalogue and periodic data. `sandbox.js` contains the canvas and apparatus models; `auth-ui.js` contains the account screens; `auth.py` provides authentication and account persistence. No third-party JavaScript libraries are required.

```sh
node build-offline.mjs
npm test
python -m unittest discover -s tests -p "test_*.py" -v
```

The build assembles `dist/Chemlab.html` from those modules without installing a bundler. Tests check chemistry, quantity limits, transfers, filtration, evaporation, pH, formula parsing, practical calculations and UI handlers with an offline DOM adapter. They also compile the actual offline bundle. These adapter tests **do not verify real browser layout, rendering or browser-native behaviours**.

Browser preview access was declined by the permission gate during this session, so desktop/mobile visual QA, real drag-and-drop, download dialogs and native file-picker behaviour remain unverified. The stylesheet includes responsive breakpoints and reduced-motion handling, but they have not been visually inspected here. See `VERIFICATION.md` for the checks completed. The complete suite has 79 passing checks: 49 JavaScript and 30 Python checks. Authentication, per-user workspace isolation, sandbox interactions and deployment configuration are covered. It has not been deployed in a Render account or connected to a live GitHub Gist from this session.

The original ZIP remains untouched at its supplied location. No original workspace-save import compatibility is asserted; version 2 saves use a different inventory structure.
