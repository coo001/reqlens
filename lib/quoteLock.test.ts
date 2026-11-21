import { test } from "node:test";
import assert from "node:assert/strict";
import { locateQuote } from "./quoteLock.ts";

const source =
  "Each project must include a clear description.\nSource code and setup\n  instructions should be provided where applicable. Don’t publish “secrets” here.";

test("verbatim quote is located with original offsets", () => {
  const span = locateQuote(source, "must include a clear description");
  assert.ok(span);
  assert.equal(source.slice(span.start, span.end), "must include a clear description");
});

test("whitespace and line-break differences pass", () => {
  const span = locateQuote(source, "Source code and setup instructions should be provided");
  assert.ok(span);
  assert.equal(
    source.slice(span.start, span.end),
    "Source code and setup\n  instructions should be provided",
  );
});

test("straight vs curly quotes pass", () => {
  assert.ok(locateQuote(source, "Don't publish \"secrets\" here"));
});

test("one changed letter is discarded", () => {
  assert.equal(locateQuote(source, "must include a clear descriptions"), null);
});

test("stitched text from two places is discarded", () => {
  assert.equal(locateQuote(source, "Each project must include setup instructions"), null);
});

test("too-short quotes are discarded", () => {
  assert.equal(locateQuote(source, "must"), null);
});
