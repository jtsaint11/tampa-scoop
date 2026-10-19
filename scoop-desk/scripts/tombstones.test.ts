import { describe, expect, test } from "bun:test";
import { findTombRow, isTombstoned, skipTombstoned, stripStoryFromIssue } from "../convex/lib/tombstones";

const tombs = [{ storyId: "S-0042", sheetRowId: "111" }, { storyId: "S-0099" }];

describe("tombstones", () => {
  test("matches by story key (case/space-insensitive)", () => {
    expect(isTombstoned({ storyId: " s-0042 " }, tombs)).toBe(true);
    expect(isTombstoned({ storyId: "S-0099", rowId: "999" }, tombs)).toBe(true);
  });
  test("matches by sheet row id even if the key was retyped", () => {
    expect(isTombstoned({ storyId: "S-NEW", rowId: "111" }, tombs)).toBe(true);
  });
  test("live rows pass", () => {
    expect(isTombstoned({ storyId: "S-0001", rowId: "222" }, tombs)).toBe(false);
    expect(isTombstoned({ storyId: "", rowId: "" }, tombs)).toBe(false);
  });
  test("pull skips tombstoned rows, keeps the rest in order", () => {
    const rows = [
      { storyId: "S-0001", rowId: "1" },
      { storyId: "S-0042", rowId: "111" },
      { storyId: "S-0002", rowId: "2" },
      { storyId: "x", rowId: "111" },
      { storyId: "S-0099", rowId: "3" },
    ];
    expect(skipTombstoned(rows, tombs).map(r => r.storyId)).toEqual(["S-0001", "S-0002"]);
    expect(skipTombstoned(rows, [])).toHaveLength(5);
  });
  test("strips the story from an issue and its sections", () => {
    const r = stripStoryFromIssue(
      { storyIds: ["A", "S-0042"], sections: [{ storyIds: ["S-0042"] }, { storyIds: ["B"] }] },
      "S-0042",
    );
    expect(r.changed).toBe(true);
    expect(r.storyIds).toEqual(["A"]);
    expect(r.sections?.map(s => s.storyIds)).toEqual([[], ["B"]]);
    expect(stripStoryFromIssue({ storyIds: ["A"] }, "S-0042").changed).toBe(false);
  });
  test("finds the sheet row by id, then by key", () => {
    const rows = [{ _rowId: "111", "Story ID": "renamed" }, { _rowId: "5", "Story ID": "S-0099" }];
    expect(findTombRow(rows, tombs[0])?._rowId).toBe("111");
    expect(findTombRow(rows, tombs[1])?._rowId).toBe("5");
    expect(findTombRow(rows, { storyId: "gone" })).toBeUndefined();
  });
});
