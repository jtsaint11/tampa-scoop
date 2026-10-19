import { useAction, useQuery } from "convex/react";
import { AlertTriangle, Check, CloudOff, Copy, RefreshCw } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/ui";
import { api } from "../../../convex/_generated/api";

export const ui = {
  btn: "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors h-9 px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:pointer-events-none",
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  sunset: "bg-sunset text-sunset-foreground hover:bg-sunset/90",
  outline: "border border-input bg-card hover:bg-accent",
  quiet: "hover:bg-accent",
  input:
    "flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring/60",
  card: "rounded-xl border bg-card",
  label: "text-xs font-semibold uppercase tracking-wider text-muted-foreground",
};

export function btn(kind: "primary" | "sunset" | "outline" | "quiet" = "outline", extra?: string) {
  return cn(ui.btn, ui[kind], extra);
}

export function PageHeader({ kicker, title, children }: { kicker?: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {kicker && <p className={ui.label}>{kicker}</p>}
        <h1 className="mt-1 text-3xl leading-tight md:text-4xl">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-semibold">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

const STATE_STYLE: Record<string, string> = {
  queued: "bg-secondary text-secondary-foreground",
  drafted: "bg-sunset-soft text-sunset-ink",
  verified: "bg-success text-success-foreground",
  cut: "bg-muted text-muted-foreground line-through",
};

export function StateBadge({ state }: { state: string }) {
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold", STATE_STYLE[state])}>{state}</span>
  );
}

export function Chip({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "teal" | "coral" | "warn" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        tone === "teal" && "border-primary/30 text-primary",
        tone === "coral" && "border-sunset/40 text-sunset-ink",
        tone === "warn" && "border-warning bg-warning/25 text-warning-foreground",
      )}
    >
      {children}
    </span>
  );
}

export function SyncDot({ state, message }: { state: string; message?: string }) {
  const label =
    state === "synced" ? "Saved to sheet" : state === "pending" ? "Saving…" : state === "paused" ? "Kept in Desk" : "Not saved";
  return (
    <span
      title={message || label}
      className={cn(
        "inline-flex items-center gap-1 text-xs",
        state === "synced" ? "text-success" : state === "error" ? "text-destructive" : "text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          state === "synced" ? "bg-success" : state === "error" ? "bg-destructive" : state === "paused" ? "bg-warning" : "bg-muted-foreground",
        )}
      />
      {label}
    </span>
  );
}

/** Text with every VERIFY: [field] marker highlighted. */
export function VerifyText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(VERIFY:\s*(?:\[[^\]\n]*\]|[^.\n;,]*))/g);
  return (
    <span className={cn("whitespace-pre-wrap", className)}>
      {parts.map((p, i) =>
        /^VERIFY:/.test(p) ? (
          <mark key={i} className="rounded bg-warning px-1 font-semibold text-warning-foreground" data-testid="verify-flag">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </span>
  );
}

export function WordMeter({ count, min, max }: { count: number; min: number; max: number }) {
  const ok = count >= min && count <= max;
  const pct = Math.min(100, (count / (max * 1.25)) * 100);
  return (
    <div className="space-y-1" data-testid="word-meter">
      <div className="flex items-baseline justify-between text-sm">
        <span className={cn("font-semibold tabular-nums", ok ? "text-success" : "text-destructive")}>
          {count} words
        </span>
        <span className="text-xs text-muted-foreground">
          target {min}–{max}
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-muted">
        <div
          className="absolute inset-y-0 rounded-full bg-success/25"
          style={{ left: `${(min / (max * 1.25)) * 100}%`, width: `${((max - min) / (max * 1.25)) * 100}%` }}
        />
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full", ok ? "bg-success" : "bg-sunset")}
          style={{ width: `${pct}%`, opacity: 0.85 }}
        />
      </div>
    </div>
  );
}

export function CopyButton({ text, label, testId }: { text: string; label: string; testId?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      data-testid={testId}
      className={btn("primary", "h-8 px-3")}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          toast.success(`${label} copied`);
          setTimeout(() => setDone(false), 1800);
        } catch {
          toast.error("Couldn't copy. Select the text and copy it by hand.");
        }
      }}
    >
      {done ? <Check className="size-4" /> : <Copy className="size-4" />}
      {done ? "Copied" : `Copy ${label}`}
    </Button>
  );
}

let pulledThisSession = false;

/** Sheet-sync banner: honest about "saving paused", with a Sync now button. */
export function SyncBanner() {
  const status = useQuery(api.sync.status);
  const syncNow = useAction(api.sync.syncNow);
  const refresh = useAction(api.sync.refreshFromSheet);
  const [busy, setBusy] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || pulledThisSession) return;
    ran.current = true;
    pulledThisSession = true;
    void refresh({ force: false }).catch(() => undefined);
  }, [refresh]);

  if (!status) return null;
  const unsynced = status.unsyncedStories + status.unsyncedIssues;
  const paused = status.status === "paused" || status.status === "no_tabs" || status.status === "error";
  if (!paused && unsynced === 0) return null;

  return (
    <div
      className={cn(
        "mb-5 flex flex-wrap items-start gap-3 rounded-lg border px-4 py-3 text-sm",
        paused ? "border-warning bg-warning/15" : "border-border bg-card",
      )}
      role="status"
      data-testid="sync-banner"
    >
      {paused ? <CloudOff className="mt-0.5 size-4 shrink-0" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{paused ? "Saving paused" : "Saving to the sheet…"}</p>
        <p className="text-muted-foreground">
          {paused ? status.message.replace(/^Saving paused: /, "") : "Changes are on their way to the Tampa Scoop sheet."}
          {unsynced > 0 && ` ${unsynced} item${unsynced > 1 ? "s" : ""} waiting to sync. Drafting keeps working meanwhile.`}
        </p>
      </div>
      <Button
        className={btn("outline", "h-8 px-3")}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await syncNow({});
            if (r.remaining === 0 && r.status !== "no_tabs" && r.status !== "paused") toast.success("Everything is saved to the sheet");
            else toast.message(r.message || "Still paused");
          } catch {
            toast.error("Sync failed. Try again in a minute.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <RefreshCw className={cn("size-4", busy && "animate-spin")} />
        Sync now
      </Button>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed bg-card/60 px-6 py-10 text-center">
      <p className="font-heading text-xl">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}
