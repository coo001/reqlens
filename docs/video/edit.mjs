// Cuts the recorded scenes into the demo video with burned-in captions. Silent (a silent audio track is added).
// Usage: PW=/path/to/playwright/index.mjs FF=/path/to/ffmpeg node docs/video/edit.mjs <pair|live> [out.mp4]
// Scene order follows docs/video/script_v0.md. Numbers on the results card are copied from eval/results.md.
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

const FF = process.env.FF ?? "ffmpeg";
const main = process.argv[2] ?? "pair";
const OUT = path.resolve(process.argv[3] ?? "docs/video/demo_v0.mp4");
const RAW = path.resolve("docs/video/raw");
const TMP = path.join(RAW, "edit");
await rm(TMP, { recursive: true, force: true });
await mkdir(TMP, { recursive: true });

const marksOf = async (s) =>
  Object.fromEntries(JSON.parse(await readFile(path.join(RAW, `${s}.marks.json`), "utf8")).marks.map((m) => [m.id, m.t]));
const M = await marksOf(main), L = await marksOf("long"), F = await marksOf("fault");
const isLive = main === "live";
const runLabel = isLive ? "Live run: real calls to Gemini" : "Recorded run: saved Gemini responses, replayed";

// ---- cards (rendered from HTML with the app's own colours) ----
const card = (body) => `<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;width:1920px;height:1080px;background:#fff;color:#16181d;font-family:-apple-system,"Helvetica Neue",Arial,sans-serif}
.w{padding:150px 170px}.k{font-size:30px;color:#5a606b;letter-spacing:.04em;text-transform:uppercase;margin-bottom:36px}
h1{font-size:84px;line-height:1.12;margin:0 0 40px;max-width:1500px;letter-spacing:-.02em}p{font-size:42px;line-height:1.4;color:#5a606b;max-width:1450px;margin:0 0 22px}
table{border-collapse:collapse;font-size:40px;margin:10px 0 44px}td{padding:20px 60px 20px 0;border-bottom:1px solid #e3e4e6}td.n{font-weight:700;font-variant-numeric:tabular-nums}
.s{font-size:32px}</style><div class="w">${body}</div>`;
const CARDS = {
  title: card(`<div class="k">ReqLens</div><h1>Rules pages are long. One missed line can cost an entry.</h1><p>A requirement checker for hackathon rules, contest calls and scholarship postings.</p>`),
  numbers: card(`<div class="k">How it was tested</div>
<table><tr><td>Required items found in the notices</td><td class="n">87.0% (80 of 92)</td></tr>
<tr><td>Listed items that match the answer key</td><td class="n">97.3% (108 of 111)</td></tr>
<tr><td>Planted gaps caught (drafts with one part removed)</td><td class="n">4 of 6</td></tr>
<tr><td>First two rows with keyword search, no AI</td><td class="n">55.4% and 51.2%</td></tr></table>
<p class="s">5 notices, an answer key of 145 items written before the build by two AI models. No human verified the key.</p>
<p class="s">Limits: the number of rows changes between runs of the same notice, and some Met verdicts were too generous.</p>`),
  close: card(`<div class="k">ReqLens</div><h1>It checks text against text. It does not predict judging.</h1><p>reqlens-two.vercel.app</p><p class="s">The failure in this video was injected on purpose. Scenes marked Recorded replay saved model responses.</p>`),
};
const { chromium } = await import(process.env.PW ?? "playwright");
const browser = await chromium.launch({ headless: true, args: ["--mute-audio"] });
const pg = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
for (const [name, html] of Object.entries(CARDS)) {
  await pg.setContent(html);
  await pg.screenshot({ path: path.join(TMP, `${name}.png`) });
}
await browser.close();

// ---- segments: [source, start, end, target seconds (null = real time), caption, corner label] ----
const longLabel = "Recorded run: saved Gemini responses, replayed";
const SEGS = [
  ["card:title", 0, 7, null, "", ""],
  [main, M.open + 0.2, M.notice_pasted - 0.1, 6, "ReqLens puts every requirement next to the part of your draft that answers it.", ""],
  [main, M.notice_pasted - 0.1, M.check_clicked, 9, isLive ? "Paste the rules and your draft. This run is live: two calls to Gemini." : "Paste the rules and your draft, then check.", runLabel],
  [main, M.check_clicked, M.check_done + 1.4, 8, "Gemini lists the requirements. Code keeps a quote only if it is in the rules word for word.", runLabel, true],
  [main, M.check_done + 1.4, M.check_done + 1.4 + (M.tour_done - M.check_done - 1.4) * 0.55, 11, "Each row shows the rule's sentence, the verdict and the draft sentence used as proof.", runLabel],
  [main, M.check_done + 1.4 + (M.tour_done - M.check_done - 1.4) * 0.55, M.tour_done, 9, "What text cannot prove is set aside for you to confirm. No verdict is invented.", runLabel],
  [main, M.tour_done, M.recheck_clicked, 8, "The draft never said how its AI works. Add that paragraph and re-check.", runLabel],
  [main, M.recheck_clicked, M.recheck_done + 1.4, 5, "Only the comparison runs again.", runLabel, true],
  [main, M.recheck_done + 1.4, M.recheck_tour_done, null, "Verdicts that changed since the last check are marked.", runLabel],
  ["long", L.check_clicked, L.fold_open + 0.8, null, "A harder case: this hackathon's own rules against our own early write-up. Met rows fold away so the gaps come first.", longLabel],
  ["long", L.recheck_clicked, L.recheck_tour_done, null, "After a rewrite, 15 verdicts changed. One requirement was still missing.", longLabel],
  ["fault", F.sample_clicked - 0.3, F.recovered + 5.5, null, "When the model is overloaded, the requirement list is kept and the next try starts from the comparison.", "Recorded sample, failure injected on purpose"],
  ["card:numbers", 0, 14, null, "", ""],
  ["card:close", 0, 8, null, "", ""],
];

const ff = (args) => execFileSync(FF, ["-v", "error", "-y", ...args], { stdio: ["ignore", "inherit", "inherit"] });
const enc = ["-an", "-r", "30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p"];
const cues = [];
let t = 0;
const list = [];
for (const [i, [src, s, e, target, text, label, waitCut]] of SEGS.entries()) {
  const real = e - s, dur = target ?? real, out = path.join(TMP, `seg${String(i).padStart(2, "0")}.mp4`);
  if (src.startsWith("card:")) {
    ff(["-loop", "1", "-t", String(dur), "-i", path.join(TMP, `${src.slice(5)}.png`), "-vf", "fps=30,format=yuv420p", ...enc, out]);
  } else {
    const k = dur / real; // >1 slower, <1 faster
    ff(["-ss", s.toFixed(2), "-t", real.toFixed(2), "-i", path.join(RAW, `${src}.webm`), "-vf", `setpts=${k.toFixed(4)}*(PTS-STARTPTS),fps=30,scale=1920:1080`, "-t", dur.toFixed(2), ...enc, out]);
  }
  let lab = label;
  if (waitCut && real > dur * 1.5) lab += `  ·  waiting shortened: ${Math.round(real)} s shown in ${Math.round(dur)} s`;
  cues.push({ a: t, b: t + dur, text, label: lab });
  list.push(`file '${out}'`);
  t += dur;
}
if (t >= 180) throw new Error(`too long: ${t.toFixed(1)} s`);

const ts = (x) => { const h = Math.floor(x / 3600), m = Math.floor(x / 60) % 60, s = (x % 60).toFixed(2).padStart(5, "0"); return `${h}:${String(m).padStart(2, "0")}:${s}`; };
const ass = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Helvetica Neue,42,&H00FFFFFF,&H00FFFFFF,&H00201A16,&H00201A16,0,0,0,0,100,100,0,0,3,14,0,2,220,220,34,1
Style: Lab,Helvetica Neue,26,&H00FFFFFF,&H00FFFFFF,&H00804020,&H00804020,0,0,0,0,100,100,0,0,3,8,0,9,30,30,24,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${cues.flatMap((c) => [
  c.text && `Dialogue: 0,${ts(c.a)},${ts(c.b - 0.05)},Cap,,0,0,0,,${c.text}`,
  c.label && `Dialogue: 1,${ts(c.a)},${ts(c.b - 0.05)},Lab,,0,0,0,,${c.label}`,
]).filter(Boolean).join("\n")}
`;
await writeFile(path.join(TMP, "cap.ass"), ass);
await writeFile(path.join(TMP, "list.txt"), list.join("\n"));
const srt = cues.filter((c) => c.text).map((c, i) => `${i + 1}\n${ts(c.a).replace(".", ",").padStart(11, "0")}0 --> ${ts(c.b - 0.05).replace(".", ",").padStart(11, "0")}0\n${c.text}\n`).join("\n");
await writeFile(OUT.replace(/\.mp4$/, ".srt"), srt);
ff(["-f", "concat", "-safe", "0", "-i", path.join(TMP, "list.txt"), "-c", "copy", path.join(TMP, "joined.mp4")]);
process.chdir(TMP); // the subtitles filter is given a bare file name
ff(["-i", "joined.mp4", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-vf", "subtitles=cap.ass", "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-r", "30", "-c:a", "aac", "-b:a", "96k", "-shortest", "-movflags", "+faststart", OUT]);
await writeFile(OUT.replace(/\.mp4$/, ".timeline.json"), JSON.stringify({ main, total: +t.toFixed(2), cues }, null, 2));
console.log("done", OUT, t.toFixed(1), "s");
