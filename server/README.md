# 4DTasks API (Node.js + Express + SQLite)

Delegation backend for the in-app "Delegated to me" flow.

## Setup

```bash
cd server && npm install
```

Copy `server/.env.example` to `server/.env` and set `PORT`, `FRONTEND_ORIGIN`, and optionally `DB_PATH`.

## Run

From repo root:

```bash
npm run server
```

Or from `server/`:

```bash
npm start
```

Server listens on `http://localhost:3001` (or `PORT`). Health: `GET /health`.

## Frontend

Set `VITE_API_URL=http://localhost:3001` in the project root `.env` (see root `.env.example`) so the frontend can call this API.
