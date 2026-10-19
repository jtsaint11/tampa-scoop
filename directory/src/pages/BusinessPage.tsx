import {
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  Clock,
  Globe,
  Instagram,
  MapPin,
  Navigation,
  Phone,
  ShieldCheck,
  Siren,
  Tag,
  Wrench,
} from "lucide-react";
import { useEffect } from "react";
import { Link, useParams } from "react-router";
import { BusinessCard } from "@/components/site/BusinessCard";
import {
  ClaimedBadge,
  Eyebrow,
  FeaturedBadge,
  LogoTile,
} from "@/components/site/bits";
import { QuoteForm } from "@/components/site/QuoteForm";
import { useDirectory } from "@/hooks/useDirectory";
import {
  directionsHref,
  EVENTS_URL,
  hostOf,
  longDate,
  telHref,
} from "@/lib/site";
import { MoreCategories } from "@/pages/CategoryPage";

function Detail({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Clock;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 py-3">
      <Icon className="mt-0.5 size-4.5 shrink-0 text-primary" aria-hidden />
      <div className="min-w-0">
        <dt className="text-xs font-bold tracking-[0.1em] text-muted-foreground uppercase">
          {label}
        </dt>
        <dd className="mt-0.5 break-words">{children}</dd>
      </div>
    </div>
  );
}

export function BusinessPage() {
  const { slug = "" } = useParams();
  const { status, businesses, categories } = useDirectory();
  const b = businesses.find(x => x.slug === slug);

  useEffect(() => {
    document.title = b
      ? `${b.name} | ${b.category} in Tampa, FL | The Tampa Scoop`
      : "Tampa Business Directory | The Tampa Scoop";
  }, [b]);

  if (status === "loading") {
    return (
      <div className="container py-16">
        <div className="h-60 animate-pulse rounded-2xl border bg-card" />
      </div>
    );
  }
  if (!b) {
    return (
      <div className="container py-16">
        <div
          className="mx-auto max-w-xl rounded-2xl border bg-card p-8 text-center"
          data-testid="business-missing"
        >
          <h1 className="font-heading text-3xl font-semibold">
            This listing isn't available
          </h1>
          <p className="mt-2 text-muted-foreground">
            {status === "error"
              ? "We couldn't load the directory right now."
              : "It may have been removed or renamed while we re-verify it."}
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

  const others = businesses
    .filter(x => x.categorySlug === b.categorySlug && x.slug !== b.slug)
    .slice(0, 6);
  const btn =
    "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 font-bold transition";

  return (
    <div className="paper-grain">
      <div className="container pt-8 sm:pt-12">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1 text-sm font-semibold text-muted-foreground"
        >
          <Link to="/" className="text-primary hover:underline">
            Directory
          </Link>
          <ChevronRight className="size-4" aria-hidden />
          <Link
            to={`/category/${b.categorySlug}`}
            className="text-primary hover:underline"
          >
            {b.category}
          </Link>
          <ChevronRight className="size-4" aria-hidden />
          <span className="truncate">{b.name}</span>
        </nav>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_24rem]">
          <div className="min-w-0">
            <div className="flex items-start gap-4">
              <LogoTile name={b.name} logoUrl={b.logoUrl} size="lg" />
              <div className="min-w-0">
                <div className="flex flex-wrap gap-1.5">
                  <Link
                    to={`/category/${b.categorySlug}`}
                    className="inline-flex items-center gap-1 rounded-full border bg-card px-2.5 py-0.5 text-xs font-bold hover:border-primary"
                  >
                    <Tag className="size-3" aria-hidden /> {b.category}
                  </Link>
                  {b.claimed ? <ClaimedBadge /> : null}
                  {b.featured ? <FeaturedBadge /> : null}
                </div>
                <h1 className="mt-2 font-heading text-4xl leading-tight font-semibold text-balance sm:text-5xl">
                  {b.name}
                </h1>
                {b.address ? (
                  <p className="mt-1.5 flex items-start gap-1.5 text-muted-foreground">
                    <MapPin className="mt-1 size-4 shrink-0" aria-hidden />
                    {b.address}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2.5">
              {b.phone ? (
                <a
                  href={telHref(b.phone)}
                  className={`${btn} bg-primary text-primary-foreground hover:brightness-110`}
                >
                  <Phone className="size-4" aria-hidden /> Call now
                </a>
              ) : null}
              {b.website ? (
                <a
                  href={b.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${btn} border bg-card hover:bg-accent`}
                >
                  <Globe className="size-4" aria-hidden /> Visit website
                </a>
              ) : null}
              {b.address ? (
                <a
                  href={directionsHref(b.name, b.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${btn} border bg-card hover:bg-accent`}
                >
                  <Navigation className="size-4" aria-hidden /> Get directions
                </a>
              ) : null}
              {b.quoteEnabled ? (
                <a
                  href="#quote"
                  className={`${btn} bg-sunset text-sunset-foreground hover:brightness-110 lg:hidden`}
                >
                  Request a quote
                </a>
              ) : null}
            </div>

            {b.description ? (
              <section className="mt-10" aria-labelledby="about-heading">
                <h2
                  id="about-heading"
                  className="font-heading text-2xl font-semibold"
                >
                  About {b.name}
                </h2>
                <p className="mt-3 text-[1.05rem] leading-relaxed whitespace-pre-line">
                  {b.description}
                </p>
              </section>
            ) : null}

            <section
              className="mt-10 rounded-2xl border bg-card px-5 py-2"
              aria-labelledby="contact-heading"
            >
              <h2 id="contact-heading" className="sr-only">
                Contact information and details
              </h2>
              <dl className="divide-y">
                {b.phone ? (
                  <Detail icon={Phone} label="Phone">
                    <a
                      href={telHref(b.phone)}
                      className="font-semibold hover:text-primary"
                    >
                      {b.phone}
                    </a>
                  </Detail>
                ) : null}
                {b.website ? (
                  <Detail icon={Globe} label="Website">
                    <a
                      href={b.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-primary hover:underline"
                    >
                      {hostOf(b.website)}
                    </a>
                  </Detail>
                ) : null}
                {b.instagram ? (
                  <Detail icon={Instagram} label="Instagram">
                    <a
                      href={b.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-primary hover:underline"
                    >
                      {b.instagram
                        .replace(/^https?:\/\/(www\.)?instagram\.com\//, "@")
                        .replace(/\/$/, "")}
                    </a>
                  </Detail>
                ) : null}
                {b.address ? (
                  <Detail icon={MapPin} label="Address">
                    {b.address}
                    {b.neighborhood ? (
                      <span className="text-muted-foreground">
                        {" "}
                        · {b.neighborhood}
                      </span>
                    ) : null}
                  </Detail>
                ) : null}
                {b.hours ? (
                  <Detail icon={Clock} label="Hours">
                    <span className="whitespace-pre-line">{b.hours}</span>
                  </Detail>
                ) : null}
                {b.services ? (
                  <Detail icon={Wrench} label="Services & specialties">
                    {b.services}
                  </Detail>
                ) : null}
                {b.priceModel ? (
                  <Detail icon={Tag} label="Pricing">
                    {b.priceModel}
                  </Detail>
                ) : null}
                {b.licenseNumber ? (
                  <Detail icon={ShieldCheck} label="License">
                    {b.licenseNumber}
                  </Detail>
                ) : null}
                {b.emergency ? (
                  <Detail icon={Siren} label="Emergency / same-day">
                    Offers emergency or same-day service
                  </Detail>
                ) : null}
              </dl>
            </section>

            <p
              className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground"
              data-testid="last-verified"
            >
              <BadgeCheck className="size-4 text-primary" aria-hidden />
              {b.lastVerified
                ? `Details last verified ${longDate(b.lastVerified)} by The Tampa Scoop.`
                : "Verification date pending."}{" "}
              <Link
                to="/list-your-business#correct"
                className="font-semibold text-primary hover:underline"
              >
                Report a correction
              </Link>
            </p>

            {!b.claimed ? (
              <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-sunset/30 bg-sunset-soft/70 p-5 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  <strong>Is this your business?</strong> Claim your free
                  listing to keep your details current.
                </p>
                <Link
                  to="/list-your-business#claim"
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-sunset px-5 py-2.5 text-sm font-bold text-sunset-foreground"
                >
                  Claim this listing{" "}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            ) : null}
          </div>

          <aside
            id="quote"
            className="scroll-mt-24 lg:sticky lg:top-24 lg:self-start"
          >
            {b.quoteEnabled ? (
              <QuoteForm business={b} />
            ) : (
              <div className="rounded-2xl border bg-card p-5">
                <h2 className="font-heading text-xl font-semibold">
                  Get in touch
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Contact {b.name} directly using the details on this page.
                </p>
                {b.phone ? (
                  <a
                    href={telHref(b.phone)}
                    className={`${btn} mt-4 w-full bg-primary text-primary-foreground`}
                  >
                    <Phone className="size-4" aria-hidden /> {b.phone}
                  </a>
                ) : null}
              </div>
            )}
            <a
              href={EVENTS_URL}
              className="mt-4 block rounded-2xl border bg-card p-4 text-sm hover:border-primary/40"
            >
              <Eyebrow>Out and about?</Eyebrow>
              <span className="mt-1 block font-semibold">
                See what's on in Tampa this week ↗
              </span>
            </a>
          </aside>
        </div>
      </div>

      {others.length ? (
        <section className="container mt-16" aria-labelledby="others-heading">
          <h2
            id="others-heading"
            className="font-heading text-3xl font-semibold"
          >
            Other {b.category} in Tampa
          </h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {others.map(o => (
              <BusinessCard key={o.slug} b={o} compact />
            ))}
          </div>
        </section>
      ) : null}
      <MoreCategories current={b.categorySlug} categories={categories} />
    </div>
  );
}
