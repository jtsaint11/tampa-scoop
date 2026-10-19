import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { BusinessCard } from "@/components/site/BusinessCard";
import { CategoryIcon, Eyebrow } from "@/components/site/bits";
import { useDirectory } from "@/hooks/useDirectory";
import { EVENTS_URL, plural } from "@/lib/site";
import { CategoryTile } from "@/pages/HomePage";
import type { PublicCategory } from "../../convex/lib/directory";

const PAGE = 10;

/** Splits a free-text sheet cell into paragraphs on blank lines. */
function paragraphs(s: string): string[] {
  return s
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean);
}

/** FAQs cell: blocks separated by blank lines; first line is the question. */
function faqs(s: string): { q: string; a: string }[] {
  return paragraphs(s).map(block => {
    const [first, ...rest] = block.split("\n");
    return {
      q: first.replace(/^Q[:.]\s*/i, ""),
      a: rest.join("\n").replace(/^A[:.]\s*/i, ""),
    };
  });
}

export function MoreCategories({
  current,
  categories,
}: {
  current?: string;
  categories: PublicCategory[];
}) {
  const others = categories.filter(c => c.slug !== current).slice(0, 8);
  if (!others.length) return null;
  return (
    <section className="container mt-16" aria-labelledby="more-heading">
      <Eyebrow>Keep exploring</Eyebrow>
      <h2
        id="more-heading"
        className="mt-1 font-heading text-3xl font-semibold"
      >
        More Tampa services
      </h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {others.map(c => (
          <CategoryTile key={c.slug} c={c} />
        ))}
      </div>
      <Link
        to="/#categories"
        className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
      >
        View all {categories.length} categories{" "}
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </section>
  );
}

export function CategoryPage() {
  const { slug = "" } = useParams();
  const { status, categories, businesses } = useDirectory();
  const [shown, setShown] = useState(PAGE);
  useEffect(() => setShown(PAGE), [slug]);
  const cat = categories.find(c => c.slug === slug);

  useEffect(() => {
    document.title = cat
      ? `${cat.headline} | The Tampa Scoop Directory`
      : "Tampa Business Directory | The Tampa Scoop";
  }, [cat]);

  if (status === "loading") {
    return (
      <div className="container py-16">
        <div className="h-40 animate-pulse rounded-2xl border bg-card" />
      </div>
    );
  }
  if (!cat) {
    return (
      <div className="container py-16">
        <div className="mx-auto max-w-xl rounded-2xl border bg-card p-8 text-center">
          <h1 className="font-heading text-3xl font-semibold">
            Category not found
          </h1>
          <p className="mt-2 text-muted-foreground">
            {status === "error"
              ? "We couldn't load the directory right now."
              : "That category isn't in the Tampa directory."}
          </p>
          <Link
            to="/"
            className="mt-5 inline-flex rounded-full bg-primary px-5 py-2.5 font-bold text-primary-foreground"
          >
            Back to the directory
          </Link>
        </div>
      </div>
    );
  }

  const list = businesses.filter(b => b.categorySlug === cat.slug);
  const featured = list.filter(b => b.featured);
  const rest = list.filter(b => !b.featured);
  const guide = paragraphs(cat.buyingGuide);
  const faq = faqs(cat.faqs);
  const lower = /^[A-Z]{2,}$/.test(cat.name)
    ? cat.name
    : cat.name.toLowerCase();

  return (
    <div className="paper-grain">
      <div className="container pt-8 sm:pt-12">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1 text-sm font-semibold text-muted-foreground"
        >
          <Link to="/" className="text-primary hover:underline">
            Directory
          </Link>
          <ChevronRight className="size-4" aria-hidden />
          <span>{cat.name}</span>
        </nav>
        <div className="mt-6 flex items-start gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <CategoryIcon slug={cat.slug} className="size-7" />
          </span>
          <div>
            <h1 className="font-heading text-4xl leading-tight font-semibold text-balance sm:text-5xl">
              {cat.headline}
            </h1>
            <p
              className="mt-2 text-muted-foreground"
              data-testid="category-summary"
            >
              {plural(list.length, "business", "businesses")} ·{" "}
              {featured.length} featured
            </p>
          </div>
        </div>
      </div>

      {list.length === 0 ? (
        <section className="container mt-10">
          <div
            className="relative overflow-hidden rounded-2xl border bg-card p-6 sm:p-10"
            data-testid="category-empty"
          >
            <div
              className="sunset-stripe absolute inset-y-0 left-0 w-1.5"
              aria-hidden
            />
            <Eyebrow>Opening soon</Eyebrow>
            <h2 className="mt-2 max-w-2xl font-heading text-2xl leading-tight font-semibold text-balance sm:text-3xl">
              No verified {lower} listed yet.
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              We're checking Tampa {lower} against city tax receipts, license
              records and their own sites before anything goes live, so this
              page stays empty rather than guessing. Own one? Get listed free.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/list-your-business"
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-sunset px-6 py-3 font-bold text-sunset-foreground shadow-sm hover:brightness-110"
              >
                Add your business <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-1.5 rounded-full border px-6 py-3 font-semibold hover:bg-accent"
              >
                <ArrowLeft className="size-4" aria-hidden /> All categories
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <>
          {featured.length ? (
            <section
              className="container mt-10"
              aria-labelledby="featured-heading"
            >
              <h2
                id="featured-heading"
                className="font-heading text-2xl font-semibold"
              >
                Featured businesses
              </h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {featured.map(b => (
                  <BusinessCard key={b.slug} b={b} />
                ))}
              </div>
            </section>
          ) : null}
          {rest.length ? (
            <section className="container mt-10" aria-labelledby="all-heading">
              <h2
                id="all-heading"
                className="font-heading text-2xl font-semibold"
              >
                {featured.length ? "All businesses" : `Tampa ${lower}`}
              </h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {rest.slice(0, shown).map(b => (
                  <BusinessCard key={b.slug} b={b} compact />
                ))}
              </div>
              {rest.length > shown ? (
                <button
                  type="button"
                  onClick={() => setShown(s => s + PAGE)}
                  className="mt-5 rounded-full border bg-card px-5 py-2.5 font-semibold hover:bg-accent"
                >
                  Load more ({Math.min(PAGE, rest.length - shown)} more)
                </button>
              ) : null}
            </section>
          ) : null}
          <section className="container mt-10">
            <div className="flex flex-col gap-3 rounded-2xl border border-sunset/30 bg-sunset-soft/70 p-5 sm:flex-row sm:items-center sm:justify-between">
              <p>
                <strong>Own a {cat.name} business in Tampa?</strong> Get listed
                free, or claim your listing to keep it current.
              </p>
              <Link
                to="/list-your-business"
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-sunset px-5 py-2.5 text-sm font-bold text-sunset-foreground"
              >
                List your business <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </section>
        </>
      )}

      {guide.length ? (
        <section
          className="container mt-14 max-w-3xl"
          aria-labelledby="guide-heading"
          data-testid="buying-guide"
        >
          <h2
            id="guide-heading"
            className="font-heading text-3xl font-semibold"
          >
            Hiring {lower} in Tampa
          </h2>
          <div className="mt-4 space-y-4 text-[1.05rem] leading-relaxed">
            {guide.map(p => (
              <p key={p.slice(0, 40)} className="whitespace-pre-line">
                {p}
              </p>
            ))}
          </div>
        </section>
      ) : null}
      {faq.length ? (
        <section
          className="container mt-12 max-w-3xl"
          aria-labelledby="faq-heading"
        >
          <h2 id="faq-heading" className="font-heading text-3xl font-semibold">
            {cat.name} in Tampa: FAQs
          </h2>
          <div className="mt-4 divide-y rounded-2xl border bg-card">
            {faq.map(f => (
              <details key={f.q} className="group p-5">
                <summary className="cursor-pointer font-heading text-lg font-semibold">
                  {f.q}
                </summary>
                {f.a ? (
                  <p className="mt-2 whitespace-pre-line text-muted-foreground">
                    {f.a}
                  </p>
                ) : null}
              </details>
            ))}
          </div>
        </section>
      ) : null}

      <section className="container mt-12">
        <p className="text-sm text-muted-foreground">
          Planning something fun instead? See what's on in the{" "}
          <a
            href={EVENTS_URL}
            className="font-semibold text-primary hover:underline"
          >
            Tampa events calendar ↗
          </a>
        </p>
      </section>
      <MoreCategories current={cat.slug} categories={categories} />
    </div>
  );
}
