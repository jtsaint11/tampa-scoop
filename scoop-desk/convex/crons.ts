import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/** Read-only: confirms the Story Queue / Issues tabs exist and match, so the status banner stays honest. Never writes to the sheet. */
crons.interval("check desk tabs", { minutes: 15 }, internal.sync.checkTabs, {});

export default crons;
