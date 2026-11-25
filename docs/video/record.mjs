// Records the three demo scenes from the running app with Playwright (headless, silent).
// Usage: PW=/path/to/node_modules/playwright node docs/video/record.mjs <live|fault|long> <port>
// The server for each scene is started by docs/video/record.sh with the env that scene needs.
import { readFile, rename, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const { chromium } = await import(process.env.PW ?? "playwright");
const [scene, port] = process.argv.slice(2);
const OUT = path.resolve("docs/video/raw");
await mkdir(OUT, { recursive: true });
const read = (p) => readFile(p, "utf8");

const browser = await chromium.launch({ headless: true, args: ["--mute-audio"] });
const ctx = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: { dir: OUT, size: { width: 1920, height: 1080 } },
});
const page = await ctx.newPage();
const t0 = Date.now();
const marks = [];
const mark = (id) => {
  marks.push({ id, t: +((Date.now() - t0) / 1000).toFixed(2) });
  console.log(scene, id, marks.at(-1).t);
};
const hold = (ms) => page.waitForTimeout(ms);

async function dress() {
  // Bigger text for a 1080p recording; hide the dev-only overlay. The app itself is not edited.
  await page.addStyleTag({ content: "html{zoom:1.5} nextjs-portal{display:none!important}" });
}
async function glide(y, ms = 1800) {
  await page.evaluate(
    ([y, ms]) =>
      new Promise((done) => {
        const from = window.scrollY, s = performance.now();
        const step = (now) => {
          const k = Math.min(1, (now - s) / ms), e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
          window.scrollTo(0, from + (y - from) * e);
          k < 1 ? requestAnimationFrame(step) : done();
        };
        requestAnimationFrame(step);
      }),
    [y, ms],
  );
}
async function glideTo(loc, offset = 120, ms = 1800) {
  const y = await loc.first().evaluate((el, off) => {
    const z = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
    return window.scrollY + el.getBoundingClientRect().top * (1) - off / z;
  }, offset);
  await glide(Math.max(0, y), ms);
}
async function press(loc) {
  await loc.evaluate((el) => {
    el.style.transition = "box-shadow .2s";
    el.style.boxShadow = "0 0 0 4px rgba(20,90,220,.55)";
    setTimeout(() => (el.style.boxShadow = ""), 900);
  });
  await hold(600);
  await loc.click();
}
const submit = page.locator("button.primary");
const results = page.locator("section.results");
async function finished(timeout = 150000) {
  // Either the run ends (button enabled again) or an error band shows.
  await hold(400);
  await page.waitForFunction(() => !document.querySelector("button.primary")?.disabled, null, { timeout });
  const err = await page.locator('p.notice-band').count();
  return err === 0;
}
async function tour(ms = 9000) {
  await glideTo(results, 110, 1500);
  await hold(2500);
  const h = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  const y = await page.evaluate(() => window.scrollY);
  await glide(Math.min(h, y + 2200), ms);
  await hold(1500);
}

let ok = true;
try {
  if (scene === "live" || scene === "long") {
    const live = scene === "live";
    const notice = await read(live ? "samples/notice_first_ai_app_rules.txt" : "eval/notices/n1_gaibc_rules_and_resources.txt");
    const d1 = await read(live ? "samples/draft_rotamate_gap.txt" : "eval/drafts/C_reqlens_early.txt");
    const d2 = await read(live ? "eval/drafts/A_complete.txt" : "eval/drafts/C_reqlens_revised.txt");
    await page.goto(`http://localhost:${port}/`, { waitUntil: "networkidle" });
    await dress();
    mark("open");
    await hold(3000);
    const boxes = page.locator("textarea");
    await glideTo(boxes.nth(0), 160, 900);
    await boxes.nth(0).fill(notice);
    mark("notice_pasted");
    await hold(1800);
    await glideTo(boxes.nth(1), 160, 900);
    await boxes.nth(1).fill(d1);
    mark("draft_pasted");
    await hold(1800);
    await glideTo(submit, 500, 700);
    await press(submit);
    mark("check_clicked");
    await glideTo(page.locator("ol.steps"), 300, 800).catch(() => {});
    ok = await finished();
    mark(ok ? "check_done" : "check_failed");
    if (ok) {
      await hold(1500);
      await tour(live ? 10000 : 7000);
      mark("tour_done");
      if (!live) {
        const fold = results.locator("summary").first();
        await glideTo(fold, 300, 1500);
        await hold(1200);
        mark("fold_closed");
        await press(fold);
        await hold(1000);
        mark("fold_open");
        await glideTo(fold, 120, 1200);
        await hold(3000);
      }
      await glideTo(boxes.nth(1), 160, 1600);
      await hold(800);
      await boxes.nth(1).fill(d2);
      mark("draft_revised");
      if (live) {
        // Show the paragraph that was added.
        await boxes.nth(1).evaluate((el) => {
          const i = el.value.indexOf("How the AI works");
          if (i >= 0) { el.focus(); el.setSelectionRange(i, el.value.indexOf("\n", i)); el.scrollTop = Math.max(0, (i / el.value.length) * el.scrollHeight - 60); }
        });
      }
      await hold(3000);
      await glideTo(submit, 500, 700);
      await press(submit);
      mark("recheck_clicked");
      await glideTo(page.locator("ol.steps"), 300, 800).catch(() => {});
      ok = await finished();
      mark(ok ? "recheck_done" : "recheck_failed");
      if (ok) {
        await hold(1500);
        await tour(live ? 9000 : 7000);
        mark("recheck_tour_done");
      }
    }
  } else if (scene === "fault") {
    // Not /?sample=1: in dev, React runs that effect twice and the two runs use up the injected failures.
    await page.goto(`http://localhost:${port}/`, { waitUntil: "networkidle" });
    await dress();
    mark("open");
    await hold(2500);
    await press(page.getByRole("button", { name: "Try a sample" }));
    mark("sample_clicked");
    await page.locator('p.notice-band').waitFor({ timeout: 60000 });
    mark("failure_shown");
    await glideTo(page.locator('p.notice-band'), 300, 900);
    await hold(4500);
    const again = page.getByRole("button", { name: "Try a sample" });
    await press(again);
    mark("retry_clicked");
    await results.waitFor({ timeout: 60000 });
    await finished();
    mark("recovered");
    await hold(1200);
    await tour(7000);
    mark("tour_done");
  }
} catch (e) {
  ok = false;
  mark("error:" + String(e.message).slice(0, 120));
}
await hold(1000);
await page.screenshot({ path: path.join(OUT, `${scene}_last.png`) });
const video = page.video();
await ctx.close();
await browser.close();
await rename(await video.path(), path.join(OUT, `${scene}.webm`));
await writeFile(path.join(OUT, `${scene}.marks.json`), JSON.stringify({ scene, ok, marks }, null, 2));
process.exit(ok ? 0 : 1);
