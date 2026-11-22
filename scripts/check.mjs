// Runs one check against a local dev server and prints a summary.
// usage: node scripts/check.mjs <noticeFile> [draftFile] [mode] [compareMode]
// mode / compareMode: "live" (default) or "sample" (replay a saved response, no API call).
// "sample live" replays the saved extraction and calls the model only for the comparison.
import { readFileSync, writeFileSync } from "node:fs";
const [nf, df, mode = "live", compareMode = mode] = process.argv.slice(2);
const clean = (s) => s.replace(/\r\n/g, "\n").trim();
const notice = clean(readFileSync(nf, "utf8"));
const post = async (p, b) => { const r = await fetch("http://localhost:" + (process.env.PORT ?? 3000) + "" + p, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }); return [r.status, await r.json()]; };
const [s1, ex] = await post("/api/extract", { notice, mode });
console.log("extract", s1, ex.error ?? { n: ex.requirements.length, discarded: ex.discarded, meta: ex.meta });
if (ex.error) process.exit(1);
for (const r of ex.requirements) console.log(r.id, r.level, r.type, r.checkable, "|", r.summary, "|", JSON.stringify(r.quote.slice(0, 70)));
if (df) {
  const draft = clean(readFileSync(df, "utf8"));
  const [s2, cm] = await post("/api/compare", { notice, draft, requirements: ex.requirements, mode: compareMode });
  console.log("compare", s2, cm.error ?? { discardedEvidence: cm.discardedEvidence, meta: cm.meta });
  if (!cm.error) for (const r of cm.results) console.log(r.id, r.verdict, r.checkReason ?? "", "|", r.note, "|", JSON.stringify(r.evidence.slice(0, 60)));
}
