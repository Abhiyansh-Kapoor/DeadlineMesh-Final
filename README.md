# DeadlineMesh

A project planning app with six core features: project and task management, dependency validation, an interactive timeline, critical path analysis, blocked work and schedule risk, and what-if delay simulation.

The browser client is React/TypeScript. The API is Express/TypeScript. PostgreSQL stores users, projects, tasks and dependency links. The API rejects self-dependencies, cross-project prerequisites and cycles. A simulation recalculates the schedule without saving the hypothetical delay.

## Run locally

Requirements: Node.js 24 or newer and PostgreSQL 18 (or a compatible recent version).

1. Create an empty PostgreSQL database named `deadlinemesh_final`.
2. Copy `server/.env.example` to `server/.env`. Set `DATABASE_URL` and a long, random `JWT_SECRET`. Keep `server/.env` private.
3. From the repository root, run:

   ```powershell
   npm ci
   npm ci --prefix client
   npm ci --prefix server
   npm run db:init
   npm run dev
   ```

4. Open http://localhost:5174. The development client proxies `/api` to the server on port 5001.

## Production build

Run `npm run check`, then `npm run db:init` and `npm run start`. The Express server serves both the built client and API on `PORT` (5001 in the example). Set `DATABASE_URL`, `JWT_SECRET` and `PORT` in the server environment. For hosted PostgreSQL, configure SSL through the connection URL as required by the provider. Do not commit real credentials.

For a container deployment, create a root `.env` containing `POSTGRES_PASSWORD` and `JWT_SECRET`, then run `docker compose up --build`. The app is available at http://localhost:8080. If the password contains URL-special characters, URL-encode it in the connection string or choose a URL-safe password.

## Checks

- `npm run check`: lint and production build.
- `npm run test:smoke`: integration test against a running production server on port 5001. Override with `TEST_URL` if needed. It creates and deletes a disposable test project.
- `/api/health/db`: checks the database connection.

## Accessibility

The pages use semantic landmarks and heading order, explicit form labels, text error messages, keyboard-operable controls and a native modal dialog with visible Cancel and Escape support. The timeline bars have accessible names; the task list and dependency names remain available as text. The color palette targets WCAG AA contrast. Automated tools such as WAVE should be followed by a keyboard and screen reader check.

## Scheduling notes

The timeline uses each task's earliest chosen start date and waits for every prerequisite to finish. The critical path calculation reports relative day offsets based on task durations and dependencies. These are related views with different purposes; critical path does not yet use chosen calendar start dates or the target deadline. Priority is a label and does not change scheduling. Blocked badges are informational; users can still change a task's status.
