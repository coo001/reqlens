// Scoring by quote overlap: a tool item and an answer-key item are the same
// requirement when their quotes overlap in the notice text. No API calls.

export type Span = { start: number; end: number };

export type KeyItem = {
  id: string;
  notice: string;
  level: "required" | "recommended" | "scoring";
  type: string;
  checkable: "yes" | "partial" | "no";
  quote: string;
  occurrence: number;
  alsoStatedAt: { quote: string; occurrence: number }[];
};

export type ToolItem = { label: string; level?: string; span: Span | null };

export type ExtractionScore = {
  items: number;
  matchedItems: number;
  unlocatedItems: number;
  repeatItems: number;
  keys: number;
  keysFound: number;
  requiredKeys: number;
  requiredFound: number;
  levelAgree: number;
  levelCompared: number;
  toolOnly: ToolItem[];
  keysMissed: KeyItem[];
  /** key id -> indexes of the tool items that overlap it */
  links: Map<string, number[]>;
};

function nthIndexOf(text: string, quote: string, n: number): number {
  let at = text.indexOf(quote);
  for (let i = 0; i < n && at !== -1; i++) at = text.indexOf(quote, at + 1);
  return at;
}

/** Where a key item sits in the notice: its main quote plus every place the key says it is restated. */
export function keySpans(notice: string, key: KeyItem): Span[] {
  return [{ quote: key.quote, occurrence: key.occurrence }, ...key.alsoStatedAt].map(({ quote, occurrence }) => {
    const start = nthIndexOf(notice, quote, occurrence);
    if (start === -1) throw new Error(`Answer key quote not found in the notice: ${key.id} "${quote}"`);
    return { start, end: start + quote.length };
  });
}

const overlaps = (a: Span, b: Span) => a.start < b.end && b.start < a.end;

export function scoreExtraction(notice: string, keys: KeyItem[], items: ToolItem[]): ExtractionScore {
  const spans = keys.map((k) => keySpans(notice, k));
  const links = new Map<string, number[]>(keys.map((k) => [k.id, []]));
  const toolOnly: ToolItem[] = [];
  let matchedItems = 0;
  let repeatItems = 0;
  let levelAgree = 0;
  let levelCompared = 0;
  items.forEach((item, i) => {
    const hit = item.span ? keys.filter((_, k) => spans[k].some((s) => overlaps(s, item.span!))) : [];
    if (hit.length === 0) {
      toolOnly.push(item);
      return;
    }
    matchedItems++;
    if (hit.every((k) => links.get(k.id)!.length > 0)) repeatItems++;
    for (const k of hit) links.get(k.id)!.push(i);
    if (item.level) {
      levelCompared++;
      if (hit.some((k) => k.level === item.level)) levelAgree++;
    }
  });
  const found = keys.filter((k) => links.get(k.id)!.length > 0);
  const required = keys.filter((k) => k.level === "required");
  return {
    items: items.length,
    matchedItems,
    unlocatedItems: items.filter((i) => !i.span).length,
    repeatItems,
    keys: keys.length,
    keysFound: found.length,
    requiredKeys: required.length,
    requiredFound: required.filter((k) => links.get(k.id)!.length > 0).length,
    levelAgree,
    levelCompared,
    toolOnly,
    keysMissed: keys.filter((k) => links.get(k.id)!.length === 0),
    links,
  };
}

// The no-AI baseline: every sentence that contains a marker word is one "requirement".
const MARKERS =
  /\b(must|required|requires?|shall|should|need(?:s)? to|not permitted|prohibited|do not|don't|never|may not|cannot|will not be considered|disqualif\w+|encouraged|please|deadline|eligible)\b/i;

export function markerBaseline(notice: string): ToolItem[] {
  const items: ToolItem[] = [];
  const re = /[^\n.!?]+[.!?]*/g;
  for (let m = re.exec(notice); m; m = re.exec(notice)) {
    const text = m[0].trim();
    if (text.length < 8 || !MARKERS.test(text)) continue;
    const start = m.index + m[0].indexOf(text);
    items.push({ label: text, span: { start, end: start + text.length } });
  }
  return items;
}

export const pct = (a: number, b: number) => (b === 0 ? "n/a" : `${((100 * a) / b).toFixed(1)}% (${a}/${b})`);
