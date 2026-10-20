import { useAction, useMutation, useQuery } from "convex/react";
import { ArrowLeft, ExternalLink, Pencil, RotateCcw, Scissors, Trash2, ShieldCheck, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { btn, Chip, PageHeader, StateBadge, SyncBanner, SyncDot, ui, VerifyText, WordMeter } from "@/components/desk/bits";
import { StoryForm } from "@/components/desk/StoryForm";
import { cn } from "@/lib/utils";
import { Button } from "@/ui";
import { api } from "../../convex/_generated/api";
import { countWords, findVerifyFlags, prettyDate, splitLines, wordRange } from "../../convex/lib/desk";

export function StoryPage() {
  const { storyId = "" } = useParams();
  const story = useQuery(api.stories.get, { storyId });
  const saveDraft = useMutation(api.stories.saveDraft);
  const setState = useMutation(api.stories.setState);
  const deleteStory = useAction(api.deletes.deleteStory);
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const onDelete = async () => {
    if (!window.confirm("Delete permanently? This also removes it from Smartsheet.")) return;
    setDeleting(true);
    try {
      const r = await deleteStory({ storyId });
      if (r.outcome === "deleted") toast.success(r.message);
      else toast(r.message);
      navigate("/queue");
    } catch (e) {
      toast.error(`Delete failed: ${String(e).slice(0, 120)}`);
      setDeleting(false);
    }
  };
  const updateIntake = useMutation(api.stories.updateIntake);

  const [headline, setHeadline] = useState("");
  const [draft, setDraft] = useState("");
  const [notes, setNotes] = useState("");
  const [dirty, setDirty] = useState(false);
  const [editingIntake, setEditingIntake] = useState(false);

  // Load server copy whenever it changes and the editor has no unsaved typing.
  useEffect(() => {
    if (story && !dirty) {
      setHeadline(story.headline);
      setDraft(story.draft);
      setNotes(story.editorNotes);
    }
  }, [story, dirty]);

  if (story === undefined) return <div className="mx-auto h-64 max-w-5xl animate-pulse rounded-xl bg-muted" />;
  if (story === null)
    return (
      <div className="mx-auto max-w-5xl">
        <p>That story isn't in the queue.</p>
        <Link to="/queue" className="text-primary underline">
          Back to the queue
        </Link>
      </div>
    );

  const range = wordRange(story.tone, story.sponsor);
  const words = countWords(draft);
  const flags = findVerifyFlags(`${headline}\n${draft}`);
  const urls = splitLines(story.sourceUrls);
  const facts = splitLines(story.factBullets);

  const save = async () => {
    await saveDraft({ storyId, headline, draft, editorNotes: notes });
    setDirty(false);
    toast.success("Draft saved");
  };

  const changeState = async (state: "queued" | "drafted" | "verified" | "cut") => {
    if (dirty) await save();
    const r = await setState({ storyId, state });
    if (!r.ok) toast.error(r.message);
    else toast.success(state === "verified" ? "Marked verified" : `Moved to ${state}`);
  };

  return (
    <div className="mx-auto max-w-6xl">
      <SyncBanner />
      <Link to="/queue" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Story queue
      </Link>
      <PageHeader kicker={`${prettyDate(story.issueDate)} · ${story.sponsor ? "Sponsor" : story.section}`} title={story.headline || facts[0] || story.sponsorName || "Untitled story"}>
        <StateBadge state={story.state} />
        <SyncDot state={story.syncState} message={story.syncMessage} />
        <Button className={btn("quiet", "h-8 px-2 text-destructive")} disabled={deleting} onClick={onDelete} data-testid="delete-story" title="Delete permanently">
          <Trash2 className="size-4" /> Delete
        </Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        {/* Intake: the only material the draft may use */}
        <aside className="space-y-4">
          <div className={cn(ui.card, "p-5")}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl">Intake</h2>
              <Button className={btn("quiet", "h-8 px-2")} onClick={() => setEditingIntake(v => !v)}>
                <Pencil className="size-4" /> {editingIntake ? "Close" : "Edit"}
              </Button>
            </div>
            {editingIntake ? (
              <StoryForm
                mode="edit"
                initial={{
                  issueDate: story.issueDate,
                  tone: story.tone,
                  section: story.section,
                  factBullets: story.factBullets,
                  sourceUrls: story.sourceUrls,
                  readerAction: story.readerAction,
                  knownGaps: story.knownGaps,
                  sponsor: story.sponsor,
                  sponsorName: story.sponsorName,
                  sponsorCopy: story.sponsorCopy,
                  sponsorUrl: story.sponsorUrl,
                }}
                submitLabel="Save intake"
                onCancel={() => setEditingIntake(false)}
                onSubmit={async f => {
                  const r = await updateIntake({ storyId, ...f });
                  if (!r.ok) return r.fieldErrors;
                  setEditingIntake(false);
                  toast.success("Intake saved. Regenerate the draft to use the new facts.");
                  return null;
                }}
              />
            ) : (
              <dl className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-1.5">
                  {!story.sponsor && <Chip tone="teal">{story.tone}</Chip>}
                  <Chip>{story.sponsor ? "Sponsor" : story.section}</Chip>
                  {story.readerAction && <Chip>action: {story.readerAction}</Chip>}
                </div>
                {story.sponsor ? (
                  <>
                    <div>
                      <dt className={ui.label}>Sponsor</dt>
                      <dd>{story.sponsorName}</dd>
                    </div>
                    <div>
                      <dt className={ui.label}>Destination</dt>
                      <dd className="break-all">{story.sponsorUrl}</dd>
                    </div>
                  </>
                ) : (
                  <div>
                    <dt className={ui.label}>Fact bullets</dt>
                    <dd>
                      <ul className="mt-1 list-disc space-y-1 pl-4">
                        {facts.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                )}
                {urls.length > 0 && (
                  <div>
                    <dt className={ui.label}>Sources</dt>
                    <dd className="mt-1 space-y-1">
                      {urls.map((u, i) => (
                        <a key={u} href={u} target="_blank" rel="noreferrer" className="flex items-start gap-1 break-all text-primary underline">
                          <ExternalLink className="mt-0.5 size-3 shrink-0" />
                          {i === 0 && <span className="shrink-0 font-semibold no-underline">Primary:</span>} {u}
                        </a>
                      ))}
                    </dd>
                  </div>
                )}
                {story.knownGaps && (
                  <div>
                    <dt className={ui.label}>Known gaps</dt>
                    <dd>{story.knownGaps}</dd>
                  </div>
                )}
              </dl>
            )}
          </div>
        </aside>

        {/* Draft */}
        <section className="min-w-0 space-y-4">
          <div className={cn(ui.card, "space-y-4 p-5")}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl">{story.sponsor ? "Approved sponsor copy" : "Draft"}</h2>
            </div>

            {story.sponsor && (
              <p className="rounded-md bg-sunset-soft px-3 py-2 text-sm text-sunset-ink">
                Sponsor copy is used word for word and labelled “Sponsored”. Change it under Edit intake.
              </p>
            )}

            {!story.draft && !story.sponsor && (
              <p className="rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
                No draft yet. Paste the {story.tone} {story.section} copy ({range.min}–{range.max} words) below and save. Mark anything unchecked as <mark className="rounded bg-warning px-1">VERIFY: [field]</mark>.
              </p>
            )}
            {(
              <>
                <label className="block space-y-1.5">
                  <span className="text-sm font-semibold">Headline</span>
                  <input
                    className={ui.input}
                    value={headline}
                    readOnly={story.sponsor}
                    onChange={e => {
                      setHeadline(e.target.value);
                      setDirty(true);
                    }}
                    data-testid="headline-input"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-semibold">Copy</span>
                  <textarea
                    className={cn(ui.input, "min-h-44 text-[15px] leading-relaxed")}
                    value={draft}
                    readOnly={story.sponsor}
                    onChange={e => {
                      setDraft(e.target.value);
                      setDirty(true);
                    }}
                    data-testid="draft-input"
                  />
                </label>
                <WordMeter count={words} min={range.min} max={range.max} />

                <div className="rounded-lg border bg-background/70 p-4" data-testid="draft-preview">
                  <p className={cn(ui.label, "mb-2")}>Preview</p>
                  {headline && <p className="mb-1 font-heading text-lg">{headline}</p>}
                  <VerifyText text={draft} className="text-[15px] leading-relaxed" />
                </div>

                {flags.length > 0 && (
                  <div className="flex items-start gap-2 rounded-lg border border-warning bg-warning/15 px-3 py-2 text-sm" data-testid="verify-summary">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                    <p>
                      <strong>
                        {flags.length} VERIFY flag{flags.length > 1 ? "s" : ""}:
                      </strong>{" "}
                      {flags.join(", ")}. Confirm each on the primary source and type it in, or cut the detail. Export stays
                      blocked while any flag is left.
                    </p>
                  </div>
                )}

                {story.warnings.length > 0 && !dirty && (
                  <ul className="space-y-1 text-sm" data-testid="draft-warnings">
                    {story.warnings.map(w => (
                      <li key={w} className="flex gap-2 text-muted-foreground">
                        <span className="text-sunset">•</span> {w}
                      </li>
                    ))}
                  </ul>
                )}

                {!story.sponsor && (
                  <label className="block space-y-1.5">
                    <span className="text-sm font-semibold">Editor notes</span>
                    <input
                      className={ui.input}
                      value={notes}
                      placeholder="What you checked, who confirmed it…"
                      onChange={e => {
                        setNotes(e.target.value);
                        setDirty(true);
                      }}
                    />
                  </label>
                )}

                <div className="flex flex-wrap gap-2 border-t pt-4">
                  {!story.sponsor && (
                    <Button className={btn("primary")} disabled={!dirty} onClick={save} data-testid="save-draft">
                      Save edits
                    </Button>
                  )}
                  {story.state !== "verified" && story.state !== "cut" && (
                    <Button
                      className={btn("outline")}
                      onClick={() => changeState("verified")}
                      disabled={flags.length > 0}
                      title={flags.length ? "Resolve VERIFY flags first" : "I opened the primary source and confirmed dates, price, status, address"}
                      data-testid="mark-verified"
                    >
                      <ShieldCheck className="size-4" /> Mark verified
                    </Button>
                  )}
                  {story.state === "cut" ? (
                    <Button className={btn("outline")} onClick={() => changeState(story.draft ? "drafted" : "queued")}>
                      <RotateCcw className="size-4" /> Restore
                    </Button>
                  ) : (
                    <Button className={btn("quiet", "text-destructive")} onClick={() => changeState("cut")}>
                      <Scissors className="size-4" /> Cut
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>

          {story.claims.length > 0 && (
            <div className={cn(ui.card, "p-5")} data-testid="claims">
              <h2 className="mb-1 text-xl">Claims → sources</h2>
              <p className="mb-3 text-sm text-muted-foreground">Every named fact should trace to a link. Open the primary source before you mark it verified.</p>
              <ol className="space-y-2 text-sm">
                {story.claims.map((c, i) => (
                  <li key={i} className="grid gap-1 rounded-md bg-background/70 p-2 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-3">
                    <span>{c.claim}</span>
                    {c.sourceUrl.startsWith("UNMAPPED") ? (
                      <Chip tone="warn">no matching source</Chip>
                    ) : (
                      <a href={c.sourceUrl} target="_blank" rel="noreferrer" className="max-w-64 truncate text-xs text-primary underline">
                        {c.sourceUrl.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                  </li>
                ))}
              </ol>
              {story.lastDraftAt && (
                <p className="mt-3 text-xs text-muted-foreground">
                  AI draft #{story.draftCount}
                  {story.editedByHand ? ", edited by you" : ""}.
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
