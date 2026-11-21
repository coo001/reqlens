import { NextResponse } from "next/server";
import { fail, failFrom, MAX_DRAFT_CHARS, MAX_NOTICE_CHARS, readText } from "@/lib/http.ts";
import { compareDraft } from "@/lib/pipeline.ts";
import { locateQuote } from "@/lib/quoteLock.ts";
import { CHECKABLE, LEVELS, TYPES, type Requirement } from "@/lib/types.ts";

export const maxDuration = 60;

const MAX_REQUIREMENTS = 200;

// The requirement list comes back from the browser, so it is re-locked
// against the notice here instead of being trusted.
function relock(list: unknown, notice: string): Requirement[] | null {
  if (!Array.isArray(list) || list.length > MAX_REQUIREMENTS) return null;
  const out: Requirement[] = [];
  for (const r of list) {
    const span = typeof r?.quote === "string" ? locateQuote(notice, r.quote) : null;
    if (
      !span ||
      typeof r.id !== "string" ||
      typeof r.summary !== "string" ||
      !LEVELS.includes(r.level) ||
      !TYPES.includes(r.type) ||
      !CHECKABLE.includes(r.checkable)
    ) {
      return null;
    }
    out.push({
      id: r.id,
      summary: r.summary,
      quote: notice.slice(span.start, span.end),
      level: r.level,
      type: r.type,
      checkable: r.checkable,
      start: span.start,
      end: span.end,
    });
  }
  return out;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const notice = readText(body?.notice, MAX_NOTICE_CHARS);
  const draft = readText(body?.draft, MAX_DRAFT_CHARS);
  if (!notice) return fail("bad_notice", "The notice text is missing.", 400);
  if (!draft) {
    return fail("bad_draft", `Paste your draft (up to ${MAX_DRAFT_CHARS.toLocaleString("en-US")} characters).`, 400);
  }
  const requirements = relock(body?.requirements, notice);
  if (!requirements) return fail("bad_requirements", "The requirement list does not match the notice.", 400);
  try {
    return NextResponse.json(await compareDraft(requirements, draft, body?.mode === "sample"));
  } catch (e) {
    return failFrom(e);
  }
}
