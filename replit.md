# vMix Replay Bridge

## Overview
A web-based vMix Replay Controller with a React frontend and Express backend bridge. The frontend provides a touch-friendly UI for tagging highlights during live sports production. The backend forwards commands to a vMix instance's API.

## Project Architecture
- **Frontend**: React 18 + Vite, served on port 5000
- **Backend**: Express server (`server.js`) on port 3001, proxied via Vite's dev proxy
- **API Proxy**: Vite proxies `/api/*` and `/health` requests to the Express backend

## Key Files
- `src/App.jsx` - Main React component with highlight tagging UI
- `src/App.css` - Styling
- `src/main.jsx` - React entry point
- `server.js` - Express bridge server that calls vMix API
- `vite.config.js` - Vite config with proxy and host settings
- `index.html` - HTML entry point

## Environment Variables
- `VMIX_HOST` - vMix PC hostname/IP (default: "VMIX-PC")
- `VMIX_PORT` - vMix API port (default: "8088")
- `HIGHLIGHTS_LIST` - Highlight list index 0-19 (default: 1)
- `CAM_A` / `CAM_B` - Camera indices (default: 1, 2)
- `AUTH_TOKEN` - Optional auth token for the bridge API
- `VITE_BRIDGE_BASE` - Frontend bridge URL (defaults to same-origin proxy)
- `VITE_AUTH_TOKEN` - Frontend auth token

## Running
- `npm run dev` starts both the Express backend and Vite dev server concurrently
