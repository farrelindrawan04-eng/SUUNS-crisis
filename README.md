# SUUNS Crisis Engine

Web-based deterministic crisis simulation engine scaffold.

## One-command local use

From the project root:

```bash
./suuns start
./suuns status
./suuns stop
```

Use `./suuns restart` after rebuilding, `./suuns logs` to inspect recent backend and frontend output, and
`./suuns history` to see the local start/stop history.

## Shape

```text
backend/
  Java + Spring Boot REST API
  OOP simulation domain

frontend/
  React + Vite web UI
  Fetches simulation state from the backend
```

## Backend

The original recursive economy demo remains available at `/api/simulation`. The crisis engine persistence foundation exposes:

- `POST /api/crisis/sessions` creates a durable session and tick-zero snapshot
- `GET /api/crisis/sessions/{sessionId}` returns its latest state
- `POST /api/crisis/sessions/{sessionId}/policies` submits a delayed, duration-bound policy
- `POST /api/crisis/sessions/{sessionId}/events` schedules a crisis event
- `POST /api/crisis/sessions/{sessionId}/ticks` advances and atomically commits one tick

Run it with:

```bash
gradle :backend:bootRun
```

Requires Java 11+ and Gradle.

The default `dev` profile uses an embedded H2 database at `data/clec` when launched from the project root. The `production` profile uses PostgreSQL and expects `DATABASE_URL`, `DATABASE_USERNAME`, and `DATABASE_PASSWORD`.

## Staff Authentication

The API uses server-side sessions, an HTTP-only `JSESSIONID` cookie, BCrypt password hashes, and CSRF protection. There is no public signup.

On an empty development database, the bootstrap master account is:

```text
username: master
password: master-change-me
```

The master can open **Manage staff** and create staff accounts. Staff accounts can use the simulator but cannot list or create accounts.

Staff and master accounts can also open the **Directive management** workspace for the active session. It supports delegate profile creation, card-based action tracking, status management, and threaded responses. Delegate accounts sign into the same web application and land on a dedicated desk where they can submit directives and reply to staff. Both feeds refresh every four seconds.

Delegate operations endpoints:

- `GET|POST /api/operations/sessions/{sessionId}/delegates`
- `GET /api/operations/sessions/{sessionId}/directives`
- `PUT /api/operations/directives/{directiveId}/status`
- `POST /api/operations/directives/{directiveId}/responses`
- `GET|POST /api/operations/delegate/directives`
- `POST /api/operations/delegate/directives/{directiveId}/messages`

### Public situation feed

Staff can create persistent situation cards as drafts or publish them to every authenticated delegate in the
session. Cards have a category, severity, lifecycle (`DRAFT`, `PUBLISHED`, `ARCHIVED`), author, and timestamps.
Published changes are pushed immediately over server-sent events at
`GET /api/feed/sessions/{sessionId}/stream`; reconnecting clients restore the feed from the REST endpoint.

Override the bootstrap identity before the first startup with `CLEC_MASTER_USERNAME`, `CLEC_MASTER_PASSWORD`, and `CLEC_MASTER_DISPLAY_NAME`. The production profile requires all three variables and does not provide defaults.

## Frontend

Run it with:

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL, normally `http://localhost:5173`.

The active simulation ID is retained in browser storage across sign-out so staff can reconnect to the
same persisted session after using a delegate account. **Choose another track** intentionally clears that
selection; it does not delete the database session.

Requires Node.js and npm.

## Packaged deployment

The repository includes production containers for PostgreSQL, Spring Boot, and the Nginx-served React client.
Nginx proxies `/api` to Spring, including the server-sent event feed, so production browser traffic stays
same-origin.

```bash
cp .env.example .env
# Replace every placeholder secret in .env, then:
docker compose up --build
```

Open `http://localhost:8088` by default. Set `SUUNS_PORT` and `CLEC_ALLOWED_ORIGIN` together when exposing a
different origin. PostgreSQL data is retained in the named `suuns-postgres` volume.

## Current Crisis Model

- Nine bounded public indicators and eight hidden variables are represented explicitly.
- Session and tick metadata are relational records.
- Full engine state is stored as a JSON snapshot with a SHA-256 hash.
- Tick zero, its snapshot, and the session are created in one transaction.
- Policy actions and events activate on explicit tick ranges.
- Each advance follows the specification's 12-stage order and writes an ordered causal ledger.
- Resource commitments are charged once, on the policy's activation tick.
- Flyway owns the schema for both H2 development and PostgreSQL production.

The current numerical effects are conservative provisional coefficients intended to exercise the engine. They must be moved into scenario configuration and calibrated before the model is treated as authoritative.

Example policy body:

```json
{
  "actionType": "LIQUIDITY_SUPPORT",
  "authority": "Central Bank",
  "scale": 1.0,
  "resourceCommitment": 2.0,
  "credibility": 0.9,
  "coverage": 0.8,
  "implementationDelay": 1,
  "duration": 3,
  "sourceDirectiveId": "directive-001"
}
```

Example event body:

```json
{
  "eventType": "BANK_RUN",
  "magnitude": 1.0,
  "delay": 0,
  "duration": 2,
  "description": "Elevated retail withdrawals"
}
```
