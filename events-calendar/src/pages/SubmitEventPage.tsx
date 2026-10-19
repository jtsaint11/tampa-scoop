import { useAction } from "convex/react";
import { ArrowLeft, CheckCircle2, Info, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { api } from "../../convex/_generated/api";
import {
  type SubmissionInput,
  validateSubmission,
} from "../../convex/lib/submission";
import {
  AGE_RULES,
  EVENT_CATEGORIES,
  NEIGHBORHOODS,
  todayInTampa,
} from "../../convex/lib/tampa";

type FormState = Omit<SubmissionInput, "elapsedMs" | "clientId">;

const EMPTY: FormState = {
  submitterName: "",
  submitterEmail: "",
  organizer: "",
  title: "",
  startDate: "",
  startTime: "",
  endDate: "",
  endTime: "",
  venue: "",
  address: "",
  neighborhood: "",
  ticketUrl: "",
  priceType: "free",
  price: "",
  category: "",
  ageRule: "",
  description: "",
  imageUrl: "",
  accuracyConfirmed: false,
  marketingOptIn: false,
  website: "",
};

function getClientId(): string {
  try {
    let id = localStorage.getItem("tampa-scoop-client");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("tampa-scoop-client", id);
    }
    return id;
  } catch {
    return "no-storage";
  }
}

const inputCls =
  "w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-base outline-none placeholder:text-muted-foreground/80 focus:border-primary focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-destructive";

function Field({
  id,
  label,
  required,
  hint,
  error,
  children,
  className,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-bold">
        {label}
        {required ? (
          <span className="text-sunset-ink"> *</span>
        ) : (
          <span className="font-medium text-muted-foreground"> (optional)</span>
        )}
      </label>
      {children}
      {error ? (
        <p
          id={`${id}-error`}
          className="text-sm font-medium text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function Fieldset({
  title,
  step,
  children,
}: {
  title: string;
  step: number;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-2xl border bg-card p-5 sm:p-7">
      <legend className="sr-only">{title}</legend>
      <div className="mb-5 flex items-center gap-3">
        <span className="flex size-8 items-center justify-center rounded-full bg-sunset-soft font-heading font-semibold text-sunset-ink">
          {step}
        </span>
        <h2 className="font-heading text-xl font-semibold">{title}</h2>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export function SubmitEventPage() {
  const submitEvent = useAction(api.submissions.submitEvent);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [banner, setBanner] = useState<string | null>(null);
  const openedAt = useRef(Date.now());
  const today = todayInTampa();

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(f => ({ ...f, [key]: value }));
    if (errors[key])
      setErrors(e => {
        const n = { ...e };
        delete n[key];
        return n;
      });
  };
  const text = (key: keyof FormState) => ({
    id: key,
    name: key,
    value: form[key] as string,
    onChange: (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => set(key, e.target.value as never),
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `${key}-error` : undefined,
    className: inputCls,
  });

  const focusFirstError = (errs: Record<string, string>) => {
    const first = Object.keys(errs)[0];
    if (first) setTimeout(() => document.getElementById(first)?.focus(), 30);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);
    const payload: SubmissionInput = {
      ...form,
      elapsedMs: Date.now() - openedAt.current,
      clientId: getClientId(),
    };
    const clientErrors = validateSubmission(payload, today);
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      setBanner("Please fix the highlighted fields.");
      focusFirstError(clientErrors);
      return;
    }
    setStatus("sending");
    try {
      const res = await submitEvent(payload);
      if (res.ok) {
        setStatus("done");
        window.scrollTo({ top: 0 });
        return;
      }
      setErrors(res.fieldErrors);
      setBanner(res.message);
      focusFirstError(res.fieldErrors);
    } catch {
      setBanner(
        "We couldn't send your submission. Please check your connection and try again.",
      );
    }
    setStatus("idle");
  };

  if (status === "done") {
    return (
      <div className="container py-16">
        <div
          className="mx-auto max-w-xl rounded-2xl border bg-card p-8 text-center"
          data-testid="submit-success"
        >
          <CheckCircle2 className="mx-auto size-12 text-success" aria-hidden />
          <h1 className="mt-4 font-heading text-3xl font-semibold">
            Thanks, we've got it
          </h1>
          <p className="mt-3 text-muted-foreground">
            Your event is in our review queue. We check every submission against
            the organizer or venue before it goes live, and we'll email you only
            if we need to confirm something.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <Link
              to="/"
              className="rounded-full bg-primary px-5 py-2.5 font-bold text-primary-foreground"
            >
              Back to events
            </Link>
            <button
              type="button"
              onClick={() => {
                setForm(EMPTY);
                setStatus("idle");
                openedAt.current = Date.now();
              }}
              className="rounded-full border px-5 py-2.5 font-semibold hover:bg-accent"
            >
              Submit another event
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="paper-grain">
      <div className="container py-8 sm:py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden /> All Tampa events
        </Link>
        <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_20rem]">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-sunset-ink uppercase">
              Free listing
            </p>
            <h1 className="mt-2 font-heading text-4xl leading-tight font-semibold text-balance sm:text-5xl">
              Submit Your Tampa Event
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
              Hosting something in Tampa? Tell us about it. A person reviews
              every submission, and approved events appear on the calendar and
              may be picked for The Tampa Scoop newsletter.
            </p>

            <form
              onSubmit={onSubmit}
              noValidate
              className="mt-8 space-y-5"
              data-testid="submit-form"
            >
              {/* Honeypot: hidden from people, tempting to bots. */}
              <div
                aria-hidden="true"
                className="absolute -left-[9999px] h-px w-px overflow-hidden"
              >
                <label htmlFor="website">Website</label>
                <input
                  id="website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={e => set("website", e.target.value)}
                />
              </div>

              <Fieldset title="About you" step={1}>
                <Field
                  id="submitterName"
                  label="Your name"
                  required
                  error={errors.submitterName}
                >
                  <input {...text("submitterName")} autoComplete="name" />
                </Field>
                <Field
                  id="submitterEmail"
                  label="Your email"
                  required
                  error={errors.submitterEmail}
                  hint="Used only to verify this listing."
                >
                  <input
                    {...text("submitterEmail")}
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                  />
                </Field>
                <Field
                  id="organizer"
                  label="Organizer name"
                  required
                  error={errors.organizer}
                  hint="The business, group or person hosting."
                  className="sm:col-span-2"
                >
                  <input {...text("organizer")} autoComplete="organization" />
                </Field>
              </Fieldset>

              <Fieldset title="The event" step={2}>
                <Field
                  id="title"
                  label="Event title"
                  required
                  error={errors.title}
                  className="sm:col-span-2"
                >
                  <input
                    {...text("title")}
                    placeholder="e.g. Seminole Heights Sunday Market"
                  />
                </Field>
                <Field
                  id="startDate"
                  label="Start date"
                  required
                  error={errors.startDate}
                >
                  <input {...text("startDate")} type="date" min={today} />
                </Field>
                <Field
                  id="startTime"
                  label="Start time"
                  required
                  error={errors.startTime}
                >
                  <input {...text("startTime")} type="time" />
                </Field>
                <Field
                  id="endDate"
                  label="End date"
                  error={errors.endDate}
                  hint="For multi-day events."
                >
                  <input
                    {...text("endDate")}
                    type="date"
                    min={form.startDate || today}
                  />
                </Field>
                <Field id="endTime" label="End time" error={errors.endTime}>
                  <input {...text("endTime")} type="time" />
                </Field>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground sm:col-span-2">
                  <Info className="size-3.5" aria-hidden /> All times are
                  Eastern (Tampa local time).
                </p>
                <Field
                  id="category"
                  label="Category"
                  required
                  error={errors.category}
                >
                  <select {...text("category")}>
                    <option value="">Choose a category</option>
                    {EVENT_CATEGORIES.map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  id="ageRule"
                  label="Age / access"
                  required
                  error={errors.ageRule}
                >
                  <select {...text("ageRule")}>
                    <option value="">Who can attend?</option>
                    {AGE_RULES.map(a => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  id="description"
                  label="Tell us about the event"
                  required
                  error={errors.description}
                  hint="What's happening, who it's for, anything to know before going. 40–2,000 characters."
                  className="sm:col-span-2"
                >
                  <textarea
                    {...text("description")}
                    rows={5}
                    maxLength={2000}
                  />
                </Field>
              </Fieldset>

              <Fieldset title="Where" step={3}>
                <Field id="venue" label="Venue" required error={errors.venue}>
                  <input {...text("venue")} placeholder="e.g. Armature Works" />
                </Field>
                <Field
                  id="neighborhood"
                  label="Neighborhood"
                  error={errors.neighborhood}
                >
                  <select {...text("neighborhood")}>
                    <option value="">Choose a neighborhood</option>
                    {NEIGHBORHOODS.map(n => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  id="address"
                  label="Full address"
                  required
                  error={errors.address}
                  hint="Street, city and ZIP."
                  className="sm:col-span-2"
                >
                  <input
                    {...text("address")}
                    autoComplete="street-address"
                    placeholder="1910 N Ola Ave, Tampa, FL 33602"
                  />
                </Field>
              </Fieldset>

              <Fieldset title="Tickets & links" step={4}>
                <Field
                  id="ticketUrl"
                  label="Official event or ticket link"
                  required
                  error={errors.ticketUrl}
                  className="sm:col-span-2"
                >
                  <input
                    {...text("ticketUrl")}
                    type="url"
                    inputMode="url"
                    placeholder="https://"
                  />
                </Field>
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-bold">
                    Free or paid<span className="text-sunset-ink"> *</span>
                  </span>
                  <div
                    className="grid grid-cols-2 gap-2"
                    role="radiogroup"
                    aria-label="Free or paid"
                  >
                    {(["free", "paid"] as const).map(p => (
                      <label
                        key={p}
                        className={cn(
                          "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 font-semibold capitalize",
                          form.priceType === p
                            ? "border-primary bg-primary/10 text-primary"
                            : "bg-background",
                        )}
                      >
                        <input
                          type="radio"
                          name="priceType"
                          value={p}
                          checked={form.priceType === p}
                          onChange={() => set("priceType", p)}
                          className="accent-[var(--primary)]"
                        />
                        {p}
                      </label>
                    ))}
                  </div>
                </div>
                {form.priceType === "paid" ? (
                  <Field
                    id="price"
                    label="Price"
                    required
                    error={errors.price}
                    hint='e.g. "$25" or "from $15".'
                  >
                    <input {...text("price")} />
                  </Field>
                ) : (
                  <div className="hidden sm:block" />
                )}
                <Field
                  id="imageUrl"
                  label="Image link (flyer or photo)"
                  error={errors.imageUrl}
                  hint="Only an image you have the rights to share."
                  className="sm:col-span-2"
                >
                  <input
                    {...text("imageUrl")}
                    type="url"
                    inputMode="url"
                    placeholder="https://"
                  />
                </Field>
              </Fieldset>

              <div className="space-y-4 rounded-2xl border bg-card p-5 sm:p-7">
                <label className="flex items-start gap-3">
                  <input
                    id="accuracyConfirmed"
                    type="checkbox"
                    checked={form.accuracyConfirmed}
                    onChange={e => set("accuracyConfirmed", e.target.checked)}
                    aria-invalid={errors.accuracyConfirmed ? true : undefined}
                    className="mt-1 size-4.5 accent-[var(--primary)]"
                  />
                  <span className="text-sm">
                    <strong>
                      I confirm this is accurate and I have the rights to the
                      image and text.
                    </strong>
                    <span className="text-sunset-ink"> *</span>
                  </span>
                </label>
                {errors.accuracyConfirmed ? (
                  <p
                    className="text-sm font-medium text-destructive"
                    role="alert"
                  >
                    {errors.accuracyConfirmed}
                  </p>
                ) : null}
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={form.marketingOptIn}
                    onChange={e => set("marketingOptIn", e.target.checked)}
                    className="mt-1 size-4.5 accent-[var(--primary)]"
                  />
                  <span className="text-sm">
                    Also send me The Tampa Scoop newsletter (optional).
                  </span>
                </label>
                <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                  <li>
                    Submitting doesn't guarantee publication. We confirm every
                    event with the organizer or venue first.
                  </li>
                  <li>Commercial or paid promotions may be labeled as such.</li>
                  <li>
                    Your email is used to verify this listing only, not for
                    marketing, unless you tick the box above.
                  </li>
                </ul>
              </div>

              {banner ? (
                <p
                  className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive"
                  role="alert"
                  data-testid="form-banner"
                >
                  {banner}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={status === "sending"}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-sunset px-8 py-3.5 text-base font-bold text-sunset-foreground shadow-sm transition hover:brightness-110 disabled:opacity-70 sm:w-auto"
              >
                {status === "sending" ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />{" "}
                    Sending…
                  </>
                ) : (
                  "Submit event for review"
                )}
              </button>
            </form>
          </div>

          <aside className="h-fit space-y-4 lg:sticky lg:top-24">
            <div className="rounded-2xl border bg-card p-5">
              <h2 className="font-heading text-lg font-semibold">
                What happens next
              </h2>
              <ol className="mt-3 space-y-3 text-sm text-muted-foreground">
                <li>
                  <strong className="text-foreground">1. Review.</strong> A
                  person reads every submission.
                </li>
                <li>
                  <strong className="text-foreground">2. Verify.</strong> We
                  check the details against your official page.
                </li>
                <li>
                  <strong className="text-foreground">3. Publish.</strong>{" "}
                  Approved events go on the calendar, and may be picked for the
                  newsletter.
                </li>
              </ol>
            </div>
            <div className="rounded-2xl border border-sunset/30 bg-sunset-soft/60 p-5 text-sm text-sunset-ink">
              <strong>Tip:</strong> a clear official link and an exact start
              time get events approved fastest.
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
