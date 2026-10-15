# Verification — Render edition

**42 checks pass: 29 JavaScript chemistry/app checks and 13 Python WSGI/deployment checks.** The server suite invokes the real production entry point without network access and checks the health endpoint, correct module MIME types, cache revalidation, gzip, HEAD responses, missing files, path containment and Render port binding.

The chemistry and application tests run with Node's built-in test runner, with no installed dependencies.

The completed automated checks cover:

- All 118 element identities and unique reagent IDs; corrected insoluble carbonate and manganese dioxide states.
- Formula parsing, nested parentheses and hydrates; verified atom conservation for balanced equations; ionic charge-balanced formula construction.
- Strong acid titration before, at and after equivalence; weak ethanoic acid, buffer and equivalence behaviour.
- Iron/dilute-acid reactions, limiting reagents and gas amounts; exclusions for copper/HCl and the simple nitric-acid/metal model.
- Carbonate reactions, copper and silver/lead precipitates, catalyst retention, heated ammonium tests and hydroxide redissolving in acid.
- Transfer conservation and prevention of reaction replay; filtration separation; capacity, amount and concentration validation.
- Group 1/water reaction quantities; evaporation, dry salt residue and redissolving.
- Finite outputs for all 18 practical defaults; catalyst yield invariance and gas-volume bounds.
- All six application views and all 18 practical control handlers using an offline DOM adapter.
- Trial capture, notebook reports, notes, learning progress, quiz grading, workspace validation, formula and quantity forms, isotope/titre/repeat-result forms and gas-test output.
- Offline bundle compilation with no external module imports.
- Python application and Render production configuration.

Run `npm test` and `python -m unittest discover -s tests -p "test_*.py" -v` to reproduce the checks. Generated test logs are omitted from this package.

## Verification limit

The browser permission gate declined access to the local preview. No alternate browser or network workaround was used. Real browser visual/responsive QA and browser-specific behaviour remain unverified. Automated passing checks do not establish that every possible chemistry combination is modelled correctly; model boundaries are documented in the app and README.
