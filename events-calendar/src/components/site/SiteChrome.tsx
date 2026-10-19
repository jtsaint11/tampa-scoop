import { Link } from "react-router";
import { useEvents } from "@/hooks/useEvents";
import { longDate } from "@/lib/events";
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
      aria-label="The Tampa Scoop events, home"
    >
      <span className="sunset-stripe block h-7 w-2 rounded-full" aria-hidden />
      <span className="font-heading text-xl leading-none font-semibold tracking-tight sm:text-[1.4rem]">
        The Tampa <em className="text-sunset-ink">Scoop</em>
      </span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <ScoopNav
      current="events"
      localCta={{
        to: "/submit-event",
        label: "Submit an event",
        short: "Submit your Tampa event",
      }}
    />
  );
}

export function SiteFooter() {
  const { today, fetchedAt } = useEvents();
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
            A local guide to what's happening in Tampa, FL. Every listing is
            checked against the organizer or venue before it goes live.
          </p>
        </div>
        <div>
          <h2 className="font-sans text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">
            Explore
          </h2>
          <ul className="mt-3 space-y-2 text-sm font-medium">
            <li>
              <Link to="/" className="hover:text-primary">
                All events
              </Link>
            </li>
            <li>
              <Link to="/?date=weekend" className="hover:text-primary">
                This weekend
              </Link>
            </li>
            <li>
              <a href="/#guides" className="hover:text-primary">
                Tampa guides
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
                to="/submit-event"
                className="text-sunset-ink hover:underline"
              >
                Submit an event →
              </Link>
            </li>
            <li>
              <a href="/#how-it-works" className="hover:text-primary">
                How listings work
              </a>
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
        <span>© {today.slice(0, 4)} The Tampa Scoop · Tampa, Florida</span>
        <span data-testid="updated-stamp">
          {fetchedAt
            ? `Events updated ${longDate(today)} · times are Eastern`
            : "Times are Eastern"}
        </span>
      </div>
    </footer>
  );
}
