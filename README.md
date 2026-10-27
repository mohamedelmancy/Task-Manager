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

## Setup

```bash
npm install
```

`npm install` also runs Husky, which installs the git hooks.

To refresh the mock JSON data:

```bash
node data-fetching/generate-data.js
```

See `DATA_README.md` for the data shape.

## Run

```bash
npm start
```

Open `http://localhost:4200/`. The app reloads when you save a file.

## Maintain

| Command                | What it does                                |
| ---------------------- | ------------------------------------------- |
| `npm run lint`         | ESLint on `src` TypeScript and HTML         |
| `npm run format`       | Prettier on the project                     |
| `npm run format:check` | Check formatting without writing files      |
| `npm test`             | Unit tests in watch mode                    |
| `npm run test:ci`      | Unit tests once, with coverage. Minimum 80% |
| `npm run build`        | Production build in `dist/`                 |

## Pre-commit

The hook runs only when you commit, not on every save. Husky runs `lint-staged` on the staged files:

- `.ts` and `.html`: ESLint `--fix`, then Prettier
- `.scss`, `.json`, and `.md`: Prettier

If a file cannot be fixed, the commit stops.
