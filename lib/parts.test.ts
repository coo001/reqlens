import { test } from "node:test";
import assert from "node:assert/strict";
import { decideParts } from "./parts.ts";
import type { Requirement } from "./types.ts";

const draft =
  "Last spring my family lost our home.\n\nI kept studying at the library every night.\n\nNow I want to become a nurse.";
const req = (type: Requirement["type"] = "content"): Requirement => ({
  id: "R01",
  summary: "Describe a hard time and how it shaped your future.",
  quote: "",
  level: "required",
  type,
  checkable: "yes",
  start: 0,
  end: 0,
});
const result = (verdict: string, ...evidence: string[]) => ({
  id: "R01",
  verdict,
  note: "",
  parts: evidence.map((e, i) => ({ part: `part ${i + 1}`, evidence: e })),
});

test("every part locked, quotes from two paragraphs: met", () => {
  const d = decideParts(req(), result("met", "my family lost our home", "I want to become a nurse"), draft);
  assert.equal(d.verdict, "met");
  assert.equal(d.discarded, 0);
  assert.deepEqual(
    d.parts.map((p) => draft.slice(p.evStart!, p.evEnd!)),
    ["my family lost our home", "I want to become a nurse"],
  );
});

test("model says met but one part has no quote: partial", () => {
  const d = decideParts(req(), result("met", "my family lost our home", ""), draft);
  assert.equal(d.verdict, "partial");
  assert.equal(d.parts[1].evStart, null);
});

test("a part whose quote is not in the draft counts as unsupported", () => {
  const d = decideParts(req(), result("met", "my family lost our home", "I want to become a doctor"), draft);
  assert.equal(d.verdict, "partial");
  assert.equal(d.discarded, 1);
});

test("model's partial stays partial even when every part is locked", () => {
  assert.equal(decideParts(req(), result("partial", "my family lost our home"), draft).verdict, "partial");
});

test("no quote locked, some thrown away: check yourself", () => {
  const d = decideParts(req(), result("met", "we lost the farm"), draft);
  assert.equal(d.verdict, "check");
  assert.equal(d.checkReason, "evidence_discarded");
});

test("met with no quotes at all: missing, or check for a conduct rule", () => {
  assert.equal(decideParts(req(), result("met", ""), draft).verdict, "missing");
  assert.equal(decideParts(req(), { id: "R01", verdict: "met", note: "" }, draft).verdict, "missing");
  const c = decideParts(req("conduct"), result("partial", ""), draft);
  assert.equal(c.verdict, "check");
  assert.equal(c.checkReason, "rule_not_mentioned");
});
