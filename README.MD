# vMix Web Replay

A touch-friendly replay tagging app for live production with **React + Vite** frontend and an **Express bridge** that sends commands to the vMix HTTP API.

## What this app does

- Tag highlights with one tap (by sport preset).
- Select **Home/Away** side and include that in replay labels.
- Control whether **Cam 2** is included on each event.
- Trigger manual short/long highlights.
- Play or stop a configured replay reel.
- Save vMix host/IP from the UI (persisted to `vmix-host.config.json`).

## Architecture

- **Frontend**: Vite + React (`src/App.jsx`)
- **Backend bridge**: Express (`server.js`)
- **vMix integration**: Backend calls `http://<VMIX_HOST>:<VMIX_PORT>/api/?Function=...`

In development, Vite proxies `/api/*` and `/health` to the backend.

---

## Requirements

- Node.js 18+ (recommended)
- npm
- vMix instance reachable on your network with API enabled (default port `8088`)

---

## Installation

```bash
npm install
```

---

## Run in development

Starts both backend and frontend:

```bash
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:5000`
- Backend health: `http://localhost:3001/health`

> Note: `npm run dev` uses `concurrently` to run both services in one command.

---

## Run in production-style mode

Build frontend assets and serve everything through Express:

```bash
npm run build
npm start
```

If the frontend build is missing, the server returns a `503` with guidance.

---

## Configuration

### Environment variables

| Variable | Default | Description |
|---|---:|---|
| `PORT` | `3001` | Express server port |
| `VMIX_HOST` | `VMIX-PC` | Initial vMix hostname/IP |
| `VMIX_PORT` | `8088` | vMix API port |
| `HIGHLIGHTS_LIST` | `1` | Primary replay events list used for highlight creation |
| `DUPLICATE_HIGHLIGHTS_LIST` | `2` | Secondary list for duplicate high-value tags |
| `REEL_PLAY_LIST` | `2` | Events list selected when pressing “Play Reel” |
| `CAM_A` | `1` | Camera index used as Cam 1 (hero) |
| `CAM_B` | `2` | Camera index used as Cam 2 (wide) |
| `AUTH_TOKEN` | _(empty)_ | Optional bearer token required on protected API routes |
| `VITE_BRIDGE_BASE` | _(empty)_ | Optional frontend base URL for API calls |
| `VITE_AUTH_TOKEN` | _(empty)_ | Optional frontend bearer token for the bridge |

### vMix host persistence

When you save the vMix host from the UI, the backend writes to:

- `vmix-host.config.json`

This value overrides the initial `VMIX_HOST` environment variable on startup.

---

## API endpoints

### `GET /health`
Returns bridge health/config metadata.

### `GET /api/config/vmix`
Gets current vMix host + port.

### `POST /api/config/vmix`
Sets and persists vMix host.

Request body:

```json
{ "vmixHost": "192.168.1.50" }
```

### `POST /api/highlight`
Creates one highlight event.

Request body:

```json
{
  "seconds": 7,
  "side": "H",
  "tag": "TD",
  "camsMode": "A_BOTH",
  "camBEnabled": true
}
```

Validation rules:

- `seconds` must be `5`, `7`, or `10`
- `side` must be `"H"` or `"A"`
- `camsMode` must be `"A_ONLY"` or `"A_BOTH"`
- `camBEnabled` must be boolean

### `POST /api/reel/play`
Selects `REEL_PLAY_LIST` and plays all events to replay output channel B.

### `POST /api/reel/stop`
Stops replay output on channel B.

> If `AUTH_TOKEN` is set, all `/api/*` endpoints require `Authorization: Bearer <token>`.

---

## UI behavior notes

- Sport presets control short/long durations:
  - General: 5/7
  - Football: 7/10
  - MMA: 5/7
- Tag buttons send one request per tap.
- Event labels are formatted like:
  - `H • TD`
  - `A • BIG PLAY • CAM2`

Certain tags are duplicated to the secondary highlights list by default:

- `SCORE`, `GOAL`, `BIG PLAY`, `TD`, `3PT`, `DUNK`

---

## Useful checks

```bash
npm run build
curl http://localhost:3001/health
```

---

## Project structure

```text
.
├── server.js
├── src/
│   ├── App.jsx
│   ├── App.css
│   └── main.jsx
├── vite.config.js
├── vmix-host.config.json
└── README.MD
```
