# Handoff requests

Append a request under the **owner's** heading. Include the exact function or endpoint, the expected JSON, and why. The owner ticks the request off when it's done.

## For Mihir (frontend)

## For Rajat (ingest / scoring / finance / data)

- [ ] (Sanskar) `app.ingest.parse_statement` / `normalize` are still stubs on main, so uploads give 3 fake weeks → no band → no loan offers. 7 API tests auto-skip while `app/ingest/sniff.py` docstring contains "STUB" (remove that word when the real parser lands and they run). The API also needs `data/samples/<persona>.aa.json` for `/aa/fetch`, seed persona data and `/fairness/report`.

## For Sanskar (API / DB / security / seed)
