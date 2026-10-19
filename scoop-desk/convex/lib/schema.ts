/** Column layout of the two Desk tabs. Must match tabs_batch.json (sheetIds 8 and 9). */
export const STORY_TAB = "Story Queue";
export const STORY_GID = 8;
export const STORY_COLUMNS = [
  "Story ID", "Issue Date", "Issue Type", "Tone", "Section", "Fact Bullets", "Source URLs", "Reader Action",
  "Known Gaps", "Sponsor", "Sponsor Name", "Sponsor Copy", "Sponsor URL", "State", "Headline", "Draft",
  "Word Count", "VERIFY Flags", "Claim Sources", "Editor Notes", "Created At", "Updated At",
] as const;
export const STORY_LAST_COL = "V";

export const ISSUE_TAB = "Issues";
export const ISSUE_GID = 9;
export const ISSUE_COLUMNS = [
  "Issue ID", "Issue Date", "Issue Type", "Subject", "Preview Text", "Opening", "Story IDs", "Event Picks",
  "Business Pick", "Checklist", "Status", "Plain Text", "HTML", "Exported At", "Updated At", "Notes",
  "Sections JSON", "Subject Options",
] as const;
export const ISSUE_LAST_COL = "R";

export const EVENTS_TAB = "Events";
export const BUSINESSES_TAB = "Businesses";
export const CATEGORIES_TAB = "Categories";
