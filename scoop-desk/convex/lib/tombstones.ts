/** Pure helpers for permanently deleted stories (tombstones). */

export type Tombstone = { storyId: string; sheetRowId?: string };
export type PullRow = { storyId: string; rowId?: string };

/** Pull is sheet-wins, so a deleted story must never come back from the sheet. */
export function isTombstoned(row: PullRow, tombs: readonly Tombstone[]): boolean {
  const id = row.storyId.trim().toLowerCase();
  return tombs.some(
    t => (id && t.storyId.trim().toLowerCase() === id) || (!!row.rowId && !!t.sheetRowId && t.sheetRowId === row.rowId),
  );
}

export function skipTombstoned<T extends PullRow>(rows: readonly T[], tombs: readonly Tombstone[]): T[] {
  return rows.filter(r => !isTombstoned(r, tombs));
}

/** Removes a story key from an issue's story list and every section's context list. */
export function stripStoryFromIssue<I extends { storyIds: string[]; sections?: { storyIds: string[] }[] }>(
  issue: I,
  storyId: string,
): { changed: boolean; storyIds: string[]; sections?: I["sections"] } {
  const storyIds = issue.storyIds.filter(s => s !== storyId);
  let changed = storyIds.length !== issue.storyIds.length;
  const sections = issue.sections?.map(sec => {
    if (!sec.storyIds.includes(storyId)) return sec;
    changed = true;
    return { ...sec, storyIds: sec.storyIds.filter(s => s !== storyId) };
  }) as I["sections"];
  return { changed, storyIds, sections };
}

/** Finds the sheet row for a tombstone: by row id first, then by Story ID. */
export function findTombRow<R extends Record<string, unknown>>(rows: readonly R[], t: Tombstone): R | undefined {
  return (
    (t.sheetRowId ? rows.find(r => String(r._rowId) === t.sheetRowId) : undefined) ??
    rows.find(r => String(r["Story ID"] ?? "").trim().toLowerCase() === t.storyId.trim().toLowerCase())
  );
}

export const DELETE_FALLBACK_TOAST =
  "Removed from the Desk; the Smartsheet row is marked Deleted until row deletion is set to Auto.";
