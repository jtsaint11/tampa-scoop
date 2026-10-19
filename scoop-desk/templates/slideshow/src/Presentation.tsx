import { useConvexConnectionState, useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { controlStyles } from "@/components/controlStyles";
import { Alert, Button } from "@/ui";
import { api } from "../convex/_generated/api";
import { Slide } from "../presentation/Slide";
import "./slideshow.css";

function ErrorNotice({ message }: { message: string }) {
  return (
    <Alert className="text-destructive">
      <p>{message}</p>
    </Alert>
  );
}

function StartPresentation() {
  const start = useMutation(api.presentations.start);
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const pending = useRef<Promise<string> | null>(null);
  const connected = useConvexConnectionState().isWebSocketConnected;
  useEffect(() => {
    if (!connected) return;
    let active = true;
    // Reuse the request across StrictMode effect replay and reconnects.
    pending.current ??= (async () => {
      const controller = crypto.randomUUID();
      sessionStorage.setItem("slideshow:storage-check", "1");
      const sessionId = await start({ controller });
      sessionStorage.setItem(`slideshow:${sessionId}`, controller);
      return sessionId;
    })();
    void pending.current.then(
      sessionId => {
        if (active)
          navigate(
            `/dashboard?session=${encodeURIComponent(sessionId)}&mode=present`,
            {
              replace: true,
            },
          );
      },
      err => {
        if (active)
          setError(
            err instanceof Error ? err.message : "Could not start presentation",
          );
      },
    );
    return () => {
      active = false;
    };
  }, [attempt, connected, navigate, start]);
  return error ? (
    <section className="slideshow-unavailable">
      <ErrorNotice message={error} />
      <Button
        className={controlStyles.primaryButton}
        disabled={!connected}
        onClick={() => {
          pending.current = null;
          setError("");
          setAttempt(value => value + 1);
        }}
      >
        Retry
      </Button>
    </section>
  ) : (
    <p role="status">{connected ? "Opening presentation…" : "Connecting…"}</p>
  );
}

function Notes({ lines }: { lines: string[] }) {
  return (
    <ul>
      {lines.map((line, index) => (
        <li key={`${index}:${line}`}>
          {line
            .split(/(\*\*.*?\*\*)/g)
            .map((part, i) =>
              part.startsWith("**") && part.endsWith("**") ? (
                <strong key={`${i}:${part}`}>{part.slice(2, -2)}</strong>
              ) : (
                part
              ),
            )}
        </li>
      ))}
    </ul>
  );
}

function Session({
  sessionId,
  display,
}: {
  sessionId: string;
  display: boolean;
}) {
  const [controller, setController] = useState(() => {
    try {
      return sessionStorage.getItem(`slideshow:${sessionId}`) ?? undefined;
    } catch {
      return undefined;
    }
  });
  const state = useQuery(api.presentations.read, {
    sessionId,
    mode: display ? "display" : "present",
    ...(controller ? { controller } : {}),
  });
  const control = useMutation(api.presentations.control);
  const takeControl = useMutation(api.presentations.takeControl);
  const [, setParams] = useSearchParams();
  const connected = useConvexConnectionState().isWebSocketConnected;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showNotes, setShowNotes] = useState(true);
  const [expired, setExpired] = useState(false);
  const expiresAt = state?.expiresAt;
  useEffect(() => {
    if (expiresAt === undefined) return;
    const timer = setTimeout(
      () => setExpired(true),
      Math.max(0, expiresAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [expiresAt]);
  const canControl =
    !!controller && !!state?.canControl && connected && !busy && !expired;
  async function claimControl() {
    if (!state || !connected || busy || expired) return;
    setBusy(true);
    setError("");
    try {
      const next = crypto.randomUUID();
      // Persist before claiming so a storage failure cannot strand control.
      sessionStorage.setItem(`slideshow:${sessionId}`, next);
      await takeControl({
        sessionId,
        controller: next,
        revision: state.revision,
      });
      setController(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not take control");
    } finally {
      setBusy(false);
    }
  }
  async function move(action: "next" | "previous" | "end") {
    if (!canControl || !controller || !state) return;
    setBusy(true);
    setError("");
    try {
      await control({
        sessionId,
        controller,
        revision: state.revision,
        action,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change slide");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    function key(event: KeyboardEvent) {
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        (event.target instanceof HTMLElement &&
          event.target.closest("input,textarea,select,[contenteditable]"))
      )
        return;
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        void move(event.key === "ArrowRight" ? "next" : "previous");
      }
      if (!display && event.key.toLowerCase() === "n")
        setShowNotes(value => !value);
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  if (state === undefined) return <p role="status">Loading presentation…</p>;
  if (state === null || expired)
    return (
      <section className="slideshow-unavailable">
        <h1>Presentation unavailable</h1>
        <p>It ended, expired, or belongs to another account.</p>
        <a href="/dashboard">Back to presentation</a>
      </section>
    );
  const slide = state.slides[state.slide];
  const last = state.slide === state.slides.length - 1;
  const visual = (
    <Slide
      slide={slide}
      title={state.title}
      index={state.slide}
      count={state.slides.length}
    />
  );
  return (
    <section
      className={`slideshow-session ${display ? "slideshow-display" : ""}`}
    >
      {!connected && (
        <Alert>
          <p>Disconnected. Keeping this slide until connection returns.</p>
        </Alert>
      )}
      {error && <ErrorNotice message={error} />}
      {display ? (
        <>
          {visual}
          <nav
            className="slideshow-display-controls"
            aria-label="Display controls"
          >
            <span>
              {state.canControl
                ? "You control · ← → navigate"
                : "Following presenter"}
            </span>
            {!state.canControl && (
              <Button
                className={controlStyles.primaryButton}
                disabled={!connected || busy}
                onClick={() => void claimControl()}
              >
                Take control
              </Button>
            )}
            <Button
              className={controlStyles.outlineButton}
              onClick={() => setParams({ session: sessionId, mode: "present" })}
            >
              Presenter view
            </Button>
          </nav>
        </>
      ) : (
        <>
          <header className="slideshow-toolbar">
            <div className="slideshow-home">
              <img
                className="slideshow-wordmark"
                src="/viktor-wordmark.svg"
                alt="Viktor"
              />
              Presentation
            </div>
            <span>
              {state.slide + 1} / {state.slides.length}
            </span>
            <Button
              className={controlStyles.outlineButton}
              onClick={() => setParams({ session: sessionId, mode: "display" })}
            >
              Display view
            </Button>
            <a
              href={`/dashboard?session=${encodeURIComponent(sessionId)}&mode=display`}
              target="_blank"
              rel="noreferrer"
            >
              Open display ↗
            </a>
          </header>
          {!state.canControl && (
            <Alert>
              <p>
                Following another controller. Taking control stops that tab from
                changing slides.
                <Button
                  className={controlStyles.primaryButton}
                  disabled={!connected || busy}
                  onClick={() => void claimControl()}
                >
                  Take control
                </Button>
              </p>
            </Alert>
          )}
          <div className="slideshow-presenter">
            <div>
              <button
                type="button"
                className="slideshow-thumbnail"
                aria-label="Next slide"
                disabled={!canControl || last}
                onClick={() => void move("next")}
              >
                {visual}
              </button>
              <div className="slideshow-controls">
                <Button
                  className={controlStyles.primaryButton}
                  disabled={!canControl || state.slide === 0}
                  onClick={() => void move("previous")}
                >
                  Previous
                </Button>
                <Button
                  className={controlStyles.primaryButton}
                  disabled={!canControl || last}
                  onClick={() => void move("next")}
                >
                  Next
                </Button>
                <Button
                  className={controlStyles.outlineButton}
                  onClick={() => setShowNotes(value => !value)}
                >
                  {showNotes ? "Hide" : "Show"} notes
                </Button>
                <Button
                  className={controlStyles.outlineButton}
                  disabled={!canControl}
                  onClick={() => void move("end")}
                >
                  End
                </Button>
              </div>
              <p className="slideshow-hint">
                ← → navigate · N toggles notes · Tap the thumbnail to advance
              </p>
            </div>
            {showNotes && state.notes && (
              <aside className="slideshow-notes">
                <p className="slideshow-eyebrow">Speaker notes</p>
                <Notes lines={state.notes} />
              </aside>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export function Presentation() {
  const [params] = useSearchParams();
  const sessionId = params.get("session");
  const display = params.get("mode") === "display";
  return sessionId ? (
    <Session
      key={`${sessionId}:${display}`}
      sessionId={sessionId}
      display={display}
    />
  ) : (
    <StartPresentation />
  );
}
