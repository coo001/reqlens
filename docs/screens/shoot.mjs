// Takes the two screenshots used in the description from the running app. No model call: the server runs with REPLAY=1.
// Usage: PW=/path/to/playwright/index.mjs node docs/screens/shoot.mjs <first|fault> <port>
import path from "node:path";
const { chromium } = await import(process.env.PW ?? "playwright");
const [which, port] = process.argv.slice(2);
const browser = await chromium.launch({ headless: true, args: ["--mute-audio"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
const out = (n) => path.resolve("docs/screens", n);
await page.goto(`http://localhost:${port}/`, { waitUntil: "networkidle" });
await page.addStyleTag({ content: "nextjs-portal{display:none!important}" }); // dev-only badge
const sample = page.getByRole("button", { name: "Try a sample" });
await sample.click();
if (which === "first") {
  await page.locator("section.results").waitFor({ timeout: 60000 });
  await page.waitForFunction(() => !document.querySelector("button.primary")?.disabled);
  await page.waitForTimeout(600);
  await page.locator("section.results").scrollIntoViewIfNeeded();
  await page.evaluate(() => { const r = document.querySelector("section.results"); window.scrollTo(0, window.scrollY + r.getBoundingClientRect().top - 24); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: out("sample_result.png") });
} else {
  const band = page.locator("p.notice-band");
  await band.waitFor({ timeout: 60000 });
  await page.waitForFunction(() => !document.querySelector("button.primary")?.disabled);
  console.log("failure text:", (await band.textContent())?.trim());
  await page.evaluate(() => { const r = document.querySelector("p.notice-band"); window.scrollTo(0, window.scrollY + r.getBoundingClientRect().top - 260); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: out("service_failed_replay.png") });
}
console.log("rows:", await page.locator("li.row").count(), "| summary:", (await page.locator("section.results").first().innerText().catch(() => "")).split("\n").slice(0, 4).join(" / "));
await browser.close();
