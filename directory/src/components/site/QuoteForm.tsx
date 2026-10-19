import { useAction } from "convex/react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";
import {
  CONTACT_PREFERENCES,
  JOB_MAX,
  type PublicBusiness,
  QUOTE_TIMINGS,
  type QuoteInput,
  validateQuote,
} from "../../../convex/lib/directory";

type FormState = Omit<QuoteInput, "businessSlug" | "sourcePageUrl">;
const EMPTY: FormState = {
  serviceZip: "",
  timing: "",
  jobDescription: "",
  name: "",
  email: "",
  phone: "",
  phoneConsent: false,
  contactPreference: "Email",
  termsAccepted: false,
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

export function QuoteForm({ business }: { business: PublicBusiness }) {
  const submitQuote = useAction(api.quotes.submitQuote);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [banner, setBanner] = useState<string | null>(null);
  const openedAt = useRef(Date.now());

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
    id: `q-${key}`,
    name: key,
    value: form[key] as string,
    onChange: (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => set(key, e.target.value as never),
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `q-${key}-error` : undefined,
    className: inputCls,
  });
  const focusFirst = (errs: Record<string, string>) => {
    const first = Object.keys(errs)[0];
    if (first)
      setTimeout(() => document.getElementById(`q-${first}`)?.focus(), 30);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);
    const payload: QuoteInput = {
      ...form,
      businessSlug: business.slug,
      sourcePageUrl: window.location.href.split("#")[0],
    };
    const clientErrors = validateQuote(payload);
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      setBanner("Please fix the highlighted fields.");
      focusFirst(clientErrors);
      return;
    }
    setStatus("sending");
    try {
      const res = await submitQuote({
        ...payload,
        elapsedMs: Date.now() - openedAt.current,
        clientId: getClientId(),
      });
      if (res.ok) {
        setStatus("done");
        return;
      }
      setErrors(res.fieldErrors);
      setBanner(res.message);
      focusFirst(res.fieldErrors);
    } catch {
      setBanner(
        "We couldn't send your request. Please check your connection and try again.",
      );
    }
    setStatus("idle");
  };

  if (status === "done") {
    return (
      <div
        className="rounded-2xl border bg-card p-6 text-center"
        data-testid="quote-success"
      >
        <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden />
        <h3 className="mt-3 font-heading text-2xl font-semibold">
          Request received
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          We review each request by hand, then pass it to {business.name}.
          They'll reach you by {form.contactPreference.toLowerCase()}.
        </p>
      </div>
    );
  }

  const left = JOB_MAX - form.jobDescription.length;
  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6"
      data-testid="quote-form"
      aria-labelledby="quote-heading"
    >
      <h2 id="quote-heading" className="font-heading text-2xl font-semibold">
        Request a free quote
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        From {business.name} · {business.category}
      </p>
      {/* Honeypot: hidden from people, tempting to bots. */}
      <div
        aria-hidden="true"
        className="absolute -left-[9999px] h-px w-px overflow-hidden"
      >
        <label htmlFor="q-website">Website</label>
        <input
          id="q-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={e => set("website", e.target.value)}
        />
      </div>
      {banner ? (
        <p
          className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-sm font-medium text-destructive"
          role="alert"
          data-testid="quote-banner"
        >
          {banner}
        </p>
      ) : null}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <Field
          id="q-serviceZip"
          label="Service ZIP"
          required
          error={errors.serviceZip}
          hint="Where the work is. No street address needed."
        >
          <input
            {...text("serviceZip")}
            inputMode="numeric"
            maxLength={5}
            autoComplete="postal-code"
            placeholder="33602"
          />
        </Field>
        <Field id="q-timing" label="Timing" required error={errors.timing}>
          <select {...text("timing")}>
            <option value="">When do you need it?</option>
            {QUOTE_TIMINGS.map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field
          id="q-jobDescription"
          label="What do you need?"
          required
          error={errors.jobDescription}
          className="sm:col-span-2 lg:col-span-1"
        >
          <textarea
            {...text("jobDescription")}
            rows={4}
            maxLength={JOB_MAX}
            placeholder="e.g. AC is blowing warm air, 2-story home, unit is about 10 years old."
          />
          <span
            className={cn(
              "self-end text-xs",
              left < 50 ? "text-sunset-ink" : "text-muted-foreground",
            )}
          >
            {left} characters left
          </span>
        </Field>
        <Field id="q-name" label="Your name" required error={errors.name}>
          <input {...text("name")} autoComplete="name" />
        </Field>
        <Field id="q-email" label="Email" required error={errors.email}>
          <input
            {...text("email")}
            type="email"
            inputMode="email"
            autoComplete="email"
          />
        </Field>
        <Field id="q-phone" label="Phone" error={errors.phone}>
          <input
            {...text("phone")}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(813) 555-1234"
          />
        </Field>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-sm font-bold">
            Contact me by <span className="text-sunset-ink">*</span>
          </legend>
          <div className="mt-1.5 flex gap-2">
            {CONTACT_PREFERENCES.map(p => (
              <label
                key={p}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold",
                  form.contactPreference === p
                    ? "border-primary bg-accent text-primary"
                    : "bg-background",
                )}
              >
                <input
                  type="radio"
                  name="contactPreference"
                  value={p}
                  checked={form.contactPreference === p}
                  onChange={() => set("contactPreference", p)}
                  className="accent-[var(--primary)]"
                />
                {p}
              </label>
            ))}
          </div>
          {errors.contactPreference ? (
            <p className="text-sm font-medium text-destructive" role="alert">
              {errors.contactPreference}
            </p>
          ) : null}
        </fieldset>
      </div>

      <div className="mt-5 space-y-3 text-sm">
        {form.phone.trim() ? (
          <label className="flex items-start gap-2.5">
            <input
              id="q-phoneConsent"
              type="checkbox"
              checked={form.phoneConsent}
              onChange={e => set("phoneConsent", e.target.checked)}
              className="mt-0.5 size-4 accent-[var(--primary)]"
              aria-describedby={
                errors.phoneConsent ? "q-phoneConsent-error" : undefined
              }
            />
            <span>
              {business.name} may call or text me at this number about this
              request.{" "}
              <span className="text-muted-foreground">
                (Separate from the box below; not used for marketing.)
              </span>
            </span>
          </label>
        ) : null}
        {errors.phoneConsent ? (
          <p
            id="q-phoneConsent-error"
            className="font-medium text-destructive"
            role="alert"
          >
            {errors.phoneConsent}
          </p>
        ) : null}
        <label className="flex items-start gap-2.5">
          <input
            id="q-termsAccepted"
            type="checkbox"
            checked={form.termsAccepted}
            onChange={e => set("termsAccepted", e.target.checked)}
            className="mt-0.5 size-4 accent-[var(--primary)]"
            aria-describedby={
              errors.termsAccepted ? "q-termsAccepted-error" : undefined
            }
          />
          <span>
            <strong>Send my request to 1 business: {business.name}.</strong> The
            Tampa Scoop will share these details with them only, so they can
            contact me about this job.{" "}
            <span className="text-sunset-ink">*</span>
          </span>
        </label>
        {errors.termsAccepted ? (
          <p
            id="q-termsAccepted-error"
            className="font-medium text-destructive"
            role="alert"
          >
            {errors.termsAccepted}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={status === "sending"}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-sunset px-6 py-3 font-bold text-sunset-foreground shadow-sm transition hover:brightness-110 disabled:opacity-70"
      >
        {status === "sending" ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden /> Sending…
          </>
        ) : (
          "Send quote request"
        )}
      </button>
      <p className="mt-3 text-xs text-muted-foreground">
        Free, no obligation. A person reviews every request before it's passed
        on. We never sell your details.
      </p>
    </form>
  );
}
