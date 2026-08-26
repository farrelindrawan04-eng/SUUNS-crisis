# SUUNS Crisis Engine

Web-based deterministic crisis simulation engine scaffold.

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

Override the bootstrap identity before the first startup with `CLEC_MASTER_USERNAME`, `CLEC_MASTER_PASSWORD`, and `CLEC_MASTER_DISPLAY_NAME`. The production profile requires all three variables and does not provide defaults.

## Frontend

Run it with:

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL, normally `http://localhost:5173`.

Requires Node.js and npm.

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
