// "Read only the organizer's own summary" alternative, counted without any model call.
// For each notice that has a short guidance section written by the organizer, count how
// many required items of the answer key are stated (primary quote or a restatement)
// inside that section. Sections are fixed by heading lines below.
// usage: node eval/guidance.ts
import { readFileSync } from "node:fs";
import { locateQuote } from "../lib/quoteLock.ts";

// [notice file, section name, first heading line, heading line that ends it] or null when
// the notice has no separate summary section.
const SECTIONS: Record<string, [string, string, string] | null> = {
  n1_gaibc_rules_and_resources: ["Getting started", "Getting started", "Global AI Builder’s Challenge — Full judging rubric"],
  n2_first_ai_app_rules: null,
  n3_ai_for_medicine_rules: null,
  n4_burress_scholarship: null,
  n5_stossel_essay_contest: ["Essay Contest at a Glance", "Essay Contest at a Glance", "Last Year's Winning Entries"],
};

const key: any[] = JSON.parse(readFileSync("eval/answer_key.json", "utf8"));
const nth = (text: string, quote: string, occ: number): number | null => {
  let from = 0;
  let at: number | null = null;
  for (let i = 0; i <= occ; i++) {
    const span = locateQuote(text.slice(from), quote);
    if (!span) return i === 0 ? null : at;
    at = from + span.start;
    from = from + span.end;
  }
  return at;
};

console.log("| Notice | Organizer's summary section | Words in section / notice | Required items stated there | Missed |");
console.log("|---|---|---|---|---|");
for (const [name, sec] of Object.entries(SECTIONS)) {
  const text = readFileSync(`eval/notices/${name}.txt`, "utf8").replace(/\r\n/g, "\n").trim();
  const required = key.filter((k) => k.notice === name && k.level === "required");
  if (!sec) {
    console.log(`| ${name} | none (the notice is one rules page) | – | – of ${required.length} | – |`);
    continue;
  }
  const start = text.indexOf(`\n${sec[1]}\n`);
  const end = text.indexOf(`\n${sec[2]}\n`, start + 1);
  if (start < 0 || end < 0) throw new Error(`section not found in ${name}`);
  const inside = (pos: number | null) => pos !== null && pos >= start && pos < end;
  const hit: string[] = [];
  const miss: string[] = [];
  for (const k of required) {
    const spots = [nth(text, k.quote, k.occurrence ?? 0), ...(k.alsoStatedAt ?? []).map((a: any) => nth(text, a.quote, a.occurrence ?? 0))];
    (spots.some(inside) ? hit : miss).push(k.id);
  }
  const wc = (s: string) => s.split(/\s+/).filter(Boolean).length;
  console.log(`| ${name} | "${sec[0]}" | ${wc(text.slice(start, end))} / ${wc(text)} | ${hit.length} of ${required.length} | ${miss.join(", ")} |`);
}
