import { createHash } from "node:crypto";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RunMeta } from "./types.ts";

// One provider, one entry point. Every live response is saved verbatim under
// runs/ so any result on screen can be replayed without calling the model.

const RUNS_DIR = process.env.RUNS_DIR ?? path.join(process.cwd(), "runs");
const CALL_LOG = path.join(RUNS_DIR, "call-log.jsonl");
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS ?? 60_000);

export const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash";

export class PipelineError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 500) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

type SavedRun = {
  runId: string;
  stage: string;
  promptVersion: string;
  model: string;
  inputHash: string;
  recordedAt: string;
  durationMs: number;
  httpStatus: number;
  request: unknown;
  response: unknown;
};

type CallArgs = {
  stage: "extract" | "compare";
  promptVersion: string;
  prompt: string;
  schema: unknown;
  forceReplay?: boolean;
  model?: string;
};

function kstDate(d = new Date()): string {
  return new Date(d.getTime() + 9 * 3600_000).toISOString().slice(0, 10);
}

// Falls back to a per-process count when the filesystem is read-only (serverless).
let memoryCalls: { date: string; count: number } = { date: "", count: 0 };

async function liveCallsToday(): Promise<number> {
  const today = kstDate();
  try {
    const lines = (await readFile(CALL_LOG, "utf8")).split("\n").filter(Boolean);
    return lines.filter((l) => JSON.parse(l).date === today).length;
  } catch {
    return memoryCalls.date === today ? memoryCalls.count : 0;
  }
}

async function logCall(entry: Record<string, unknown>): Promise<void> {
  const today = kstDate();
  memoryCalls = { date: today, count: (memoryCalls.date === today ? memoryCalls.count : 0) + 1 };
  try {
    await mkdir(RUNS_DIR, { recursive: true });
    await appendFile(CALL_LOG, JSON.stringify({ date: today, at: new Date().toISOString(), ...entry }) + "\n");
  } catch {
    // read-only filesystem: the in-memory count above still applies
  }
}

function runPath(runId: string): string {
  return path.join(RUNS_DIR, `${runId}.json`);
}

function parseModelJson(response: any): { data: any; modelVersion: string } {
  const parts: any[] = response?.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .filter((p) => typeof p.text === "string" && !p.thought)
    .map((p) => p.text)
    .join("");
  if (!text.trim()) {
    const reason = response?.candidates?.[0]?.finishReason ?? response?.promptFeedback?.blockReason ?? "no text";
    throw new PipelineError("empty_response", `The model returned no content (${reason}).`, 502);
  }
  try {
    return { data: JSON.parse(text), modelVersion: response.modelVersion ?? "" };
  } catch {
    throw new PipelineError("malformed_response", "The model's answer was not valid JSON.", 502);
  }
}

export async function generateJson(args: CallArgs): Promise<{ data: any; meta: RunMeta }> {
  const model = args.model ?? DEFAULT_MODEL;
  const inputHash = createHash("sha256").update(args.prompt).digest("hex").slice(0, 16);
  const runId = `${args.stage}__${args.promptVersion}__${model}__${inputHash}`;

  if (args.forceReplay || process.env.REPLAY === "1") {
    let saved: SavedRun;
    try {
      saved = JSON.parse(await readFile(runPath(runId), "utf8"));
    } catch {
      // Never fall through to a live call from replay mode.
      throw new PipelineError("replay_miss", `No recorded response for ${runId}.`, 404);
    }
    const { data, modelVersion } = parseModelJson(saved.response);
    return {
      data,
      meta: {
        source: "recorded",
        model,
        modelVersion,
        promptVersion: args.promptVersion,
        runId,
        durationMs: saved.durationMs,
        recordedAt: saved.recordedAt,
      },
    };
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new PipelineError("no_key", "The server has no GEMINI_API_KEY set.", 500);

  const cap = Number(process.env.DAILY_CALL_CAP ?? 13);
  if ((await liveCallsToday()) >= cap) {
    throw new PipelineError(
      "cap_reached",
      `Today's limit of ${cap} live checks is used up. The recorded sample still works.`,
      429,
    );
  }

  const request = {
    contents: [{ role: "user", parts: [{ text: args.prompt }] }],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: args.schema,
    },
  };

  const started = Date.now();
  let httpStatus = 0;
  let response: any;
  try {
    const res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    httpStatus = res.status;
    response = await res.json().catch(() => ({}));
  } catch (e) {
    const timedOut = e instanceof Error && e.name === "TimeoutError";
    await logCall({ stage: args.stage, model, runId, status: timedOut ? "timeout" : "network_error" });
    throw new PipelineError(
      timedOut ? "timeout" : "network_error",
      timedOut ? `The model took longer than ${Math.round(TIMEOUT_MS / 1000)} seconds.` : "Could not reach the model.",
      504,
    );
  }
  const durationMs = Date.now() - started;
  const recordedAt = new Date().toISOString();
  await logCall({ stage: args.stage, model, runId, status: httpStatus, durationMs });

  if (httpStatus !== 200) {
    if (httpStatus === 429) {
      throw new PipelineError("rate_limited", "The free model quota is used up for now.", 429);
    }
    if (httpStatus === 503) {
      throw new PipelineError("overloaded", "The model is overloaded right now. Try again in a few minutes.", 503);
    }
    const detail = String(response?.error?.message ?? "").slice(0, 200);
    throw new PipelineError("model_error", `The model returned an error (${httpStatus}). ${detail}`, 502);
  }

  if (process.env.RECORD !== "0") {
    const saved: SavedRun = {
      runId,
      stage: args.stage,
      promptVersion: args.promptVersion,
      model,
      inputHash,
      recordedAt,
      durationMs,
      httpStatus,
      request,
      response,
    };
    try {
      await mkdir(RUNS_DIR, { recursive: true });
      await writeFile(runPath(runId), JSON.stringify(saved, null, 2));
    } catch {
      // read-only filesystem: the result is still returned, just not recorded
    }
  }

  const { data, modelVersion } = parseModelJson(response);
  return {
    data,
    meta: { source: "live", model, modelVersion, promptVersion: args.promptVersion, runId, durationMs, recordedAt },
  };
}
