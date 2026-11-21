import { NextResponse } from "next/server";
import { fail, failFrom, MAX_NOTICE_CHARS, readText } from "@/lib/http.ts";
import { extractRequirements } from "@/lib/pipeline.ts";

export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const notice = readText(body?.notice, MAX_NOTICE_CHARS);
  if (!notice) {
    return fail("bad_notice", `Paste the notice text (up to ${MAX_NOTICE_CHARS.toLocaleString("en-US")} characters).`, 400);
  }
  try {
    return NextResponse.json(await extractRequirements(notice, body?.mode === "sample"));
  } catch (e) {
    return failFrom(e);
  }
}
