// Scores the saved model responses in runs/ against eval/answer_key.json and
// writes eval/results.md and eval/unmatched.csv. Makes no API calls.
// usage: node eval/score.ts            (GEMINI_MODEL picks which model's saved runs to score)
import { readFileSync, writeFileSync } from "node:fs";
import { DEFAULT_MODEL, generateJson, PipelineError } from "../lib/gemini.ts";
import { compareDraft, extractRequirements } from "../lib/pipeline.ts";
import {
  COMPARE_SCHEMA,
  COMPARE_VERSION,
  EXTRACT_SCHEMA,
  EXTRACT_VERSION,
  comparePrompt,
  extractPrompt,
} from "../lib/prompts.ts";
import { countWords, parseWordLimit, withinLimit } from "../lib/counted.ts";
import { locateQuote } from "../lib/quoteLock.ts";
import type { CompareResult, Requirement } from "../lib/types.ts";
import { markerBaseline, pct, scoreExtraction, type ExtractionScore, type KeyItem, type ToolItem } from "./scoring.ts";

const here = (p: string) => new URL(p, import.meta.url);
const read = (p: string) => readFileSync(here(p), "utf8").replace(/\r\n/g, "\n").trim();
const keys: KeyItem[] = JSON.parse(readFileSync(here("./answer_key.json"), "utf8"));

const NOTICES = [
  "n1_gaibc_rules_and_resources",
  "n2_first_ai_app_rules",
  "n3_ai_for_medicine_rules",
  "n4_burress_scholarship",
  "n5_stossel_essay_contest",
];
// Draft -> notice, and the answer-key items whose paragraph was removed (or, for
// the over-length draft, violated) when the draft was built by eval/make_gaps.py.
const DRAFTS: { file: string; notice: string; gap: string[]; what: string }[] = [
  { file: "A_complete", notice: "n2_first_ai_app_rules", gap: [], what: "complete" },
  { file: "A_gap1_problem", notice: "n2_first_ai_app_rules", gap: ["S2-13"], what: "problem explanation removed" },
  { file: "A_gap2_ai_details", notice: "n2_first_ai_app_rules", gap: ["S2-14"], what: "AI implementation details removed" },
  { file: "A_gap3_credits", notice: "n2_first_ai_app_rules", gap: ["S2-06", "S2-07"], what: "credits paragraph removed" },
  { file: "B_complete", notice: "n4_burress_scholarship", gap: [], what: "complete" },
  { file: "B_gap1_future", notice: "n4_burress_scholarship", gap: ["S5-07"], what: "\"shaped your future\" part removed" },
  { file: "B_gap2_persevere", notice: "n4_burress_scholarship", gap: ["S5-06"], what: "\"persevered\" part removed" },
  { file: "B_gap3_overlength", notice: "n4_burress_scholarship", gap: ["S5-05"], what: "537 words against a 500-word limit" },
];

async function replay<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof PipelineError && e.code === "replay_miss") return null;
    throw e;
  }
}

const out: string[] = [];
const unmatched: string[] = ["kind,stage,notice,id_or_label,level,quote"];
const csv = (s: string) => `"${s.replace(/"/g, '""')}"`;

type Row = { name: string; s0: ExtractionScore; s1: ExtractionScore; base: ExtractionScore; reqs: Requirement[]; meta: string };
const rows: Row[] = [];
const notRun: string[] = [];

for (const name of NOTICES) {
  const notice = read(`./notices/${name}.txt`);
  const own = keys.filter((k) => k.notice === name);
  const raw = await replay(() =>
    generateJson({ stage: "extract", promptVersion: EXTRACT_VERSION, prompt: extractPrompt(notice), schema: EXTRACT_SCHEMA, forceReplay: true }),
  );
  if (!raw) {
    notRun.push(`extraction of ${name}`);
    continue;
  }
  const rawItems: ToolItem[] = (raw.data.requirements ?? []).map((r: any) => ({
    label: String(r.summary ?? ""),
    level: r.level,
    span: typeof r.quote === "string" ? locateQuote(notice, r.quote) : null,
  }));
  const locked = await extractRequirements(notice, true);
  const s1Items: ToolItem[] = locked.requirements.map((r) => ({ label: `${r.id} ${r.summary}`, level: r.level, span: { start: r.start, end: r.end } }));
  const row: Row = {
    name,
    s0: scoreExtraction(notice, own, rawItems),
    s1: scoreExtraction(notice, own, s1Items),
    base: scoreExtraction(notice, own, markerBaseline(notice)),
    reqs: locked.requirements,
    meta: `${raw.meta.modelVersion || raw.meta.model}, ${(raw.meta.durationMs / 1000).toFixed(0)} s`,
  };
  rows.push(row);
  for (const t of row.s1.toolOnly) unmatched.push(["tool_only", "S1", name, csv(t.label), t.level ?? "", csv(notice.slice(t.span!.start, t.span!.end))].join(","));
  for (const k of row.s1.keysMissed) unmatched.push(["key_missed", "S1", name, k.id, k.level, csv(k.quote)].join(","));
}

const sum = (f: (r: Row) => number) => rows.reduce((a, r) => a + f(r), 0);
const ladder = (label: string, pick: (r: Row) => ExtractionScore) =>
  `| ${label} | ${pct(sum((r) => pick(r).matchedItems), sum((r) => pick(r).items))} | ${pct(sum((r) => pick(r).requiredFound), sum((r) => pick(r).requiredKeys))} | ${pct(sum((r) => pick(r).keysFound), sum((r) => pick(r).keys))} | ${sum((r) => pick(r).unlocatedItems)} |`;

// --- comparison ---
type DraftRow = {
  d: (typeof DRAFTS)[number];
  results: CompareResult[];
  reqs: Requirement[];
  rawByReq: Map<string, any>;
  unverifiableEvidence: number;
  gapS0: string;
  gapS2: string;
  detectedS0: boolean | null;
  detectedS2: boolean | null;
  numericWrongModel: number;
  numericItems: number;
  secs: string;
};
const draftRows: DraftRow[] = [];
const flags = (v: (string | null | undefined)[]) => v.map((x) => x ?? "no verdict").join(", ");
const isFlag = (v: string | null | undefined) => v === "missing" || v === "partial";

for (const d of DRAFTS) {
  const row = rows.find((r) => r.name === d.notice);
  if (!row) continue;
  const draft = read(`./drafts/${d.file}.txt`);
  const judged = row.reqs.filter((r) => r.checkable !== "no");
  const raw = await replay(() =>
    generateJson({ stage: "compare", promptVersion: COMPARE_VERSION, prompt: comparePrompt(judged, draft), schema: COMPARE_SCHEMA, forceReplay: true }),
  );
  if (!raw) {
    notRun.push(`comparison of ${d.file}`);
    continue;
  }
  const rawByReq = new Map<string, any>((raw.data.results ?? []).map((r: any) => [r.id, r]));
  const final = await compareDraft(row.reqs, draft, true);
  const linked = [...new Set(d.gap.flatMap((id) => row.s1.links.get(id) ?? []))].map((i) => row.reqs[i]);
  const s0 = linked.map((r) => (r.checkable === "no" ? "check" : (rawByReq.get(r.id)?.verdict as string | undefined)));
  const s2 = linked.map((r) => final.results.find((x) => x.id === r.id)?.verdict);
  const words = countWords(draft);
  const numeric = row.reqs.filter((r) => parseWordLimit(r.quote));
  const numericWrongModel = numeric.filter((r) => {
    const ok = withinLimit(words, parseWordLimit(r.quote)!);
    const v = rawByReq.get(r.id)?.verdict;
    return ok ? v !== "met" : !isFlag(v);
  }).length;
  draftRows.push({
    d,
    results: final.results,
    reqs: row.reqs,
    rawByReq,
    unverifiableEvidence: [...rawByReq.values()].filter(
      (r) => (r.verdict === "met" || r.verdict === "partial") && !(typeof r.evidence === "string" && locateQuote(draft, r.evidence)),
    ).length,
    gapS0: linked.length ? linked.map((r, i) => `${r.id} ${s0[i] ?? "no verdict"}`).join(", ") : d.gap.length ? "requirement not extracted" : "–",
    gapS2: linked.length ? linked.map((r, i) => `${r.id} ${s2[i] ?? "no verdict"}`).join(", ") : d.gap.length ? "requirement not extracted" : "–",
    detectedS0: d.gap.length ? s0.some(isFlag) : null,
    detectedS2: d.gap.length ? s2.some(isFlag) : null,
    numericWrongModel,
    numericItems: numeric.length,
    secs: (raw.meta.durationMs / 1000).toFixed(0),
  });
}

const gapRows = draftRows.filter((r) => r.d.gap.length);
const completeRows = draftRows.filter((r) => !r.d.gap.length);
const yn = (b: boolean | null) => (b === null ? "–" : b ? "yes" : "**no**");

out.push(
  "# Evaluation results",
  "",
  `Generated by \`node eval/score.ts\` from the saved model responses in \`runs/\` (model setting \`${DEFAULT_MODEL}\`, prompts \`${EXTRACT_VERSION}\` and \`${COMPARE_VERSION}\`). The script makes no API calls and does not decide pass or fail; it only counts.`,
  "",
  "How to read this:",
  "- A tool item and an answer-key item count as the same requirement when their quotes overlap in the notice text (the key's main quote or any place the key lists the requirement as restated).",
  "- The answer key (145 items over 5 notices) was written before the build period by two AI models from different companies and reconciled. **No human verified the answer key.**",
  "- The sample is small: 5 notices, 8 drafts, 6 planted gaps. One run per input at temperature 0.",
  "",
);
if (notRun.length) out.push(`**Not run yet (no saved response):** ${notRun.join("; ")}.`, "");

out.push(
  "## Requirement extraction, by stage",
  "",
  "| Stage | Precision (tool items that match a key item) | Recall, required items | Recall, all items | Items shown with a quote that is not in the notice |",
  "|---|---|---|---|---|",
  ladder("S0 raw model output", (r) => r.s0),
  ladder("S1 + Quote Lock (code)", (r) => r.s1).replace(/\| \d+ \|$/, "| 0 (discarded before display) |"),
  ladder("No-AI baseline: sentences with marker words", (r) => r.base),
  "",
  `Quote Lock discarded ${sum((r) => r.s0.items - r.s1.items)} of ${sum((r) => r.s0.items)} extracted items.`,
  "",
  "### By notice (S1, after Quote Lock)",
  "",
  "| Notice | Key items (required) | Tool items | Precision | Recall, required | Recall, all | Level agrees with key | Items that only repeat a matched key item | Baseline precision / required recall | Run |",
  "|---|---|---|---|---|---|---|---|---|---|",
  ...rows.map(
    (r) =>
      `| ${r.name} | ${r.s1.keys} (${r.s1.requiredKeys}) | ${r.s1.items} | ${pct(r.s1.matchedItems, r.s1.items)} | ${pct(r.s1.requiredFound, r.s1.requiredKeys)} | ${pct(r.s1.keysFound, r.s1.keys)} | ${pct(r.s1.levelAgree, r.s1.levelCompared)} | ${r.s1.repeatItems} | ${pct(r.base.matchedItems, r.base.items)} / ${pct(r.base.requiredFound, r.base.requiredKeys)} | ${r.meta} |`,
  ),
  "",
  "Items the overlap rule could not pair are listed in `eval/unmatched.csv` (`tool_only`: the tool returned it, no key item overlaps; `key_missed`: no tool item overlaps the key item).",
  "",
  "## Planted gaps (main metric)",
  "",
  "Each gap draft is a complete draft with one paragraph removed (or, for the last one, a paragraph added to break the word limit). The gap counts as detected when a tool row linked to the removed requirement shows Missing or Partial.",
  "",
  "| Draft | What was changed | Key item | S0/S1: model verdict | S2: shown after code steps | Detected (model alone) | Detected (shown) |",
  "|---|---|---|---|---|---|---|",
  ...gapRows.map((r) => `| ${r.d.file} | ${r.d.what} | ${r.d.gap.join(", ")} | ${r.gapS0} | ${r.gapS2} | ${yn(r.detectedS0)} | ${yn(r.detectedS2)} |`),
  "",
  `Detected: **${gapRows.filter((r) => r.detectedS2).length} of ${gapRows.length} run so far** (6 planted in total); by the model alone, before the code steps: ${gapRows.filter((r) => r.detectedS0).length} of ${gapRows.length}.`,
  "",
  "## Complete drafts: rows flagged although nothing was removed",
  "",
  "| Draft | Rows | Missing | Partial | Check yourself | Met | Flagged rows |",
  "|---|---|---|---|---|---|---|",
  ...completeRows.map((r) => {
    const n = (v: string) => r.results.filter((x) => x.verdict === v).length;
    const flagged = r.results.filter((x) => isFlag(x.verdict)).map((x) => `${x.id} ${x.verdict}: ${r.reqs.find((q) => q.id === x.id)?.summary}`);
    return `| ${r.d.file} | ${r.results.length} | ${n("missing")} | ${n("partial")} | ${n("check")} | ${n("met")} | ${flagged.join("; ") || "none"} |`;
  }),
  "",
  "## Comparison, by stage (all drafts run so far)",
  "",
  "| Stage | Verdicts shown with evidence that is not in the draft | Planted gap shown as Met | Word-limit rows without a correct verdict |",
  "|---|---|---|---|",
  `| S0 raw model output | ${draftRows.reduce((a, r) => a + r.unverifiableEvidence, 0)} | ${gapRows.filter((r) => r.detectedS0 === false).length} | ${draftRows.reduce((a, r) => a + r.numericWrongModel, 0)} of ${draftRows.reduce((a, r) => a + r.numericItems, 0)} |`,
  `| S1 + Quote Lock (code) | 0 (moved to Check yourself) | ${gapRows.filter((r) => r.detectedS0 === false).length} | ${draftRows.reduce((a, r) => a + r.numericWrongModel, 0)} of ${draftRows.reduce((a, r) => a + r.numericItems, 0)} |`,
  `| S2 + Counted (code) | 0 | ${gapRows.filter((r) => r.detectedS2 === false).length} | 0 of ${draftRows.reduce((a, r) => a + r.numericItems, 0)} (the count is computed, not judged) |`,
  "",
  "Word-limit rows: the comparison prompt tells the model not to count words, so at S0 and S1 its answer for these rows is usually \"cannot tell\"; that is counted here as not correct. At S2 the verdict comes from the code's word count.",
  "",
  `Comparison calls took ${draftRows.map((r) => `${r.secs} s`).join(", ")}.`,
  "",
);

writeFileSync(here("./results.md"), out.join("\n"));
writeFileSync(here("./unmatched.csv"), unmatched.join("\n") + "\n");
console.log(out.join("\n"));
