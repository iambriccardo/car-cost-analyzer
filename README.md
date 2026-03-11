# Vienna Car Cost Analyzer

Local-first web app for Vienna car total cost of ownership estimation, focused on an EV-first, public-charging-first workflow with a clean local setup.

## Stack

This uses `Vite + React + TypeScript + Tailwind + Recharts + Zod + localStorage`.

Why this stack:
- `Vite` keeps the app easy to run locally and easy to open in a browser-based dev loop.
- `React + TypeScript` keeps the large form surface and calculation modules maintainable.
- `Tailwind` makes it practical to build a dense, polished UI without a component framework dependency.
- `Recharts` is enough for local dashboard-style visualizations.
- `Zod` validates scenarios on import and while editing.

## What the app models right now

- Cash purchase with gross/net VAT split, registration costs, depreciation, and resale
- Insurance premium with Austrian EV `motorbezogene Versicherungssteuer` derived from tax power and weight
- Vienna parking with private parking cost plus optional Parkpickerl
- Public charging with AC/DC mix, tariffs, charging losses, winter penalties, idle fees, and tariff inflation
- Sensitivity analysis and Monte Carlo uncertainty ranges

## Austrian / Vienna notes

- The legacy single-file HTML that was supposed to be migrated was not present in `the workspace` or nearby workspace folders on March 10, 2026, so this app was built as a clean replacement rather than a direct formula extraction.
- The app treats Austrian BEV `NoVA` as derived `EUR 0` in the current EV-first model.
- The EV `motorbezogene Versicherungssteuer` is derived from rated tax power and vehicle mass, then shown separately even if your entered insurance premium already includes it.
- Public charging tariffs are intentionally user-editable because they are market prices, not stable statutory values.
- The starter scenario is a single `Model 3 standard` baseline with `1,000 km/month`, `EUR 100/month` private parking, and Parkpickerl enabled by default.

## Run locally

```bash
npm install
npm run dev
```

Then open the local Vite URL shown in the terminal.

For a production build:

```bash
npm run build
npm run preview
```

You can also open `index.html` after a build via a simple static server, but `npm run dev` is the intended workflow.

## Tests

```bash
npm test
```

## Project structure

```text
src/
  app/
    App.tsx
    field-config.ts
  components/
    BreakdownTable.tsx
    ChartsPanel.tsx
    Fields.tsx
    MetricCards.tsx
    ScenarioManager.tsx
  lib/
    calculator.ts
    calculator.test.ts
    defaults.ts
    format.ts
    research.ts
    schema.ts
    storage.ts
    types.ts
    utils.ts
  main.tsx
  styles.css
```

## Next upgrades

- Add explicit ICE / hybrid vehicle types with derived NoVA and fuel taxes
- Add URL-safe scenario sharing
- Add PDF-specific export formatting
- Replace prompt-based rename/create with richer in-app dialogs
