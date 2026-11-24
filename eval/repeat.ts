// Compares three runs of the same notice + draft (run 1 = first recording, runs 2 and 3
// from scripts/repeat.ts). Requirements are matched across runs by their locked quote
// position in the notice, because ids are assigned in output order. No model call.
// usage: REPLAY=1 node eval/repeat.ts
import { readFileSync } from "node:fs";
import { compareDraft, extractRequirements } from "../lib/pipeline.ts";

const read = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n").trim();
const notice = read("eval/notices/n2_first_ai_app_rules.txt");
const draft = read("eval/drafts/A_complete.txt");
const ex1 = await extractRequirements(notice, true);
const cm1 = await compareDraft(ex1.requirements, draft, true, "compare-v2");
const runs = [{ extract: ex1, compare: cm1 }, ...[2, 3].map((n) => JSON.parse(readFileSync(`eval/repeats/A_complete_run${n}.json`, "utf8")))];

const rows = new Map<string, { quote: string; cells: string[] }>();
runs.forEach((run, i) => {
  const verdict = new Map(run.compare.results.map((r: any) => [r.id, r.verdict]));
  for (const req of run.extract.requirements) {
    const k = `${req.start}-${req.end}`;
    if (!rows.has(k)) rows.set(k, { quote: req.quote, cells: ["–", "–", "–"] });
    rows.get(k)!.cells[i] = `${req.level}/${verdict.get(req.id)}`;
  }
});
const all = [...rows.values()];
const same = all.filter((r) => r.cells.every((c) => c === r.cells[0]));
const sameSet = all.filter((r) => r.cells.every((c) => c !== "–"));
console.log(`Items per run: ${runs.map((r) => r.extract.requirements.length).join(", ")}. Distinct quote spans across runs: ${all.length}. In all three runs: ${sameSet.length}. Same level and verdict in all three: ${same.length}.`);
console.log(`Required items per run: ${runs.map((r) => r.extract.requirements.filter((q: any) => q.level === "required").length).join(", ")}.`);
console.log("\n| Quote (first 70 characters) | Run 1 | Run 2 | Run 3 |\n|---|---|---|---|");
for (const r of all.filter((r) => !same.includes(r))) console.log(`| ${r.quote.slice(0, 70).replace(/\|/g, "/").replace(/\n/g, " ")} | ${r.cells.join(" | ")} |`);
