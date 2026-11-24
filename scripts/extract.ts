// Runs one extraction live with the chosen prompt version (evaluation only).
// usage: node --env-file=.env.local scripts/extract.ts <notice> [extract-v1|extract-v2]
import { readFileSync } from "node:fs";
import { extractRequirements } from "../lib/pipeline.ts";
import { EXTRACT_VERSION, EXTRACT_VERSIONS, type ExtractVersion } from "../lib/prompts.ts";

const [nf, v = EXTRACT_VERSION] = process.argv.slice(2);
if (!EXTRACT_VERSIONS.includes(v as ExtractVersion)) throw new Error(`Unknown prompt version ${v}`);
const notice = readFileSync(nf, "utf8").replace(/\r\n/g, "\n").trim();
const ex = await extractRequirements(notice, false, v as ExtractVersion);
const by = (l: string) => ex.requirements.filter((r) => r.level === l).length;
console.log(nf, v, ex.meta?.modelVersion, `${((ex.meta?.durationMs ?? 0) / 1000).toFixed(0)} s`, "items", ex.requirements.length, "required", by("required"), "recommended", by("recommended"), "scoring", by("scoring"), "discarded", ex.discarded);
