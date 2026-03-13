# Austria EV TCO

Local-first EV total cost of ownership calculator for Austria. The app runs entirely in the browser with no backend and focuses on cash purchase, Austrian EV insurance tax treatment, parking, public charging, resale, sensitivity analysis, and Monte Carlo ranges.

## Stack

- `Vite`
- `React + TypeScript`
- `Tailwind CSS`
- `Recharts`
- `Zod`
- `localStorage`

This combination keeps the app fast to run locally, easy to maintain, and simple to deploy as static files.

## Current model scope

- Cash purchase with registration costs and resale at the selected TCO horizon
- Austrian EV `motorbezogene Versicherungssteuer`, derived from tax power and vehicle mass
- Insurance premium with optional inclusion of motor tax
- Private parking with optional resident permit
- Public charging with AC/DC/Supercharger mix, losses, winter penalty, idle fees, and tariff inflation
- Sensitivity analysis and Monte Carlo uncertainty simulation

The default starter scenario is `Model 3 standard` with `1,000 km/month`, `EUR 100/month` private parking, the resident permit enabled, and Austria-focused public charging defaults.

## Run locally

```bash
npm install
npm run dev
```

Then open the local Vite URL printed in the terminal.

For a production build:

```bash
npm run build
npm run preview
```

## Tests

```bash
npm test
```

## GitHub Pages

The app is configured for GitHub Pages:

- `vite.config.ts` uses relative asset paths
- `public/.nojekyll` is included
- `.github/workflows/deploy-pages.yml` builds, tests, and deploys `dist/`

To publish:

1. Push the repository to GitHub.
2. In repository settings, open `Pages`.
3. Set the source to `GitHub Actions`.
4. Push to `main`, or run the workflow manually.

## Project structure

```text
src/
  app/
    App.tsx
    field-config.ts
  components/
    ChartsPanel.tsx
    Fields.tsx
    ScenarioManager.tsx
    SummarySidebar.tsx
    ui/
  lib/
    austria-sources.ts
    calculator.ts
    calculator.test.ts
    defaults.ts
    format.ts
    report.ts
    schema.ts
    storage.ts
    types.ts
    utils.ts
  main.tsx
  styles.css
```

## Notes

- Public charging defaults are editable assumptions, not statutory values.
- The PDF export is generated locally in the browser.
- The current model is EV-first; ICE and hybrid support would be a future extension.
