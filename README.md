# Chemlab Studio 2.4.0 — original lab, liquid glass

The chemistry bench restores the supplied **Chemlab-main.zip** implementation. Its JavaScript, base CSS, 119-chemical catalogue and Python reaction engine are copied byte-for-byte; their original SHA-256 hashes are recorded in `original_lab/source-manifest.json`. The HTML retains the original lab structure, with asset paths resolved for this server and a separate integration script and glass stylesheet.

The current separate Chemlab login, 18 practical workspaces, 34 revision topics, retrieval practice, 118-element periodic table, calculations and Studio notebook remain available. The original lab is isolated from the Studio styles and code so its apparatus and reaction behaviour come from the original source.

## Run locally

```sh
python app.py
```

Open `http://127.0.0.1:5050` and create or sign into a Chemlab account. Local development uses the ignored root file `data/chemlab_users.json`. The server and original reaction engine use Python's standard library. Render installs Gunicorn and runs `python -m gunicorn app:app`; use [RENDER.md](RENDER.md) for deployment and Gist account settings.

Include **`original_lab/` and all of `dist/`** when uploading the project. `original_lab/data/chemicals.json` is application data and must be committed. Only the root `/data/` directory is ignored because it contains local account records.

## Bench and sidebars

- The original Apparatus and Chemicals tabs, glassware, burners, burettes, pouring controls, heating, evaporation, reaction information, notes and workspace save/open controls are restored.
- The button at the top left of the Studio hides or shows navigation. In the lab header, separate buttons hide or show the chemical cupboard and the reaction-information panel. Their hidden states are remembered on this device.
- Liquid-glass styling adds translucent surfaces, blurred backgrounds, bright edges and soft highlights. Light/dark themes stay coordinated between the Studio and lab. Reduced-motion preferences are respected.
- Switching to another Studio section preserves the running laboratory frame. Lab notes can be sent to the Studio notebook.

The original bench's own pouring panels and history/periodic-table dialogs are restored as part of its original interaction. The replacement NOBOOK-inspired bench is removed.

## Saves and accounts

RevisionCore-style authentication uses **separate Chemlab accounts**, its own cookie and its own Gist filename. Passwords are salted scrypt hashes and stored session tokens are hashed. Hosted account/session persistence uses your configured Gist; experiment data stays in the browser, separately for each username.

The integration autosaves the original laboratory per account, including apparatus, mixture volumes, temperatures and notes. The lab toolbar exports/imports the original **version 1** workspace format. Studio **Export workspace** captures that lab plus revision progress, practical trials and notebook entries in a version 2 backup. Import version 1 files with the original lab's folder button; import Studio backups through Settings.

Previous 2.2/2.3 replacement-bench inventories remain in older Studio backups but are not automatically converted into the original lab's different vessel format. Existing study progress and notebook entries continue to load.

## Offline study

Double-click `dist/Chemlab.html` and choose the offline option to use the practicals, revision, periodic table, calculations and notebook without installation. **The original chemistry bench needs the Python server or Render**, as it calls the original Python reaction engine. The offline file explains this on the Lab bench screen.

Use the same browser and file location for consistent local storage. Export backups to move work between devices, browsers or site origins. Login does not provide cloud experiment sync.

## Chemistry and course coverage

The restored bench uses the original qualitative rules, approximate pH calculations, volume-based mixture representation and special cases. Its original assumptions and limitations are retained; it is not a universal reaction solver or a quantitatively complete model of every Edexcel experiment.

The separate practical workspaces and calculators retain their existing models and assumptions. There are 18 practicals, including the 12 named 4CH1 investigations, original course-wide notes, flashcards, quizzes, result graphs, trial recording and CSV export. Content organisation was checked against [Pearson's 4CH1 specification, Issue 3](https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Chemistry/2017/specification-and-sample-assessments/international-gcse-chemistry-2017-specification.pdf). Notes support revision and do not replace every specification statement or official assessment material. Modular 4XCH1 is not separately mapped.

## Included source

- `dist/original-lab/app.js` and `style.css`: unchanged original client and base stylesheet.
- `original_lab/reaction_engine.py` and `data/chemicals.json`: unchanged original engine and catalogue.
- `original_api.py`: WSGI request adapter for `/api/react` and `/api/chemicals`.
- `dist/original-lab/bridge.js` and `liquid-glass.css`: account-scoped saves, safe workspace integration, sidebar controls and appearance.
- Other `dist/` modules: the current practicals, learning, periodic table, calculations, notebook and account screens.

This is the deployment package. Development tests, their report and Node build files have been removed; all runtime source and the prebuilt offline edition are included. No Node build step is required.

Before packaging, **81 automated checks passed: 41 JavaScript and 40 Python checks.** They covered source identity, original reaction API passthrough, account behaviour, workspace isolation, sidebar preferences, persistent lab embedding, study screens, calculation models and HTTP/deployment behaviour.

Browser-preview access was previously declined by the permission gate. Real-browser visual/responsive QA, drag gestures, native downloads and file-picker behaviour remain unverified. Gist responses are mocked in tests; this update has not been deployed to Render or tested against a live Gist from this session. The original Downloads ZIP is untouched.
