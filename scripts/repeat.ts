// Repeats one notice + draft pair live (extraction and comparison) without
// replacing the first recorded run. New responses go to runs/repeats/ with a
// label; the processed result goes to eval/repeats/<label>.json.
// usage: node --env-file=.env.local scripts/repeat.ts <notice> <draft> <label> [compare version]
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { compareDraft, extractRequirements } from "../lib/pipeline.ts";
import { COMPARE_VERSION, type CompareVersion } from "../lib/prompts.ts";

const [nf, df, label, v = COMPARE_VERSION] = process.argv.slice(2);
const read = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n").trim();
const RUNS = "runs";
const BACKUP = path.join(RUNS, ".repeat-backup");
const OUT = path.join(RUNS, "repeats");
mkdirSync(BACKUP, { recursive: true });
mkdirSync(OUT, { recursive: true });
mkdirSync("eval/repeats", { recursive: true });
const jsons = () => readdirSync(RUNS).filter((f) => f.endsWith(".json"));
const before = new Map(jsons().map((f) => [f, readFileSync(path.join(RUNS, f), "utf8")]));
for (const [f, text] of before) writeFileSync(path.join(BACKUP, f), text);

async function live<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      if (e?.code !== "overloaded" || attempt >= 3) throw e;
      console.log("503, waiting 45 s (attempt", attempt, ")");
      await new Promise((r) => setTimeout(r, 45_000));
    }
  }
}

try {
  const notice = read(nf);
  const ex = await live(() => extractRequirements(notice, false));
  const cm = await live(() => compareDraft(ex.requirements, read(df), false, v as CompareVersion));
  writeFileSync(`eval/repeats/${label}.json`, JSON.stringify({ label, notice: nf, draft: df, extract: ex, compare: cm }, null, 2));
  console.log(label, "items", ex.requirements.length, "extract", ex.meta?.durationMs, "ms compare", cm.meta?.durationMs, "ms");
} finally {
  // Move what this run wrote into runs/repeats/ and put the first recordings back.
  for (const f of jsons()) {
    const now = readFileSync(path.join(RUNS, f), "utf8");
    if (before.get(f) === now) continue;
    renameSync(path.join(RUNS, f), path.join(OUT, f.replace(/\.json$/, `__${label}.json`)));
    if (before.has(f)) copyFileSync(path.join(BACKUP, f), path.join(RUNS, f));
  }
  if (existsSync(BACKUP)) rmSync(BACKUP, { recursive: true });
}
