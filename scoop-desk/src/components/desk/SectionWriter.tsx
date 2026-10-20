import { useAction, useMutation, useQuery } from "convex/react";
import {
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Mail,
  Plus,
  RotateCcw,
  Save,
  Send,
  TriangleAlert,
  Undo2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/ui";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { SECTION_SPECS, SECTION_TONES, type SectionTone, checkRules, charCount, specFor, toHtml, toPlain } from "../../../convex/lib/sections";
import { btn, ui, VerifyText } from "./bits";

type Board = NonNullable<ReturnType<typeof useBoard>>;
type Section = Board["sections"][number];
type StoryLite = Board["stories"][number];

function useBoard(issueId: string) {
  return useQuery(api.sections.board, { issueId });
}

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch {
    toast.error("Couldn't copy. Select the text and copy it by hand.");
  }
}

export function SectionWriter({ issueId }: { issueId: string }) {
  const board = useBoard(issueId);
  const send = useAction(api.sections.sendToBeehiiv);
  const reopen = useMutation(api.sections.reopen);
  const [sending, setSending] = useState(false);
  const [beehiivMsg, setBeehiivMsg] = useState<{ ok: boolean; message: string } | null>(null);

  if (board === undefined) return <div className="h-64 animate-pulse rounded-xl bg-muted" />;
  if (board === null) return <p>No such issue.</p>;
  const { issue, sections, stories, assembly } = board;
  const approved = sections.filter(s => s.approvedTone && s.approvedText.trim()).length;

  return (
    <div className="space-y-6" data-testid="section-writer">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button className={btn("outline")} data-testid="copy-full" onClick={() => copy(toPlain(assembly), "Full issue")}>
          <Copy className="size-4" /> Copy full issue
        </Button>
        <Button className={btn("outline")} data-testid="copy-html" onClick={() => copy(toHtml(assembly), "beehiiv HTML")}>
          <Code2 className="size-4" /> Copy beehiiv HTML
        </Button>
        <Button
          className={cn(ui.btn, "bg-[#1D2B33] text-white hover:bg-[#1D2B33]/90")}
          data-testid="send-beehiiv"
          disabled={sending}
          onClick={async () => {
            setSending(true);
            setBeehiivMsg(null);
            try {
              const r = await send({ issueId });
              setBeehiivMsg(r);
              (r.ok ? toast.success : toast.error)(r.message);
            } catch {
              setBeehiivMsg({ ok: false, message: "Couldn't reach beehiiv. Try again in a minute." });
            } finally {
              setSending(false);
            }
          }}
        >
          <Send className="size-4" /> {sending ? "Sending…" : "Send to beehiiv"}
        </Button>
        <Button
          className={btn("outline")}
          data-testid="reopen"
          onClick={async () => {
            await reopen({ issueId });
            toast.success("Issue reopened as a draft");
          }}
        >
          <RotateCcw className="size-4" /> Reopen issue
        </Button>
      </div>
      {beehiivMsg && (
        <p
          data-testid="beehiiv-msg"
          className={cn("rounded-md border px-3 py-2 text-sm", beehiivMsg.ok ? "border-success/40 bg-success/10" : "border-sunset/40 bg-sunset/10")}
        >
          {beehiivMsg.message}
        </p>
      )}

      <SubjectCard issue={issue} />

      <div className={cn(ui.card, "p-5")} data-testid="progress">
        <div className="mb-2 flex items-center justify-between text-sm font-semibold">
          <span data-testid="approved-count">
            {approved} of {SECTION_SPECS.length} sections approved
          </span>
          {approved === SECTION_SPECS.length && (
            <span className="flex items-center gap-1 text-success">
              <CheckCircle2 className="size-4" /> Every section approved
            </span>
          )}
        </div>
        <div className="h-2 rounded-full bg-muted">
          <div className="h-2 rounded-full bg-success transition-all" style={{ width: `${(approved / SECTION_SPECS.length) * 100}%` }} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {sections.map(s => {
          const spec = specFor(s.key);
          const ok = !!s.approvedTone;
          return (
            <a
              key={s.key}
              href={`#sec-${s.key}`}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold",
                ok ? "border-success/50 bg-success/10 text-success" : "bg-card text-muted-foreground",
              )}
            >
              {spec.emoji} {spec.title}
            </a>
          );
        })}
      </div>

      {sections.map(s => (
        <SectionCard key={s.key} issueId={issueId} section={s} stories={stories} />
      ))}
    </div>
  );
}

function SubjectCard({ issue }: { issue: Doc<"issues"> }) {
  const update = useMutation(api.issues.update);
  const [subject, setSubject] = useState(issue.subject);
  const [preview, setPreview] = useState(issue.previewText);
  useEffect(() => setSubject(issue.subject), [issue.subject]);
  useEffect(() => setPreview(issue.previewText), [issue.previewText]);

  const save = async (p: { subject?: string; previewText?: string }) => {
    await update({ issueId: issue.issueId, ...p });
  };

  return (
    <section className={cn(ui.card, "p-5")} data-testid="subject-card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg">
          <Mail className="size-4" /> Subject line and preview
        </h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-semibold">Subject line ({subject.length})</span>
          <input
            className={ui.input}
            data-testid="subject-input"
            placeholder="Pick one below or write your own"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            onBlur={() => subject !== issue.subject && save({ subject })}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-semibold">Preview text ({preview.length})</span>
          <input
            className={ui.input}
            data-testid="preview-input"
            placeholder="Shows next to the subject in the inbox"
            value={preview}
            onChange={e => setPreview(e.target.value)}
            onBlur={() => preview !== issue.previewText && save({ previewText: preview })}
          />
        </label>
      </div>
      {!!issue.subjectOptions?.length && (
        <ul className="mt-4 space-y-2" data-testid="subject-options">
          {issue.subjectOptions.map((o, i) => (
            <li key={i} className="flex items-start gap-3 rounded-lg border p-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{o.subject}</p>
                <p className="text-sm">{o.preview}</p>
                <p className="text-xs italic text-muted-foreground">{o.why}</p>
              </div>
              <Button
                className={btn("outline", "h-8 px-3")}
                data-testid="use-subject"
                onClick={async () => {
                  setSubject(o.subject);
                  setPreview(o.preview);
                  await save({ subject: o.subject, previewText: o.preview });
                  toast.success("Subject and preview set");
                }}
              >
                Use this
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RuleNotes({ text, k, note }: { text: string; k: string; note?: string }) {
  if (!text.trim()) return null;
  const r = checkRules(text, k);
  return (
    <div className="space-y-1 border-t px-3 py-2 text-xs" data-testid="rule-notes">
      {r.ok ? (
        <p className="text-muted-foreground">· Checked against all hard rules: no dashes, no Oxford comma, contractions used, length within target.</p>
      ) : (
        r.problems.map(p => (
          <p key={p} className="flex items-start gap-1 font-semibold text-sunset" data-testid="rule-violation">
            <TriangleAlert className="mt-0.5 size-3 shrink-0" /> {p}
          </p>
        ))
      )}
      {note && <p className="text-muted-foreground">· {note}</p>}
    </div>
  );
}

function SectionCard({ issueId, section, stories }: { issueId: string; section: Section; stories: StoryLite[] }) {
  const spec = specFor(section.key);
  const patch = useMutation(api.sections.patch);
  const approve = useMutation(api.sections.approve);
  const unapprove = useMutation(api.sections.unapprove);
  const startOver = useMutation(api.sections.startOver);
  const pasteApproved = useMutation(api.sections.pasteApproved);
  const [pasted, setPasted] = useState("");
  const [command, setCommand] = useState(section.command);
  const [outline, setOutline] = useState(section.outline);
  const [notes, setNotes] = useState(section.notes);
  const [picked, setPicked] = useState<string[]>(section.storyIds);
  const [showCtx, setShowCtx] = useState(false);
  const [approvedText, setApprovedText] = useState(section.approvedText);
  useEffect(() => setCommand(section.command), [section.command]);
  useEffect(() => setOutline(section.outline), [section.outline]);
  useEffect(() => setNotes(section.notes), [section.notes]);
  useEffect(() => setPicked(section.storyIds), [section.storyIds]);
  useEffect(() => setApprovedText(section.approvedText), [section.approvedText]);

  const hasDrafts = SECTION_TONES.some(t => section.drafts[t].trim());
  const base = { issueId, key: section.key };

  const best = section.approvedText || section.drafts.Deep || section.drafts.Punchy || section.drafts.Straight;

  return (
    <section id={`sec-${section.key}`} className={cn(ui.card, "scroll-mt-4 p-5")} data-testid={`section-${section.key}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex flex-wrap items-center gap-2 text-2xl">
            <span>{spec.emoji}</span> {spec.title}
            {section.approvedTone && (
              <span className="flex items-center gap-1 rounded-full border border-success/50 bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                <CheckCircle2 className="size-3" /> Approved · {section.approvedTone}
              </span>
            )}
          </h2>
          <p className="text-xs text-muted-foreground">
            {spec.min} to {spec.max} chars · {section.storyIds.length ? `${section.storyIds.length} picked stor${section.storyIds.length > 1 ? "ies" : "y"}` : "issue stories by default"}
            {section.notes.trim() ? " · notes added" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className={btn("outline", "h-8 px-3")} disabled={!best} onClick={() => copy(best, `${spec.title} text`)}>
            <Copy className="size-4" /> Copy text
          </Button>
          <Button
            className={btn("quiet", "h-8 px-3")}
            data-testid="start-over"
            onClick={async () => {
              if (!confirm(`Clear every draft, approval and note in ${spec.title}?`)) return;
              await startOver(base);
            }}
          >
            <RotateCcw className="size-4" /> Start over
          </Button>
        </div>
      </div>

      <Button className={btn("outline", "mb-3 h-8 px-3")} data-testid="add-context" onClick={() => setShowCtx(x => !x)}>
        <Plus className="size-4" /> Add context
      </Button>
      {showCtx && (
        <div className="mb-4 space-y-3 rounded-lg border bg-muted/30 p-3" data-testid="context-panel">
          <p className={ui.label}>Pick Story Queue stories</p>
          <div className="max-h-56 space-y-1 overflow-auto">
            {stories.length === 0 && <p className="text-sm text-muted-foreground">The Story Queue is empty.</p>}
            {stories.map(st => (
              <label key={st.storyId} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  data-testid="ctx-story"
                  checked={picked.includes(st.storyId)}
                  onChange={e => setPicked(p => (e.target.checked ? [...p, st.storyId] : p.filter(x => x !== st.storyId)))}
                />
                <span>
                  <span className="font-semibold">{st.headline || st.sponsorName || st.firstFact.slice(0, 80) || st.storyId}</span>{" "}
                  <span className="text-xs text-muted-foreground">
                    {st.section} · {st.issueDate}
                    {st.inIssue ? " · in this issue" : ""}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <label className="block space-y-1 text-sm">
            <span className={ui.label}>Or paste notes (checked facts and links)</span>
            <textarea className={cn(ui.input, "min-h-24")} data-testid="ctx-notes" value={notes} onChange={e => setNotes(e.target.value)} />
          </label>
          <Button
            className={btn("primary", "h-8 px-3")}
            data-testid="save-context"
            onClick={async () => {
              await patch({ ...base, notes, storyIds: picked });
              toast.success("Context saved");
              setShowCtx(false);
            }}
          >
            <Save className="size-4" /> Save context
          </Button>
        </div>
      )}

      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-semibold">Command</span>
          <textarea
            className={cn(ui.input, "min-h-16")}
            data-testid="command"
            placeholder="What do you want this section to do? e.g. lead with the patio, mention it's pricey"
            value={command}
            onChange={e => setCommand(e.target.value)}
            onBlur={() => command !== section.command && patch({ ...base, command })}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-semibold">Outline</span>
          <textarea
            className={cn(ui.input, "min-h-16")}
            data-testid="outline"
            placeholder="Optional beat by beat structure"
            value={outline}
            onChange={e => setOutline(e.target.value)}
            onBlur={() => outline !== section.outline && patch({ ...base, outline })}
          />
        </label>
      </div>

      {hasDrafts ? (
        <div className="grid gap-3 lg:grid-cols-3">
          {SECTION_TONES.map(t => (
            <DraftColumn
              key={t}
              tone={t}
              text={section.drafts[t]}
              note={section.draftNotes[t]}
              k={section.key}
              approvedTone={section.approvedTone}
              onApprove={() => approve({ ...base, tone: t })}
            />
          ))}
        </div>
      ) : (
        !section.approvedTone && (
          <div className="space-y-2 rounded-lg border border-dashed p-4" data-testid="paste-panel">
            <p className="text-sm text-muted-foreground">No drafts yet. Paste this section's finished text, then approve it.</p>
            <textarea
              className={cn(ui.input, "min-h-32")}
              data-testid="paste-text"
              value={pasted}
              onChange={e => setPasted(e.target.value)}
            />
            <RuleNotes text={pasted} k={section.key} />
            <Button
              className={btn("primary", "h-8 px-3")}
              data-testid="paste-approve"
              disabled={!pasted.trim()}
              onClick={async () => {
                await pasteApproved({ ...base, text: pasted });
                setPasted("");
                toast.success("Approved copy saved");
              }}
            >
              <Save className="size-4" /> Save and approve
            </Button>
          </div>
        )
      )}

      {section.approvedTone && (
        <div className="mt-4 rounded-lg border border-success/50 bg-success/5" data-testid="approved-box">
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
            <span className="flex items-center gap-1 text-sm font-semibold text-success">
              <CheckCircle2 className="size-4" /> Approved copy <span className="font-normal text-muted-foreground">from {section.approvedTone}</span>
            </span>
            <div className="flex gap-2">
              <Button className={btn("quiet", "h-8 px-3")} data-testid="unapprove" onClick={() => unapprove(base)}>
                <Undo2 className="size-4" /> Unapprove
              </Button>
              <Button
                className={btn("primary", "h-8 px-3")}
                data-testid="save-approved"
                disabled={approvedText === section.approvedText}
                onClick={async () => {
                  await patch({ ...base, approvedText });
                  toast.success("Approved copy saved");
                }}
              >
                <Save className="size-4" /> Save
              </Button>
            </div>
          </div>
          <textarea
            className="block min-h-48 w-full resize-y border-t bg-card px-3 py-2 text-sm leading-relaxed outline-none"
            data-testid="approved-text"
            value={approvedText}
            onChange={e => setApprovedText(e.target.value)}
          />
          <RuleNotes text={approvedText} k={section.key} />
        </div>
      )}
    </section>
  );
}

function DraftColumn({
  tone,
  text,
  note,
  k,
  approvedTone,
  onApprove,
}: {
  tone: SectionTone;
  text: string;
  note: string;
  k: string;
  approvedTone: string;
  onApprove: () => void;
}) {
  const isApproved = approvedTone === tone;
  return (
    <div className={cn("flex flex-col rounded-lg border bg-card", isApproved && "border-success ring-1 ring-success/40")} data-testid={`draft-${tone}`}>
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <span className="text-sm font-semibold">
          {tone} <span className="text-xs font-normal text-muted-foreground" data-testid="char-count">{charCount(text)} chars</span>
        </span>
        <div className="flex gap-1">
          <Button className={btn("quiet", "h-7 px-2 text-xs")} disabled={!text} onClick={() => copy(text, `${tone} draft`)}>
            <Copy className="size-3" /> Copy text
          </Button>
          {isApproved ? (
            <span className="flex h-7 items-center gap-1 rounded-md bg-success px-2 text-xs font-semibold text-success-foreground">
              <Check className="size-3" /> Approved
            </span>
          ) : (
            <Button className={btn("outline", "h-7 px-2 text-xs")} data-testid="approve" disabled={!text} onClick={onApprove}>
              {approvedTone ? "Use this instead" : "Approve"}
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1 px-3 py-2 text-sm leading-relaxed">
        <VerifyText text={text} />
      </div>
      <RuleNotes text={text} k={k} note={note} />
    </div>
  );
}
