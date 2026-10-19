import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  ClipboardList,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { SignupBanner } from "@/components/site/ScoopNav";
import { useEvents } from "@/hooks/useEvents";
import {
  applyFilters,
  DATE_FILTERS,
  type DateFilter,
  dateParts,
  type Filters,
  relativeDayLabel,
  shortDate,
} from "@/lib/events";
import { cn } from "@/lib/utils";
import {
  EVENT_CATEGORIES,
  NEIGHBORHOODS,
  type PublicEvent,
} from "../../convex/lib/tampa";

const PAGE_SIZE = 24;

function useFilters(): [
  Filters,
  (patch: Partial<Filters>) => void,
  () => void,
] {
  const [params, setParams] = useSearchParams();
  const read = (p: URLSearchParams): Filters => ({
    q: p.get("q") ?? "",
    date: (DATE_FILTERS.some(d => d.value === p.get("date"))
      ? p.get("date")
      : "all") as DateFilter,
    on: /^\d{4}-\d{2}-\d{2}$/.test(p.get("on") ?? "")
      ? (p.get("on") as string)
      : "",
    category: p.get("category") ?? "",
    neighborhood: p.get("neighborhood") ?? "",
    free: p.get("free") === "1",
    family: p.get("family") === "1",
  });
  const filters = read(params);
  // Latest params, updated synchronously so rapid clicks never drop a filter.
  const latest = useRef(params);
  useEffect(() => {
    latest.current = params;
  }, [params]);
  const update = (patch: Partial<Filters>) => {
    setParams(
      () => {
        const next = { ...read(latest.current), ...patch };
        const p = new URLSearchParams();
        if (next.q) p.set("q", next.q);
        if (next.date !== "all") p.set("date", next.date);
        if (next.on) p.set("on", next.on);
        if (next.category) p.set("category", next.category);
        if (next.neighborhood) p.set("neighborhood", next.neighborhood);
        if (next.free) p.set("free", "1");
        if (next.family) p.set("family", "1");
        latest.current = p;
        return p;
      },
      { replace: true, preventScrollReset: true },
    );
  };
  const clear = () => {
    latest.current = new URLSearchParams();
    setParams(new URLSearchParams(), {
      replace: true,
      preventScrollReset: true,
    });
  };
  return [filters, update, clear];
}

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-card hover:border-foreground/40",
      )}
    >
      {children}
    </button>
  );
}

export function EventCard({ ev, today }: { ev: PublicEvent; today: string }) {
  const { weekday, day, month } = dateParts(ev.startDate);
  const rel = relativeDayLabel(ev.startDate, today);
  return (
    <li>
      <Link
        to={`/events/${encodeURIComponent(ev.key)}`}
        className="group flex overflow-hidden rounded-xl border bg-card shadow-[0_1px_0_oklch(0.88_0.025_78)] transition hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-md"
        data-testid="event-card"
      >
        <div className="ticket-stub flex w-[4.5rem] shrink-0 flex-col items-center justify-center bg-sunset-soft py-4 text-sunset-ink sm:w-20">
          <span className="text-[0.7rem] font-bold tracking-[0.12em] uppercase">
            {weekday}
          </span>
          <span className="font-heading text-3xl leading-none font-semibold">
            {day}
          </span>
          <span className="text-[0.7rem] font-bold tracking-[0.12em] uppercase">
            {month}
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-4">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
            {rel ? (
              <span className="rounded-full bg-primary px-2 py-0.5 text-primary-foreground">
                {rel}
              </span>
            ) : null}
            {ev.categories.slice(0, 2).map(c => (
              <span
                key={c}
                className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground"
              >
                {c}
              </span>
            ))}
            {ev.isFree ? (
              <span className="rounded-full bg-success/10 px-2 py-0.5 text-success">
                Free
              </span>
            ) : null}
          </div>
          <h3 className="font-heading text-lg leading-snug font-semibold text-balance group-hover:text-primary">
            {ev.name}
          </h3>
          <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span className="min-w-0">
              <span className="font-semibold text-foreground">{ev.venue}</span>
              {ev.neighborhood ? ` · ${ev.neighborhood}` : ""}
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            {ev.endDate && ev.endDate > ev.startDate
              ? `${shortDate(ev.startDate)} – ${shortDate(ev.endDate)}`
              : shortDate(ev.startDate)}
            {ev.time ? ` · ${ev.time}` : ""}
            {!ev.isFree && ev.price ? ` · ${ev.price}` : ""}
          </p>
        </div>
        <div className="hidden items-center pr-5 sm:flex">
          <span className="inline-flex items-center gap-1 text-sm font-bold text-primary">
            View details{" "}
            <ArrowRight
              className="size-4 transition group-hover:translate-x-0.5"
              aria-hidden
            />
          </span>
        </div>
      </Link>
    </li>
  );
}

function SubmitCallout({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-sunset/30 bg-sunset-soft/70 p-5 sm:flex-row sm:items-center sm:justify-between",
        compact && "p-4",
      )}
    >
      <p className="text-[0.95rem] text-sunset-ink">
        <strong className="font-bold">Hosting an event in Tampa?</strong> Tell
        us about it. Listing is free, and every submission is reviewed by a
        person.
      </p>
      <Link
        to="/submit-event"
        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-sunset px-5 py-2.5 text-sm font-bold text-sunset-foreground shadow-sm transition hover:brightness-110"
        data-testid="submit-cta"
      >
        Submit your event <ArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}

function EmptyCalendar() {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border bg-card p-6 sm:p-10"
      data-testid="empty-calendar"
    >
      <div
        className="sunset-stripe absolute inset-y-0 left-0 w-1.5"
        aria-hidden
      />
      <p className="text-xs font-bold tracking-[0.16em] text-sunset-ink uppercase">
        The calendar is opening
      </p>
      <h2 className="mt-2 max-w-xl font-heading text-2xl leading-tight font-semibold text-balance sm:text-3xl">
        No approved events yet. We're checking the first listings with Tampa
        organizers now.
      </h2>
      <p className="mt-3 max-w-xl text-muted-foreground">
        We only publish events we've confirmed with the organizer or venue, so
        this page starts empty rather than guessing. Got something happening in
        Tampa? Yours could be one of the first listings.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          to="/submit-event"
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-sunset px-6 py-3 font-bold text-sunset-foreground shadow-sm transition hover:brightness-110"
        >
          Submit your Tampa event <ArrowRight className="size-4" aria-hidden />
        </Link>
        <a
          href="#how-it-works"
          className="inline-flex items-center justify-center rounded-full border px-6 py-3 font-semibold hover:bg-accent"
        >
          How listings work
        </a>
      </div>
    </div>
  );
}

const GUIDES: { title: string; blurb: string; to: string; tag: string }[] = [
  {
    title: "Things to do in Tampa this weekend",
    blurb: "Everything on the calendar from Friday to Sunday.",
    to: "/?date=weekend",
    tag: "Weekend",
  },
  {
    title: "Live music in Tampa",
    blurb: "Concerts, open-air shows and bar gigs.",
    to: "/?category=Live+Music",
    tag: "Live Music",
  },
  {
    title: "Free things to do in Tampa",
    blurb: "Listings marked free by the organizer.",
    to: "/?free=1",
    tag: "Free",
  },
  {
    title: "Family-friendly Tampa",
    blurb: "Kids' activities and all-ages outings.",
    to: "/?family=1",
    tag: "Family",
  },
  {
    title: "Tampa markets",
    blurb: "Farmers markets, makers' markets and pop-ups.",
    to: "/?category=Markets",
    tag: "Markets",
  },
  {
    title: "Ybor City nights",
    blurb: "Nightlife and late shows on 7th Avenue and nearby.",
    to: "/?neighborhood=Ybor+City",
    tag: "Ybor City",
  },
];

function Guides({ counts }: { counts: (to: string) => number }) {
  return (
    <section
      id="guides"
      className="scroll-mt-20"
      aria-labelledby="guides-heading"
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.16em] text-sunset-ink uppercase">
            Tampa guides
          </p>
          <h2
            id="guides-heading"
            className="mt-1 font-heading text-3xl font-semibold"
          >
            Start with a shortcut
          </h2>
        </div>
      </div>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {GUIDES.map(g => {
          const n = counts(g.to);
          return (
            <li key={g.title}>
              <Link
                to={g.to}
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="group flex h-full flex-col justify-between gap-4 rounded-xl border bg-card p-5 transition hover:border-foreground/30 hover:shadow-md"
              >
                <div>
                  <span className="text-xs font-bold tracking-[0.12em] text-primary uppercase">
                    {g.tag}
                  </span>
                  <h3 className="mt-1.5 font-heading text-xl leading-snug font-semibold group-hover:text-primary">
                    {g.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {g.blurb}
                  </p>
                </div>
                <span className="text-sm font-semibold text-muted-foreground">
                  {n === 0
                    ? "No listings yet"
                    : `${n} upcoming ${n === 1 ? "event" : "events"}`}{" "}
                  →
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: ClipboardList,
      title: "Organizers submit",
      body: "Hosts send their event through our form. It's free and takes about three minutes.",
    },
    {
      icon: ShieldCheck,
      title: "We check the source",
      body: "Each event is confirmed against the organizer's or venue's own page before it's approved.",
    },
    {
      icon: BadgeCheck,
      title: "Re-checked before it happens",
      body: "Anything starting within 14 days is verified again, and finished events are removed.",
    },
  ];
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20"
      aria-labelledby="how-heading"
    >
      <p className="text-xs font-bold tracking-[0.16em] text-sunset-ink uppercase">
        How listings work
      </p>
      <h2 id="how-heading" className="mt-1 font-heading text-3xl font-semibold">
        Checked by people, not scraped
      </h2>
      <ol className="mt-6 grid gap-3 md:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <s.icon className="size-4.5" aria-hidden />
              </span>
              <span className="font-heading text-sm font-semibold text-muted-foreground">
                Step {i + 1}
              </span>
            </div>
            <h3 className="mt-3 font-heading text-lg font-semibold">
              {s.title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function EventsPage() {
  const { status, events, today, stale, reload } = useEvents();
  const [filters, update, clear] = useFilters();
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [searchDraft, setSearchDraft] = useState(filters.q);

  const filtered = useMemo(
    () => applyFilters(events, filters, today),
    [events, filters, today],
  );
  const anyFilter =
    !!filters.q ||
    filters.date !== "all" ||
    !!filters.on ||
    !!filters.category ||
    !!filters.neighborhood ||
    filters.free ||
    filters.family;
  const count = events.length;
  const guideCount = (to: string) => {
    const p = new URLSearchParams(to.split("?")[1]);
    return applyFilters(
      events,
      {
        q: "",
        date: (p.get("date") as DateFilter) ?? "all",
        on: "",
        category: p.get("category") ?? "",
        neighborhood: p.get("neighborhood") ?? "",
        free: p.get("free") === "1",
        family: p.get("family") === "1",
      },
      today,
    ).length;
  };

  return (
    <div className="paper-grain">
      {/* Hero */}
      <section className="container pt-10 pb-8 sm:pt-14">
        <p className="flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-muted-foreground uppercase">
          <CalendarDays className="size-3.5" aria-hidden /> Tampa, Florida ·
          Updated daily
        </p>
        <h1 className="mt-3 max-w-4xl font-heading text-[2.6rem] leading-[1.02] font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl">
          Events in Tampa,{" "}
          <em className="font-medium text-sunset-ink">this weekend</em> and
          beyond
        </h1>
        <p
          className="mt-4 max-w-2xl text-lg text-muted-foreground"
          data-testid="event-count"
        >
          {status === "loading" ? (
            <span className="inline-block h-5 w-64 animate-pulse rounded bg-secondary align-middle" />
          ) : status === "error" ? (
            "Festivals, markets, live music and more, checked with the organizers."
          ) : (
            <>
              <strong className="font-bold text-foreground">
                {count} upcoming {count === 1 ? "event" : "events"}
              </strong>{" "}
              {count === 0
                ? "listed so far. The first verified Tampa events are on their way."
                : "happening in Tampa, FL: live music, food, markets, family fun and more."}
            </>
          )}
        </p>
        <div className="mt-6 max-w-3xl">
          <SubmitCallout />
        </div>
        <SignupBanner className="mt-6 max-w-3xl" />
      </section>

      {/* Finder */}
      <section className="container" aria-labelledby="finder-heading">
        <div className="rounded-2xl border bg-card/90 p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <h2
              id="finder-heading"
              className="font-heading text-2xl font-semibold"
            >
              Find your next outing
            </h2>
            <p
              className="text-sm text-muted-foreground"
              data-testid="results-line"
            >
              {status === "ready"
                ? `${filtered.length} of ${count} ${count === 1 ? "listing" : "listings"}`
                : "\u00a0"}
              {anyFilter ? (
                <button
                  type="button"
                  onClick={() => {
                    clear();
                    setSearchDraft("");
                  }}
                  className="ml-3 font-semibold text-primary hover:underline"
                >
                  Clear filters
                </button>
              ) : null}
            </p>
          </div>
          <form
            className="relative mt-4"
            role="search"
            onSubmit={e => {
              e.preventDefault();
              update({ q: searchDraft });
            }}
          >
            <Search
              className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              value={searchDraft}
              onChange={e => {
                setSearchDraft(e.target.value);
                update({ q: e.target.value });
              }}
              placeholder="Search events, venues or categories"
              aria-label="Search events, venues or categories"
              className="h-12 w-full rounded-full border border-input bg-background pr-4 pl-11 text-base outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </form>

          <div className="mt-4 space-y-3">
            <div
              className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
              role="group"
              aria-label="Date"
            >
              {DATE_FILTERS.map(d => (
                <Chip
                  key={d.value}
                  active={!filters.on && filters.date === d.value}
                  onClick={() => update({ date: d.value, on: "" })}
                >
                  {d.label}
                </Chip>
              ))}
              <label
                className={cn(
                  "relative flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold",
                  filters.on
                    ? "border-foreground bg-foreground text-background"
                    : "bg-card",
                )}
              >
                <CalendarDays className="size-4" aria-hidden />
                <span className="sr-only">Pick a date</span>
                <input
                  type="date"
                  min={today}
                  value={filters.on}
                  onChange={e => update({ on: e.target.value })}
                  className="bg-transparent text-sm outline-none [color-scheme:light]"
                  data-testid="date-picker"
                />
              </label>
            </div>

            <div
              className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
              role="group"
              aria-label="Category"
            >
              <Chip
                active={!filters.category}
                onClick={() => update({ category: "" })}
              >
                All categories
              </Chip>
              {EVENT_CATEGORIES.map(c => (
                <Chip
                  key={c}
                  active={filters.category === c}
                  onClick={() =>
                    update({ category: filters.category === c ? "" : c })
                  }
                >
                  {c}
                </Chip>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="relative">
                <span className="sr-only">Neighborhood</span>
                <MapPin
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <select
                  value={filters.neighborhood}
                  onChange={e => update({ neighborhood: e.target.value })}
                  className="h-9 appearance-none rounded-full border bg-card pr-8 pl-9 text-sm font-semibold"
                  data-testid="neighborhood-select"
                >
                  <option value="">All neighborhoods</option>
                  {NEIGHBORHOODS.map(n => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <Chip
                active={filters.free}
                onClick={() => update({ free: !filters.free })}
              >
                🎟️ Free only
              </Chip>
              <Chip
                active={filters.family}
                onClick={() => update({ family: !filters.family })}
              >
                Family friendly
              </Chip>
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <section
        className="container mt-8"
        aria-label="Upcoming events"
        aria-live="polite"
      >
        {stale ? (
          <p className="mb-4 rounded-lg border border-warning/50 bg-warning/15 px-4 py-2 text-sm text-warning-foreground">
            Showing the last saved calendar while we reconnect. Listings may be
            a few minutes behind.
          </p>
        ) : null}
        {status === "loading" ? (
          <ul className="grid gap-3" aria-busy="true">
            {[0, 1, 2].map(i => (
              <li
                key={i}
                className="h-28 animate-pulse rounded-xl border bg-card"
              />
            ))}
          </ul>
        ) : status === "error" ? (
          <div
            className="rounded-2xl border bg-card p-8 text-center"
            data-testid="load-error"
          >
            <h2 className="font-heading text-2xl font-semibold">
              We couldn't load the calendar right now
            </h2>
            <p className="mt-2 text-muted-foreground">
              This is on our side. Please try again in a moment.
            </p>
            <button
              type="button"
              onClick={reload}
              className="mt-5 inline-flex items-center gap-2 rounded-full border px-5 py-2.5 font-semibold hover:bg-accent"
            >
              <RefreshCw className="size-4" aria-hidden /> Try again
            </button>
          </div>
        ) : count === 0 ? (
          <EmptyCalendar />
        ) : filtered.length === 0 ? (
          <div
            className="rounded-2xl border bg-card p-8 text-center"
            data-testid="no-matches"
          >
            <h2 className="font-heading text-2xl font-semibold">
              No events match those filters
            </h2>
            <p className="mt-2 text-muted-foreground">
              Try a wider date range or another category.
            </p>
            <button
              type="button"
              onClick={() => {
                clear();
                setSearchDraft("");
              }}
              className="mt-5 inline-flex items-center gap-2 rounded-full border px-5 py-2.5 font-semibold hover:bg-accent"
            >
              <X className="size-4" aria-hidden /> Clear filters
            </button>
          </div>
        ) : (
          <>
            <ul className="grid gap-3">
              {filtered.slice(0, visible).map(ev => (
                <EventCard key={ev.key} ev={ev} today={today} />
              ))}
            </ul>
            {filtered.length > visible ? (
              <div className="mt-6 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => setVisible(v => v + PAGE_SIZE)}
                  className="rounded-full border bg-card px-6 py-3 font-semibold hover:bg-accent"
                >
                  Load more events
                </button>
                <span className="text-sm text-muted-foreground">
                  Showing {visible} of {filtered.length}
                </span>
              </div>
            ) : null}
          </>
        )}
      </section>

      <div className="container mt-16 space-y-16">
        <Guides counts={guideCount} />
        <HowItWorks />
        <SubmitCallout compact />
      </div>
    </div>
  );
}
