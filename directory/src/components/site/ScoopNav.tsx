import { ArrowRight, Mail, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";

/** One-site links shared by the newsletter, events calendar and directory. */
export const SCOOP_HOME_URL = "https://tampascoop.beehiiv.com";
export const SCOOP_SUBSCRIBE_URL = "https://tampascoop.beehiiv.com/subscribe";
export const SCOOP_EVENTS_URL: string =
  import.meta.env.VITE_EVENTS_URL || "https://tampa-events-justin-s-team.viktor.space";
export const SCOOP_DIRECTORY_URL: string =
  import.meta.env.VITE_DIRECTORY_URL || "https://tampa-directory-justin-s-team.viktor.space";

type Current = "events" | "directory";

export function SubscribeButton({
  className,
  short,
}: {
  className?: string;
  short?: boolean;
}) {
  return (
    <a
      href={SCOOP_SUBSCRIBE_URL}
      data-testid="subscribe-button"
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#F7B538] px-4 py-2 text-sm font-bold whitespace-nowrap text-[#1D2B33] shadow-sm transition hover:brightness-105 focus-visible:ring-2 focus-visible:ring-[#1D2B33] focus-visible:outline-none",
        className,
      )}
    >
      <Mail className="size-4" aria-hidden />
      {short ? (<><span className="sm:hidden">Subscribe</span><span className="hidden sm:inline">Newsletter (free)</span></>) : "Get the newsletter (free)"}
    </a>
  );
}

export function SignupBanner({
  className,
  testId = "signup-banner",
}: {
  className?: string;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      className={cn(
        "flex flex-col items-start gap-3 rounded-2xl bg-[#0F5C6E] px-5 py-4 text-[#FFF6EA] shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6",
        className,
      )}
    >
      <p className="text-base font-semibold sm:text-lg">
        Get Tampa's best events and new spots in your inbox, free.
      </p>
      <SubscribeButton />
    </div>
  );
}

export function ScoopNav({
  current,
  localCta,
}: {
  current: Current;
  localCta: { to: string; label: string; short: string };
}) {
  const [open, setOpen] = useState(false);
  const item = (active: boolean) =>
    cn(
      "rounded-full px-3 py-2 text-sm font-semibold transition-colors hover:bg-[#FFF6EA]",
      active
        ? "text-[#0F5C6E] underline decoration-[#EE6C4D] decoration-2 underline-offset-8"
        : "text-[#1D2B33]",
    );
  const mobileItem =
    "rounded-lg px-3 py-2.5 font-semibold text-[#1D2B33] hover:bg-[#FFF6EA]";
  return (
    <header
      className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-md"
      data-testid="scoop-nav"
    >
      <div className="container flex h-16 items-center justify-between gap-3">
        <a
          href={SCOOP_HOME_URL}
          className="flex min-w-0 items-center gap-2.5"
          aria-label="The Tampa Scoop newsletter home"
        >
          <span
            className="sunset-stripe block h-7 w-2 shrink-0 rounded-full"
            aria-hidden
          />
          <span className="whitespace-nowrap font-heading text-[1.05rem] min-[400px]:text-lg leading-none font-semibold tracking-tight text-[#1D2B33] sm:text-[1.4rem]">
            The Tampa <em className="text-[#EE6C4D]">Scoop</em>
          </span>
        </a>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          <a
            href={SCOOP_EVENTS_URL}
            className={item(current === "events")}
            aria-current={current === "events" ? "page" : undefined}
          >
            Events Calendar
          </a>
          <a
            href={SCOOP_DIRECTORY_URL}
            className={item(current === "directory")}
            aria-current={current === "directory" ? "page" : undefined}
          >
            Local Directory
          </a>
          <Link
            to={localCta.to}
            className="rounded-full px-3 py-2 text-sm font-semibold text-[#c2492c] hover:bg-[#FFF6EA]"
          >
            {localCta.label}
          </Link>
          <SubscribeButton className="ml-2" />
        </nav>
        <div className="flex items-center gap-1.5 lg:hidden">
          <SubscribeButton short className="px-3 text-[0.8rem]" />
          <button
            type="button"
            className="rounded-full p-2 hover:bg-accent"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen(o => !o)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open ? (
        <nav
          className="container flex flex-col gap-1 border-t pt-2 pb-4 lg:hidden"
          aria-label="Mobile"
        >
          <a href={SCOOP_HOME_URL} className={mobileItem}>
            The Tampa Scoop newsletter
          </a>
          <a href={SCOOP_EVENTS_URL} className={mobileItem}>
            Events Calendar
          </a>
          <a href={SCOOP_DIRECTORY_URL} className={mobileItem}>
            Local Directory
          </a>
          <Link
            to={localCta.to}
            className={cn(mobileItem, "text-[#c2492c]")}
            onClick={() => setOpen(false)}
          >
            {localCta.short}{" "}
            <ArrowRight className="inline size-4" aria-hidden />
          </Link>
          <SubscribeButton className="mt-2 self-start" />
        </nav>
      ) : null}
    </header>
  );
}
