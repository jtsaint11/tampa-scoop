/**
 * Server-side Smartsheet client (direct REST API, token in SMARTSHEET_TOKEN).
 * Never exported as a Convex function, so the token never reaches a client.
 */
declare const process: { env: Record<string, string | undefined> };

export const EVENTS_TAB = "Events";
export const SUBMISSIONS_TAB = "Event Submissions";

export class GatewayError extends Error {
  readonly code: "unreachable" | "tool_error" | "needs_approval";
  constructor(
    message: string,
    code: "unreachable" | "tool_error" | "needs_approval",
  ) {
    super(message);
    this.code = code;
  }
}



// ---------------------------------------------------------------- Smartsheet
// The Tampa Scoop workspace in Smartsheet is the source of truth. Only three
// auto-approved tool roles are used: get sheet, add rows, update rows.

/** Sheet ids in the "Tampa Scoop" Smartsheet workspace, keyed by sheet name. */
export const SHEET_IDS: Record<string, string> = {
  Lists: "962440566361988",
  Categories: "4514636218191748",
  Organizers: "2475660623957892",
  Events: "6801895281872772",
  "Event Submissions": "153543605702532",
  Businesses: "3177664438554500",
  "Quote Requests": "7224434164453252",
  "Story Queue": "2546355785650052",
  Issues: "3037219007975300",
};

export type SsRow = Record<string, unknown>;

// ---- Direct Smartsheet REST (replaces the Viktor tool gateway) ----
const SS_API = "https://api.smartsheet.com/2.0";

/** Calls Smartsheet with SMARTSHEET_TOKEN; keeps 15+ digit ids as strings. */
async function ssFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = process.env.SMARTSHEET_TOKEN;
  if (!token) throw new GatewayError("SMARTSHEET_TOKEN is not set", "unreachable");
  let response: Response;
  try {
    response = await fetch(`${SS_API}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
  } catch (error) {
    throw new GatewayError(`Smartsheet unreachable: ${String(error)}`, "unreachable");
  }
  const text = await response.text();
  if (!response.ok) throw new GatewayError(`Smartsheet HTTP ${response.status}: ${text.slice(0, 500)}`, "tool_error");
  const safe = text.replace(/"(id|rowId|columnId)"\s*:\s*(\d{15,})/g, '"$1":"$2"');
  return JSON.parse(safe) as T;
}

type RawSheet = {
  columns: { id: string; title: string; type: string }[];
  rows: { id: string; rowNumber: number; cells: { columnId: string; value?: unknown }[] }[];
};

const columnCache = new Map<string, Map<string, string>>();
async function columnIds(sheetName: string): Promise<Map<string, string>> {
  const hit = columnCache.get(sheetName);
  if (hit) return hit;
  const res = await ssFetch<{ data: { id: string; title: string }[] }>(
    `/sheets/${sheetIdFor(sheetName)}/columns?includeAll=true`,
  );
  const map = new Map(res.data.map(c => [c.title, String(c.id)]));
  columnCache.set(sheetName, map);
  return map;
}

function toCells(o: Record<string, unknown>, cols: Map<string, string>) {
  return Object.entries(o)
    .filter(([k]) => k !== "rowId")
    .map(([k, value]) => {
      const columnId = cols.get(k);
      if (!columnId) throw new GatewayError(`Unknown column "${k}"`, "tool_error");
      return { columnId, value: value === "" ? "" : value, strict: false };
    });
}


function sheetIdFor(sheetName: string): string {
  const id = SHEET_IDS[sheetName];
  if (!id) throw new GatewayError(`Unknown sheet ${sheetName}`, "tool_error");
  return id;
}


type SsSheet = {
  columns: { id?: string; title: string; type: string }[];
  rows: { id: string | number; rowNumber: number; cellsByName?: Record<string, unknown> }[];
};

async function getSheet(sheetName: string): Promise<SsSheet> {
  const raw = await ssFetch<RawSheet>(`/sheets/${sheetIdFor(sheetName)}?pageSize=5000`);
  if (!raw || !Array.isArray(raw.rows) || !Array.isArray(raw.columns)) {
    throw new GatewayError(`Unexpected response reading ${sheetName} (no rows array)`, "tool_error");
  }
  const titleById = new Map(raw.columns.map(c => [String(c.id), c.title]));
  return {
    columns: raw.columns,
    rows: raw.rows.map(r => {
      const cellsByName: Record<string, unknown> = {};
      for (const c of r.cells ?? []) {
        const t = titleById.get(String(c.columnId));
        if (t) cellsByName[t] = c.value;
      }
      return { id: r.id, rowNumber: r.rowNumber, cellsByName };
    }),
  };
}

/**
 * Reads a whole sheet as rows keyed by column title, with every column present.
 * Values are shaped like the old Google read: text, checkboxes as "TRUE"/"FALSE",
 * dates as YYYY-MM-DD, blanks as "". Adds _rowId and _rowNumber.
 */
export async function readSheet(sheetName: string): Promise<SsRow[]> {
  const sheet = await getSheet(sheetName);
  return sheet.rows.map(r => {
    const by = r.cellsByName ?? {};
    const out: SsRow = { _rowId: String(r.id), _rowNumber: r.rowNumber };
    for (const c of sheet.columns) {
      const val = by[c.title];
      out[c.title] =
        val === undefined || val === null ? "" : typeof val === "boolean" ? (val ? "TRUE" : "FALSE") : String(val);
    }
    return out;
  });
}

/** Turns an app value into a Smartsheet cell value (no formulas are ever sent). */
function toCell(val: unknown): unknown {
  if (typeof val !== "string") return val;
  if (val === "TRUE") return true;
  if (val === "FALSE") return false;
  // Values are stored as plain values, so the Google-era leading apostrophe is dropped.
  return /^'[=+\-@\t0-9(]/.test(val) ? val.slice(1) : val;
}

/** Adds rows (blank cells are left out). Returns the new row ids and numbers. */
export async function addRows(
  sheetName: string,
  rows: Record<string, unknown>[],
): Promise<{ id: string; rowNumber: number }[]> {
  const body = rows.map(row => {
    const o: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(row)) if (val !== "" && val !== undefined && val !== null) o[k] = toCell(val);
    return o;
  });
  const cols = await columnIds(sheetName);
  const res = await ssFetch<{ result: { id: string; rowNumber: number }[] }>(`/sheets/${sheetIdFor(sheetName)}/rows`, {
    method: "POST",
    body: JSON.stringify(body.map(o => ({ toBottom: true, cells: toCells(o, cols) }))),
  });
  return (res.result ?? []).map(x => ({ id: String(x.id ?? ""), rowNumber: Number(x.rowNumber) || 0 }));
}

/** Updates rows in place by row id ("" clears a cell). */
export async function updateRows(sheetName: string, rows: ({ rowId: string } & Record<string, unknown>)[]): Promise<void> {
  const body = rows.map(row => {
    const o: Record<string, unknown> = { rowId: row.rowId };
    for (const [k, val] of Object.entries(row)) if (k !== "rowId") o[k] = toCell(val);
    return o;
  });
  const cols = await columnIds(sheetName);
  await ssFetch(`/sheets/${sheetIdFor(sheetName)}/rows`, {
    method: "PUT",
    body: JSON.stringify(body.map(o => ({ id: String(o.rowId), cells: toCells(o, cols) }))),
  });
}
