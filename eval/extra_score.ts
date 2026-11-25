// Scores the repeat runs, the one-shot chatbot answers and the lighter-model extractions
// against eval/answer_key.json. No model call. Prints markdown.
// usage: node eval/extra_score.ts            (repeat runs + chatbot answers)
//        GEMINI_MODEL=gemini-3.5-flash-lite REPLAY=1 node eval/extra_score.ts lite
import { existsSync, readFileSync } from "node:fs";
import { extractRequirements } from "../lib/pipeline.ts";
import { pct, scoreExtraction, keySpans, type KeyItem, type ToolItem } from "./scoring.ts";

const read = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n").trim();
const keys: KeyItem[] = JSON.parse(readFileSync("eval/answer_key.json", "utf8"));
const N2 = "n2_first_ai_app_rules";
const N4 = "n4_burress_scholarship";
const toItems = (reqs: any[]): ToolItem[] => reqs.map((r) => ({ label: r.summary, level: r.level, span: { start: r.start, end: r.end } }));
const line = (name: string, s: ReturnType<typeof scoreExtraction>) =>
  `| ${name} | ${s.items} | ${pct(s.keysFound, s.keys)} | ${pct(s.requiredFound, s.requiredKeys)} | ${pct(s.matchedItems, s.items)} | ${pct(s.levelAgree, s.levelCompared)} | ${s.keysMissed.filter((k) => k.level === "required").map((k) => k.id).join(", ") || "none"} |`;
const HEAD = "| Run | Items | Key items found | Required found | Items that match the key | Level agrees | Required items missed |\n|---|---|---|---|---|---|---|";

if (process.argv[2] === "lite") {
  console.log(HEAD.replace("Run", "Notice"));
  for (const n of [N2, N4]) {
    const notice = read(`eval/notices/${n}.txt`);
    const ex = await extractRequirements(notice, true);
    const s = scoreExtraction(notice, keys.filter((k) => k.notice === n), toItems(ex.requirements));
    console.log(line(`${n} (${ex.meta?.modelVersion}, ${((ex.meta?.durationMs ?? 0) / 1000).toFixed(0)} s)`, s));
  }
} else {
  const notice = read(`eval/notices/${N2}.txt`);
  const own = keys.filter((k) => k.notice === N2);
  console.log("### Repeat runs scored against the answer key\n\n" + HEAD);
  const ex1 = await extractRequirements(notice, true);
  console.log(line("Run 1 (Nov 22)", scoreExtraction(notice, own, toItems(ex1.requirements))));
  for (const n of [2, 3]) {
    const run = JSON.parse(readFileSync(`eval/repeats/A_complete_run${n}.json`, "utf8"));
    console.log(line(`Run ${n} (Nov 24)`, scoreExtraction(notice, own, toItems(run.extract.requirements))));
  }

  const ws = (s: string) => s.replace(/\s+/g, " ").trim();
  const PAIRS = [
    { label: "n2_A_gap1", notice: N2, gap: ["S2-13"] },
    { label: "n2_A_complete", notice: N2, gap: [] },
    { label: "n4_B_complete", notice: N4, gap: [] },
  ];
  const detail: string[] = [];
  console.log("\n### Chatbot answers scored (rules fixed before the build)\n");
  console.log("| Pair | Answer items | Items with no quote | Distinct quotes | Quotes not verbatim in the notice | Required key items found | \"Meets\" items under a quote that covers the planted gap | \"Meets\" on items the key says a draft cannot show |\n|---|---|---|---|---|---|---|---|");
  for (const p of PAIRS) {
    const f = `runs/chatbot/${p.label}.md`;
    if (!existsSync(f)) continue;
    const noticeText = read(`eval/notices/${p.notice}.txt`);
    const flat = ws(noticeText);
    const ownKeys = keys.filter((k) => k.notice === p.notice);
    let current: string[] = [];
    const items: { status: string; quotes: string[] }[] = [];
    const all = new Set<string>();
    for (const l of read(f).split("\n")) {
      if (/Quote/.test(l) || /^\s*>/.test(l)) {
        const got = [...l.matchAll(/["“]([^"”]{12,})["”]/g)].map((m) => ws(m[1].replace(/^\.\.\.|\.\.\.$/g, "")));
        if (got.length || /Quote/.test(l)) current = got;
        current.forEach((q) => all.add(q));
      } else if (/^#{2,3} /.test(l)) current = [];
      else if (/Status/.test(l)) items.push({ status: l.replace(/^.*Status:?\*\*\s*/, "").replace(/\*/g, "").trim(), quotes: current });
    }
    const notVerbatim = [...all].filter((q) => !flat.includes(q));
    // A key item is covered by a chatbot quote when the quote sits on it in the notice, or
    // (for a quote that is not verbatim) when the key's own quote appears inside the quote.
    const covers = (q: string, k: KeyItem) => {
      const at = noticeText.indexOf(q);
      if (at !== -1) return keySpans(noticeText, k).some((s) => s.start < at + q.length && at < s.end);
      return [k.quote, ...k.alsoStatedAt.map((a) => a.quote)].some((kq) => q.includes(ws(kq)));
    };
    const keysOf = (it: { quotes: string[] }) => ownKeys.filter((k) => it.quotes.some((q) => covers(q, k)));
    const required = ownKeys.filter((k) => k.level === "required");
    const found = required.filter((k) => [...all].some((q) => covers(q, k)));
    const meets = (s: string) => /\bMET\b|MEETS/i.test(s) && !/\bNOT\b|PARTIAL/i.test(s);
    const gapMeets = items.filter((it) => meets(it.status) && keysOf(it).some((k) => p.gap.includes(k.id)));
    const cannot = items.filter((it) => meets(it.status) && keysOf(it).length > 0 && keysOf(it).every((k) => k.checkable === "no"));
    const noQuote = items.filter((it) => it.quotes.length === 0);
    console.log(`| ${p.label} | ${items.length} | ${noQuote.length} | ${all.size} | ${notVerbatim.length} | ${pct(found.length, required.length)} | ${p.gap.length ? gapMeets.length : "no gap planted"} | ${cannot.length} |`);
    detail.push(`- ${p.label}: required key items not under any quote: ${required.filter((k) => !found.includes(k)).map((k) => k.id).join(", ") || "none"}. Not verbatim: ${notVerbatim.map((q) => `"${q.slice(0, 60)}…"`).join("; ") || "none"}.`);
  }
  console.log("\n" + detail.join("\n"));
}
