import { useMutation, useQuery } from "convex/react";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { btn, EmptyState, Field, PageHeader, SyncBanner, SyncDot, ui } from "@/components/desk/bits";
import { cn } from "@/lib/utils";
import { Button } from "@/ui";
import { api } from "../../convex/_generated/api";
import {
  CHECKLIST,
  ISSUE_RHYTHM,
  ISSUE_TYPES,
  type IssueType,
  issueTypeForDate,
  nextIssueDate,
  prettyDate,
} from "../../convex/lib/desk";
import { todayInTampa } from "../../convex/lib/tampa";

export function IssuesPage() {
  const issues = useQuery(api.issues.list);
  const ensure = useMutation(api.issues.ensure);
  const navigate = useNavigate();
  const first = nextIssueDate(todayInTampa());
  const [date, setDate] = useState(first);
  const [type, setType] = useState<IssueType>(issueTypeForDate(first));
  const [busy, setBusy] = useState(false);

  return (
    <div className="mx-auto max-w-5xl">
      <SyncBanner />
      <PageHeader kicker="Package" title="Issues" />

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
        <section className={cn(ui.card, "p-5")}>
          <h2 className="mb-4 text-2xl">Build an issue</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Issue date" htmlFor="issue-date">
              <input
                id="issue-date"
                type="date"
                className={ui.input}
                value={date}
                onChange={e => {
                  setDate(e.target.value);
                  if (e.target.value) setType(issueTypeForDate(e.target.value));
                }}
              />
            </Field>
            <Field label="Issue type" htmlFor="issue-type">
              <select id="issue-type" className={ui.input} value={type} onChange={e => setType(e.target.value as IssueType)}>
                {ISSUE_TYPES.map(t => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {ISSUE_RHYTHM[type].job} · build window {ISSUE_RHYTHM[type].build} · primary CTA {ISSUE_RHYTHM[type].cta}. Stories dated{" "}
            {date ? prettyDate(date) : "that day"} are pulled in automatically.
          </p>
          <Button
            className={btn("sunset", "mt-4")}
            disabled={!date || busy}
            data-testid="open-issue"
            onClick={async () => {
              setBusy(true);
              try {
                const id = await ensure({ issueDate: date, issueType: type });
                navigate(`/issues/${id}`);
              } finally {
                setBusy(false);
              }
            }}
          >
            Open issue builder
          </Button>
        </section>

        <aside className={cn(ui.card, "p-5")}>
          <h2 className="mb-3 text-xl">The weekly rhythm</h2>
          <ul className="space-y-3 text-sm">
            {ISSUE_TYPES.map(t => (
              <li key={t}>
                <p className="font-semibold">{t}</p>
                <p className="text-muted-foreground">
                  {ISSUE_RHYTHM[t].job}. Build {ISSUE_RHYTHM[t].build}. CTA: {ISSUE_RHYTHM[t].cta}.
                </p>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <h2 className="mt-10 mb-3 text-2xl">Recent issues</h2>
      {issues === undefined ? (
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
      ) : issues.length === 0 ? (
        <EmptyState title="No issues yet">Pick a date above to start the first one.</EmptyState>
      ) : (
        <ul className={cn(ui.card, "divide-y")}>
          {issues.map(i => (
            <li key={i._id}>
              <Link to={`/issues/${i.issueId}`} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/60">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {prettyDate(i.issueDate)} · {i.issueType}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{i.subject || "No subject yet"}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{i.status}</span>
                    <span>
                      Checklist {i.checklist.filter(Boolean).length}/{CHECKLIST.length}
                    </span>
                    <SyncDot state={i.syncState} message={i.syncMessage} />
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
