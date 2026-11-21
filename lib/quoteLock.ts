// Quote Lock: a quote is only kept if it appears verbatim in the source text.
// Only whitespace runs and curly quotes are normalized before matching;
// any other difference (one changed letter, a dropped comma) discards the quote.

export type Span = { start: number; end: number };

const QUOTE_MAP: Record<string, string> = {
  "‘": "'",
  "’": "'",
  "“": '"',
  "”": '"',
};

const MIN_QUOTE_LENGTH = 8;

function normalize(text: string): { norm: string; map: number[] } {
  let norm = "";
  const map: number[] = [];
  let pendingSpace = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (/\s/.test(ch)) {
      pendingSpace = norm.length > 0;
      continue;
    }
    if (pendingSpace) {
      norm += " ";
      map.push(i - 1);
      pendingSpace = false;
    }
    norm += QUOTE_MAP[ch] ?? ch;
    map.push(i);
  }
  return { norm, map };
}

/** Returns where `quote` sits in `source` (offsets into the original text), or null. */
export function locateQuote(source: string, quote: string): Span | null {
  const q = normalize(quote).norm;
  if (q.length < MIN_QUOTE_LENGTH) return null;
  const { norm, map } = normalize(source);
  const at = norm.indexOf(q);
  if (at === -1) return null;
  return { start: map[at], end: map[at + q.length - 1] + 1 };
}
