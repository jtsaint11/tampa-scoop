import {
  ArrowLeft,
  CalendarPlus,
  Clock,
  ExternalLink,
  MapPin,
  Tag,
  Ticket,
  Users,
} from "lucide-react";
import { Link, useParams } from "react-router";
import { useEvents } from "@/hooks/useEvents";
import { dateParts, dateRangeLabel, downloadIcs, longDate } from "@/lib/events";
import { EventCard } from "./EventsPage";

function Row({
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
        <dt className="text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase">
          {label}
        </dt>
        <dd className="mt-0.5 font-medium break-words">{children}</dd>
      </div>
    </div>
  );
}

export function EventDetailPage() {
  const { key = "" } = useParams();
  const { status, events, today } = useEvents();
  const ev = events.find(e => e.key === decodeURIComponent(key));

  if (status === "loading") {
    return (
      <div className="container py-12">
        <div className="h-10 w-2/3 animate-pulse rounded bg-secondary" />
        <div className="mt-6 h-64 animate-pulse rounded-2xl bg-secondary" />
      </div>
    );
  }

  if (!ev) {
    return (
      <div className="container py-16">
        <div
          className="mx-auto max-w-xl rounded-2xl border bg-card p-8 text-center"
          data-testid="event-not-found"
        >
          <h1 className="font-heading text-3xl font-semibold">
            This event isn't on the calendar
          </h1>
          <p className="mt-2 text-muted-foreground">
            It may have already happened, been cancelled, or still be waiting
            for review.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-bold text-primary-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden /> See upcoming Tampa
            events
          </Link>
        </div>
      </div>
    );
  }

  const { weekday, day, month } = dateParts(ev.startDate);
  const more = events.filter(e => e.key !== ev.key).slice(0, 3);
  const mapsUrl = ev.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ev.venue}, ${ev.address}`)}`
    : "";

  return (
    <article className="container py-8 sm:py-12">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden /> All Tampa events
      </Link>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div>
          <div className="flex items-start gap-4">
            <div className="ticket-stub flex w-20 shrink-0 flex-col items-center rounded-xl bg-sunset-soft py-3 text-sunset-ink">
              <span className="text-xs font-bold tracking-[0.12em] uppercase">
                {weekday}
              </span>
              <span className="font-heading text-4xl leading-none font-semibold">
                {day}
              </span>
              <span className="text-xs font-bold tracking-[0.12em] uppercase">
                {month}
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
                {ev.categories.map(c => (
                  <span
                    key={c}
                    className="rounded-full bg-secondary px-2 py-0.5"
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
              <h1 className="mt-2 font-heading text-3xl leading-tight font-semibold text-balance sm:text-5xl">
                {ev.name}
              </h1>
              {ev.organizer ? (
                <p className="mt-2 text-muted-foreground">
                  Hosted by {ev.organizer}
                </p>
              ) : null}
            </div>
          </div>
          {ev.imageUrl ? (
            <img
              src={ev.imageUrl}
              alt=""
              className="mt-6 aspect-[16/9] w-full rounded-2xl border object-cover"
              loading="lazy"
            />
          ) : null}
          {ev.description ? (
            <div className="mt-6 max-w-2xl text-lg leading-relaxed whitespace-pre-line">
              {ev.description}
            </div>
          ) : null}
        </div>

        <aside className="h-fit rounded-2xl border bg-card p-5 lg:sticky lg:top-24">
          <dl className="divide-y">
            <Row icon={Clock} label="When">
              {dateRangeLabel(ev)}
              {ev.time ? (
                <div className="text-muted-foreground">{ev.time} (Eastern)</div>
              ) : null}
            </Row>
            <Row icon={MapPin} label="Where">
              {ev.venue}
              {ev.address ? (
                <div className="text-muted-foreground">
                  {mapsUrl ? (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      {ev.address}
                    </a>
                  ) : (
                    ev.address
                  )}
                </div>
              ) : null}
              {ev.neighborhood ? (
                <div className="text-muted-foreground">{ev.neighborhood}</div>
              ) : null}
            </Row>
            {ev.price ? (
              <Row icon={Ticket} label="Admission">
                {ev.price}
              </Row>
            ) : null}
            {ev.familyFriendly ? (
              <Row icon={Users} label="Good for">
                Families and kids
              </Row>
            ) : null}
            {ev.categories.length ? (
              <Row icon={Tag} label="Category">
                {ev.categories.join(", ")}
              </Row>
            ) : null}
          </dl>
          <div className="mt-4 grid gap-2">
            {ev.ticketUrl ? (
              <a
                href={ev.ticketUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 font-bold text-primary-foreground hover:brightness-110"
              >
                Official page & tickets{" "}
                <ExternalLink className="size-4" aria-hidden />
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => downloadIcs(ev)}
              className="inline-flex items-center justify-center gap-2 rounded-full border px-5 py-3 font-semibold hover:bg-accent"
            >
              <CalendarPlus className="size-4" aria-hidden /> Add to calendar
            </button>
          </div>
          {ev.dateVerified ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Details confirmed with the organizer on{" "}
              {longDate(ev.dateVerified)}.
            </p>
          ) : null}
        </aside>
      </div>

      {more.length ? (
        <section className="mt-14">
          <h2 className="font-heading text-2xl font-semibold">
            More events in Tampa, FL
          </h2>
          <ul className="mt-4 grid gap-3">
            {more.map(e => (
              <EventCard key={e.key} ev={e} today={today} />
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
