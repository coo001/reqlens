import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { countWords, parseWordLimit, withinLimit } from "./counted.ts";

test("word limits are read from the notice's own wording", () => {
  assert.deepEqual(
    parseWordLimit("Please write an essay of 500 words or less (submissions of over 500 words will not be considered)"),
    { max: 500 },
  );
  assert.deepEqual(parseWordLimit("submissions of over 500 words will not be considered"), { max: 500 });
  assert.deepEqual(parseWordLimit("Essays must be no more than 1,000 words"), { max: 1000 });
  assert.deepEqual(parseWordLimit("a maximum of 250 words"), { max: 250 });
  assert.deepEqual(parseWordLimit("Write at least 300 words"), { min: 300 });
  assert.deepEqual(parseWordLimit("no less than 300 words"), { min: 300 });
  assert.deepEqual(parseWordLimit("Essays must be 500-1,000 words"), { min: 500, max: 1000 });
  assert.deepEqual(parseWordLimit("between 400 and 600 words"), { min: 400, max: 600 });
});

test("text without a word limit is left to the model", () => {
  assert.equal(parseWordLimit("a 2–4 minute demonstration video"), null);
  assert.equal(parseWordLimit("teams of up to six people"), null);
  assert.equal(parseWordLimit("Describe the project in your own words"), null);
});

// Expected counts are the ones eval/make_gaps.py printed when the drafts were built.
test("word counts match the counts recorded when the eval drafts were built", () => {
  const expected: Record<string, number> = {
    "A_complete.txt": 410,
    "A_gap1_problem.txt": 325,
    "A_gap2_ai_details.txt": 318,
    "A_gap3_credits.txt": 367,
    "B_complete.txt": 420,
    "B_gap1_future.txt": 324,
    "B_gap2_persevere.txt": 327,
    "B_gap3_overlength.txt": 537,
  };
  for (const [file, words] of Object.entries(expected)) {
    assert.equal(countWords(readFileSync(new URL(`../eval/drafts/${file}`, import.meta.url), "utf8")), words, file);
  }
});

test("a limit is inclusive", () => {
  assert.equal(withinLimit(500, { max: 500 }), true);
  assert.equal(withinLimit(501, { max: 500 }), false);
  assert.equal(withinLimit(299, { min: 300 }), false);
});
