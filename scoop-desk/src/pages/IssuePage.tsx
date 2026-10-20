import { useAction, useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Lock,
  Megaphone,
  RefreshCw,
  Store,
  TriangleAlert,
} from "lucide-react";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import {
  btn,
  Chip,
  CopyButton,
  EmptyState,
  Field,
  PageHeader,
  StateBadge,
  SyncBanner,
  SyncDot,
  ui,
  VerifyText,
} from "@/components/desk/bits";
import { SectionWriter } from "@/components/desk/SectionWriter";
import { cn } from "@/lib/utils";
import { Button } from "@/ui";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import {
  CHECKLIST,
  countWords,
  DIRECTORY_URL,
  daysBetween,
  EVENTS_URL,
  eventWindow,
  findVerifyFlags,
  ISSUE_RHYTHM,
  type IssueType,
  prettyDate,
  STANDARD_CLOSE,
  shortDay,
  wordRange,
} from "../../convex/lib/desk";
import type { EventPick } from "../../convex/lib/render";

type Feeds = {
  events: {
    key: string;
    name: string;
    venue: string;
    neighborhood: string;
    startDate: string;
    endDate: string;
    time: string;
    categories: string[];
    description: string;
    price: string;
    isFree: boolean;
    familyFriendly: boolean;
    featured: boolean;
    dateVerified: string;
  }[];
  businesses: {
    slug: string;
    name: string;
    category: string;
    neighborhood: string;
    description: string;
    featured: boolean;
    lastVerified: string;
  }[];
  today: string;
  fetchedAt: number;
  stale: boolean;
  error: string | null;
};

const SLOTS = ["Free", "Family", "Date night", "Wildcard"];

function firstSentence(s: string) {
  const m = s.match(/^.*?[.!?](\s|$)/);
  return (m ? m[0] : s).trim().slice(0, 160);
}

export function VerifiedAge({ dateVerified, today }: { dateVerified: string; today: string }) {
  if (!dateVerified) return <Chip tone="warn">never verified</Chip>;
  const age = daysBetween(dateVerified, today);
  if (age <= 14) return <Chip tone="teal">verified {age === 0 ? "today" : `${age}d ago`}</Chip>;
  return <Chip tone="warn">verified {age}d ago: recheck</Chip>;
}

function Module({
  n,
  title,
  hint,
  icon,
  children,
  testId,
}: {
  n: number;
  title: string;
  hint?: string;
  icon?: ReactNode;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <section className={cn(ui.card, "p-5")} data-testid={testId}>
      <div className="mb-3 flex items-start gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary font-heading text-sm">{n}</span>
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-xl">
            {icon}
            {title}
          </h2>
          {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function StoryToggle({
  s,
  included,
  onToggle,
}: {
  s: Doc<"stories">;
  included: boolean;
  onToggle: (v: boolean) => void;
}) {
  const flags = findVerifyFlags(`${s.headline}\n${s.draft}`);
  const range = wordRange(s.tone, s.sponsor);
  const wc = countWords(s.draft);
  return (
    <div className={cn("rounded-lg border p-3", included ? "border-primary/40 bg-background" : "bg-muted/40 opacity-80")}>
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 size-4 accent-[var(--primary)]"
          checked={included}
          disabled={!s.draft}
          onChange={e => onToggle(e.target.checked)}
          aria-label={`Include ${s.headline || s.storyId}`}
        />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <StateBadge state={s.state} />
            {!s.sponsor && <Chip tone="teal">{s.tone}</Chip>}
            {s.draft && (
              <span className={cn("text-xs", wc < range.min || wc > range.max ? "text-destructive" : "text-muted-foreground")}>
                {wc} words
              </span>
            )}
            {flags.length > 0 && <Chip tone="warn">{flags.length} VERIFY</Chip>}
          </div>
          <p className="font-medium">{s.sponsor ? `Sponsored by ${s.sponsorName}` : s.headline || s.factBullets.split("\n")[0]}</p>
          {s.draft ? (
            <p className="line-clamp-3 text-sm text-muted-foreground">
              <VerifyText text={s.draft} />
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Not drafted yet.</p>
          )}
        </div>
        <Link to={`/story/${s.storyId}`} className="shrink-0 text-xs text-primary underline">
          Open
        </Link>
      </label>
    </div>
  );
}

export function IssuePage({ tab }: { tab: "write" | "build" | "export" }) {
  const { issueId = "" } = useParams();
  const data = useQuery(api.issues.get, { issueId });
  const update = useMutation(api.issues.update);
  const loadFeeds = useAction(api.feeds.load);
  const [feeds, setFeeds] = useState<Feeds | null>(null);
  const [feedsBusy, setFeedsBusy] = useState(false);

  const refreshFeeds = useCallback(
    async (force: boolean) => {
      setFeedsBusy(true);
      try {
        setFeeds(await loadFeeds({ force }));
      } catch {
        setFeeds(f => f ?? { events: [], businesses: [], today: "", fetchedAt: 0, stale: true, error: "Couldn't load the sheet." });
      } finally {
        setFeedsBusy(false);
      }
    },
    [loadFeeds],
  );

  useEffect(() => {
    if (tab === "build") void refreshFeeds(false);
  }, [tab, refreshFeeds]);

  if (data === undefined) return <div className="mx-auto h-64 max-w-6xl animate-pulse rounded-xl bg-muted" />;
  if (data === null)
    return (
      <div className="mx-auto max-w-5xl">
        <p>No such issue.</p>
        <Link to="/issues" className="text-primary underline">
          Back to issues
        </Link>
      </div>
    );

  const { issue, candidates, rendered, blockers } = data;
  const ticked = issue.checklist.filter(Boolean).length;

  return (
    <div className="mx-auto max-w-6xl">
      <SyncBanner />
      <Link to="/issues" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Issues
      </Link>
      <PageHeader kicker={`${issue.issueType} · ${ISSUE_RHYTHM[issue.issueType as IssueType].job}`} title={prettyDate(issue.issueDate)}>
        <span className="rounded-full bg-secondary px-3 py-1 text-sm font-semibold">{issue.status}</span>
        <SyncDot state={issue.syncState} message={issue.syncMessage} />
      </PageHeader>

      <nav className="mb-6 flex gap-1 border-b" aria-label="Issue steps">
        <Link
          to={`/issues/${issueId}`}
          data-testid="write-tab"
          className={cn("-mb-px border-b-2 px-4 py-2 text-sm font-semibold", tab === "write" ? "border-sunset" : "border-transparent text-muted-foreground")}
        >
          Write sections
        </Link>
        <Link
          to={`/issues/${issueId}/build`}
          className={cn("-mb-px border-b-2 px-4 py-2 text-sm font-semibold", tab === "build" ? "border-sunset" : "border-transparent text-muted-foreground")}
        >
          Stories & picks
        </Link>
        <Link
          to={`/issues/${issueId}/export`}
          className={cn("-mb-px border-b-2 px-4 py-2 text-sm font-semibold", tab === "export" ? "border-sunset" : "border-transparent text-muted-foreground")}
          data-testid="export-tab"
        >
          Checklist & export{" "}
          <span className="ml-1 rounded-full bg-secondary px-2 text-xs">
            {ticked}/{CHECKLIST.length}
          </span>
        </Link>
      </nav>

      {tab === "write" ? (
        <SectionWriter issueId={issueId} />
      ) : tab === "build" ? (
        <BuildTab
          issue={issue}
          candidates={candidates}
          feeds={feeds}
          feedsBusy={feedsBusy}
          onRefreshFeeds={() => refreshFeeds(true)}
          update={args => update({ issueId, ...args })}
          renderedHtml={rendered.html}
        />
      ) : (
        <ExportTab issue={issue} blockers={blockers} verifyFlags={rendered.verifyFlags} notVerified={data.notVerified} />
      )}
    </div>
  );
}

type UpdateArgs = {
  subject?: string;
  previewText?: string;
  opening?: string;
  storyIds?: string[];
  eventPicks?: EventPick[];
  business?: Doc<"issues">["business"];
};

function BuildTab({
  issue,
  candidates,
  feeds,
  feedsBusy,
  onRefreshFeeds,
  update,
  renderedHtml,
}: {
  issue: Doc<"issues">;
  candidates: Doc<"stories">[];
  feeds: Feeds | null;
  feedsBusy: boolean;
  onRefreshFeeds: () => void;
  update: (a: UpdateArgs) => Promise<null>;
  renderedHtml: string;
}) {
  const [subject, setSubject] = useState(issue.subject);
  const [preview, setPreview] = useState(issue.previewText);
  const [opening, setOpening] = useState(issue.opening);
  useEffect(() => {
    setSubject(issue.subject);
    setPreview(issue.previewText);
    setOpening(issue.opening);
  }, [issue.subject, issue.previewText, issue.opening]);

  const included = new Set(issue.storyIds);
  const toggle = (id: string, on: boolean) => {
    const ids = on ? [...issue.storyIds, id] : issue.storyIds.filter(x => x !== id);
    void update({ storyIds: [...new Set(ids)] });
  };
  const bySection = (sec: string) => candidates.filter(s => (sec === "Sponsor" ? s.sponsor || s.section === "Sponsor" : !s.sponsor && s.section === sec));
  const snapshotIn = bySection("Snapshot").filter(s => included.has(s.storyId) && s.draft).length;

  const type = issue.issueType as IssueType;
  const win = eventWindow(issue.issueDate, type);
  const today = feeds?.today || issue.issueDate;
  const events = (feeds?.events ?? []).filter(e => e.startDate >= issue.issueDate && e.startDate <= win.end);
  const later = (feeds?.events ?? []).filter(e => e.startDate > win.end).length;
  const picked = new Map(issue.eventPicks.map(p => [p.key, p]));

  const setPicks = (picks: EventPick[]) => void update({ eventPicks: picks });
  const togglePick = (e: Feeds["events"][number], on: boolean) => {
    if (on) {
      if (issue.eventPicks.length >= 4) {
        toast.error("Four picks max: one free, one family, one date-night, one wildcard.");
        return;
      }
      const used = new Set(issue.eventPicks.map(p => p.slot));
      const slot =
        (e.isFree && !used.has("Free") && "Free") ||
        (e.familyFriendly && !used.has("Family") && "Family") ||
        SLOTS.find(s => !used.has(s)) ||
        "Wildcard";
      setPicks([
        ...issue.eventPicks,
        {
          key: e.key,
          slot,
          name: e.name,
          startDate: e.startDate,
          time: e.time,
          venue: e.venue,
          neighborhood: e.neighborhood,
          price: e.price,
          note: firstSentence(e.description),
          dateVerified: e.dateVerified,
        },
      ]);
    } else setPicks(issue.eventPicks.filter(p => p.key !== e.key));
  };

  const savePackaging = () => {
    if (subject !== issue.subject || preview !== issue.previewText || opening !== issue.opening)
      void update({ subject, previewText: preview, opening });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,25rem)]">
      <div className="min-w-0 space-y-5">
        <Module n={1} title="Subject + preview text" hint="Tampa in 5: [lead consequence] + [standout event]. Opening: one sentence that earns the scroll; no weather filler.">
          <div className="space-y-3">
            <Field label="Subject" htmlFor="subject" hint={`${subject.length} characters`}>
              <input id="subject" className={ui.input} value={subject} onChange={e => setSubject(e.target.value)} onBlur={savePackaging} data-testid="subject-input" />
            </Field>
            <Field label="Preview text" htmlFor="preview" hint={`${preview.length} characters`}>
              <input id="preview" className={ui.input} value={preview} onChange={e => setPreview(e.target.value)} onBlur={savePackaging} />
            </Field>
            <Field label="Opening" htmlFor="opening">
              <textarea id="opening" className={cn(ui.input, "min-h-16")} value={opening} onChange={e => setOpening(e.target.value)} onBlur={savePackaging} />
            </Field>
          </div>
        </Module>

        <Module
          n={2}
          title="Tampa Snapshot"
          hint="2–4 verified briefs in Deep / Punchy / Straight order. Primary source preferred."
          testId="module-snapshot"
        >
          {snapshotIn > 0 && (snapshotIn < 2 || snapshotIn > 4) && (
            <p className="mb-2 text-sm text-destructive">{snapshotIn} included; the Snapshot wants 2–4.</p>
          )}
          <StoryList items={bySection("Snapshot")} included={included} toggle={toggle} empty="No Snapshot stories dated for this issue." />
        </Module>

        <Module
          n={3}
          title="Event picks"
          icon={<CalendarDays className="size-5 text-primary" />}
          hint={`From the Events tab: Approved, starting ${win.label} (${prettyDate(win.start, false)}–${prettyDate(win.end, false)}). One free, one family, one date-night, one wildcard; each rechecked inside 14 days.`}
          testId="module-events"
        >
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Button className={btn("quiet", "h-7 px-2 text-xs")} onClick={onRefreshFeeds} disabled={feedsBusy}>
              <RefreshCw className={cn("size-3", feedsBusy && "animate-spin")} /> Re-read sheet
            </Button>
            {feeds?.fetchedAt ? <span>Read {new Date(feeds.fetchedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span> : null}
            {feeds?.stale && <Chip tone="warn">showing last good copy</Chip>}
            {feeds?.error && !feeds.stale && <span className="text-destructive">{feeds.error}</span>}
          </div>
          {feeds === null ? (
            <div className="h-20 animate-pulse rounded-lg bg-muted" />
          ) : events.length === 0 && issue.eventPicks.length === 0 ? (
            <EmptyState title="No approved events in this window yet">
              Event picks come from the Events tab (Status = Approved, upcoming). {later > 0 ? `${later} approved event(s) start later. ` : ""}
              Approve events in the sheet and they appear here within 5 minutes.{" "}
              <a className="text-primary underline" href={EVENTS_URL} target="_blank" rel="noreferrer">
                Open the calendar
              </a>
            </EmptyState>
          ) : (
            <ul className="space-y-2">
              {[...events, ...issue.eventPicks.filter(p => !events.some(e => e.key === p.key)).map(p => ({ ...p, categories: [], description: "", endDate: "", isFree: false, familyFriendly: false, featured: false }))].map(e => {
                const p = picked.get(e.key);
                return (
                  <li key={e.key} className={cn("rounded-lg border p-3", p ? "border-primary/40 bg-background" : "")}>
                    <label className="flex items-start gap-3">
                      <input type="checkbox" className="mt-1 size-4 accent-[var(--primary)]" checked={!!p} onChange={ev => togglePick(e, ev.target.checked)} />
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="font-medium">{e.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {shortDay(e.startDate)} {prettyDate(e.startDate, false)}
                          {e.time && ` · ${e.time}`} · {[e.venue, e.neighborhood].filter(Boolean).join(", ")} · {e.price || "price not listed"}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          <VerifiedAge dateVerified={e.dateVerified} today={today} />
                          {e.isFree && <Chip>free</Chip>}
                          {e.familyFriendly && <Chip>family</Chip>}
                        </div>
                      </div>
                    </label>
                    {p && (
                      <div className="mt-3 grid gap-2 pl-7 sm:grid-cols-[9rem_1fr]">
                        <select
                          aria-label="Slot"
                          className={cn(ui.input, "h-9 py-1")}
                          value={p.slot}
                          onChange={ev => setPicks(issue.eventPicks.map(x => (x.key === p.key ? { ...x, slot: ev.target.value } : x)))}
                        >
                          {SLOTS.map(s => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                        <input
                          aria-label="Reason to care"
                          className={cn(ui.input, "h-9 py-1")}
                          defaultValue={p.note}
                          placeholder="One-line reason to care (from the listing)"
                          onBlur={ev => {
                            if (ev.target.value !== p.note) setPicks(issue.eventPicks.map(x => (x.key === p.key ? { ...x, note: ev.target.value } : x)));
                          }}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {bySection("Events").length > 0 && (
            <div className="mt-4 space-y-2">
              <p className={ui.label}>Event stories from the queue</p>
              <StoryList items={bySection("Events")} included={included} toggle={toggle} empty="" />
            </div>
          )}
        </Module>

        {(type === "Sat food" || bySection("Food").length > 0) && (
          <Module n={4} title="Food & drink" hint="Try this: [item] at [business]. Separate firsthand reporting from sourced announcements.">
            <StoryList items={bySection("Food")} included={included} toggle={toggle} empty="No Food stories dated for this issue." />
          </Module>
        )}

        <Module
          n={5}
          title="One useful business"
          icon={<Store className="size-5 text-primary" />}
          hint="A Published directory page that solves a current need."
          testId="module-business"
        >
          {feeds === null ? (
            <div className="h-16 animate-pulse rounded-lg bg-muted" />
          ) : feeds.businesses.length === 0 && !issue.business ? (
            <EmptyState title="No published businesses yet">
              This pick comes from the Businesses tab (Status = Published).{" "}
              <a className="text-primary underline" href={DIRECTORY_URL} target="_blank" rel="noreferrer">
                Open the directory
              </a>
            </EmptyState>
          ) : (
            <div className="space-y-3">
              <select
                aria-label="Business"
                className={ui.input}
                value={issue.business?.slug ?? ""}
                onChange={e => {
                  const b = feeds.businesses.find(x => x.slug === e.target.value);
                  void update({
                    business: b ? { slug: b.slug, name: b.name, category: b.category, neighborhood: b.neighborhood, note: firstSentence(b.description) } : null,
                  });
                }}
              >
                <option value="">No business this issue</option>
                {issue.business && !feeds.businesses.some(b => b.slug === issue.business?.slug) && (
                  <option value={issue.business.slug}>{issue.business.name} (no longer published)</option>
                )}
                {feeds.businesses.map(b => (
                  <option key={b.slug} value={b.slug}>
                    {b.name} · {b.category}
                    {b.neighborhood ? ` · ${b.neighborhood}` : ""}
                  </option>
                ))}
              </select>
              {issue.business && (
                <input
                  aria-label="Why this business now"
                  className={ui.input}
                  defaultValue={issue.business.note}
                  key={issue.business.slug}
                  placeholder="Why it solves a current need"
                  onBlur={e => {
                    if (issue.business && e.target.value !== issue.business.note) void update({ business: { ...issue.business, note: e.target.value } });
                  }}
                />
              )}
            </div>
          )}
        </Module>

        <Module n={6} title="Development watch" hint="Approved / proposed / under construction labels. Never turn a proposal into a promise.">
          <StoryList items={bySection("Development")} included={included} toggle={toggle} empty="No Development stories dated for this issue." />
        </Module>

        <Module n={7} title="Sponsor" icon={<Megaphone className="size-5 text-sunset" />} hint="Clearly labelled “Sponsored”: one offer, one link, one tracking code.">
          <StoryList items={bySection("Sponsor")} included={included} toggle={toggle} empty="No sponsor this issue." />
        </Module>

        <Module n={8} title="Close" hint={`Primary CTA for ${type}: ${ISSUE_RHYTHM[type].cta}.`}>
          <p className="text-sm">“{STANDARD_CLOSE}”</p>
          <p className="mt-2 text-xs text-muted-foreground">Links to Submit an event and Suggest a business are added automatically.</p>
        </Module>
      </div>

      <aside className="min-w-0 xl:sticky xl:top-6 xl:h-fit">
        <div className={cn(ui.card, "overflow-hidden")}>
          <div className="flex items-center justify-between border-b bg-secondary/60 px-4 py-2">
            <p className="text-sm font-semibold">Preview</p>
            <Link to={`/issues/${issue.issueId}/export`} className="text-xs font-semibold text-primary underline">
              Checklist & export →
            </Link>
          </div>
          <div className="space-y-1 border-b px-4 py-3 text-sm">
            <p>
              <span className="text-muted-foreground">Subject: </span>
              <strong>{issue.subject || "—"}</strong>
            </p>
            <p className="text-muted-foreground">{issue.previewText || "No preview text"}</p>
          </div>
          <div className="max-h-[70vh] overflow-auto bg-white px-5 py-4 text-[15px] text-[#1d2a3a]" data-testid="issue-preview">
            {/* Our own escaped HTML (render.ts escapes every value). */}
            <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
          </div>
        </div>
      </aside>
    </div>
  );
}

function StoryList({
  items,
  included,
  toggle,
  empty,
}: {
  items: Doc<"stories">[];
  included: Set<string>;
  toggle: (id: string, on: boolean) => void;
  empty: string;
}) {
  if (!items.length) return empty ? <p className="text-sm text-muted-foreground">{empty}</p> : null;
  return (
    <div className="space-y-2">
      {items.map(s => (
        <StoryToggle key={s._id} s={s} included={included.has(s.storyId)} onToggle={on => toggle(s.storyId, on)} />
      ))}
    </div>
  );
}

function ExportTab({
  issue,
  blockers,
  verifyFlags,
  notVerified,
}: {
  issue: Doc<"issues">;
  blockers: string[];
  verifyFlags: { where: string; field: string }[];
  notVerified: string[];
}) {
  const setCheck = useMutation(api.issues.setCheck).withOptimisticUpdate((store, { issueId, index, value }) => {
    const cur = store.getQuery(api.issues.get, { issueId });
    if (!cur) return;
    const checklist = cur.issue.checklist.map((c, i) => (i === index ? value : c));
    store.setQuery(api.issues.get, { issueId }, { ...cur, issue: { ...cur.issue, checklist } });
  });
  const exportIssue = useMutation(api.issues.exportIssue);
  const markSent = useMutation(api.issues.markSent);
  const [result, setResult] = useState<{ subject: string; previewText: string; html: string; text: string; links: { label: string; url: string }[] } | null>(
    null,
  );
  const exported = issue.status === "Exported" || issue.status === "Sent";
  const shown =
    result ??
    (exported && issue.exportedHtml
      ? { subject: issue.subject, previewText: issue.previewText, html: issue.exportedHtml, text: issue.exportedText ?? "", links: [] }
      : null);
  const blocked = blockers.length > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
      <section className={cn(ui.card, "h-fit p-5")} data-testid="checklist">
        <h2 className="mb-1 text-2xl">Approval checklist</h2>
        <p className="mb-4 text-sm text-muted-foreground">Tick each one only after you've checked it. Export unlocks when all 12 are ticked and no VERIFY flag is left.</p>
        <ol className="space-y-1.5">
          {CHECKLIST.map((item, i) => (
            <li key={item}>
              <label className={cn("flex items-start gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-accent/60", issue.checklist[i] && "text-muted-foreground")}>
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-[var(--success)]"
                  checked={!!issue.checklist[i]}
                  onChange={e => void setCheck({ issueId: issue.issueId, index: i, value: e.target.checked })}
                  data-testid={`check-${i}`}
                />
                <span>{item}</span>
              </label>
            </li>
          ))}
        </ol>
      </section>

      <section className="min-w-0 space-y-4">
        <div className={cn(ui.card, "p-5")}>
          <h2 className="mb-3 text-2xl">Export for beehiiv</h2>
          {blocked ? (
            <div className="space-y-2 rounded-lg border border-warning bg-warning/15 p-4 text-sm" data-testid="export-blockers">
              <p className="flex items-center gap-2 font-semibold">
                <Lock className="size-4" /> Export is locked
              </p>
              <ul className="list-disc space-y-1 pl-5">
                {blockers.map(b => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              {verifyFlags.length > 0 && (
                <p className="text-muted-foreground">Fix flags on each story's page; the subject, preview and opening live on the Build tab.</p>
              )}
            </div>
          ) : (
            <p className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 p-3 text-sm font-semibold text-success">
              <CheckCircle2 className="size-4" /> All checks ticked and no VERIFY flags. Ready to export.
            </p>
          )}
          {notVerified.length > 0 && (
            <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-sunset" />
              {notVerified.length} included stor{notVerified.length > 1 ? "ies are" : "y is"} still “drafted”, not “verified”. Open the primary source before
              you send.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              className={btn("sunset")}
              disabled={blocked}
              data-testid="export-button"
              onClick={async () => {
                const r = await exportIssue({ issueId: issue.issueId });
                if (!r.ok) toast.error(r.reasons.join("; "));
                else {
                  setResult(r);
                  toast.success("Exported. Paste it into beehiiv, test-send to your phone, then send.");
                }
              }}
            >
              {exported ? "Re-export" : "Export HTML + text"}
            </Button>
            {issue.status === "Exported" && (
              <Button className={btn("outline")} onClick={() => void markSent({ issueId: issue.issueId })}>
                Mark as sent in beehiiv
              </Button>
            )}
          </div>
        </div>

        {shown && !blocked && (
          <div className="space-y-4" data-testid="export-output">
            <ExportBox title="Subject" value={shown.subject} />
            <ExportBox title="Preview text" value={shown.previewText} />
            <ExportBox title="HTML" value={shown.html} mono testId="copy-html" />
            <ExportBox title="Plain text" value={shown.text} mono testId="copy-text" />
            {shown.links.length > 0 && (
              <div className={cn(ui.card, "p-5")}>
                <h3 className="mb-2 text-lg">Links (UTM-tagged)</h3>
                <p className="mb-3 text-sm text-muted-foreground">Click each one before sending: “All links resolve to the intended page.”</p>
                <ul className="space-y-1.5 text-sm">
                  {shown.links.map((l, i) => (
                    <li key={`${l.url}-${i}`} className="flex items-start gap-2">
                      <ExternalLink className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
                      <a href={l.url} target="_blank" rel="noreferrer" className="break-all text-primary underline">
                        {l.label}
                      </a>
                      <span className="hidden truncate text-xs text-muted-foreground md:inline">{l.url.split("?")[1]}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function ExportBox({ title, value, mono, testId }: { title: string; value: string; mono?: boolean; testId?: string }) {
  return (
    <div className={cn(ui.card, "p-4")}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-lg">{title}</h3>
        <CopyButton text={value} label={title.toLowerCase()} testId={testId} />
      </div>
      <textarea readOnly value={value} className={cn(ui.input, mono ? "min-h-40 font-mono text-xs" : "min-h-0 h-10")} aria-label={title} />
    </div>
  );
}
