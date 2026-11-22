// Counted, not guessed: when a requirement states a word limit, code counts
// the draft's words and sets the verdict. The model's own verdict is kept
// next to it so the two can be compared later.

export type WordLimit = { min?: number; max?: number };

const N = String.raw`(\d{1,3}(?:,\d{3})+|\d+)`;
const num = (s: string) => Number(s.replace(/,/g, ""));

const RANGE = [
  new RegExp(String.raw`between\s+${N}\s+and\s+${N}\s+words`, "i"),
  new RegExp(String.raw`${N}\s*(?:-|–|—|to)\s*${N}[\s-]words?\b`, "i"),
];
const MAX = [
  new RegExp(String.raw`${N}\s+words?\s+or\s+(?:less|fewer)`, "i"),
  new RegExp(String.raw`${N}\s+words?\s+(?:maximum|max\b|limit)`, "i"),
  new RegExp(String.raw`${N}[\s-]word\s+(?:maximum|max\b|limit)`, "i"),
  new RegExp(String.raw`(?:more\s+than|over|exceed(?:s|ing)?|up\s+to|under|fewer\s+than|less\s+than|within)\s+${N}\s+words`, "i"),
  new RegExp(String.raw`(?:maximum|max\.?|limit)\s+(?:of\s+|is\s+|:\s*)?${N}\s+words`, "i"),
];
const MIN = [
  new RegExp(String.raw`(?:at\s+least|minimum\s+of|minimum:?|no\s+(?:less|fewer)\s+than)\s+${N}\s+words`, "i"),
  new RegExp(String.raw`${N}\s+words?\s+(?:or\s+more|minimum|min\b)`, "i"),
];

/** Reads a word limit out of a requirement's notice quote, or returns null. */
export function parseWordLimit(quote: string): WordLimit | null {
  for (const re of RANGE) {
    const m = quote.match(re);
    if (m && num(m[1]) < num(m[2])) return { min: num(m[1]), max: num(m[2]) };
  }
  // "no less than 300 words" must not be read as "less than 300 words".
  for (const re of MIN) {
    const m = quote.match(re);
    if (m) return { min: num(m[1]) };
  }
  for (const re of MAX) {
    const m = quote.match(re);
    if (m) return { max: num(m[1]) };
  }
  return null;
}

/** Whitespace-separated tokens, the same rule as eval/make_gaps.py. */
export function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

export function withinLimit(words: number, limit: WordLimit): boolean {
  return (limit.min === undefined || words >= limit.min) && (limit.max === undefined || words <= limit.max);
}

export function limitText(limit: WordLimit): string {
  const f = (n: number) => n.toLocaleString("en-US");
  if (limit.min !== undefined && limit.max !== undefined) return `${f(limit.min)} to ${f(limit.max)} words`;
  if (limit.max !== undefined) return `at most ${f(limit.max)} words`;
  return `at least ${f(limit.min!)} words`;
}
