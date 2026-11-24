// One-shot chatbot baseline: the notice and the draft in a single plain question
// to the same model at temperature 0, no schema, no code checks. The question
// text was fixed before the build started. The whole answer is saved.
// usage: node --env-file=.env.local scripts/chatbot.ts <notice> <draft> <label>
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const [nf, df, label] = process.argv.slice(2);
const read = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n").trim();
const QUESTION =
  "Here are the rules of a competition and my draft. List every requirement in the rules, and for each say whether my draft meets it. Quote the rules.";
const model = process.env.GEMINI_MODEL ?? "gemini-3.5-flash";
const prompt = `${QUESTION}\n\nRULES:\n${read(nf)}\n\nMY DRAFT:\n${read(df)}`;
const kst = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
const LOG = "runs/call-log.jsonl";
const cap = Number(process.env.DAILY_CALL_CAP ?? 13);
const used = () => readFileSync(LOG, "utf8").split("\n").filter(Boolean).filter((l) => JSON.parse(l).date === kst()).length;
mkdirSync("runs/chatbot", { recursive: true });

for (let attempt = 1; attempt <= 3; attempt++) {
  if (used() >= cap) throw new Error(`cap ${cap} reached`);
  const started = Date.now();
  const request = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0 } };
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(100_000),
  });
  const response: any = await res.json().catch(() => ({}));
  const durationMs = Date.now() - started;
  appendFileSync(LOG, JSON.stringify({ date: kst(), at: new Date().toISOString(), stage: "chatbot", model, runId: `chatbot__${label}`, status: res.status, durationMs }) + "\n");
  if (res.status === 503 && attempt < 3) {
    console.log("503, waiting 45 s");
    await new Promise((r) => setTimeout(r, 45_000));
    continue;
  }
  if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
  const text = (response?.candidates?.[0]?.content?.parts ?? []).filter((p: any) => typeof p.text === "string" && !p.thought).map((p: any) => p.text).join("");
  writeFileSync(`runs/chatbot/${label}.json`, JSON.stringify({ label, notice: nf, draft: df, question: QUESTION, model, recordedAt: new Date().toISOString(), durationMs, request, response }, null, 2));
  writeFileSync(`runs/chatbot/${label}.md`, text);
  console.log(label, response.modelVersion, durationMs, "ms", text.length, "chars");
  break;
}
