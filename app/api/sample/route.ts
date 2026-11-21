import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

// The sample pair that "Try a sample" loads. Its model responses are replayed
// from runs/, so it costs no API calls.
export async function GET() {
  const dir = path.join(process.cwd(), "samples");
  const [notice, draft] = await Promise.all([
    readFile(path.join(dir, "notice_first_ai_app_rules.txt"), "utf8"),
    readFile(path.join(dir, "draft_rotamate_gap.txt"), "utf8"),
  ]);
  return NextResponse.json({
    notice: notice.trim(),
    draft: draft.trim(),
    noticeLabel: "Build Your First AI App — Rules (public Devpost page, saved 2026-11-17)",
    draftLabel: "A made-up project description with one required part left out",
  });
}
