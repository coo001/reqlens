import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

// The sample pairs that "Try a sample" loads. Their model responses are replayed
// from runs/, so they cost no API calls.
const SAMPLES = {
  gap: {
    notice: "notice_first_ai_app_rules.txt",
    draft: "draft_rotamate_gap.txt",
    noticeLabel: "Build Your First AI App — Rules (public Devpost page, saved 2026-11-17)",
    draftLabel: "A made-up project description with one required part left out",
  },
  wordlimit: {
    notice: "notice_scholarship.txt",
    draft: "draft_essay_overlength.txt",
    noticeLabel: "A public scholarship posting (saved 2026-11-17)",
    draftLabel: "A made-up essay that runs past the 500-word limit",
  },
};

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  const s = SAMPLES[id === "wordlimit" ? "wordlimit" : "gap"];
  const dir = path.join(process.cwd(), "samples");
  const [notice, draft] = await Promise.all([
    readFile(path.join(dir, s.notice), "utf8"),
    readFile(path.join(dir, s.draft), "utf8"),
  ]);
  return NextResponse.json({ notice: notice.trim(), draft: draft.trim(), noticeLabel: s.noticeLabel, draftLabel: s.draftLabel });
}
