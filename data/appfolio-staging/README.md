# AppFolio staging (local dumps only)

Drop AppFolio exports here before wiring them into the demo seed.

**Do not invent sample dumps.** Wait for real exports or pasted tables from Justin.

## Suggested filenames

| File | Entity |
|------|--------|
| `01-properties.csv` / `.xlsx` / `.json` | Properties / buildings |
| `02-units.csv` | Units |
| `03-owners.csv` | Owners |
| `04-tenants-leases.csv` | Tenants + leases (or split) |
| `05-prospects.csv` | Prospects / applicants / leads |
| `06-work-orders.csv` | Maintenance / work orders |
| `07-showings.csv` | Showings / tours |
| `paste-notes.md` | Chat pastes, column notes, quirks |

Also fine: one multi-sheet `.xlsx`, or markdown tables pasted into `paste-notes.md`.

## Load path

1. Drop AppFolio PDF/CSV exports here (already have Property / Unit / Tenant / Rent Roll from 2026-07-17).
2. Extract text (PDF → `.txt`) if needed, then parse + import:

```bash
export PATH="/opt/homebrew/opt/node@20/bin:/opt/homebrew/opt/postgresql@16/bin:/opt/homebrew/bin:$PATH"
npm run db:seed:appfolio   # parse PDFs → JSON → replace portfolio (keeps staff logins)
```

Or stepwise:

```bash
python3 scripts/parse-appfolio-pdfs.py
npx tsx scripts/import-appfolio-staging.ts
```

**Do not** use `npm run db:seed` after this unless you want the old synthetic Portland demo back (full wipe).

After AppFolio import, populate demo ops (maintenance / prospects / calendar) without wiping the portfolio:

```bash
npm run db:seed:ops
```

## Commands

```bash
export PATH="/opt/homebrew/opt/node@20/bin:/opt/homebrew/opt/postgresql@16/bin:/opt/homebrew/bin:$PATH"
npm run db:push             # schema only
npm run db:seed:appfolio    # AppFolio portfolio import
npm run db:seed:ops         # demo maintenance + prospects + calendar (safe re-run)
npm run db:seed             # FULL WIPE + synthetic Portland demo
npm run db:studio           # inspect rows
```

Repo already depends on `xlsx` for Excel/CSV parsing elsewhere (`src/app/api/reports/export`, Freddie PMMS, etc.).
