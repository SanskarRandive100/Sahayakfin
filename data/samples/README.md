# Synthetic statement samples

All identities, accounts, payments, banks and lenders here are fictional demo data.
Generated with seed 42; statements end on 2026-10-25. Never replace them with real statements.

From the repository root, using the backend Python environment:

```powershell
python data/generate_personas.py
python data/generate_personas.py --check
python data/generate_personas.py --layout alt
python data/verify_pipeline.py
```

The first command writes four formats per persona (ravi, sunita, arjun, meena):
`.csv`, `.pdf` (DEMO BANK), `.locked.pdf`, and `.aa.json` (simulated AA).
It also writes `ravi.alt.pdf` (ALT BANK): **17 statement files** in total.
`--layout alt` writes only `ravi.alt.pdf`. `--check` regenerates before checking;
it prints parsed row counts, score, confidence, affordability and format equivalence,
and returns nonzero if any format differs. Unchanged encrypted PDFs are reused,
so the printed number of written files may be 13 rather than 17.
`verify_pipeline.py` reads existing files without regenerating and emits JSON evidence.

| Persona | Locked PDF password | Rows | Score | Confidence |
| --- | --- | --- | --- | --- |
| Ravi | RAVI0101 | 284 | 85 | HIGH |
| Sunita | SUNI0101 | 747 | 99 | HIGH |
| Arjun | ARJU0101 | 185 | 43 | HIGH |
| Meena | MEEN0101 | 117 | 94 | LOW (provisional) |

CSV headers are `date,narration,debit,credit,balance`; amounts are rupees in source
statements, converted to integer paise during normalization. Quote amounts containing
commas. Blank balances are allowed. Column order is detected by header name.
Plain PDFs use dates DD-MM-YYYY; ALT BANK uses DD/MM/YY.

These fixed synthetic results are regression fixtures, not evidence of real-world
creditworthiness, fairness, lender approval or regulatory compliance.
