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

// Per-visitor limit for the public deployment. In-memory, so on serverless it
// holds per instance only: a speed bump next to DAILY_CALL_CAP, not a guarantee.
// Default: 6 live calls (about three checks) per IP per day on Vercel, off locally.
const clientCalls = new Map<string, { date: string; count: number }>();

export function clientLimited(req: Request, calls: number): Response | null {
  const cap = Number(process.env.IP_DAILY_CAP ?? (process.env.VERCEL ? 6 : 0));
  if (!cap) return null;
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const date = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
  const seen = clientCalls.get(ip);
  const count = seen?.date === date ? seen.count : 0;
  if (count + calls > cap) {
    return fail("client_cap", "You have used today's live checks for this address. The recorded sample still works.", 429);
  }
  clientCalls.set(ip, { date, count: count + calls });
  return null;
}

/** Returns the trimmed text, or null if it is missing, empty, or too long. */
export function readText(value: unknown, maxChars: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\r\n/g, "\n").trim();
  return text.length > 0 && text.length <= maxChars ? text : null;
}
