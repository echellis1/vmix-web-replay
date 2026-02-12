import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const SPORT_PRESETS = {
  GENERAL: { short: 5, long: 7 },
  FOOTBALL: { short: 7, long: 10 },
};

// Tag definitions: choose whether tag defaults to A only or A+B and short/long
const TAGS = [
  // Scoring / finishes (A-only looks best with Hero)
  { tag: "SCORE", len: "long", cams: "A_ONLY" },
  { tag: "GOAL", len: "long", cams: "A_ONLY" },
  { tag: "3PT", len: "long", cams: "A_ONLY" },
  { tag: "DUNK", len: "long", cams: "A_ONLY" },
  { tag: "FINISH", len: "long", cams: "A_ONLY" },

  // Defense / chaos (A+B for context)
  { tag: "BLOCK", len: "short", cams: "A_BOTH" },
  { tag: "STEAL", len: "short", cams: "A_BOTH" },
  { tag: "SAVE", len: "short", cams: "A_BOTH" },
  { tag: "HIT", len: "short", cams: "A_BOTH" },
  { tag: "TURNOVER", len: "short", cams: "A_BOTH" },

  // Football-specific (works in GENERAL too, just uses preset lengths)
  { tag: "TD", len: "long", cams: "A_BOTH" },
  { tag: "INT", len: "long", cams: "A_BOTH" },
  { tag: "FUMBLE", len: "long", cams: "A_BOTH" },
  { tag: "SACK", len: "short", cams: "A_ONLY" }, // tight hero is usually great
  { tag: "BIG PLAY", len: "long", cams: "A_BOTH" },
];

function cls(...parts) {
  return parts.filter(Boolean).join(" ");
}

const BRIDGE_BASE = import.meta.env.VITE_BRIDGE_BASE || "";
const AUTH_TOKEN = import.meta.env.VITE_AUTH_TOKEN || "";

async function apiRequest(path, options = {}) {
  const res = await fetch(`${BRIDGE_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

async function apiPost(path, body) {
  return apiRequest(path, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export default function App() {
  const [sport, setSport] = useState("GENERAL");
  const [side, setSide] = useState("H"); // H=Home, A=Away
  const [busy, setBusy] = useState(false);
  const [camBEnabled, setCamBEnabled] = useState(true);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [vmixHost, setVmixHost] = useState("");
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [reelStatus, setReelStatus] = useState({ isPlaying: null, remainingMs: null });
  const inFlightRef = useRef(false);

  const preset = SPORT_PRESETS[sport];

  useEffect(() => {
    let mounted = true;

    async function loadConfig() {
      setError("");
      try {
        const data = await apiRequest("/api/config/vmix");
        if (mounted) setVmixHost(data.vmixHost || "");
      } catch (e) {
        if (mounted) setError(`❌ ${e.message}`);
      } finally {
        if (mounted) setLoadingConfig(false);
      }
    }

    loadConfig();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadReelStatus() {
      try {
        const data = await apiRequest("/api/reel/status");
        if (!mounted) return;
        setReelStatus({
          isPlaying: typeof data.isPlaying === "boolean" ? data.isPlaying : null,
          remainingMs: Number.isFinite(data.remainingMs) ? data.remainingMs : null,
        });
      } catch {
        if (mounted) {
          setReelStatus({ isPlaying: null, remainingMs: null });
        }
      }
    }

    loadReelStatus();
    const id = setInterval(loadReelStatus, 500);

    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const groupedTags = useMemo(() => {
    // Put football-ish tags later; keep it simple
    return TAGS;
  }, []);

  async function run(fn) {
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    setError("");
    setToast("");
    setBusy(true);
    try {
      await fn();
      setToast("✅ Sent to vMix");
    } catch (e) {
      setError(`❌ ${e.message}`);
    } finally {
      setBusy(false);
      inFlightRef.current = false;
      setTimeout(() => setToast(""), 1200);
    }
  }

  async function saveVmixHost() {
    if (!vmixHost.trim()) {
      setError("❌ vMix IP/hostname is required");
      return;
    }

    setError("");
    setToast("");
    setSavingConfig(true);
    try {
      const data = await apiPost("/api/config/vmix", { vmixHost: vmixHost.trim() });
      setVmixHost(data.vmixHost);
      setToast("✅ vMix host saved");
    } catch (e) {
      setError(`❌ ${e.message}`);
    } finally {
      setSavingConfig(false);
      setTimeout(() => setToast(""), 1500);
    }
  }

  function resolveSeconds(len) {
    return len === "short" ? preset.short : preset.long;
  }

  function resolveCamsLabel(camsMode) {
    if (camsMode === "A_ONLY" || !camBEnabled) return "A only";
    return "A+B";
  }

  function formatRemaining(ms) {
    if (!Number.isFinite(ms) || ms < 0) return null;
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return (
    <div className="wrap">
      <header className="header">
        <div>
          <div className="title">vMix Replay Controller</div>
          <div className="sub">A = Hero • B = Wide • Highlights → List 1</div>
        </div>

        <div className="status">
          <span className="pill">Bridge: {BRIDGE_BASE}</span>
          <span className="pill">vMix: {loadingConfig ? "Loading..." : vmixHost || "Not set"}</span>
          <span className={cls("pill", sport === "FOOTBALL" && "pill-accent")}>
            Preset: {sport === "FOOTBALL" ? "Football (7/10)" : "General (5/7)"}
          </span>
          <span className={cls("pill", side === "H" ? "pill-home" : "pill-away")}>
            Side: {side === "H" ? "HOME" : "AWAY"}
          </span>
          <span className={cls("pill", camBEnabled ? "pill-accent" : "")}>Cam B: {camBEnabled ? "ON" : "OFF"}</span>
          <span className={cls("pill", reelStatus.isPlaying && "pill-live")}>
            Reel: {reelStatus.isPlaying ? (formatRemaining(reelStatus.remainingMs) ? `${formatRemaining(reelStatus.remainingMs)} left` : "Playing…") : "Idle"}
          </span>
        </div>
      </header>

      <div className="grid">
        <section className="panel">
          <h2>Sticky Controls</h2>

          <div className="vmixConfig">
            <label className="configLabel" htmlFor="vmix-host-input">
              vMix PC IP / Hostname
            </label>
            <div className="row configRow">
              <input
                id="vmix-host-input"
                className="hostInput"
                type="text"
                placeholder="e.g. 192.168.1.25"
                value={vmixHost}
                disabled={busy || loadingConfig || savingConfig}
                onChange={(e) => setVmixHost(e.target.value)}
              />
              <button className="btn configSave" disabled={busy || loadingConfig || savingConfig} onClick={saveVmixHost}>
                {savingConfig ? "Saving..." : "Save Host"}
              </button>
            </div>
          </div>

          <div className="row">
            <button
              className={cls("btn", sport === "GENERAL" && "btn-on")}
              disabled={busy}
              onClick={() => setSport("GENERAL")}
            >
              General (5/7)
            </button>
            <button
              className={cls("btn", sport === "FOOTBALL" && "btn-on")}
              disabled={busy}
              onClick={() => setSport("FOOTBALL")}
            >
              Football (7/10)
            </button>
          </div>

          <div className="row">
            <button
              className={cls("btn", side === "H" && "btn-on", "btn-home")}
              disabled={busy}
              onClick={() => setSide("H")}
            >
              HOME
            </button>
            <button
              className={cls("btn", side === "A" && "btn-on", "btn-away")}
              disabled={busy}
              onClick={() => setSide("A")}
            >
              AWAY
            </button>
          </div>

          <div className="row">
            <button className={cls("btn", camBEnabled && "btn-on")} disabled={busy} onClick={() => setCamBEnabled(true)}>
              Cam B On
            </button>
            <button className={cls("btn", !camBEnabled && "btn-on")} disabled={busy} onClick={() => setCamBEnabled(false)}>
              Cam B Off
            </button>
          </div>

          <div className="row">
            <button
              className="btn btn-secondary"
              disabled={busy}
              onClick={() =>
                run(() =>
                  apiPost("/api/highlight", {
                    seconds: preset.short,
                    side,
                    tag: "MANUAL",
                    camsMode: "A_BOTH",
                    camBEnabled,
                  })
                )
              }
            >
              Manual Short (+{preset.short})
            </button>

            <button
              className="btn btn-secondary"
              disabled={busy}
              onClick={() =>
                run(() =>
                  apiPost("/api/highlight", {
                    seconds: preset.long,
                    side,
                    tag: "MANUAL",
                    camsMode: "A_BOTH",
                    camBEnabled,
                  })
                )
              }
            >
              Manual Long (+{preset.long})
            </button>
          </div>

          <div className="row">
            <button className="btn btn-play" disabled={busy} onClick={() => run(() => apiPost("/api/reel/play"))}>
              ▶ Play Reel
            </button>
            <button className="btn btn-stop" disabled={busy} onClick={() => run(() => apiPost("/api/reel/stop"))}>
              ■ Stop
            </button>
          </div>

          {toast && <div className="toast ok">{toast}</div>}
          {error && <div className="toast err">{error}</div>}
        </section>

        <section className="panel">
          <h2>Highlight Tags (one tap)</h2>

          <div className="taggrid">
            {groupedTags.map((t) => {
              const secs = resolveSeconds(t.len);
              return (
                <button
                  key={t.tag}
                  type="button"
                  className="tag"
                  disabled={busy}
                  onClick={() =>
                    run(() =>
                      apiPost("/api/highlight", {
                        seconds: secs,
                        side,
                        tag: t.tag,
                        camsMode: t.cams,
                        camBEnabled,
                      })
                    )
                  }
                >
                  <div className="tagTitle">{t.tag}</div>
                  <div className="tagMeta">
                    +{secs}s • {resolveCamsLabel(t.cams)}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="hint">
            Tip: Edit <code>TAGS</code> to match your sports and preferred lengths.
          </div>
        </section>
      </div>
    </div>
  );
}
