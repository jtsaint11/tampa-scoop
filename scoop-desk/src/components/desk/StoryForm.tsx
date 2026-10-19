import { ClipboardPaste } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/ui";
import {
  EMPTY_INTAKE,
  type IntakeFields,
  parseIntakeBlock,
  READER_ACTIONS,
  SECTIONS,
  TONE_RULES,
  TONES,
  validateIntake,
} from "../../../convex/lib/desk";
import { btn, Field, ui } from "./bits";

const PASTE_PLACEHOLDER = `ISSUE DATE: 2026-10-20   |   TONE: Punchy
SECTION: Events
FACT BULLETS:
one fact per line
SOURCE URLS:
https://primary-source.example
READER ACTION: go
KNOWN GAPS: price
SPONSOR: no`;

export function StoryForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  mode = "create",
}: {
  mode?: "create" | "edit";
  initial?: IntakeFields;
  submitLabel: string;
  onSubmit: (f: IntakeFields) => Promise<Record<string, string> | null>;
  onCancel?: () => void;
}) {
  const [f, setF] = useState<IntakeFields>(initial ?? EMPTY_INTAKE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paste, setPaste] = useState("");
  const [showPaste, setShowPaste] = useState(mode === "create");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof IntakeFields>(k: K, val: IntakeFields[K]) => setF(prev => ({ ...prev, [k]: val }));

  const applyPaste = () => {
    const { fields, found } = parseIntakeBlock(paste);
    if (!found.length) {
      toast.error("Couldn't find any intake labels (ISSUE DATE:, TONE:, FACT BULLETS: …).");
      return;
    }
    setF(prev => {
      const next = { ...prev };
      for (const k of Object.keys(fields) as (keyof IntakeFields)[]) {
        const val = fields[k];
        if (k === "sponsor" ? found.includes("sponsor") : val !== "") (next as Record<string, unknown>)[k] = val;
      }
      return next;
    });
    setErrors({});
    toast.success(`Filled ${found.join(", ")}. Check the form, then add it to the queue.`);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateIntake(f);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const serverErrs = await onSubmit(f);
      if (serverErrs) setErrors(serverErrs);
      else if (mode === "create") {
        setF({ ...EMPTY_INTAKE, issueDate: f.issueDate });
        setPaste("");
      }
    } finally {
      setBusy(false);
    }
  };

  const tone = TONE_RULES[f.tone as keyof typeof TONE_RULES];

  return (
    <form onSubmit={submit} className="space-y-5" noValidate data-testid="story-form">
      <div className="rounded-lg border border-dashed bg-background/60 p-3">
        <button
          type="button"
          className="flex w-full items-center gap-2 text-left text-sm font-semibold"
          onClick={() => setShowPaste(s => !s)}
          aria-expanded={showPaste}
        >
          <ClipboardPaste className="size-4 text-primary" />
          Paste an intake block
          <span className="ml-auto text-xs font-normal text-muted-foreground">{showPaste ? "Hide" : "Show"}</span>
        </button>
        {showPaste && (
          <div className="mt-3 space-y-2">
            <textarea
              aria-label="Paste intake block"
              data-testid="paste-box"
              className={cn(ui.input, "min-h-36 font-mono text-xs")}
              placeholder={PASTE_PLACEHOLDER}
              value={paste}
              onChange={e => setPaste(e.target.value)}
            />
            <Button className={btn("outline", "h-8 px-3")} onClick={applyPaste} disabled={!paste.trim()}>
              Fill the form from this block
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Issue date" htmlFor="issueDate" error={errors.issueDate}>
          <input
            id="issueDate"
            type="date"
            className={ui.input}
            value={f.issueDate}
            onChange={e => set("issueDate", e.target.value)}
          />
        </Field>
        <Field label="Section" htmlFor="section" error={errors.section}>
          <select
            id="section"
            className={ui.input}
            value={f.sponsor ? "Sponsor" : f.section}
            disabled={f.sponsor}
            onChange={e => set("section", e.target.value)}
          >
            <option value="">Choose…</option>
            {SECTIONS.map(s => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Reader action" htmlFor="readerAction" error={errors.readerAction}>
          <select
            id="readerAction"
            className={ui.input}
            value={f.readerAction}
            onChange={e => set("readerAction", e.target.value)}
          >
            <option value="">None</option>
            {READER_ACTIONS.map(s => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
      </div>

      {!f.sponsor && (
        <Field
          label="Tone"
          error={errors.tone}
          hint={tone ? `${tone.min}–${tone.max} words · ${tone.shape}` : "Deep for why-it-matters stories, Punchy for picks, Straight for notices."}
        >
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tone">
            {TONES.map(t => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={f.tone === t}
                onClick={() => set("tone", t)}
                className={cn(
                  "rounded-md border px-3 py-2 text-left text-sm transition-colors",
                  f.tone === t ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent",
                )}
              >
                <span className="block font-semibold">{t}</span>
                <span className={cn("text-xs", f.tone === t ? "opacity-85" : "text-muted-foreground")}>
                  {TONE_RULES[t].min}–{TONE_RULES[t].max} words
                </span>
              </button>
            ))}
          </div>
        </Field>
      )}

      {!f.sponsor && (
        <>
          <Field label="Fact bullets" htmlFor="factBullets" hint="One verified fact per line. The draft uses nothing else." error={errors.factBullets}>
            <textarea
              id="factBullets"
              className={cn(ui.input, "min-h-32")}
              value={f.factBullets}
              onChange={e => set("factBullets", e.target.value)}
            />
          </Field>
          <Field label="Source URLs" htmlFor="sourceUrls" hint="Primary source first, one per line." error={errors.sourceUrls}>
            <textarea
              id="sourceUrls"
              className={cn(ui.input, "min-h-20 font-mono text-xs")}
              value={f.sourceUrls}
              onChange={e => set("sourceUrls", e.target.value)}
            />
          </Field>
          <Field label="Known gaps" htmlFor="knownGaps" hint="e.g. price / time / address / confirmation. These become VERIFY flags.">
            <input id="knownGaps" className={ui.input} value={f.knownGaps} onChange={e => set("knownGaps", e.target.value)} />
          </Field>
        </>
      )}

      <div className="rounded-lg border bg-background/60 p-3">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            className="size-4 accent-[var(--sunset)]"
            checked={f.sponsor}
            onChange={e => {
              set("sponsor", e.target.checked);
              if (e.target.checked) set("section", "Sponsor");
            }}
          />
          Sponsored placement
          <span className="font-normal text-muted-foreground">(approved copy runs word for word, labelled)</span>
        </label>
        {f.sponsor && (
          <div className="mt-3 grid gap-4">
            <Field label="Sponsor business" htmlFor="sponsorName" error={errors.sponsorName}>
              <input id="sponsorName" className={ui.input} value={f.sponsorName} onChange={e => set("sponsorName", e.target.value)} />
            </Field>
            <Field label="Approved copy" htmlFor="sponsorCopy" hint="40–90 words: reader problem + specific offer + one call to action." error={errors.sponsorCopy}>
              <textarea
                id="sponsorCopy"
                className={cn(ui.input, "min-h-24")}
                value={f.sponsorCopy}
                onChange={e => set("sponsorCopy", e.target.value)}
              />
            </Field>
            <Field label="Destination URL" htmlFor="sponsorUrl" error={errors.sponsorUrl}>
              <input id="sponsorUrl" className={ui.input} value={f.sponsorUrl} onChange={e => set("sponsorUrl", e.target.value)} />
            </Field>
            <Field label="Source URLs (optional)" htmlFor="sponsorSources" error={errors.sourceUrls}>
              <input
                id="sponsorSources"
                className={ui.input}
                value={f.sourceUrls}
                onChange={e => set("sourceUrls", e.target.value)}
              />
            </Field>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" className={btn("sunset")} disabled={busy} data-testid="story-submit">
          {busy ? "Saving…" : submitLabel}
        </Button>
        {onCancel && (
          <Button className={btn("quiet")} onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
