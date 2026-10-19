import { useMutation, useQuery } from "convex/react";
import { ChevronRight, Megaphone } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { Chip, EmptyState, PageHeader, StateBadge, SyncBanner, SyncDot, ui } from "@/components/desk/bits";
import { StoryForm } from "@/components/desk/StoryForm";
import { cn } from "@/lib/utils";
import { api } from "../../convex/_generated/api";
import {
  addDaysIso,
  countWords,
  findVerifyFlags,
  ISSUE_RHYTHM,
  issueTypeForDate,
  nextIssueDate,
  prettyDate,
  STATES,
} from "../../convex/lib/desk";
import { todayInTampa } from "../../convex/lib/tampa";

export function QueuePage() {
  const stories = useQuery(api.stories.list);
  const create = useMutation(api.stories.create);
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>("open");
  const today = todayInTampa();
  const next = nextIssueDate(today);
  const nextType = issueTypeForDate(next);

  const groups = useMemo(() => {
    const list = (stories ?? []).filter(s =>
      filter === "all" ? true : filter === "open" ? s.state !== "cut" : s.state === filter,
    );
    const by = new Map<string, typeof list>();
    for (const s of list) by.set(s.issueDate, [...(by.get(s.issueDate) ?? []), s]);
    return [...by.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [stories, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: stories?.length ?? 0, open: 0 };
    for (const s of stories ?? []) {
      c[s.state] = (c[s.state] ?? 0) + 1;
      if (s.state !== "cut") c.open++;
    }
    return c;
  }, [stories]);

  return (
    <div className="mx-auto max-w-6xl">
      <SyncBanner />
      <PageHeader kicker="Collect" title="Story queue">
        <div className="rounded-lg border bg-card px-3 py-2 text-sm">
          <span className="text-muted-foreground">Next issue </span>
          <strong>
            {prettyDate(next)} · {nextType}
          </strong>
          <span className="block text-xs text-muted-foreground">
            Bullets in by 5 p.m. {prettyDate(addDaysIso(next, -1))} · {ISSUE_RHYTHM[nextType].job}
          </span>
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <section aria-label="Queued stories" className="min-w-0 space-y-4">
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter by state">
            {["open", ...STATES, "all"].map(k => (
              <button
                key={k}
                role="tab"
                aria-selected={filter === k}
                onClick={() => setFilter(k)}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm capitalize",
                  filter === k ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent",
                )}
              >
                {k === "open" ? "In play" : k} <span className="opacity-70">{counts[k] ?? 0}</span>
              </button>
            ))}
          </div>

          {stories === undefined ? (
            <div className="h-40 animate-pulse rounded-xl bg-muted" />
          ) : groups.length === 0 ? (
            <EmptyState title="Nothing in the queue yet">
              Add your first story with the form: paste an intake block or fill in the fields. Each item becomes a draft
              you can check against its sources.
            </EmptyState>
          ) : (
            groups.map(([date, items]) => (
              <div key={date} className={cn(ui.card, "overflow-hidden")}>
                <div className="flex items-center justify-between border-b bg-secondary/60 px-4 py-2">
                  <h2 className="font-heading text-lg">{prettyDate(date)}</h2>
                  <span className="text-xs text-muted-foreground">{issueTypeForDate(date)}</span>
                </div>
                <ul className="divide-y">
                  {items.map(s => {
                    const flags = findVerifyFlags(`${s.headline}\n${s.draft}`).length;
                    const title = s.headline || s.factBullets.split("\n")[0] || s.sponsorName;
                    return (
                      <li key={s._id}>
                        <Link
                          to={`/story/${s.storyId}`}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-accent/60"
                          data-testid="queue-item"
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <StateBadge state={s.state} />
                              {s.sponsor ? (
                                <Chip tone="coral">
                                  <Megaphone className="size-3" /> Sponsor
                                </Chip>
                              ) : (
                                <Chip>{s.section}</Chip>
                              )}
                              {!s.sponsor && <Chip tone="teal">{s.tone}</Chip>}
                              {flags > 0 && <Chip tone="warn">{flags} VERIFY</Chip>}
                              {s.draft && <span className="text-xs text-muted-foreground">{countWords(s.draft)} words</span>}
                            </div>
                            <p className="truncate font-medium">{title}</p>
                            <SyncDot state={s.syncState} message={s.syncMessage} />
                          </div>
                          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </section>

        <aside className={cn(ui.card, "h-fit p-5 lg:sticky lg:top-6")} aria-label="Add a story">
          <h2 className="mb-1 text-2xl">Add to the queue</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Mirrors the intake block. Only verified facts and their source links go in.
          </p>
          <StoryForm
            initial={{
              issueDate: next,
              tone: "",
              section: "",
              factBullets: "",
              sourceUrls: "",
              readerAction: "",
              knownGaps: "",
              sponsor: false,
              sponsorName: "",
              sponsorCopy: "",
              sponsorUrl: "",
            }}
            submitLabel="Add to queue"
            onSubmit={async f => {
              const r = await create(f);
              if (!r.ok) return r.fieldErrors;
              toast.success("Added to the queue");
              navigate(`/story/${r.storyId}`);
              return null;
            }}
          />
        </aside>
      </div>
    </div>
  );
}
