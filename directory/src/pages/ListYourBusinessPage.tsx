import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import { Eyebrow } from "@/components/site/bits";
import { HowItWorks } from "@/pages/HomePage";

/**
 * Explains how businesses get listed. There is no sign-up form yet: the site
 * only writes quote requests. Listings are added by the editor in the sheet.
 */
export function ListYourBusinessPage() {
  const card = "scroll-mt-24 rounded-2xl border bg-card p-6";
  return (
    <div className="paper-grain">
      <div className="container py-8 sm:py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden /> Tampa directory
        </Link>
        <Eyebrow className="mt-6">Free basic listing</Eyebrow>
        <h1 className="mt-2 max-w-3xl font-heading text-4xl leading-tight font-semibold text-balance sm:text-5xl">
          List your Tampa business
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
          Basic listings are free. We add businesses ourselves after checking
          them against official sources, so nothing on this directory is
          pay-to-play or scraped.
        </p>
        <div
          className="mt-8 grid gap-4 md:grid-cols-3"
          data-testid="list-options"
        >
          <div id="add" className={card}>
            <h2 className="font-heading text-xl font-semibold">Get added</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We're building the first categories now (HVAC, roofers, pool
              services, plumbers and restaurants first). Online sign-up opens
              soon; until then our editors add businesses as they verify them.
            </p>
          </div>
          <div id="claim" className={card}>
            <h2 className="font-heading text-xl font-semibold">
              Claim your listing
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Already listed? Claimed listings show a{" "}
              <strong className="text-primary">Claimed</strong> badge and can
              switch on free quote requests from Tampa readers. Claiming opens
              with sign-up.
            </p>
          </div>
          <div id="correct" className={card}>
            <h2 className="font-heading text-xl font-semibold">Fix a detail</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Every page shows when it was last verified. If something changed,
              it's re-checked against the official source before the page is
              updated.
            </p>
          </div>
        </div>
      </div>
      <HowItWorks />
    </div>
  );
}
