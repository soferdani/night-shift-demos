'use strict';

// A browser port of the franchise lane from soferdani/sold-signal (src/
// franchise.js, src/purpose.js, src/normalize.js). The repo holds the tested
// implementation — 98 tests — and this file exists so the page computes its
// numbers from the baked-in CSVs instead of printing numbers typed by hand.
// If a figure on the page disagrees with `npm run franchise`, the repo wins.

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

function analyse(key) {
  const d = DATASETS[key];
  const sba = readTable(d.sba);
  const listings = readTable(d.listings);
  const ucc = readTable(d.ucc);
  return {
    sba, listings, ucc, lane: franchiseLane(sba, listings), legB: legB(sba),
  };
}

window.SoldSignal = { analyse, classifyBusinessAge, isUsableBrand, coarse };
