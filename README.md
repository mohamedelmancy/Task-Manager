# Task Manager

A task dashboard for creating, filtering, and following work. The app is an Angular 21 single-page application. It reads mock JSON from `public/data`, keeps edits in memory for the current visit, and stores activity history and the chosen language in the browser.

Node `^20.19.0`, `^22.12.0`, or `>=24`, and npm 8 or newer.

## Overview

The shell has a sidebar, a header, and one main region. The home route redirects to Tasks.

| Route                     | Screen                                                                                             |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| `/tasks`                  | Board with To Do, In Progress, and Done. Search, filters, create, edit, delete, and drag-and-drop. |
| `/dashboard`              | Four statistic cards and two Chart.js doughnuts for status and priority.                           |
| `/calendar`               | Recent activity. Each row opens to show the fields that changed.                                   |
| `/team`                   | People who can be assigned a task, with a count of their tasks.                                    |
| `/analytics`, `/settings` | Placeholder routes. They share an empty page.                                                      |

English and Arabic ship in `public/i18n/`. Arabic sets the page to right-to-left. The account control switches language. There is no signed-in user.

## Architecture

```text
src/app/
  core/       API, activity history, HTTP cache, i18n, search, navigation
  features/   dashboard, tasks, calendar, team, and the empty section page
  shared/     task types and small UI pieces
public/
  data/       tasks.json and statistics.json
  i18n/       language list and translation files
data-fetching/generate-data.js
```

The root component bootstraps with `bootstrapApplication`. There are no NgModules. Feature routes load with `loadComponent`, so the dashboard, board, calendar, and team code stay out of the first bundle.

### Decisions

- **Signals, not a store.** Screen state and the task list live in signals. Derived values use `computed()`. There is no NgRx.
- **`httpResource` for reads.** Statistics and tasks load with `httpResource`. A parser checks the JSON shape before the UI sees it. The tasks request stays idle until a screen calls `loadTasks()`.
- **Edits stay in memory.** Create, update, and delete do not write `tasks.json`. They update signals in `Apis` and return an Observable. A refresh loads the file again.
- **Drag order is separate.** Dropping a card reorders or changes status for the current visit only. That order is not sent to the API.
- **Activity history is local.** `ActivityLog` stores the newest 30 changes in `localStorage` under `task-activity`. The first visit copies titles from the task file. Later creates, edits, and deletes store the fields that changed.
- **Chart.js stays in the dashboard chunk.** The charts import it as a normal dependency, so it is not part of the first bundle.
- **Angular Material and CDK.** Dialogs, snack bars, and drag-and-drop come from Material and the CDK. PrimeNG is not used.
- **No Zone.js.** Change detection is `OnPush`. Async work updates a signal, which schedules a check. Components do not subscribe in the template for display.

## Setup

```bash
npm install
npm start
```

Open `http://localhost:4200/`. The dev server reloads when a file changes.

`npm install` also installs Husky and the pre-commit hook.

To regenerate the mock JSON, including fresh dates:

```bash
npm run generate-data
```

The file shapes are described in `DATA_README.md`.

### Add a language

Copy `public/i18n/en.json` to a new file such as `fr.json`, translate the values, and add one entry to `public/i18n/languages.json`. The first entry is the fallback. A language with `"direction": "rtl"` switches the page to right-to-left.

## Environment

There is no `.env` file and no secret configuration. The app does not call a remote API.

| Source                                     | What it configures                  |
| ------------------------------------------ | ----------------------------------- |
| `public/data/tasks.json`                   | Tasks loaded on each visit          |
| `public/data/statistics.json`              | The four dashboard cards            |
| `public/i18n/`                             | Languages and copy                  |
| `localStorage` key `task-manager.language` | The last chosen language            |
| `localStorage` key `task-activity`         | Activity history, newest 30 entries |

`ng serve` uses the development build. `ng build` uses the production configuration, with hashed file names and the size budgets in `angular.json`.

## Scripts

| Command                 | What it does                                           |
| ----------------------- | ------------------------------------------------------ |
| `npm start`             | Dev server at `http://localhost:4200/`                 |
| `npm run build`         | Production build in `dist/task-manager/browser`        |
| `npm run watch`         | Development build that rebuilds on change              |
| `npm test`              | Unit tests in watch mode                               |
| `npm run test:ci`       | Unit tests once, with coverage. Minimum 80%            |
| `npm run lint`          | ESLint for `src` TypeScript and HTML                   |
| `ng lint --fix`         | Apply the lint fixes ESLint can make                   |
| `npm run format`        | Prettier for the project                               |
| `npm run format:check`  | Check formatting without writing files                 |
| `npm run lighthouse`    | Production build, then Lighthouse. Run this on its own |
| `npm run generate-data` | Write new task and statistics JSON under `public/data` |

The pre-commit hook runs `lint-staged` on staged files only:

- `.ts` and `.html`: ESLint `--fix`, then Prettier
- `.scss`, `.json`, and `.md`: Prettier

If a file cannot be fixed, the commit stops.

## Design patterns and state

Each feature owns its page. Shared task types live in `src/app/shared/types`. Services that the whole app uses are `providedIn: 'root'` and injected with `inject()`.

| State                                        | Owner                         | Lifetime                                                              |
| -------------------------------------------- | ----------------------------- | --------------------------------------------------------------------- |
| Loaded tasks and statistics                  | `Apis`                        | Until refresh. Edits overlay the loaded file.                         |
| Board order after a drag                     | `TaskBoard`                   | Until refresh or a tasks retry                                        |
| Header search text                           | `TaskSearch`                  | Until refresh. The field is shown only on `/tasks`.                   |
| Activity rows                                | `ActivityLog`                 | `localStorage`, across refreshes                                      |
| Language and dictionary                      | `I18nService`                 | Language choice is stored. The dictionary is loaded again each visit. |
| Open menus, the activity row, and form state | The component that shows them | While that view is open                                               |

Filters on the board combine. A task is shown only when status, priority, assignee, and the search text all match. Search checks the title and description.

The task dialog uses a reactive form. Title, due date, and assignee are required. A due date before today is rejected. Delete asks for confirmation in a Material dialog and returns focus to the button that opened it.

Lists use `@for` with a stable id. Templates use `@if` and read signals directly.

## Testing

Vitest runs through `ng test`. Specs cover:

- the shell, language switching, and axe-core on the rendered shell (`app.spec.ts`)
- task parsing and the in-memory task API
- activity history, including a change that survives a new log
- the team page, including axe-core, task counts, and assigning a task

`npm run test:ci` fails when statements, branches, functions, or lines drop below 80%. Coverage is written as a text summary, HTML, and lcov.

Accessibility is part of the unit tests. The shell and team specs run axe-core. A new violation fails the test. Lighthouse is separate: `npm run lighthouse` builds the production app, serves it with gzip, and checks Performance, Accessibility, Best Practices, and SEO. Each score must stay above 90.

## Performance

- Feature routes are lazy. Chart.js is imported only by the dashboard charts.
- Components use `OnPush`. Local state is a signal, so a change checks that view instead of the whole tree.
- Zone.js is not included.
- Repeat GET responses are cached in an HTTP interceptor. Retry clears that URL before loading again.
- The production build hashes files. The Lighthouse server sends long-lived cache headers for those files and gzip for text and JSON.
- `angular.json` warns when the initial bundle passes 500 kB and when one component stylesheet passes 4 kB.
- Inter is a local `woff2` font with `font-display: swap`. No font stylesheet is loaded from another origin.
- Animations are short. `prefers-reduced-motion` reduces them to a single instant frame, and the charts skip their draw animation.

The dashboard statistic cards and charts keep their skeleton for one second so the loading state is visible, then the content eases in.

## Known limitations

- A refresh drops creates, edits, deletes, and drag order. The activity list remains.
- Statistic cards come from `statistics.json`. They do not change when a task is edited in the session. The charts do, because they count the live task list.
- The first activity rows copied from the task file have no field-by-field details. Changes made after that visit do.
- Activity history is capped at 30 entries and exists only in that browser.
- Analytics and Settings are empty routes.
- Calendar is an activity feed, not a month view.
- The team list is the people assigned to the loaded tasks. Someone with no task does not appear.
- The account control only switches language. There is no authentication.

## Future improvements

- Persist tasks and drag order through a real API.
- Derive the dashboard statistics from the live task list.
- Save field details for the activity rows created on the first visit.
- Replace the Calendar feed with a month or week view, and build the Analytics and Settings screens.
- Add authentication if more than one person should share a task list.
