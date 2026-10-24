'use strict';

// A browser port of the franchise and price lanes from soferdani/sold-signal
// (src/franchise.js, src/price.js, src/purpose.js, src/normalize.js). The repo
// holds the tested implementation — 133 tests — and this file exists so the page
// computes its numbers from the baked-in CSVs instead of printing numbers typed
// by hand. If a figure on the page disagrees with `npm run price`, the repo wins.

/* global DATASETS */

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; continue; }
        quoted = false; continue;
      }
      field += c; continue;
    }
    if (c === '"') { quoted = true; continue; }
    if (c === ',') { row.push(field); field = ''; continue; }
    if (c === '\r') continue;
    if (c === '\n') {
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
      continue;
    }
    field += c;
  }
  row.push(field);
  if (row.length > 1 || row[0] !== '') rows.push(row);
  return rows;
}

function readTable(text) {
  const rows = parseCsv(text);
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const o = {};
    header.forEach((h, i) => { o[h] = (r[i] ?? '').trim(); });
    return o;
  });
}

const coarse = (s) => String(s ?? '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toUpperCase()
  .replace(/[.,'`"()‘’“”′″´]/g, '')
  .replace(/[/\-_–—]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

// --- leg B: the business-age vocabulary ------------------------------------

const norm = (v) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const VOCAB = [
  {
    cls: 'change-of-ownership',
    acquisition: true,
    patterns: [/change of ownership/, /changeofownership/, /business acquisition/,
      /acquisition of (a |an )?(an? )?(existing )?business/,
      /purchase of (an? )?existing business/, /buy(ing)? (an? )?existing business/],
  },
  { cls: 'startup', patterns: [/start ?up/, /will open business/] },
  { cls: 'new', patterns: [/new business/, /2 years or less/, /two years or less/, /under 2 years/] },
  { cls: 'existing', patterns: [/existing/, /more than 2 years/, /over 2 years/, /2 years or more/] },
  { cls: 'unanswered', patterns: [/unanswered/, /^unknown$/, /^not available$/, /^n a$/, /^na$/, /^none$/] },
];

function classifyBusinessAge(value) {
  const n = norm(value);
  if (!n) return { cls: 'blank', acquisition: false, raw: '' };
  for (const fam of VOCAB) {
    if (fam.patterns.some((p) => p.test(n))) {
      return { cls: fam.cls, acquisition: Boolean(fam.acquisition), raw: String(value) };
    }
  }
  return { cls: 'unrecognised', acquisition: false, raw: String(value) };
}

// --- the brand guard -------------------------------------------------------

const INDUSTRY_WORDS = new Set(['FITNESS', 'DENTAL', 'PLUMBING', 'ROOFING', 'LAUNDRY',
  'PRINTING', 'TRUCKING', 'MACHINING', 'CHILDCARE', 'VETERINARY', 'LANDSCAPING',
  'RETAIL', 'STORAGE', 'PEST', 'CONTROL', 'AUTO', 'BODY', 'SERVICES', 'SERVICE',
  'REPAIR', 'CLEANING', 'HVAC', 'COFFEE', 'PIZZA', 'FOOD', 'GYM', 'SALON',
  'CLINIC', 'CENTER', 'CENTRE', 'SHOP', 'STORE']);

function isUsableBrand(raw) {
  const tokens = coarse(raw).split(' ').filter(Boolean);
  if (!tokens.length) return false;
  if (tokens.length === 1) return tokens[0].length >= 5 && !INDUSTRY_WORDS.has(tokens[0]);
  return tokens.some((t) => !INDUSTRY_WORDS.has(t));
}

function brandVocabulary(sba) {
  const brands = new Map();
  const rejected = [];
  let carried = 0;
  for (const r of sba) {
    const raw = (r.FranchiseName || '').trim();
    if (!raw) continue;
    carried += 1;
    if (!isUsableBrand(raw)) { rejected.push(raw); continue; }
    const key = coarse(raw);
    if (!brands.has(key)) brands.set(key, { key, raw, rows: [], cities: new Map() });
    const e = brands.get(key);
    e.rows.push(r);
    const city = coarse(r.BorrCity);
    e.cities.set(city, (e.cities.get(city) || 0) + 1);
  }
  return { brands, carried, total: sba.length, rejected };
}

function findBrand(texts, vocab) {
  const hay = ` ${texts.filter(Boolean).map(coarse).join(' | ')} `;
  let best = null;
  for (const e of vocab.brands.values()) {
    const re = new RegExp(`(^|[\\s|])${e.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([\\s|]|$)`);
    if (!re.test(hay)) continue;
    if (!best || e.key.length > best.key.length) best = e;
  }
  return best;
}

function brandCeiling(vocab) {
  const perBrand = [];
  let pairs = 0;
  let unique = 0;
  let rows = 0;
  let reachable = 0;
  for (const e of vocab.brands.values()) {
    let maxInCity = 0;
    for (const n of e.cities.values()) {
      pairs += 1;
      if (n === 1) { unique += 1; reachable += 1; }
      if (n > maxInCity) maxInCity = n;
    }
    rows += e.rows.length;
    perBrand.push({
      brand: e.raw, units: e.rows.length, cities: e.cities.size, maxUnitsInOneCity: maxInCity,
    });
  }
  perBrand.sort((a, b) => b.units - a.units || a.brand.localeCompare(b.brand));
  return {
    perBrand,
    pairs,
    unique,
    uniqueShare: pairs ? unique / pairs : 0,
    franchiseRows: rows,
    reachable,
    rowShare: rows ? reachable / rows : 0,
  };
}

function franchiseLane(sba, listings) {
  const vocab = brandVocabulary(sba);
  const ceiling = brandCeiling(vocab);
  const removed = listings.filter((l) => (l.RemovedDate || '').trim());
  const rows = [];

  for (const l of removed) {
    const named = Boolean((l.BusinessName || '').trim());
    const brand = findBrand([l.Headline, l.BusinessName, l.Industry], vocab);

    if (!brand) {
      rows.push({
        listing: l.ListingId,
        headline: l.Headline,
        brand: null,
        outcome: named ? 'name-already' : 'no-brand',
      });
      continue;
    }

    const city = coarse(l.City);
    const state = (l.State || '').toUpperCase();
    const inCity = brand.rows.filter((r) => coarse(r.BorrCity) === city);
    const inState = brand.rows.filter((r) => (r.BorrState || '').toUpperCase() === state);

    let outcome;
    let matched = null;
    let candidates = [];
    if (inCity.length === 1) { outcome = 'unique-city'; [matched] = inCity; } else if (inCity.length > 1) { outcome = 'ambiguous-city'; candidates = inCity; } else if (inState.length === 1) { outcome = 'unique-state'; [matched] = inState; } else if (inState.length > 1) { outcome = 'ambiguous-state'; candidates = inState; } else { outcome = 'brand-elsewhere-only'; candidates = brand.rows; }

    const row = {
      listing: l.ListingId,
      headline: l.Headline,
      brand: brand.raw,
      outcome,
      unitsInCity: inCity.length,
      unitsInState: inState.length,
      candidates,
    };
    if (matched) {
      row.matched = matched;
      row.legB = classifyBusinessAge(matched.BusinessAge);
    }
    rows.push(row);
  }

  const counts = {};
  for (const r of rows) counts[r.outcome] = (counts[r.outcome] || 0) + 1;
  const resolvedRows = rows.filter((r) => r.matched);
  const answered = resolvedRows.filter((r) => r.legB.cls !== 'blank' && r.legB.cls !== 'unanswered');

  return {
    vocab: {
      brands: [...vocab.brands.values()].map((b) => b.raw).sort(),
      carried: vocab.carried,
      total: vocab.total,
      rejected: [...new Set(vocab.rejected)],
    },
    ceiling,
    rows,
    counts,
    removedTotal: removed.length,
    brandBearing: rows.filter((r) => r.brand).length,
    resolved: resolvedRows.length,
    answered: answered.length,
    acquisitions: resolvedRows.filter((r) => r.legB.acquisition).length,
  };
}

// Leg B across the whole file, so the page can show the two rates night 2
// separated — answerability versus yield.
function legB(sba) {
  const rows = sba.map((r) => classifyBusinessAge(r.BusinessAge));
  const silent = rows.filter((r) => r.cls === 'blank' || r.cls === 'unanswered').length;
  const acq = rows.filter((r) => r.acquisition).length;
  return {
    total: rows.length,
    answerable: rows.length ? (rows.length - silent) / rows.length : 0,
    answeredCount: rows.length - silent,
    acquisitionCount: acq,
    acquisitionRate: rows.length ? acq / rows.length : 0,
  };
}

// --- the price lane (a port of src/price.js) --------------------------------
// The rules, verbatim from the repo: a 10% minimum equity injection against
// total project cost on a complete change of ownership, in force since
// 2025-06-01; a $5M per-loan maximum; a 10-year maturity cap unless commercial
// real estate is >=51% of the purchase price, which allows 25 years.

const PRICE_RULES = {
  minInjection: 0.10,
  effectiveFrom: '2025-06-01',
  cap: 5000000,
  termBusinessOnlyMax: 120,
  termRealEstate: 300,
};

const ASSUMPTIONS = { injectionLow: 0.10, injectionHigh: 0.30, otherUsesHigh: 0.15 };

function projectCostFloor(loan) {
  if (!loan || loan <= 0) return null;
  return loan / (1 - PRICE_RULES.minInjection);
}

function injectionRuleApplies(date) {
  const raw = String(date || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return { applies: false, reason: 'date-unreadable',
      note: 'No readable approval date, so the row cannot be placed either side of the rule change.' };
  }
  const applies = raw.slice(0, 10) >= PRICE_RULES.effectiveFrom;
  return {
    applies,
    reason: applies ? 'covered' : 'pre-rule-vintage',
    note: applies
      ? 'Approved on or after 1 June 2025, so the 10% minimum injection applies.'
      : 'Approved before 1 June 2025. Under the sourcing standard then in force a zero-down '
        + 'structure was permitted, so the loan may be the whole project and there is no floor.',
  };
}

function realEstateRead(term) {
  const t = Number(String(term == null ? '' : term).trim());
  if (!isFinite(t) || t <= 0) {
    return { cls: 'term-missing', note: 'No term on the row, so nothing bounds how much of the purchase was property.' };
  }
  if (t <= PRICE_RULES.termBusinessOnlyMax) {
    return { cls: 'business-only', note: t + ' months is inside the 10-year cap, which is the maximum '
      + 'unless real estate is ≥51% of the purchase price. So this price is the business.' };
  }
  if (t >= PRICE_RULES.termRealEstate) {
    return { cls: 'real-estate-majority', note: t + ' months is only available when commercial real estate '
      + 'is ≥51% of the purchase price. Most of this number is a building, so it is not a business sale price.' };
  }
  return { cls: 'blended', note: t + ' months is a blended maturity: real estate under 51% of the price, '
    + 'and assets in the purchase with a useful life past 10 years. Part business, part property.' };
}

function priceBand(loan, a) {
  const as = a || ASSUMPTIONS;
  if (!loan || loan <= 0) return null;
  const low = (loan / (1 - as.injectionLow)) * (1 - as.otherUsesHigh);
  const high = loan / (1 - as.injectionHigh);
  return { low, high, mid: Math.sqrt(low * high), widthRatio: high / low };
}

function priceRow(r) {
  const loan = Number(r.GrossApproval || 0);
  const vintage = injectionRuleApplies(r.ApprovalDate);
  const re = realEstateRead(r.TermInMonths);
  const atCap = loan > 0 && loan >= PRICE_RULES.cap * 0.98;

  const flags = [];
  if (!loan) flags.push('amount-missing');
  if (!vintage.applies) flags.push(vintage.reason);
  if (atCap) flags.push('at-cap');
  if (re.cls !== 'business-only') flags.push(re.cls);

  const priceable = Boolean(loan) && vintage.applies && !atCap && re.cls === 'business-only';
  return {
    name: r.BorrName, city: r.BorrCity, state: r.BorrState, date: r.ApprovalDate,
    lender: r.BankName, term: r.TermInMonths ? Number(r.TermInMonths) : null,
    label: r.BusinessAge, loan: loan,
    floor: loan && vintage.applies ? projectCostFloor(loan) : null,
    band: priceable ? priceBand(loan) : null,
    priceable: priceable,
    blockedBy: priceable ? null : (flags[0] || null),
    atCapNote: '$5,000,000 is at the per-loan maximum. A capped loan says the deal was at least '
      + 'this big and nothing about how much bigger, so the band is void, not wide.',
    vintageNote: vintage.note,
    reNote: re.note,
  };
}

// The falsification path. The repo joins with its tested matcher; this page
// uses plain name containment inside the same state, which is looser — it is
// here to find a row where an independent price exists, not to be the product's
// join. Both agree on every row in the baked-in files.
function bandCheck(sales, listings) {
  const named = listings.filter(function (l) {
    return (l.BusinessName || '').trim() && Number(l.AskingPrice || 0) > 0;
  });
  const checked = [];
  named.forEach(function (l) {
    const ln = coarse(l.BusinessName);
    const hit = sales.filter(function (s) {
      const sn = coarse(s.BorrName);
      return (s.BorrState || '').toUpperCase() === (l.State || '').toUpperCase()
        && (sn.indexOf(ln) === 0 || ln.indexOf(sn) === 0);
    });
    if (hit.length !== 1) return;
    const row = priceRow(hit[0]);
    const asking = Number(l.AskingPrice || 0);
    checked.push({
      name: row.name, listing: l.ListingId, headline: l.Headline,
      loan: row.loan, asking: asking, band: row.band, blockedBy: row.blockedBy,
      contains: row.band ? asking >= row.band.low && asking <= row.band.high : null,
      position: row.band ? (asking - row.band.low) / (row.band.high - row.band.low) : null,
      direction: !row.band ? null
        : asking > row.band.high ? 'above-band'
          : asking < row.band.low ? 'below-band' : 'inside',
    });
  });
  const testable = checked.filter(function (c) { return c.band; });
  return { checked: checked, testable: testable.length,
    contained: testable.filter(function (c) { return c.contains === true; }).length };
}

function priceLane(sba, listings) {
  const sales = sba.filter(function (r) { return classifyBusinessAge(r.BusinessAge).acquisition; });
  const rows = sales.map(priceRow);
  const priceable = rows.filter(function (r) { return r.priceable; });
  const blocked = rows.filter(function (r) { return !r.priceable; });
  const byBlocker = {};
  blocked.forEach(function (r) { byBlocker[r.blockedBy] = (byBlocker[r.blockedBy] || 0) + 1; });
  const withFloor = rows.filter(function (r) { return r.floor; });
  return {
    rules: PRICE_RULES,
    assumptions: ASSUMPTIONS,
    total: rows.length,
    priceableCount: priceable.length,
    blockedCount: blocked.length,
    byBlocker: byBlocker,
    floorCount: withFloor.length,
    floorTotal: withFloor.reduce(function (s, r) { return s + r.floor; }, 0),
    loanTotal: rows.reduce(function (s, r) { return s + r.loan; }, 0),
    bandWidthRatio: priceBand(1000000).widthRatio,
    rows: rows,
    priceable: priceable,
    blocked: blocked,
    check: bandCheck(sales, listings),
  };
}

function analyse(key) {
  const d = DATASETS[key];
  const sba = readTable(d.sba);
  const listings = readTable(d.listings);
  const ucc = readTable(d.ucc);
  return {
    sba,
    listings,
    ucc,
    lane: franchiseLane(sba, listings),
    legB: legB(sba),
    price: priceLane(sba, listings),
  };
}

window.SoldSignal = {
  analyse, classifyBusinessAge, isUsableBrand, coarse,
  priceLane, priceRow, priceBand, projectCostFloor, realEstateRead, injectionRuleApplies,
};
