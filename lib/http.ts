import { NextResponse } from "next/server";
import { PipelineError } from "./gemini.ts";

export const MAX_NOTICE_CHARS = 60_000;
export const MAX_DRAFT_CHARS = 30_000;

export function fail(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function failFrom(e: unknown) {
  if (e instanceof PipelineError) return fail(e.code, e.message, e.status);
  console.error(e);
  return fail("internal", "Something went wrong on the server.", 500);
}

/** Returns the trimmed text, or null if it is missing, empty, or too long. */
export function readText(value: unknown, maxChars: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\r\n/g, "\n").trim();
  return text.length > 0 && text.length <= maxChars ? text : null;
}
