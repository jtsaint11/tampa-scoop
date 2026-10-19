import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ClipboardCheck,
  MapPin,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { BusinessCard } from "@/components/site/BusinessCard";
import { CategoryIcon, Eyebrow } from "@/components/site/bits";
import { SignupBanner } from "@/components/site/ScoopNav";
import { useDirectory } from "@/hooks/useDirectory";
import {
  EVENTS_SUBMIT_URL,
  EVENTS_URL,
  EVENTS_WEEKEND_URL,
  plural,
} from "@/lib/site";
import { cn } from "@/lib/utils";
import type {
  PublicBusiness,
  PublicCategory,
} from "../../convex/lib/directory";

function matches(q: string, ...fields: string[]) {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hay = fields.join(" ").toLowerCase();
  return terms.every(t => hay.includes(t));
}

export function CategoryTile({ c }: { c: PublicCategory }) {
  return (
    <Link
      to={`/category/${c.slug}`}
      className="group flex items-center gap-3.5 rounded-2xl border bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
      data-testid="category-tile"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
        <CategoryIcon slug={c.slug} className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block font-heading text-[1.05rem] leading-snug font-semibold group-hover:text-primary">
          {c.name}
        </span>
        <span
          className="text-sm text-muted-foreground"
          data-testid="category-count"
        >
          {plural(c.count, "business", "businesses")}
        </span>
      </span>
    </Link>
  );
}

function SearchResults({
  q,
  categories,
  businesses,
}: {
  q: string;
  categories: PublicCategory[];
  businesses: PublicBusiness[];
}) {
  const cats = categories.filter(c => matches(q, c.name, c.slug, c.group));
  const biz = businesses.filter(b =>
    matches(
      q,
      b.name,
      b.category,
      b.neighborhood,
      b.zip,
      b.services,
      b.address,
      b.description,
    ),
  );
  return (
    <div className="mt-4 space-y-4" data-testid="search-results">
      {cats.length ? (
        <div className="flex flex-wrap gap-2">
          {cats.map(c => (
            <Link
              key={c.slug}
              to={`/category/${c.slug}`}
              className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3.5 py-1.5 text-sm font-semibold hover:border-primary hover:text-primary"
            >
              <CategoryIcon slug={c.slug} className="size-4" /> {c.name} ·{" "}
              {c.count}
            </Link>
          ))}
        </div>
      ) : null}
      {biz.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {biz.slice(0, 8).map(b => (
            <BusinessCard key={b.slug} b={b} compact />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground" data-testid="search-empty">
          {businesses.length === 0
            ? "No businesses are listed yet, so there's nothing to search. Browse a category below or check back soon."
            : `No listed businesses match "${q}".`}
        </p>
      )}
    </div>
  );
}

function AddBusinessNote({ empty }: { empty: boolean }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border bg-card p-6 sm:p-10"
      data-testid="add-business-note"
    >
      <div
        className="sunset-stripe absolute inset-y-0 left-0 w-1.5"
        aria-hidden
      />
      <Eyebrow>
        {empty ? "The directory is opening" : "Own a Tampa business?"}
      </Eyebrow>
      <h2 className="mt-2 max-w-2xl font-heading text-2xl leading-tight font-semibold text-balance sm:text-3xl">
        {empty
          ? "No listings yet. We're verifying the first Tampa businesses now."
          : "Get your business in front of Tampa locals."}
      </h2>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        {empty
          ? "We only publish businesses we've checked against official sources (city tax receipts, chambers, license databases and the business's own site), so every category starts at zero rather than guessing. Run a Tampa business? Yours could be one of the first listings."
          : "Basic listings are free. Every one is checked by a person before it goes live, and owners can claim theirs to keep details current."}
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          to="/list-your-business"
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-sunset px-6 py-3 font-bold text-sunset-foreground shadow-sm transition hover:brightness-110"
        >
          Add your business <ArrowRight className="size-4" aria-hidden />
        </Link>
        <Link
          to="/list-your-business#how-it-works"
          className="inline-flex items-center justify-center rounded-full border px-6 py-3 font-semibold hover:bg-accent"
        >
          How listings work
        </Link>
      </div>
    </div>
  );
}

export function EventsModule() {
  return (
    <section
      className="container mt-16"
      aria-labelledby="events-heading"
      data-testid="events-module"
    >
      <div className="grid gap-6 overflow-hidden rounded-3xl border bg-primary p-6 text-primary-foreground sm:p-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div>
          <p className="text-xs font-bold tracking-[0.16em] uppercase opacity-80">
            From the Tampa Scoop calendar
          </p>
          <h2
            id="events-heading"
            className="mt-2 font-heading text-3xl leading-tight font-semibold text-balance sm:text-4xl"
          >
            Plan your Tampa week,{" "}
            <em className="font-normal">not just your repairs</em>
          </h2>
          <p className="mt-3 max-w-xl opacity-90">
            Festivals, markets, live music and family outings, each checked
            against the organizer or venue before it's listed.
          </p>
        </div>
        <div className="grid gap-2.5">
          {[
            {
              href: EVENTS_WEEKEND_URL,
              title: "Things to do this weekend",
              sub: "Friday to Sunday in Tampa",
            },
            {
              href: EVENTS_URL,
              title: "Full Tampa events calendar",
              sub: "Browse by date, category and neighborhood",
            },
            {
              href: EVENTS_SUBMIT_URL,
              title: "Hosting an event?",
              sub: "Submit it free for review",
            },
          ].map(l => (
            <a
              key={l.title}
              href={l.href}
              className="group flex items-center justify-between gap-3 rounded-2xl bg-background/10 px-5 py-4 transition hover:bg-background/20"
            >
              <span>
                <span className="block font-bold">{l.title}</span>
                <span className="text-sm opacity-80">{l.sub}</span>
              </span>
              <ArrowUpRight
                className="size-5 shrink-0 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden
              />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const steps = [
    {
      icon: ClipboardCheck,
      title: "Sourced from official records",
      body: "We start from City of Tampa tax receipts, chamber directories, license databases and the business's own site.",
    },
    {
      icon: ShieldCheck,
      title: "Checked by a person",
      body: "Every page gets an original summary and a last-verified date. No scraped reviews, no invented prices.",
    },
    {
      icon: CalendarDays,
      title: "Kept current",
      body: "Owners can claim their listing. Spot something wrong? Tell us and we'll re-check it against the source.",
    },
  ];
  return (
    <section
      id="how-it-works"
      className="container mt-16 scroll-mt-24"
      aria-labelledby="how-heading"
    >
      <Eyebrow>How listings work</Eyebrow>
      <h2 id="how-heading" className="mt-1 font-heading text-3xl font-semibold">
        Verified by people, not scraped
      </h2>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {steps.map((s, i) => (
          <div key={s.title} className="rounded-2xl border bg-card p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-accent text-primary">
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
          </div>
        ))}
      </div>
    </section>
  );
}

export function HomePage() {
  const { status, categories, businesses, stale, reload } = useDirectory();
  const [q, setQ] = useState("");
  const featured = useMemo(
    () => businesses.filter(b => b.featured).slice(0, 6),
    [businesses],
  );
  const n = businesses.length;
  const m = categories.length;
  const loading = status === "loading";

  return (
    <div className="paper-grain">
      <section className="container pt-10 pb-6 sm:pt-14">
        <p className="flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-muted-foreground uppercase">
          <MapPin className="size-3.5" aria-hidden /> Tampa, Florida · Local
          business directory
        </p>
        <h1 className="mt-3 max-w-4xl font-heading text-[2.6rem] leading-[1.02] font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl">
          Tampa Business <em className="text-sunset-ink">Directory</em>
        </h1>
        <p
          className="mt-4 max-w-2xl text-lg text-muted-foreground"
          data-testid="hero-count"
        >
          Find trusted local businesses in Tampa, FL.{" "}
          {loading ? (
            <span className="inline-block h-4 w-56 animate-pulse rounded bg-muted align-middle" />
          ) : status === "error" ? (
            <span>Browse our verified listings by category.</span>
          ) : (
            <>
              Browse{" "}
              <strong className="text-foreground">
                {plural(n, "business", "businesses")}
              </strong>{" "}
              across{" "}
              <strong className="text-foreground">
                {plural(m, "category", "categories")}
              </strong>
              .
            </>
          )}
        </p>

        <SignupBanner className="mt-6" />

        <div className="mt-8 rounded-2xl border bg-card/90 p-4 shadow-sm sm:p-6">
          <label
            htmlFor="directory-search"
            className="font-heading text-2xl font-semibold"
          >
            Who do you need?
          </label>
          <div className="relative mt-3">
            <Search
              className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              id="directory-search"
              type="search"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search businesses, services, neighborhoods or ZIPs"
              className="w-full rounded-full border border-input bg-background py-3 pr-11 pl-12 text-base outline-none placeholder:text-muted-foreground/80 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            {q ? (
              <button
                type="button"
                onClick={() => setQ("")}
                aria-label="Clear search"
                className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1.5 hover:bg-accent"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
          {q.trim() ? (
            <SearchResults
              q={q.trim()}
              categories={categories}
              businesses={businesses}
            />
          ) : null}
        </div>
        {stale ? (
          <p className="mt-3 text-sm text-warning-foreground">
            Showing the last saved directory; a live refresh failed.
          </p>
        ) : null}
      </section>

      {status === "error" ? (
        <section className="container mt-6">
          <div
            className="rounded-2xl border bg-card p-8 text-center"
            data-testid="load-error"
          >
            <h2 className="font-heading text-2xl font-semibold">
              We couldn't load the directory right now
            </h2>
            <p className="mt-2 text-muted-foreground">
              Please try again in a moment.
            </p>
            <button
              type="button"
              onClick={reload}
              className="mt-5 rounded-full bg-primary px-5 py-2.5 font-bold text-primary-foreground"
            >
              Try again
            </button>
          </div>
        </section>
      ) : null}

      {featured.length ? (
        <section className="container mt-10" aria-labelledby="featured-heading">
          <Eyebrow>⭐ Featured</Eyebrow>
          <h2
            id="featured-heading"
            className="mt-1 font-heading text-3xl font-semibold"
          >
            Featured Tampa businesses
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featured.map(b => (
              <BusinessCard key={b.slug} b={b} />
            ))}
          </div>
        </section>
      ) : null}

      <section
        id="categories"
        className="container mt-10 scroll-mt-24"
        aria-labelledby="categories-heading"
      >
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <Eyebrow>Browse by category</Eyebrow>
            <h2
              id="categories-heading"
              className="mt-1 font-heading text-3xl font-semibold"
            >
              Local pros and favorite spots
            </h2>
          </div>
          {status === "ready" ? (
            <p className="text-sm text-muted-foreground">
              {plural(m, "category", "categories")}
            </p>
          ) : null}
        </div>
        <div
          className={cn("mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4")}
          data-testid="category-grid"
        >
          {loading
            ? Array.from({ length: 8 }, (_, i) => (
                <div
                  key={i}
                  className="h-[4.75rem] animate-pulse rounded-2xl border bg-card"
                />
              ))
            : categories.map(c => <CategoryTile key={c.slug} c={c} />)}
        </div>
      </section>

      {status === "ready" ? (
        <section className="container mt-12">
          <AddBusinessNote empty={n === 0} />
        </section>
      ) : null}

      <EventsModule />
      <HowItWorks />
    </div>
  );
}
