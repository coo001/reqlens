import { NextResponse } from "next/server";
import { clientLimited, fail, failFrom, MAX_NOTICE_CHARS, readText } from "@/lib/http.ts";
import { extractRequirements } from "@/lib/pipeline.ts";

export const maxDuration = 120;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const notice = readText(body?.notice, MAX_NOTICE_CHARS);
  if (!notice) {
    return fail("bad_notice", `Paste the notice text (up to ${MAX_NOTICE_CHARS.toLocaleString("en-US")} characters).`, 400);
  }
  const sample = body?.mode === "sample";
  const limited = sample ? null : clientLimited(req, 1);
  if (limited) return limited;
  try {
    return NextResponse.json(await extractRequirements(notice, sample));
  } catch (e) {
    return failFrom(e);
  }
}
