/** Same mapping as the events calendar Space (convex/events.ts there), so keys/links match. */
import { isTruthyCell, NEIGHBORHOODS, normalizeSheetDate, type PublicEvent } from "./tampa";

type Row = Record<string, unknown>;
const cell = (row: Row, key: string) => String(row[key] ?? "").trim();

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function toPublicEvent(row: Row): PublicEvent | null {
  if (cell(row, "Status") !== "Approved") return null;
  if (isTruthyCell(row.Cancelled)) return null;
  const name = cell(row, "Event Name");
  const startDate = normalizeSheetDate(row["Start Date"]);
  if (!name || !startDate) return null;
  const nz = cell(row, "Neighborhood/ZIP");
  const [nzHood, nzZip] = nz.split("/").map(s => s.trim());
  let neighborhood = cell(row, "Neighborhood");
  if (!neighborhood && nzHood) {
    neighborhood = NEIGHBORHOODS.find(n => n.toLowerCase() === nzHood.toLowerCase()) ?? nzHood;
  }
  const zip = nzZip?.match(/\d{5}/)?.[0] ?? nz.match(/\b\d{5}\b/)?.[0] ?? cell(row, "Address").match(/\b3\d{4}\b/)?.[0] ?? "";
  const price = cell(row, "Ticket Price / Free");
  const isFreeCell = cell(row, "Is Free");
  const venue = cell(row, "Venue");
  const key = cell(row, "Slug") || slugify(cell(row, "Event ID")) || slugify(`${name}-${startDate}-${venue}`);
  return {
    key,
    name,
    organizer: cell(row, "Organizer"),
    venue,
    address: cell(row, "Address"),
    neighborhood,
    zip,
    startDate,
    endDate: normalizeSheetDate(row["End Date"]),
    time: cell(row, "Time"),
    categories: cell(row, "Category")
      .split(/[,;]/)
      .map(s => s.trim())
      .filter(Boolean),
    description: cell(row, "Description"),
    price,
    isFree: isFreeCell ? isTruthyCell(isFreeCell) : /\bfree\b/i.test(price),
    familyFriendly: isTruthyCell(row["Family Friendly"]),
    ticketUrl: /^https?:\/\//i.test(cell(row, "Ticket URL")) ? cell(row, "Ticket URL") : "",
    imageUrl: /^https:\/\//i.test(cell(row, "Image URL")) ? cell(row, "Image URL") : "",
    featured: isTruthyCell(row.Featured),
    dateVerified: normalizeSheetDate(row["Date Verified"]),
  };
}

/** All approved, not-cancelled events with unique keys, in sheet order (same as the calendar). */
export function mapEvents(rows: Row[]): PublicEvent[] {
  const out: PublicEvent[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const ev = toPublicEvent(row);
    if (!ev) continue;
    let key = ev.key;
    let i = 2;
    while (seen.has(key)) key = `${ev.key}-${i++}`;
    seen.add(key);
    out.push({ ...ev, key });
  }
  return out;
}
