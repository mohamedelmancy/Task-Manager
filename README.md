# Task Manager

Angular task dashboard. Node `^20.19.0`, `^22.12.0`, or `>=24` and npm 8 or newer.

## Tools

These follow the assignment. `npm install` installs them.

- Angular 21, with standalone components, signals, reactive forms, and `httpResource`
- Angular Material and Angular CDK for the UI. PrimeNG is not used
- TypeScript and RxJS
- Vitest for unit tests. Coverage target is 80%
- ESLint, Prettier, Husky, and lint-staged

Mock data comes from `data-fetching/generate-data.js`. See `DATA_README.md`. JSON Server is not used.

The assignment asks for Chart.js (or a similar library) for the analytics charts. It is not installed yet.

## Languages

English and Arabic are included. Files live in `public/i18n/`.

To add a language, copy `en.json` to a new file such as `fr.json`, translate the values, and add one entry to `languages.json`. The first entry is the fallback. A language with `"direction": "rtl"` switches the page to right-to-left.

## Setup

```bash
npm install
```

`npm install` also installs the audit tools in `tools/` and runs Husky, which installs the git hooks.

To generate the mock JSON again, including `public/data/tasks.json` and `public/data/statistics.json`:

```bash
npm run generate-data
```

See `DATA_README.md` for the data shape.

## Run

```bash
npm start
```

Open `http://localhost:4200/`. The app reloads when you save a file.

## Maintain

| Command                 | What it does                                             |
| ----------------------- | -------------------------------------------------------- |
| `npm run lint`          | Report ESLint issues in `src` TypeScript and HTML        |
| `ng lint --fix`         | Fix the lint issues ESLint can correct                   |
| `npm run format`        | Prettier on the project                                  |
| `npm run format:check`  | Check formatting without writing files                   |
| `npm test`              | Unit tests in watch mode. axe-core runs with them        |
| `npm run test:ci`       | Unit tests once, with coverage. Minimum 80%              |
| `npm run build`         | Production build in `dist/`                              |
| `npm run lighthouse`    | Lighthouse on the production build. Run this separately  |
| `npm run generate-data` | Write fresh task and statistics JSON under `public/data` |

`npm test` runs axe-core with the unit tests. Lighthouse does not start with them. Run it on its own with `npm run lighthouse`. It builds the production app, then checks Performance, Accessibility, Best Practices, and SEO. Each score must stay above 90.

`public/robots.txt` allows crawlers. Lighthouse SEO expects this file.

## Pre-commit

The hook runs only when you commit, not on every save. Husky runs `lint-staged` on the staged files:

- `.ts` and `.html`: ESLint `--fix`, then Prettier
- `.scss`, `.json`, and `.md`: Prettier

If a file cannot be fixed, the commit stops.
