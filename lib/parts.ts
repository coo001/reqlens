// compare-v3: the model quotes the draft once per part of a requirement, and
// code (not the model) turns the locked quotes into the verdict shown.
import { locateQuote } from "./quoteLock.ts";
import type { CheckReason, PartQuote, Requirement, Verdict } from "./types.ts";

export type PartsDecision = {
  verdict: Verdict;
  checkReason?: CheckReason;
  parts: PartQuote[];
  discarded: number; // quotes the model gave that are not in the draft
};

/**
 * `r` is the model's result for one requirement whose model verdict is "met" or
 * "partial" (the caller handles missing / cannot_tell). Every part locked -> the
 * model's verdict; some locked -> partial; none locked -> missing if the model
 * quoted nothing, or check if its quotes were thrown away.
 */
export function decideParts(req: Requirement, r: any, draft: string): PartsDecision {
  const raw: any[] = Array.isArray(r?.parts) ? r.parts : [];
  let discarded = 0;
  const parts: PartQuote[] = raw.map((p) => {
    const part = typeof p?.part === "string" ? p.part.trim() : "";
    const ev = typeof p?.evidence === "string" ? p.evidence.trim() : "";
    const span = ev ? locateQuote(draft, ev) : null;
    if (ev && !span) discarded++;
    return span
      ? { part, evidence: draft.slice(span.start, span.end), evStart: span.start, evEnd: span.end }
      : { part, evidence: "", evStart: null, evEnd: null };
  });
  const locked = parts.filter((p) => p.evStart !== null).length;

  if (locked > 0 && locked === parts.length) return { verdict: r.verdict === "met" ? "met" : "partial", parts, discarded };
  if (locked > 0) return { verdict: "partial", parts, discarded };
  if (discarded > 0) return { verdict: "check", checkReason: "evidence_discarded", parts: [], discarded };
  // "met" or "partial" with no quote at all: by the prompt's own rule this is missing.
  if (req.type === "conduct") return { verdict: "check", checkReason: "rule_not_mentioned", parts: [], discarded };
  return { verdict: "missing", parts: [], discarded };
}
