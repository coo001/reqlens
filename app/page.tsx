"use client";

import { useEffect, useRef, useState } from "react";
import type {
  ApiError,
  CheckReason,
  CompareResponse,
  CompareResult,
  ExtractResponse,
  Requirement,
  Verdict,
} from "@/lib/types.ts";

type Mode = "live" | "sample";
type Phase = "idle" | "extracting" | "comparing" | "done";
type Checked = {
  notice: string;
  draft: string;
  mode: Mode;
  extract: ExtractResponse;
  compare: CompareResponse;
  // Verdicts from the previous check of the same notice, to show what changed.
  prev: Record<string, Verdict> | null;
};

// Long lists fold the Met rows away so the gaps stay on the first screen.
const FOLD_MET_ABOVE = 15;
// Errors worth one automatic retry: the provider was busy or slow, not refusing.
const RETRYABLE = new Set(["overloaded", "timeout", "network_error", "empty_response", "malformed_response", "no_answer"]);

const VERDICT_ORDER: Verdict[] = ["missing", "partial", "check", "met"];
const VERDICT_LABEL: Record<Verdict, string> = {
  missing: "Missing",
  partial: "Partial",
  check: "Check yourself",
  met: "Met",
};
const VERDICT_GLYPH: Record<Verdict, string> = { missing: "✕", partial: "◐", check: "?", met: "✓" };
const LEVEL_LABEL = { required: "Required", recommended: "Recommended", scoring: "Scoring criterion" };
const CHECK_REASON: Record<CheckReason, string> = {
  outside_text: "A draft can’t show this. Confirm it yourself.",
  model_cannot_tell: "The draft’s text can’t settle this. Confirm it yourself.",
  evidence_discarded: "The model’s quote wasn’t found in your draft, so no verdict is shown.",
  no_verdict: "The model returned no verdict for this one.",
  criterion_not_addressed: "A judging criterion your draft has no clear text for. Judges score this; decide yourself whether to add something.",
  rule_not_mentioned: "A rule of conduct your draft doesn’t mention. Nothing here breaks it; confirm it yourself.",
};

const clean = (s: string) => s.replace(/\r\n/g, "\n").trim();

class ApiFailure extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

async function postOnce<T>(url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiFailure("network_error", "The server could not be reached.");
  }
  const json = (await res.json().catch(() => null)) as T | ApiError | null;
  if (!res.ok || !json || "error" in (json as object)) {
    const err = (json as ApiError | null)?.error;
    throw new ApiFailure(err?.code ?? "no_answer", err?.message ?? "The server did not answer.");
  }
  return json as T;
}

/** One automatic retry for busy/slow failures; anything else is reported at once. */
async function post<T>(url: string, body: unknown, onRetry: () => void): Promise<T> {
  try {
    return await postOnce<T>(url, body);
  } catch (e) {
    if (!(e instanceof ApiFailure) || !RETRYABLE.has(e.code)) throw e;
    onRetry();
    await new Promise((r) => setTimeout(r, 3000));
    return postOnce<T>(url, body);
  }
}

// Small stable hash, so a confirmation is remembered per notice and requirement.
function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
const CONFIRM_KEY = "reqlens:confirmed";

function jumpTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ block: "center", behavior: "smooth" });
  el.classList.remove("flash");
  void el.offsetWidth; // restart the animation
  el.classList.add("flash");
}

/** Renders text with the located spans marked, so quotes can be jumped to. */
function MarkedText({ text, spans }: { text: string; spans: { id: string; start: number; end: number; tone: string }[] }) {
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  const out: React.ReactNode[] = [];
  let at = 0;
  for (const s of sorted) {
    if (s.start < at) continue; // overlapping quote: the earlier mark covers it
    out.push(text.slice(at, s.start));
    out.push(
      <mark key={s.id} id={s.id} className={s.tone}>
        {text.slice(s.start, s.end)}
      </mark>,
    );
    at = s.end;
  }
  out.push(text.slice(at));
  return <div className="source-text">{out}</div>;
}

export default function Page() {
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Checked | null>(null);
  const [stepNote, setStepNote] = useState<{ reqs: number; discarded: number } | null>(null);
  // The last extraction is kept even if the comparison fails, so a retry
  // resumes from the comparison instead of reading the notice again.
  const [kept, setKept] = useState<{ notice: string; mode: Mode; extract: ExtractResponse } | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
  const resultsRef = useRef<HTMLElement>(null);
  const busy = phase === "extracting" || phase === "comparing";

  async function run(mode: Mode, rawNotice: string, rawDraft: string) {
    const n = clean(rawNotice);
    const d = clean(rawDraft);
    if (!n || !d) {
      setError("Paste both the notice and your draft first.");
      return;
    }
    setError(null);
    setRetrying(false);
    let stage = "Reading the notice";
    try {
      // The notice is only re-read when it changed; a draft edit costs one call.
      let extract = kept && kept.notice === n && kept.mode === mode ? kept.extract : null;
      if (!extract) {
        setStepNote(null);
        setPhase("extracting");
        extract = await post<ExtractResponse>("/api/extract", { notice: n, mode }, () => setRetrying(true));
        setKept({ notice: n, mode, extract });
        setRetrying(false);
      }
      stage = "Comparing with your draft";
      setStepNote({ reqs: extract.requirements.length, discarded: extract.discarded });
      if (extract.requirements.length === 0) {
        setPhase("idle");
        setError("No requirements were found in that text. Check that you pasted the rules or the call itself.");
        return;
      }
      setPhase("comparing");
      const compare = await post<CompareResponse>(
        "/api/compare",
        { notice: n, draft: d, requirements: extract.requirements, mode },
        () => setRetrying(true),
      );
      setRetrying(false);
      const same = checked && checked.notice === n && checked.mode === mode && checked.draft !== d;
      const prev = same ? Object.fromEntries(checked.compare.results.map((r) => [r.id, r.verdict])) : null;
      setChecked({ notice: n, draft: d, mode, extract, compare, prev });
      setPhase("done");
      requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }));
    } catch (e) {
      setRetrying(false);
      setPhase(checked ? "done" : "idle");
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      const resume =
        stage === "Comparing with your draft"
          ? " The requirement list is kept: checking again starts from the comparison."
          : "";
      setError(`${stage} failed: ${msg}${resume}`);
    }
  }

  async function runSample(id = "gap") {
    setError(null);
    try {
      const res = await fetch(`/api/sample?id=${id}`);
      const sample = await res.json();
      setNotice(sample.notice);
      setDraft(sample.draft);
      await run("sample", sample.notice, sample.draft);
    } catch {
      setError("The sample could not be loaded.");
    }
  }

  useEffect(() => {
    try {
      setConfirmed(new Set(JSON.parse(localStorage.getItem(CONFIRM_KEY) ?? "[]")));
    } catch {
      // storage unavailable: confirmations last for this page only
    }
  }, []);

  function toggleConfirmed(key: string) {
    setConfirmed((old) => {
      const next = new Set(old);
      if (!next.delete(key)) next.add(key);
      try {
        localStorage.setItem(CONFIRM_KEY, JSON.stringify([...next]));
      } catch {
        // storage unavailable
      }
      return next;
    });
  }

  useEffect(() => {
    const sample = new URLSearchParams(window.location.search).get("sample");
    if (sample) void runSample(sample === "wordlimit" ? "wordlimit" : "gap");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows: { req: Requirement; res: CompareResult }[] = checked
    ? checked.extract.requirements
        .map((req, i) => ({ req, res: checked.compare.results[i] }))
        .filter((r) => r.res && r.res.id === r.req.id)
        .sort((a, b) => VERDICT_ORDER.indexOf(a.res.verdict) - VERDICT_ORDER.indexOf(b.res.verdict))
    : [];
  const counts = Object.fromEntries(
    VERDICT_ORDER.map((v) => [v, rows.filter((r) => r.res.verdict === v).length]),
  ) as Record<Verdict, number>;
  const canRecheck = !!checked && checked.notice === clean(notice) && checked.mode === "live";
  const discardedTotal = checked ? checked.extract.discarded + checked.compare.discardedEvidence : 0;
  const changed = checked?.prev ? rows.filter((r) => checked.prev![r.req.id] && checked.prev![r.req.id] !== r.res.verdict) : [];
  const foldMet = rows.length > FOLD_MET_ABOVE && counts.met > 0;
  const confirmKey = (req: Requirement) => hash(`${checked?.notice ?? ""}|${req.quote}|${req.summary}`);

  const renderRow = ({ req, res }: { req: Requirement; res: CompareResult }) => {
    const was = checked?.prev?.[req.id];
    const key = confirmKey(req);
    return (
      <li key={req.id} className="row">
        <div className="ask">
          <p className="req-line">
            <span className="req-id">{req.id}</span>
            <span className={`level ${req.level}`}>{LEVEL_LABEL[req.level]}</span>
          </p>
          <p className="req-summary">{req.summary}</p>
          <button type="button" className="quote" onClick={() => jumpTo(`n-${req.id}`)} title="Show in the notice">
            {req.quote}
          </button>
        </div>
        <div className="shows">
          <p className="verdict-line">
            {was && was !== res.verdict && (
              <span className="was" title="Verdict at the previous check">
                {VERDICT_LABEL[was]} →{" "}
              </span>
            )}
            <span className={`chip ${res.verdict}`}>
              <span aria-hidden="true">{VERDICT_GLYPH[res.verdict]}</span>{" "}
              {res.counted && res.verdict === "missing" ? "Not met" : VERDICT_LABEL[res.verdict]}
            </span>
          </p>
          {res.verdict === "check" ? (
            <>
              <p className="note">{CHECK_REASON[res.checkReason ?? "model_cannot_tell"]}</p>
              <label className="confirm">
                <input type="checkbox" checked={confirmed.has(key)} onChange={() => toggleConfirmed(key)} /> I’ve
                confirmed this
              </label>
            </>
          ) : (
            <>
              {res.note && <p className="note">{res.note}</p>}
              {res.parts ? (
                <ul className="parts">
                  {res.parts.map((p, i) => (
                    <li key={i}>
                      <span className="part-name">{p.part}</span>
                      {p.evStart !== null ? (
                        <button
                          type="button"
                          className={`quote ${res.verdict}`}
                          onClick={() => jumpTo(`d-${req.id}-${i}`)}
                          title="Show in your draft"
                        >
                          {p.evidence}
                        </button>
                      ) : (
                        <span className="aside">No quote in your draft.</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                res.evidence && (
                  <button
                    type="button"
                    className={`quote ${res.verdict}`}
                    onClick={() => jumpTo(`d-${req.id}`)}
                    title="Show in your draft"
                  >
                    {res.evidence}
                  </button>
                )
              )}
              {req.checkable === "partial" && res.verdict !== "missing" && (
                <p className="aside">The proof is outside the text. Confirm it yourself.</p>
              )}
            </>
          )}
        </div>
      </li>
    );
  };

  return (
    <main>
      <header className="top">
        <span className="wordmark">ReqLens</span>
        {checked && (
          <span className="run-badge">{checked.mode === "sample" ? "Recorded sample" : checked.extract.meta.source === "recorded" ? "Recorded run" : "Live run"}</span>
        )}
      </header>

      <section className="intro">
        <h1>See every requirement next to the part of your draft that answers it.</h1>
        <p>
          Paste a notice (hackathon rules, a contest call, a scholarship posting) and your draft. ReqLens lists what
          the notice asks for, quotes the exact sentence, and shows what your draft has and what it is missing.
        </p>
      </section>

      <form
        className="inputs"
        onSubmit={(e) => {
          e.preventDefault();
          void run("live", notice, draft);
        }}
      >
        <label>
          <span className="field-label">The notice</span>
          <textarea
            value={notice}
            onChange={(e) => setNotice(e.target.value)}
            placeholder="Paste the full rules or call for applications…"
            spellCheck={false}
            rows={10}
          />
        </label>
        <label>
          <span className="field-label">Your draft</span>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Paste your project description, essay, or application text…"
            spellCheck={false}
            rows={10}
          />
        </label>
        <div className="actions">
          <button type="submit" className="primary" disabled={busy}>
            {canRecheck ? "Re-check draft" : "Check my draft"}
          </button>
          <button type="button" className="quiet" disabled={busy} onClick={() => void runSample("gap")}>
            Try a sample
          </button>
          <button type="button" className="quiet" disabled={busy} onClick={() => void runSample("wordlimit")}>
            Sample: word limit
          </button>
          <p className="disclosure">
            Your text is sent to Google’s Gemini API to be processed. English text only. The samples replay saved
            responses and send nothing.
          </p>
        </div>
      </form>

      {error && (
        <p className="notice-band" role="alert">
          {error} <span>Your text is still in the boxes above.</span>
        </p>
      )}

      {(busy || stepNote) && (
        <ol className="steps" aria-live="polite">
          <li className={phase === "extracting" ? "active" : stepNote ? "done" : ""}>
            <span className="who ai">AI</span> Read the notice and list its requirements
            {stepNote && <em> · {stepNote.reqs + stepNote.discarded} found</em>}
            {retrying && phase === "extracting" && <em> · busy, trying once more</em>}
          </li>
          <li className={stepNote ? "done" : ""}>
            <span className="who code">Code</span> Quote Lock: keep only quotes found word for word in the notice
            {stepNote && <em> · {stepNote.discarded} discarded</em>}
          </li>
          <li className={phase === "comparing" ? "active" : phase === "done" ? "done" : ""}>
            <span className="who ai">AI</span> Compare each requirement with your draft
            {retrying && phase === "comparing" && <em> · busy, trying once more</em>}
          </li>
          <li className={phase === "done" ? "done" : ""}>
            <span className="who code">Code</span> Lock the draft quotes and set aside what text can’t prove
            {phase === "done" && checked && <em> · {checked.compare.discardedEvidence} discarded</em>}
          </li>
        </ol>
      )}

      {checked && (
        <section className="results" ref={resultsRef} aria-label="Results">
          <div className="summary">
            <strong>{rows.length} requirements</strong>
            {VERDICT_ORDER.map((v) => (
              <span key={v} className={`chip ${v}`}>
                <span aria-hidden="true">{VERDICT_GLYPH[v]}</span> {counts[v]} {VERDICT_LABEL[v].toLowerCase()}
              </span>
            ))}
            {checked.prev && (
              <span className="summary-meta">
                {changed.length} {changed.length === 1 ? "verdict" : "verdicts"} changed since the last check
              </span>
            )}
            <span className="summary-meta">
              {discardedTotal} unverifiable {discardedTotal === 1 ? "quote" : "quotes"} discarded
            </span>
          </div>

          <div className="col-heads" aria-hidden="true">
            <span>What the notice asks</span>
            <span>What your draft shows</span>
          </div>

          <ul className="rows">{(foldMet ? rows.filter((r) => r.res.verdict !== "met") : rows).map(renderRow)}</ul>
          {foldMet && (
            <details className="met-group">
              <summary>
                Show the {counts.met} met {counts.met === 1 ? "requirement" : "requirements"}
              </summary>
              <ul className="rows">{rows.filter((r) => r.res.verdict === "met").map(renderRow)}</ul>
            </details>
          )}

          <h2>Where the quotes come from</h2>
          <div className="sources">
            <div>
              <span className="field-label">The notice, as checked</span>
              <MarkedText
                text={checked.notice}
                spans={checked.extract.requirements.map((r) => ({ id: `n-${r.id}`, start: r.start, end: r.end, tone: "src" }))}
              />
            </div>
            <div>
              <span className="field-label">Your draft, as checked</span>
              <MarkedText
                text={checked.draft}
                spans={checked.compare.results.flatMap((r) =>
                  r.parts
                    ? r.parts.flatMap((p, i) =>
                        p.evStart !== null ? [{ id: `d-${r.id}-${i}`, start: p.evStart, end: p.evEnd!, tone: r.verdict }] : [],
                      )
                    : r.evStart !== null && r.evEnd !== null
                      ? [{ id: `d-${r.id}`, start: r.evStart, end: r.evEnd, tone: r.verdict }]
                      : [],
                )}
              />
            </div>
          </div>

          <footer className="fineprint">
            <p>
              ReqLens checks your draft against the text you pasted. It does not predict judging results. Confirm the
              final checklist yourself.
            </p>
            <p className="run-meta">
              {checked.mode === "sample" ? "Recorded sample" : checked.extract.meta.source === "recorded" ? "Recorded run" : "Live run"} · {checked.extract.meta.modelVersion || checked.extract.meta.model} ·{" "}
              {checked.extract.meta.promptVersion}
              {checked.compare.meta && ` + ${checked.compare.meta.promptVersion}`} · recorded{" "}
              {checked.extract.meta.recordedAt.slice(0, 16).replace("T", " ")} UTC
            </p>
          </footer>
        </section>
      )}
    </main>
  );
}
