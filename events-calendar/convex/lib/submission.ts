/** Submission validation shared by the Convex action and the form. */
import {
  addDays,
  AGE_RULES,
  EVENT_CATEGORIES,
  isValidIsoDate,
  NEIGHBORHOODS,
} from "./tampa";

export type SubmissionInput = {
  submitterName: string;
  submitterEmail: string;
  organizer: string;
  title: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  venue: string;
  address: string;
  neighborhood: string;
  ticketUrl: string;
  priceType: "free" | "paid";
  price: string;
  category: string;
  ageRule: string;
  description: string;
  imageUrl: string;
  accuracyConfirmed: boolean;
  marketingOptIn: boolean;
  website: string;
  elapsedMs: number;
  clientId: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return (u.protocol === "https:" || u.protocol === "http:") && !!u.hostname.includes(".");
  } catch {
    return false;
  }
}

/** Returns field -> message. Empty object means valid. */
export function validateSubmission(
  input: SubmissionInput,
  today: string,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const req = (field: keyof SubmissionInput, label: string, max: number, min = 1) => {
    const value = String(input[field] ?? "").trim();
    if (value.length === 0) errors[field] = `${label} is required.`;
    else if (value.length < min) errors[field] = min > 1 ? `${label} needs at least ${min} characters.` : `${label} is required.`;
    else if (value.length > max) errors[field] = `${label} must be ${max} characters or fewer.`;
  };
  req("submitterName", "Your name", 100, 2);
  req("submitterEmail", "Your email", 200);
  req("organizer", "Organizer name", 150, 2);
  req("title", "Event title", 150, 3);
  req("venue", "Venue", 150, 2);
  req("address", "Full address", 250, 8);
  req("description", "Description", 2000, 40);
  if (!errors.submitterEmail && !EMAIL_RE.test(input.submitterEmail.trim()))
    errors.submitterEmail = "Enter a valid email address.";

  if (!isValidIsoDate(input.startDate)) errors.startDate = "Pick a start date.";
  else if (input.startDate < today) errors.startDate = "The start date can't be in the past.";
  else if (input.startDate > addDays(today, 730)) errors.startDate = "We only list events in the next two years.";
  if (!TIME_RE.test(input.startTime)) errors.startTime = "Pick a start time.";
  if (input.endDate) {
    if (!isValidIsoDate(input.endDate)) errors.endDate = "End date is not a valid date.";
    else if (isValidIsoDate(input.startDate) && input.endDate < input.startDate)
      errors.endDate = "End date must be on or after the start date.";
  }
  if (input.endTime && !TIME_RE.test(input.endTime)) errors.endTime = "End time is not valid.";

  if (input.neighborhood && !(NEIGHBORHOODS as readonly string[]).includes(input.neighborhood))
    errors.neighborhood = "Pick a neighborhood from the list.";
  if (!(EVENT_CATEGORIES as readonly string[]).includes(input.category))
    errors.category = "Pick a category.";
  if (!(AGE_RULES as readonly string[]).includes(input.ageRule))
    errors.ageRule = "Pick an age / access rule.";

  if (!input.ticketUrl.trim()) errors.ticketUrl = "Official event or ticket link is required.";
  else if (!isHttpUrl(input.ticketUrl.trim()) || input.ticketUrl.length > 500)
    errors.ticketUrl = "Enter a full link starting with https://";
  if (input.imageUrl.trim() && (!isHttpUrl(input.imageUrl.trim()) || input.imageUrl.length > 500))
    errors.imageUrl = "Enter a full image link starting with https://";

  if (input.priceType === "paid") {
    if (!input.price.trim()) errors.price = "Add the ticket price (e.g. $25 or from $15).";
    else if (input.price.length > 80) errors.price = "Keep the price under 80 characters.";
  }
  if (!input.accuracyConfirmed)
    errors.accuracyConfirmed = "Please confirm the details are accurate and you have rights to them.";
  return errors;
}

