import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { keySpans, markerBaseline, scoreExtraction, type KeyItem } from "./scoring.ts";

const keys: KeyItem[] = JSON.parse(readFileSync(new URL("./answer_key.json", import.meta.url), "utf8"));
const notices = [...new Set(keys.map((k) => k.notice))];
const read = (name: string) =>
  readFileSync(new URL(`./notices/${name}.txt`, import.meta.url), "utf8").replace(/\r\n/g, "\n").trim();

test("the answer key has 145 items and every quote is found in its notice", () => {
  assert.equal(keys.length, 145);
  assert.equal(notices.length, 5);
  for (const k of keys) assert.ok(keySpans(read(k.notice), k).length >= 1);
});

test("scoring the answer key against itself gives 100% recall and precision", () => {
  for (const name of notices) {
    const notice = read(name);
    const own = keys.filter((k) => k.notice === name);
    const s = scoreExtraction(
      notice,
      own,
      own.map((k) => ({ label: k.id, level: k.level, span: keySpans(notice, k)[0] })),
    );
    assert.equal(s.keysFound, s.keys, name);
    assert.equal(s.requiredFound, s.requiredKeys, name);
    assert.equal(s.matchedItems, s.items, name);
    assert.equal(s.levelAgree, s.levelCompared, name);
  }
});

test("an empty output scores zero, and an unlocated quote never matches", () => {
  const name = notices[0];
  const own = keys.filter((k) => k.notice === name);
  const empty = scoreExtraction(read(name), own, []);
  assert.equal(empty.keysFound, 0);
  assert.equal(empty.keysMissed.length, own.length);
  const bad = scoreExtraction(read(name), own, [{ label: "made up", span: null }]);
  assert.equal(bad.matchedItems, 0);
  assert.equal(bad.unlocatedItems, 1);
});

test("the marker-word baseline returns sentences with their own offsets", () => {
  const notice = read("n2_first_ai_app_rules");
  const items = markerBaseline(notice);
  assert.ok(items.length > 5);
  for (const i of items) assert.equal(notice.slice(i.span!.start, i.span!.end), i.label);
});
