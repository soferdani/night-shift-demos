// How far one account reaches into people.
//
// Night 2 built the rollup: six agents in the sample act as five accounts, and
// one mailbox carries two of them. The obvious next question in the room is
// "how many people is that?", and night 2's README said the question had to
// change shape before the register could answer, because `volume` is free text
// and adding two strings would be a number the register invented.
//
// That framing was wrong, and this module is the correction. Reading "כ-40,000"
// as 40,000 is reading, not inventing. The number that would be invented is the
// SUM: one account carrying the service bot (40,000 customers) and the
// collections reminders (1,200 customers) does not reach 41,200 people unless
// those are different people, and the register cannot know that. So it does not
// add them. It prints the floor and the ceiling, and puts the one question that
// would close the gap on the sheet.
//
// Floor   = the largest single figure. At least this many distinct people, true
//           even if every smaller audience sits inside the biggest one.
// Ceiling = the sum, and only when every contributing figure could be read.
//           One rate, one blank, one "מעל" and there is no ceiling — the
//           register says so instead of guessing one.

// Hebrew letters are not `\w`, so `\b` does not fence a Hebrew word. The
// lookarounds do.
const W = (body) => new RegExp(`(?:^|[^\\p{L}])(?:${body})(?![\\p{L}])`, 'iu');

const PERIODS = [
  [W('בשנה|לשנה|שנתי|שנתית|per\\s*year|\\/\\s*year|annually'), 'שנה'],
  [W('בחודש|לחודש|חודשי|חודשית|per\\s*month|\\/\\s*month|monthly'), 'חודש'],
  [W('בשבוע|לשבוע|שבועי|שבועית|per\\s*week|\\/\\s*week|weekly'), 'שבוע'],
  [W('ביום|ליום|יומי|יומית|per\\s*day|\\/\\s*day|daily'), 'יום'],
];

const MULTIPLIER = [
  [/^(אלפים|אלף|k)$/i, 1000],
  [/^(מיליון|מיליוני|m)$/i, 1000000],
];

const AT_MOST = /(עד|פחות מ|לכל היותר|up to|under|fewer than)/iu;
const AT_LEAST = /(מעל|יותר מ|למעלה מ|לפחות|מינימום|over|more than|at least|\+\s*$)/iu;
const RANGE = /\d\s*(?:[-–—]|עד|to)\s*(?:כ?[-־]?\s*)?\d/;
const NONE = /^(אין|אף אחד|0|לא נוגע|none)$/i;

/** Thousands separators are commas here; a period is a decimal point, so
 *  "1.2 מיליון" is 1,200,000. The one exception is the European grouping
 *  ("40.000"), which is read as 40,000 — a period followed by exactly three
 *  digits, repeated, is nobody's decimal. */
export function toNumber(raw) {
  const text = String(raw).replace(/[\s, ]/g, '');
  if (!/^\d/.test(text)) return null;
  const grouped = /^\d{1,3}(\.\d{3})+$/.test(text) ? text.replace(/\./g, '') : text;
  const value = Number.parseFloat(grouped);
  return Number.isFinite(value) ? value : null;
}

function figuresIn(text) {
  const out = [];
  const pattern = /(\d[\d., ]*)\s*([\p{L}]+)?/gu;
  for (const match of text.matchAll(pattern)) {
    const base = toNumber(match[1]);
    if (base === null) continue;
    const word = (match[2] || '').trim();
    const factor = MULTIPLIER.find(([re]) => re.test(word));
    out.push(Math.round(base * (factor ? factor[1] : 1)));
  }
  return out;
}

/**
 * One answer to "on how many people can it reach information", read.
 *
 * kind: `count` a headcount · `rate` a figure per period, which is not a
 * headcount and is never added · `unknown` something was written and no number
 * came out of it · `none` the answer is that it reaches nobody · `blank`.
 */
export function parseReach(raw) {
  const first = Array.isArray(raw) ? raw.find((x) => String(x).trim() !== '') : raw;
  const text = first == null ? '' : String(first).trim();
  if (!text) return { text: '', kind: 'blank', min: null, max: null, period: null };
  if (NONE.test(text)) return { text, kind: 'none', min: 0, max: 0, period: null };

  const period = (PERIODS.find(([re]) => re.test(text)) || [])[1] || null;
  const figures = figuresIn(text);
  if (!figures.length) return { text, kind: 'unknown', min: null, max: null, period };
  if (period) {
    return { text, kind: 'rate', min: null, max: null, period, per: Math.max(...figures) };
  }
  if (figures.length > 1 && RANGE.test(text)) {
    return { text, kind: 'count', min: Math.min(...figures), max: Math.max(...figures), period: null };
  }
  const value = Math.max(...figures);
  if (AT_LEAST.test(text)) return { text, kind: 'count', min: value, max: null, period: null };
  if (AT_MOST.test(text)) return { text, kind: 'count', min: 0, max: value, period: null };
  return { text, kind: 'count', min: value, max: value, period: null };
}

/** An agent that answered "לא" to personal data reaches nobody and is not part
 *  of the arithmetic. "לא ידוע" is: not knowing is not a way out. */
export function contributes(answers = {}) {
  return String(answers.personal_data || '').trim() !== 'לא';
}

/**
 * The reach of a set of agents that share something — one account, or the whole
 * register. Nothing here is a verdict; every number is read off the answers, and
 * where they do not support a number the field is null and the reason is named.
 */
export function reachOf(entries) {
  const live = entries.filter((e) => contributes(e.answers));
  const read = live.map((e) => ({ agent: e.name, reach: parseReach(e.answers.volume) }));
  const counts = read.filter((x) => x.reach.kind === 'count' && x.reach.min !== null);
  const rates = read.filter((x) => x.reach.kind === 'rate');
  const unreadable = read.filter((x) => x.reach.kind === 'unknown');
  const missing = read.filter((x) => x.reach.kind === 'blank');
  const positive = counts.filter((x) => (x.reach.max === null ? x.reach.min > 0 : x.reach.max > 0));

  const floor = positive.length ? Math.max(...positive.map((x) => x.reach.min)) : null;
  const bounded = positive.every((x) => x.reach.max !== null)
    && !rates.length && !unreadable.length && !missing.length;
  const ceiling = positive.length && bounded
    ? positive.reduce((sum, x) => sum + x.reach.max, 0)
    : null;

  return {
    agents: live.length,
    counted: positive.length,
    floor,
    ceiling,
    // One figure, read exactly: the floor is the ceiling and no second audience
    // sits behind it.
    exact: positive.length === 1 && ceiling !== null && floor === ceiling,
    // Two audiences on one thing, and the register cannot tell whether they are
    // the same people. This is the question, not a flaw in the arithmetic.
    overlapUnknown: positive.length > 1,
    rates: rates.map((x) => ({ agent: x.agent, text: x.reach.text, period: x.reach.period })),
    unreadable: unreadable.map((x) => ({ agent: x.agent, text: x.reach.text })),
    missing: missing.map((x) => x.agent),
    figures: positive.map((x) => ({ agent: x.agent, text: x.reach.text })),
  };
}

export function groupDigits(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** The reach as a short Hebrew phrase, for a table cell. */
export function reachPhrase(reach) {
  if (!reach || !reach.agents) return null;
  if (reach.floor === null) {
    if (reach.rates.length) return `${reach.rates[0].text} — מספר לתקופה, לא מספר אנשים`;
    return null;
  }
  if (reach.ceiling === null) return `${groupDigits(reach.floor)} ומעלה`;
  if (reach.floor === reach.ceiling) return groupDigits(reach.floor);
  return `${groupDigits(reach.floor)}–${groupDigits(reach.ceiling)}`;
}

/** Why there is no upper number, in the register's own words. Returns the
 *  reasons, never an estimate to paper over them. */
export function ceilingGaps(reach) {
  const out = [];
  if (reach.rates.length) {
    out.push(`${reach.rates.length === 1 ? 'מספר אחד נרשם' : `${reach.rates.length} מספרים נרשמו`} לפי תקופה`);
  }
  if (reach.unreadable.length) {
    out.push(`${reach.unreadable.length === 1 ? 'בתשובה אחת' : `ב-${reach.unreadable.length} תשובות`} לא נמצא מספר`);
  }
  if (reach.missing.length) {
    out.push(`${reach.missing.length === 1 ? 'סוכן אחד' : `${reach.missing.length} סוכנים`} בלי מספר רשום`);
  }
  return out.filter(Boolean);
}
