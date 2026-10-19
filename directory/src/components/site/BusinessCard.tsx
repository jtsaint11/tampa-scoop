import { ArrowRight, Globe, MapPin, Phone } from "lucide-react";
import { Link } from "react-router";
import { ClaimedBadge, FeaturedBadge, LogoTile } from "@/components/site/bits";
import { hostOf, telHref } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { PublicBusiness } from "../../../convex/lib/directory";

export function BusinessCard({
  b,
  compact,
}: {
  b: PublicBusiness;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <Link
        to={`/business/${b.slug}`}
        className="group flex items-center gap-3 rounded-xl border bg-card p-3.5 transition hover:border-primary/40"
        data-testid="business-row"
      >
        <LogoTile name={b.name} logoUrl={b.logoUrl} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-heading font-semibold group-hover:text-primary">
              {b.name}
            </span>
            {b.claimed ? <ClaimedBadge /> : null}
          </span>
          <span className="block truncate text-sm text-muted-foreground">
            {[b.category, b.neighborhood || b.zip].filter(Boolean).join(" · ")}
          </span>
        </span>
        <span className="hidden shrink-0 text-sm font-semibold text-primary sm:inline">
          View info →
        </span>
      </Link>
    );
  }
  return (
    <article
      className={cn(
        "flex flex-col rounded-2xl border bg-card p-5 transition hover:shadow-md",
        b.featured && "border-sunset/40 ring-1 ring-sunset/20",
      )}
      data-testid="business-card"
    >
      <div className="flex items-start gap-3.5">
        <LogoTile name={b.name} logoUrl={b.logoUrl} />
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1.5">
            {b.featured ? <FeaturedBadge /> : null}
            {b.claimed ? <ClaimedBadge /> : null}
          </div>
          <h3 className="mt-1.5 font-heading text-xl leading-snug font-semibold">
            <Link to={`/business/${b.slug}`} className="hover:text-primary">
              {b.name}
            </Link>
          </h3>
          {b.address ? (
            <p className="mt-0.5 flex items-start gap-1 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />{" "}
              {b.address}
            </p>
          ) : null}
        </div>
      </div>
      {b.description ? (
        <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
          {b.description}
        </p>
      ) : null}
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-4 text-sm font-semibold">
        <Link
          to={`/business/${b.slug}`}
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          View details <ArrowRight className="size-4" aria-hidden />
        </Link>
        {b.phone ? (
          <a
            href={telHref(b.phone)}
            className="inline-flex items-center gap-1 hover:text-primary"
          >
            <Phone className="size-3.5" aria-hidden /> {b.phone}
          </a>
        ) : null}
        {b.website ? (
          <a
            href={b.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-primary"
          >
            <Globe className="size-3.5" aria-hidden /> {hostOf(b.website)}
          </a>
        ) : null}
      </div>
    </article>
  );
}
