import { generateJson, PipelineError } from "./gemini.ts";
import {
  COMPARE_SCHEMA,
  COMPARE_VERSION,
  EXTRACT_SCHEMA,
  EXTRACT_VERSION,
  comparePrompt,
  extractPrompt,
} from "./prompts.ts";
import { locateQuote } from "./quoteLock.ts";
import {
  CHECKABLE,
  LEVELS,
  TYPES,
  type CompareResponse,
  type CompareResult,
  type ExtractResponse,
  type Requirement,
} from "./types.ts";

const includes = <T extends string>(list: readonly T[], v: unknown): v is T => list.includes(v as T);

/** Stage 1 (model) + stage 2 (Quote Lock, code). */
export async function extractRequirements(notice: string, forceReplay: boolean): Promise<ExtractResponse> {
  const { data, meta } = await generateJson({
    stage: "extract",
    promptVersion: EXTRACT_VERSION,
    prompt: extractPrompt(notice),
    schema: EXTRACT_SCHEMA,
    forceReplay,
  });

  const raw: any[] = Array.isArray(data?.requirements) ? data.requirements : [];
  const requirements: Requirement[] = [];
  let discarded = 0;
  for (const item of raw) {
    const span = typeof item?.quote === "string" ? locateQuote(notice, item.quote) : null;
    const valid =
      span &&
      typeof item.summary === "string" &&
      includes(LEVELS, item.level) &&
      includes(TYPES, item.type) &&
      includes(CHECKABLE, item.checkable);
    if (!valid) {
      discarded++;
      continue;
    }
    requirements.push({
      id: `R${String(requirements.length + 1).padStart(2, "0")}`,
      summary: item.summary.trim(),
      // Keep the notice's own characters, not the model's copy of them.
      quote: notice.slice(span.start, span.end),
      level: item.level,
      type: item.type,
      checkable: item.checkable,
      start: span.start,
      end: span.end,
    });
  }
  return { requirements, discarded, meta };
}

/** Stage 3 (model) + Quote Lock on evidence + the check-yourself split (code). */
export async function compareDraft(
  requirements: Requirement[],
  draft: string,
  forceReplay: boolean,
): Promise<CompareResponse> {
  const judged = requirements.filter((r) => r.checkable !== "no");
  if (requirements.length === 0) {
    throw new PipelineError("no_requirements", "There are no requirements to compare against.", 400);
  }

  const byId = new Map<string, any>();
  let meta: CompareResponse["meta"] = null;
  if (judged.length > 0) {
    const out = await generateJson({
      stage: "compare",
      promptVersion: COMPARE_VERSION,
      prompt: comparePrompt(judged, draft),
      schema: COMPARE_SCHEMA,
      forceReplay,
    });
    meta = out.meta;
    for (const r of Array.isArray(out.data?.results) ? out.data.results : []) {
      if (typeof r?.id === "string" && !byId.has(r.id)) byId.set(r.id, r);
    }
  }

  let discardedEvidence = 0;
  const results: CompareResult[] = requirements.map((req) => {
    const none = { id: req.id, evidence: "", evStart: null, evEnd: null };
    if (req.checkable === "no") {
      return { ...none, verdict: "check", note: "", checkReason: "outside_text" };
    }
    const r = byId.get(req.id);
    const note = typeof r?.note === "string" ? r.note.trim() : "";
    if (!r) return { ...none, verdict: "check", note: "", checkReason: "no_verdict" };
    if (r.verdict === "missing") return { ...none, verdict: "missing", note };
    if (r.verdict === "met" || r.verdict === "partial") {
      const span = typeof r.evidence === "string" ? locateQuote(draft, r.evidence) : null;
      if (!span) {
        // A verdict without verifiable evidence is not shown as a verdict.
        discardedEvidence++;
        return { ...none, verdict: "check", note, checkReason: "evidence_discarded" };
      }
      return {
        id: req.id,
        verdict: r.verdict,
        evidence: draft.slice(span.start, span.end),
        evStart: span.start,
        evEnd: span.end,
        note,
      };
    }
    return { ...none, verdict: "check", note, checkReason: "model_cannot_tell" };
  });

  return { results, discardedEvidence, meta };
}
