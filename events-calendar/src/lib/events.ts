import {
  addDays,
  type PublicEvent,
  TIME_ZONE,
  weekday,
} from "../../convex/lib/tampa";

export type DateFilter =
  | "all"
  | "today"
  | "tomorrow"
  | "weekend"
  | "week"
  | "month";

export const DATE_FILTERS: { value: DateFilter; label: string }[] = [
  { value: "all", label: "All upcoming" },
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "weekend", label: "This weekend" },
  { value: "week", label: "Next 7 days" },
  { value: "month", label: "Next 30 days" },
];

/** Inclusive [start, end] window for a quick date filter, in Tampa dates. */
export function dateWindow(
  filter: DateFilter,
  today: string,
): [string, string] | null {
  switch (filter) {
    case "today":
      return [today, today];
    case "tomorrow":
      return [addDays(today, 1), addDays(today, 1)];
    case "weekend": {
      const wd = weekday(today); // 0 Sun ... 6 Sat
      if (wd === 0) return [today, today];
      if (wd === 6) return [today, addDays(today, 1)];
      if (wd === 5) return [today, addDays(today, 2)];
      const friday = addDays(today, 5 - wd);
      return [friday, addDays(friday, 2)];
    }
    case "week":
      return [today, addDays(today, 6)];
    case "month":
      return [today, addDays(today, 29)];
    default:
      return null;
  }
}

export type Filters = {
  q: string;
  date: DateFilter;
  on: string; // a specific day YYYY-MM-DD, overrides `date`
  category: string;
  neighborhood: string;
  free: boolean;
  family: boolean;
};

function overlaps(ev: PublicEvent, start: string, end: string): boolean {
  const evEnd = ev.endDate && ev.endDate >= ev.startDate ? ev.endDate : ev.startDate;
  return ev.startDate <= end && evEnd >= start;
}

export function applyFilters(
  events: PublicEvent[],
  f: Filters,
  today: string,
): PublicEvent[] {
  const q = f.q.trim().toLowerCase();
  const window = f.on ? ([f.on, f.on] as [string, string]) : dateWindow(f.date, today);
  return events.filter(ev => {
    if (window && !overlaps(ev, window[0], window[1])) return false;
    if (f.category && !ev.categories.includes(f.category)) return false;
    if (f.neighborhood && ev.neighborhood !== f.neighborhood) return false;
    if (f.free && !ev.isFree) return false;
    if (f.family && !(ev.familyFriendly || ev.categories.includes("Family")))
      return false;
    if (q) {
      const hay = [
        ev.name,
        ev.venue,
        ev.organizer,
        ev.neighborhood,
        ev.address,
        ev.description,
        ...ev.categories,
      ]
        .join(" ")
        .toLowerCase();
      if (!q.split(/\s+/).every(word => hay.includes(word))) return false;
    }
    return true;
  });
}

const utcDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
};

export function dateParts(iso: string) {
  const dt = utcDate(iso);
  return {
    weekday: dt.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
    day: dt.getUTCDate(),
    month: dt.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
  };
}

export function longDate(iso: string): string {
  return utcDate(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function shortDate(iso: string): string {
  return utcDate(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function dateRangeLabel(ev: PublicEvent): string {
  if (ev.endDate && ev.endDate > ev.startDate)
    return `${shortDate(ev.startDate)} – ${shortDate(ev.endDate)}`;
  return longDate(ev.startDate);
}

export function relativeDayLabel(iso: string, today: string): string | null {
  if (iso === today) return "Today";
  if (iso === addDays(today, 1)) return "Tomorrow";
  return null;
}

/** Parse "6:30 PM – 9:00 PM" into 24h [HH, MM] pairs. */
function parseTimes(time: string): [number, number][] {
  const out: [number, number][] = [];
  const re = /(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)/gi;
  for (const m of time.matchAll(re)) {
    let h = Number(m[1]) % 12;
    if (m[3].toLowerCase().startsWith("p")) h += 12;
    out.push([h, Number(m[2] ?? 0)]);
  }
  return out;
}

const icsEscape = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");

/** Build an .ics file for "Add to calendar". */
export function buildIcs(ev: PublicEvent, pageUrl: string): string {
  const times = parseTimes(ev.time);
  const d = (iso: string) => iso.replace(/-/g, "");
  const p2 = (n: number) => String(n).padStart(2, "0");
  let dtStart: string;
  let dtEnd: string;
  if (times.length > 0) {
    const [sh, sm] = times[0];
    const [eh, em] = times[1] ?? [Math.min(sh + 2, 23), sm];
    dtStart = `DTSTART;TZID=${TIME_ZONE}:${d(ev.startDate)}T${p2(sh)}${p2(sm)}00`;
    dtEnd = `DTEND;TZID=${TIME_ZONE}:${d(ev.endDate || ev.startDate)}T${p2(eh)}${p2(em)}00`;
  } else {
    dtStart = `DTSTART;VALUE=DATE:${d(ev.startDate)}`;
    dtEnd = `DTEND;VALUE=DATE:${d(addDays(ev.endDate || ev.startDate, 1))}`;
  }
  const location = [ev.venue, ev.address].filter(Boolean).join(", ");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Tampa Scoop//Events//EN",
    "BEGIN:VEVENT",
    `UID:${ev.key}@thetampascoop`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    dtStart,
    dtEnd,
    `SUMMARY:${icsEscape(ev.name)}`,
    `LOCATION:${icsEscape(location)}`,
    `DESCRIPTION:${icsEscape(`${ev.description}\n\n${ev.ticketUrl || pageUrl}`)}`,
    `URL:${ev.ticketUrl || pageUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcs(ev: PublicEvent) {
  const blob = new Blob([buildIcs(ev, window.location.href)], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${ev.key}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
