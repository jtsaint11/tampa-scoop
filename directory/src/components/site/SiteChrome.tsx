import { Link } from "react-router";
import { useDirectory } from "@/hooks/useDirectory";
import { EVENTS_URL, EVENTS_WEEKEND_URL } from "@/lib/site";
import { cn } from "@/lib/utils";
import {
  SCOOP_HOME_URL,
  ScoopNav,
  SignupBanner,
  SubscribeButton,
} from "./ScoopNav";

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn("group flex items-center gap-2.5", className)}
      aria-label="The Tampa Scoop directory, home"
    >
      <span className="sunset-stripe block h-7 w-2 rounded-full" aria-hidden />
      <span className="font-heading text-xl leading-none font-semibold tracking-tight sm:text-[1.4rem]">
        The Tampa <em className="text-sunset-ink">Scoop</em>
      </span>
      <span className="hidden rounded-full border px-2 py-0.5 text-[0.68rem] font-bold tracking-[0.12em] text-muted-foreground uppercase sm:inline">
        Directory
      </span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <ScoopNav
      current="directory"
      localCta={{
        to: "/list-your-business",
        label: "List your business",
        short: "List your Tampa business",
      }}
    />
  );
}

export function SiteFooter() {
  const { categories, fetchedAt } = useDirectory();
  const year = new Date().getFullYear();
  return (
    <footer className="mt-20 border-t bg-secondary/60">
      <div className="sunset-stripe h-1.5 w-full" aria-hidden />
      <div className="container pt-10">
        <SignupBanner testId="footer-signup-banner" />
      </div>
      <div className="container grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Wordmark />
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            A local guide to trusted businesses in Tampa, FL. Every listing is
            checked against official sources by a person before it goes live. No
            paid reviews, no scraped pages.
          </p>
        </div>
        <div>
          <h2 className="font-sans text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">
            Explore
          </h2>
          <ul className="mt-3 space-y-2 text-sm font-medium">
            <li>
              <Link to="/#categories" className="hover:text-primary">
                All {categories.length || ""} categories
              </Link>
            </li>
            <li>
              <a href={EVENTS_URL} className="hover:text-primary">
                Tampa events calendar ↗
              </a>
            </li>
            <li>
              <a href={EVENTS_WEEKEND_URL} className="hover:text-primary">
                Things to do this weekend ↗
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="font-sans text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">
            The Tampa Scoop
          </h2>
          <ul className="mt-3 space-y-2 text-sm font-medium">
            <li>
              <Link
                to="/list-your-business"
                className="text-sunset-ink hover:underline"
              >
                List your business →
              </Link>
            </li>
            <li>
              <Link
                to="/list-your-business#how-it-works"
                className="hover:text-primary"
              >
                How listings work
              </Link>
            </li>
            <li>
              <a href={SCOOP_HOME_URL} className="hover:text-primary">
                The Tampa Scoop newsletter
              </a>
            </li>
            <li>
              <SubscribeButton className="mt-1" />
            </li>
          </ul>
        </div>
      </div>
      <div className="container flex flex-col gap-1 border-t py-5 text-xs text-muted-foreground sm:flex-row sm:justify-between">
        <span>© {year} The Tampa Scoop · Tampa, Florida</span>
        <span data-testid="updated-stamp">
          {fetchedAt
            ? `Directory updated ${new Date(fetchedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" })}`
            : "Tampa, FL"}
        </span>
      </div>
    </footer>
  );
}
