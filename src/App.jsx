import { useMemo, useState } from "react";
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

async function apiPost(path, body) {
  const res = await fetch(`${BRIDGE_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export default function App() {
  const [sport, setSport] = useState("GENERAL");
  const [side, setSide] = useState("H"); // H=Home, A=Away
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  const preset = SPORT_PRESETS[sport];

  const groupedTags = useMemo(() => {
    // Put football-ish tags later; keep it simple
    return TAGS;
  }, []);

  async function run(fn) {
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
      setTimeout(() => setToast(""), 1200);
    }
  }

  function resolveSeconds(len) {
    return len === "short" ? preset.short : preset.long;
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
          <span className={cls("pill", sport === "FOOTBALL" && "pill-accent")}>
            Preset: {sport === "FOOTBALL" ? "Football (7/10)" : "General (5/7)"}
          </span>
          <span className={cls("pill", side === "H" ? "pill-home" : "pill-away")}>
            Side: {side === "H" ? "HOME" : "AWAY"}
          </span>
        </div>
      </header>

      <div className="grid">
        <section className="panel">
          <h2>Sticky Controls</h2>

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
                  })
                )
              }
            >
              Manual Long (+{preset.long})
            </button>
          </div>

          <div className="row">
            <button
              className="btn btn-play"
              disabled={busy}
              onClick={() => run(() => apiPost("/api/reel/play"))}
            >
              ▶ Play Reel
            </button>
            <button
              className="btn btn-stop"
              disabled={busy}
              onClick={() => run(() => apiPost("/api/reel/stop"))}
            >
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
                  className="tag"
                  disabled={busy}
                  onClick={() =>
                    run(() =>
                      apiPost("/api/highlight", {
                        seconds: secs,
                        side,
                        tag: t.tag,
                        camsMode: t.cams,
                      })
                    )
                  }
                >
                  <div className="tagTitle">{t.tag}</div>
                  <div className="tagMeta">
                    +{secs}s • {t.cams === "A_ONLY" ? "A only" : "A+B"}
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
