export const LEVELS = ["required", "recommended", "scoring"] as const;
export const TYPES = [
  "eligibility",
  "deadline",
  "deliverable",
  "content",
  "length_format",
  "disclosure",
  "conduct",
  "scoring",
] as const;
export const CHECKABLE = ["yes", "partial", "no"] as const;
export const MODEL_VERDICTS = ["met", "partial", "missing", "cannot_tell"] as const;

export type Level = (typeof LEVELS)[number];
export type ReqType = (typeof TYPES)[number];
export type Checkable = (typeof CHECKABLE)[number];
export type ModelVerdict = (typeof MODEL_VERDICTS)[number];

/** A requirement whose quote passed Quote Lock. start/end are offsets into the notice. */
export type Requirement = {
  id: string;
  summary: string;
  quote: string;
  level: Level;
  type: ReqType;
  checkable: Checkable;
  start: number;
  end: number;
};

// "check" = no verdict is shown; the user confirms it themselves.
export type Verdict = "met" | "partial" | "missing" | "check";

export type CheckReason =
  | "outside_text" // extraction marked it as not checkable from a draft
  | "model_cannot_tell"
  | "evidence_discarded" // the model's evidence quote failed Quote Lock
  | "no_verdict"; // the model returned nothing for this id

export type CompareResult = {
  id: string;
  verdict: Verdict;
  evidence: string;
  evStart: number | null;
  evEnd: number | null;
  note: string;
  checkReason?: CheckReason;
};

export type RunMeta = {
  source: "live" | "recorded";
  model: string;
  modelVersion: string;
  promptVersion: string;
  runId: string;
  durationMs: number;
  recordedAt: string;
};

export type ExtractResponse = {
  requirements: Requirement[];
  discarded: number;
  meta: RunMeta;
};

export type CompareResponse = {
  results: CompareResult[];
  discardedEvidence: number;
  meta: RunMeta | null; // null when nothing was sent to the model
};

export type ApiError = { error: { code: string; message: string } };
