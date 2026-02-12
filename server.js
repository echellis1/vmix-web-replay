import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

// ====== CONFIG ======
// Put your vMix PC hostname/IP here (or set VMIX_HOST env var).
const VMIX_HOST = process.env.VMIX_HOST || "VMIX-PC";
const VMIX_PORT = process.env.VMIX_PORT || "8088";

// Highlights list index (0-19). Using 1 per your plan.
const HIGHLIGHTS_LIST = Number(process.env.HIGHLIGHTS_LIST || 1);
const DUPLICATE_HIGHLIGHTS_LIST = Number(process.env.DUPLICATE_HIGHLIGHTS_LIST || 2);

const DUPLICATE_TAGS = new Set(["SCORE", "GOAL", "BIG PLAY", "TD", "3PT", "DUNK"]);

// Which vMix replay camera corresponds to A/B:
const CAM_A = Number(process.env.CAM_A || 1); // A = Hero
const CAM_B = Number(process.env.CAM_B || 2); // B = Wide

const VMIX_API_BASE = `http://${VMIX_HOST}:${VMIX_PORT}/api/`;

// Optional simple auth token for your LAN
const AUTH_TOKEN = process.env.AUTH_TOKEN || ""; // if blank, auth disabled

function requireAuth(req, res, next) {
  if (!AUTH_TOKEN) return next();
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (token !== AUTH_TOKEN) return res.status(401).json({ ok: false, error: "Unauthorized" });
  next();
}

async function vmixCall(Function, params = {}) {
  const url = new URL(VMIX_API_BASE);
  url.searchParams.set("Function", Function);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`vMix API error ${res.status}: ${text}`);
  }
  return true;
}

// Camera control for the LAST replay event
async function setLastEventCameras({ aOn = true, bOn = true }) {
  // A always on in your workflow
  if (aOn) await vmixCall("ReplayLastEventCameraOn", { Value: CAM_A });

  // Toggle wide on/off based on rule
  if (bOn) await vmixCall("ReplayLastEventCameraOn", { Value: CAM_B });
  else await vmixCall("ReplayLastEventCameraOff", { Value: CAM_B });
}

async function markHighlight({ seconds, side, tag, camsMode, camBEnabled = true }) {
  // 1) Ensure the primary highlights list is selected before creating the event
  await vmixCall(`ReplaySelectEvents${HIGHLIGHTS_LIST}`, { Channel: "A" });

  // 2) Create event (last N seconds)
  await vmixCall("ReplayMarkInOut", { Value: seconds });

  // 3) Apply camera rule (A=Hero, B=Wide)
  const bOn = camsMode === "A_BOTH" && camBEnabled;
  await setLastEventCameras({ aOn: true, bOn });

  // 4) Label (e.g., "H • TD")
  const label = `${side} • ${tag}`;
  await vmixCall("ReplaySetLastEventText", { Value: label });

  // 5) Duplicate selected high-value tags to list 2 (or env-configured duplicate list)
  if (!DUPLICATE_TAGS.has(tag) || DUPLICATE_HIGHLIGHTS_LIST === HIGHLIGHTS_LIST) return;

  await vmixCall(`ReplaySelectEvents${DUPLICATE_HIGHLIGHTS_LIST}`, { Channel: "A" });
  await vmixCall("ReplayMarkInOut", { Value: seconds });
  await setLastEventCameras({ aOn: true, bOn });
  await vmixCall("ReplaySetLastEventText", { Value: label });

  // Keep list 1 selected and re-assert the original event label so it remains tagged.
  await vmixCall(`ReplaySelectEvents${HIGHLIGHTS_LIST}`, { Channel: "A" });
  await vmixCall("ReplaySetLastEventText", { Value: label });
}

app.get("/health", async (_req, res) => {
  // lightweight: just report config; doesn't call vMix
  res.json({
    ok: true,
    vmix: VMIX_API_BASE,
    highlightsList: HIGHLIGHTS_LIST,
    duplicateHighlightsList: DUPLICATE_HIGHLIGHTS_LIST,
    camA: CAM_A,
    camB: CAM_B,
    authEnabled: Boolean(AUTH_TOKEN),
  });
});

// Main endpoint: one request = one highlight
app.post("/api/highlight", requireAuth, async (req, res) => {
  try {
    const { seconds, side, tag, camsMode, camBEnabled = true } = req.body || {};

    if (![5, 7, 10].includes(Number(seconds))) {
      return res.status(400).json({ ok: false, error: "seconds must be 5, 7, or 10" });
    }
    if (!["H", "A"].includes(side)) {
      return res.status(400).json({ ok: false, error: 'side must be "H" or "A"' });
    }
    if (typeof tag !== "string" || !tag.trim()) {
      return res.status(400).json({ ok: false, error: "tag is required" });
    }
    if (!["A_ONLY", "A_BOTH"].includes(camsMode)) {
      return res.status(400).json({ ok: false, error: 'camsMode must be "A_ONLY" or "A_BOTH"' });
    }
    if (typeof camBEnabled !== "boolean") {
      return res.status(400).json({ ok: false, error: "camBEnabled must be a boolean" });
    }

    await markHighlight({
      seconds: Number(seconds),
      side,
      tag: tag.trim(),
      camsMode,
      camBEnabled,
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Play the highlight reel (list 1) to Output on Channel A
app.post("/api/reel/play", requireAuth, async (_req, res) => {
  try {
    // Select highlight list
    await vmixCall(`ReplaySelectEvents${HIGHLIGHTS_LIST}`, { Channel: "A" });
    // Play all to output
    await vmixCall("ReplayPlayAllEventsToOutput", { Channel: "A" });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Optional: Stop replay output
app.post("/api/reel/stop", requireAuth, async (_req, res) => {
  try {
    await vmixCall("ReplayStop", { Channel: "A" });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.use(express.static(path.join(__dirname, "dist")));
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost";
app.listen(PORT, HOST, () => {
  console.log(`vMix Replay Bridge running on http://${HOST}:${PORT}`);
  console.log(`Using vMix API: ${VMIX_API_BASE}`);
});
