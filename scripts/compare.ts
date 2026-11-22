// Runs one comparison without the dev server: replays the saved extraction and
// calls the model live for the comparison with the chosen prompt version.
// usage: node --env-file=.env.local scripts/compare.ts <notice> <draft> [compare-v1|compare-v2|compare-v3]
import { readFileSync } from "node:fs";
import { compareDraft, extractRequirements } from "../lib/pipeline.ts";
import { COMPARE_VERSION, COMPARE_VERSIONS, type CompareVersion } from "../lib/prompts.ts";

const [nf, df, v = COMPARE_VERSION] = process.argv.slice(2);
if (!COMPARE_VERSIONS.includes(v as CompareVersion)) throw new Error(`Unknown prompt version ${v}`);
const read = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n").trim();
const notice = read(nf);
const ex = await extractRequirements(notice, true);
const cm = await compareDraft(ex.requirements, read(df), false, v as CompareVersion);
console.log(df, v, cm.meta?.modelVersion, `${((cm.meta?.durationMs ?? 0) / 1000).toFixed(0)} s`, "discardedEvidence", cm.discardedEvidence);
for (const r of cm.results) if (r.verdict !== "met" && r.verdict !== "check") console.log(" ", r.id, r.verdict, "|", r.note);
