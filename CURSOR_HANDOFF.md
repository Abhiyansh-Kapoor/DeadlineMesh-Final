# DeadlineMesh final copy — Cursor handoff

## User goal

Finish an accessible, deployable six-feature class project while keeping the **early Windows / Windows 95–2000** visual style of the user's reference image: blue title bars, grey desktop, square beveled windows and controls. The professor will use the WAVE extension. Keep visible text readable (normally 16px or more), semantic landmarks/headings, labels, text errors and keyboard access. Visible task/dependency labels must use **names, never database IDs such as #5/#6**.

## Repositories and local app

- Working copy: `C:\Users\abhiy\OneDrive\Desktop\College\WT\Project\DeadlineMesh-Final`
- User's public GitHub repo: https://github.com/Abhiyansh-Kapoor/DeadlineMesh-Final
- Teammate's original repo, preserved as `upstream`: https://github.com/aarav2pf/DeadlineMesh
- Original local copy `DeadlineMesh` is untouched.
- Final local PostgreSQL database: `deadlinemesh_final`; local `server/.env` is ignored by Git and contains credentials. **Do not print, commit, or copy its contents.**
- Production-style server was started from `server` with `npm run start` on http://localhost:5001. It serves `client/dist`; rebuild to see new source changes.
- Demo account exists in this local database: `demo@deadlinemesh.local` / `DemoPass2026!` (test-only). The sample project has six tasks, branches, blocked work, and a 9-day critical path.

## Completed and verified before latest style edit

- Independent copy, checked-in schema and database init command.
- React UI rewritten with Tasks, Dependencies, interactive Timeline, Critical Path & Risk, and What-if Simulation sections.
- Task form uses named prerequisite checkboxes. No visible `#id` labels.
- Native edit dialog has visible sticky Cancel/Save actions. A circular dependency error was verified in the dialog as text; Cancel remained usable.
- API PostgreSQL DATE parser keeps YYYY-MM-DD dates stable across time zones. Local hardcoded SSL setting removed.
- Express serves built client in production; client uses relative `/api` and Vite dev proxy.
- Dockerfile, compose.yaml and README added. `docker compose config --quiet` passed. Docker daemon was off, so container runtime was **not** tested.
- `npm run check` passed with no lint warnings before latest style edit. `npm run test:smoke` passed against local production server: auth, CRUD, ownership, dependencies/cycle rejection, blocked status, CPM, simulation non-persistence, dates and page serving.
- Commit `e01c21e` was pushed to the user's public repo and verified. Git working tree was clean at that moment.

## Latest uncommitted change (user correction)

The user rejected the modern card styling and asked for the early Windows look. The latest edits changed brand text and appended a classic Windows CSS theme in `client/src/styles/global.css`. **These edits are not yet rebuilt, visually checked, committed or pushed.** Complete those steps first so GitHub matches the user's requested style. The currently open production page may still show the previous build until `npm run build`.

## Immediate next steps

1. Run `npm run check` from the root. Fix any build/lint errors.
2. Rebuild and inspect the production UI at http://localhost:5001, especially dashboard, task editor at a narrow viewport, dependency map and timeline. Keep Cancel visible in the dialog. Adjust classic theme only as needed.
3. Run `npm run test:smoke` once after changes. If the current production server is not running, start from `server` with `npm run start`; the local `server/.env` is already configured.
4. If possible, run WAVE or an accessibility audit on login, dashboard, project, and open task dialog. WAVE itself has **not** yet been run. Verify contrast, labels, heading order, keyboard focus, and no horizontal page overflow. Do not claim a WAVE pass without running it.
5. Review `git status`, ensure `server/.env` and demo credentials are not staged, then commit and push to `origin main`. Verify the remote head.

## Notes and limitations

- GitHub currently shares source code, not a live hosted backend. A full web deployment needs an app host and PostgreSQL; GitHub Pages alone cannot run the Express API.
- The timeline schedules calendar dates from task start dates and prerequisites. CPM calculates relative day offsets from durations/dependencies; it does not incorporate project deadline or calendar start dates. Priority is a label and blocked badges are informational.
- The user's evaluation image lists semantic HTML, h1→h2→h3 headings, WCAG AA contrast, minimum 16px body text, appropriate alt text, explicit labels, text errors, instructions and keyboard access.
- The latest classic CSS theme was appended as an override block. If refining it, keep the appearance but consider consolidating duplicate rules.
