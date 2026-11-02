import { AGENT_QUESTIONS, ORG_QUESTIONS, SECTIONS, applies, optionLabel } from './questions.js';
import { LAW, LAW_STATUS_HE, LAW_STATUS_EN, ASI } from './refs.js';
import { readRegister, stats, isEmpty, asList } from './register.js';
import { readIdentities, identityStats, sheetLines, sheetCounts } from './identities.js';
import { readSystems, systemStats } from './systems.js';
import { reachOf, ceilingGaps, groupDigits } from './reach.js';
import { DIR, t } from './i18n.js';

const RLM = '‏'; // Chromium prints a list of Latin names inside a Hebrew
// sentence in reverse order. Fencing every separator with a right-to-left mark
// is the fix; the Amendment 13 inventory shipped two nights with the bug.

export const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * A list of names inside a Hebrew sentence.
 *
 * Nights 1–4 fenced every separator with a right-to-left mark, and that did
 * keep the names in the order they were written. Night 5 measured both
 * mechanisms in the browser that prints the sheet, character by character, and
 * found two things. The order is identical under either one — so the mark was
 * never the thing holding the list together on its own. And the mark does
 * nothing at all for a name whose own last character is neutral: `support@`
 * laid out as `@support` in the Hebrew register, which is an account name
 * printed backwards, shipped since night 2 and never caught, because the check
 * had always been "is the list in the right order".
 *
 * `<bdi>` fixes that and keeps the order, which is why night 4's open item is
 * closed here rather than deferred again. The measurement is in the README.
 */
export function joinHe(items) {
  return items.map((x) => `<bdi>${esc(x)}</bdi>`).join(' · ');
}

/**
 * The same list inside an English sentence, where the problem is mirrored —
 * Hebrew answers inside a left-to-right line. `<bdi>` is the general fix: it
 * isolates each item and lets the browser read its direction, so the separators
 * stay in the paragraph's own direction and no mark is needed.
 *
 * The Hebrew document keeps the mark instead of moving to `<bdi>` as well. Not
 * because the mark is better — it isn't — but because a night that changes how
 * the shipped Hebrew sheet prints has to re-verify the shipped Hebrew sheet,
 * and tonight is not that night.
 */
export function joinEn(items) {
  return items.map((x) => `<bdi>${esc(x)}</bdi>`).join(' · ');
}

const joinIn = (items, lang) => (lang === 'en' ? joinEn(items) : joinHe(items));

/** The room's own words, printed as they were given. In an English document
 *  they are isolated so a Hebrew answer does not drag the punctuation around
 *  it; they are never translated, in either document. */
const said = (text, lang) => (lang === 'en' ? `<bdi>${esc(text)}</bdi>` : esc(text));

/**
 * An identifier — an account name, a system name. Isolated in both documents,
 * because it is a name rather than a sentence: `<bdi>` resolves its direction
 * from its own first strong character, which is what you want for `svc-recon`
 * and is exactly what you do NOT want for a Hebrew sentence that happens to
 * open with a Latin word. That is why `said()` above is left alone in the
 * Hebrew document and only names are isolated here.
 */
const named = (text) => `<bdi>${esc(text)}</bdi>`;

const labelOf = (question, lang) => (lang === 'en' && question.en ? question.en : question.he);
const hintOf = (question, lang) =>
  (lang === 'en' ? (question.enHint || '') : (question.hint || ''));
const sectionLabel = (section, lang) => (lang === 'en' && section.en ? section.en : section.he);

function valueHtml(question, raw, lang) {
  const T = t(lang);
  if (isEmpty(raw)) return `<span class="open">${T.dash}</span>`;
  if (question.type === 'list') {
    const items = Array.isArray(raw) ? asList(raw) : [String(raw)];
    return joinIn(items, lang);
  }
  // A dropdown answer is a word the tool put in the list and the room pointed
  // at, so it translates. A typed answer is a sentence the room said, so it
  // does not. The schema decides, not a guess about the string.
  if (question.type === 'choice') return esc(optionLabel(question, raw, lang));
  return said(raw, lang);
}

function whyHtml(question, lang) {
  const status = lang === 'en' ? LAW_STATUS_EN : LAW_STATUS_HE;
  const laws = (question.law || []).map((k) => LAW[k]).filter(Boolean);
  const risks = (question.asi || []).filter((k) => ASI[k]);
  const bits = [];
  for (const law of laws) {
    // The Hebrew name is the citation in both documents; in the English one the
    // gloss follows it, because which English title is correct is unsettled.
    const name = lang === 'en' && law.en
      ? `<bdi>${esc(law.short)}</bdi> · ${esc(law.en)}`
      : esc(law.short);
    bits.push(`<span class="ref law ${law.status}">${name} · ${esc(status[law.status])}</span>`);
  }
  for (const key of risks) {
    bits.push(`<span class="ref risk">${esc(key)} ${esc(ASI[key])}</span>`);
  }
  return bits.join(' ');
}

const css = (lang) => `
:root{--ink:#14110d;--muted:#6a6358;--line:#d9d3c9;--open:#a8421f;--bg:#fff}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);direction:${DIR[lang]};
  font:13px/1.6 "Segoe UI","Noto Sans Hebrew",Arial,sans-serif}
.page{max-width:760px;margin:0 auto;padding:28px 26px 50px}
h1{font-size:1.45rem;margin:0 0 2px}
h2{font-size:1rem;margin:22px 0 8px;padding-bottom:4px;border-bottom:1px solid var(--line)}
.meta{color:var(--muted);font-size:.84rem;margin:0 0 14px}
.note{border:1px solid var(--line);border-inline-start:3px solid var(--ink);
  padding:9px 11px;margin:0 0 18px;font-size:.84rem;color:var(--muted)}
.note+.note{margin-top:-10px}
.agent{border:1px solid var(--line);border-radius:7px;padding:12px 14px;margin:0 0 12px}
.agent h3,.agent .who,.sect{break-after:avoid;page-break-after:avoid}
.agent table{break-inside:avoid;page-break-inside:avoid}
.agent h3{margin:0 0 2px;font-size:1rem}
.agent .who{color:var(--muted);font-size:.82rem;margin:0 0 9px}
table{width:100%;border-collapse:collapse}
tr{border-bottom:1px dotted var(--line)}
tr:last-child{border-bottom:0}
th,td{text-align:start;vertical-align:top;padding:5px 0;font-size:.86rem}
th{width:42%;font-weight:600;color:var(--muted);padding-inline-end:14px}
.open{color:var(--open);font-weight:600}
.sect{color:var(--muted);font-size:.74rem;letter-spacing:.02em;margin:10px 0 2px}
ol{padding-inline-start:20px;margin:0}
li{margin:0 0 10px;break-inside:avoid}
li .names{color:var(--muted);font-size:.82rem}
li .hint{color:var(--muted);font-size:.8rem}
.ref{display:inline-block;font-size:.7rem;border:1px solid var(--line);border-radius:99px;
  padding:1px 7px;margin:3px 0 0;margin-inline-end:4px;color:var(--muted)}
.ref.law.binding{border-color:#8d8375;color:#4a4238}
.ref.law.draft,.ref.law.opinion{border-style:dashed}
/* Night 5, found by printing the document at 390px rather than on the page:
   night 4's column spacing pushed the account table to 415px, so the whole
   printed register scrolled sideways on a phone — and the review path for this
   product IS a phone. The table scrolls inside its own box instead of dragging
   the page with it; on paper it is laid out by @page and must not be clipped,
   so the overflow is lifted in print. A4 pagination is unchanged by this. */
.ids{margin:0 0 14px;overflow-x:auto}
.ids table{border-collapse:collapse}
.ids tr{border-bottom:1px solid var(--line);break-inside:avoid;page-break-inside:avoid}
.ids tr:first-child{break-after:avoid;page-break-after:avoid}
.ids th.h{width:auto;font-size:.74rem;color:var(--muted);padding:0 0 4px;text-align:start}
/* The account table is six columns of text with no rule between them, so the
   gap is the only thing separating one from the next. Hebrew answers are short
   enough that nobody noticed; "A shared account" sitting against "Zendesk" in
   the English one made it obvious. */
.ids td,.ids th.h{padding-inline-end:12px}
.ids td:last-child,.ids th.h:last-child{padding-inline-end:0}
.ids td{padding-block:6px;font-size:.84rem}
.ids td.who{color:var(--muted)}
.ids .n{font-weight:600}
.ids .carry{color:var(--open);font-weight:600}
.ids .reach{display:block;margin-top:2px;font-size:.78rem;color:var(--muted)}
.ids .reach b{color:var(--ink);font-weight:600}
.counts{font-size:.84rem;color:var(--muted);margin:0 0 16px}
.counts b{color:var(--ink)}
@media print{
  body{font-size:11.5px}
  .page{max-width:none;padding:0}
  .ids{overflow:visible}
  @page{size:A4;margin:14mm 12mm}
}
`;

function shell(title, body, lang) {
  return `<!doctype html>
<html lang="${lang}" dir="${DIR[lang]}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><style>${css(lang)}</style></head>
<body><div class="page">${body}</div></body></html>`;
}

export const DISCLAIMER = t('he').disclaimer;

/**
 * Is there anything on this page the English document cannot translate? True as
 * soon as one answer was given in Hebrew. A register filled in English has
 * nothing to explain, so the notice is not printed.
 */
export function hasUntranslatedAnswers(doc) {
  const hebrew = /[֐-׿]/;
  const values = [];
  for (const agent of doc.agents || []) {
    values.push(agent.name || '');
    for (const [id, raw] of Object.entries(agent.answers || {})) {
      const question = [...AGENT_QUESTIONS, ...ORG_QUESTIONS].find((x) => x.id === id);
      // A dropdown answer is translated, so it is not what the notice is about.
      if (question && question.type === 'choice') continue;
      values.push(...(Array.isArray(raw) ? raw : [raw]).map((x) => String(x ?? '')));
    }
  }
  return values.some((x) => hebrew.test(x));
}

function notices(doc, lang) {
  const T = t(lang);
  const out = [`<div class="note">${esc(T.disclaimer)}</div>`];
  if (lang === 'en') {
    if (hasUntranslatedAnswers(doc)) out.push(`<div class="note">${esc(T.bilingual)}</div>`);
    out.push(`<div class="note">${esc(T.lawNote)}</div>`);
  }
  return out.join('\n');
}

/** Document 1 — the register. What the organisation keeps. */
export function renderRegister(doc, lang = 'he') {
  const T = t(lang);
  const reg = readRegister(doc);
  const s = stats(doc);
  const head = `<h1>${esc(T.registerTitle)}</h1>
<p class="meta">${said(reg.org.name || T.orgFallback, lang)} · ${said(reg.org.date || '', lang)}</p>
${notices(doc, lang)}
<p class="counts">${T.counts({
    agents: s.agents, answered: s.answered, asked: s.asked,
    believed: s.believed ? esc(s.believed) : null,
  })}</p>`;

  const orgBlock = ORG_QUESTIONS.map((question) => {
    const raw = reg.org.answers[question.id];
    return `<tr><th>${esc(labelOf(question, lang))}</th><td>${valueHtml(question, raw, lang)}</td></tr>`;
  }).join('');

  const agents = reg.agents.map((agent) => {
    const rows = SECTIONS.map((section) => {
      const asked = AGENT_QUESTIONS.filter(
        (x) => x.section === section.id && applies(x, agent.answers),
      );
      if (!asked.length) return '';
      const body = asked.map((question) =>
        `<tr><th>${esc(labelOf(question, lang))}</th><td>${valueHtml(question, agent.answers[question.id], lang)}</td></tr>`,
      ).join('');
      return `<p class="sect">${esc(sectionLabel(section, lang))}</p><table>${body}</table>`;
    }).join('');
    const openCount = agent.open.length;
    return `<div class="agent"><h3>${said(agent.name, lang)}</h3>
<p class="who">${agent.owner ? T.ownerIs(said(agent.owner, lang)) : `<span class="open">${esc(T.noOwner)}</span>`}${
      openCount ? ` · ${esc(T.openCount(openCount))}` : ` · ${esc(T.allAnswered)}`
    }</p>${rows}</div>`;
  }).join('');

  return shell(T.registerTitle, `${head}
<h2>${esc(T.orgHeading)}</h2><table>${orgBlock}</table>
${identityBlock(doc, lang)}
${systemBlock(doc, lang)}
<h2>${esc(T.agentsHeading)}</h2>${agents || `<p class="open">${esc(T.noAgents)}</p>`}`, lang);
}

/**
 * The rollup: the same register read by account instead of by agent. A CISO
 * counts agents; the access log counts accounts, and the two numbers are
 * rarely the same.
 */
export function identityLine(doc, lang = 'he') {
  const T = t(lang);
  const s = identityStats(doc);
  const agents = (doc.agents || []).length;
  if (!agents) return '';
  const bits = [T.agentsActAs({ agents, identities: s.identities })];
  if (s.widest > 1) {
    bits.push(T.widest({ n: s.widest, name: s.widestName ? named(s.widestName) : null }));
  }
  if (s.onHumanCredentials) bits.push(T.onHumanCredentials(s.onHumanCredentials));
  if (s.unnamed) bits.push(T.unnamed(s.unnamed));
  return bits.join(lang === 'en' ? ' · ' : `${RLM} · ${RLM}`);
}

/** The reach of one account, as the cell under its personal-data column. A
 *  range is printed as a range and never collapsed to its middle. */
function reachCell(reach, lang) {
  const T = t(lang);
  if (!reach || !reach.agents) return '';
  const wrap = (body) => `<span class="reach">${body}</span>`;
  if (reach.floor === null) {
    if (reach.rates.length) return wrap(T.reachRate(said(reach.rates[0].text, lang)));
    return '';
  }
  if (reach.ceiling === null) return wrap(T.reachFloorOnly(groupDigits(reach.floor)));
  if (reach.floor === reach.ceiling) return wrap(T.reachExact(groupDigits(reach.floor)));
  return wrap(T.reachRange({
    floor: groupDigits(reach.floor),
    ceiling: groupDigits(reach.ceiling),
    overlap: reach.overlapUnknown,
  }));
}

/**
 * How far the register reaches into people, all accounts together. The floor is
 * read off the answers; the ceiling exists only when every figure could be read
 * and added, and when it cannot the sentence names what is missing instead of
 * estimating around it.
 */
export function reachLine(doc, lang = 'he') {
  const T = t(lang);
  const sep = lang === 'en' ? ' · ' : `${RLM} · ${RLM}`;
  const reach = reachOf((doc.agents || []).map((a) => ({ name: a.name, answers: a.answers || {} })));
  const gapWords = () => ceilingGaps(reach, lang);
  if (reach.floor === null) {
    if (!reach.rates.length && !reach.unreadable.length && !reach.missing.length) return '';
    return `${T.reachNone}${sep}${gapWords().join(sep)}`;
  }
  const head = reach.ceiling === null
    ? T.reachHeadFloor(groupDigits(reach.floor))
    : (reach.floor === reach.ceiling
      // A range whose ends are equal is not a range. The per-account cell has
      // said this since night 3; the register-wide line had not, because until
      // tonight no sample reached it with one agent.
      ? T.reachHeadExact(groupDigits(reach.floor))
      : T.reachHeadRange({ floor: groupDigits(reach.floor), ceiling: groupDigits(reach.ceiling) }));
  const tail = [];
  if (reach.overlapUnknown) tail.push(T.reachOverlapNote);
  const gaps = gapWords();
  if (reach.ceiling === null && gaps.length) tail.push(T.reachNoCeiling(gaps.join(', ')));
  return [head, ...tail].join(sep);
}

export function identityBlock(doc, lang = 'he') {
  const T = t(lang);
  const ids = readIdentities(doc);
  if (!ids.length) return '';
  const rows = ids.map((id) => {
    const name = id.named
      ? `<span class="n">${named(id.name)}</span>`
      : `<span class="open">${esc(T.noAccount)}</span>`;
    const carry = id.agents.length > 1
      ? `<span class="carry">${id.agents.length}</span> · ${joinIn(id.agents, lang)}`
      : joinIn(id.agents, lang);
    const kindWords = id.kinds.map((k) => optionLabel(byQuestion('identity_used'), k, lang));
    const kinds = kindWords.length ? joinIn(kindWords, lang) : `<span class="open">${T.dash}</span>`;
    const write = id.writeTools.length ? joinIn(id.writeTools, lang) : `<span class="open">${T.dash}</span>`;
    const subjects = id.subjects.length ? joinIn(id.subjects, lang) : '';
    const data = id.touchesPersonalData
      ? `${esc(T.yes)}${subjects ? `${lang === 'en' ? ' · ' : `${RLM} · ${RLM}`}${subjects}` : ''}`
      : (id.personalData.length
        ? joinIn(id.personalData.map((v) => optionLabel(byQuestion('personal_data'), v, lang)), lang)
        : `<span class="open">${T.dash}</span>`);
    const reach = reachCell(id.reach, lang);
    const who = id.owners.length ? joinIn(id.owners, lang) : `<span class="open">${esc(T.noOwner)}</span>`;
    return `<tr><td>${name}</td><td>${carry}</td><td>${kinds}</td><td>${write}</td>`
      + `<td>${data}${reach}</td><td class="who">${who}</td></tr>`;
  }).join('');
  const reach = reachLine(doc, lang);
  const heads = T.cols.map((label) => `<th class="h">${esc(label)}</th>`).join('');
  return `<h2>${esc(T.accountsHeading)}</h2>
<p class="counts">${identityLine(doc, lang)}</p>${reach ? `\n<p class="counts">${reach}</p>` : ''}
<div class="ids"><table><tr>
${heads}
</tr>${rows}</table></div>`;
}

/**
 * The register read a third way: by system.
 *
 * The account rollup needs two agents to say anything. This one does not — one
 * assistant on twelve tools is twelve rows, which is the only reading of a
 * single-agent register that is not a group of one. And where there ARE several
 * agents, a system is the one place two of them meet without sharing a login:
 * in the sample, the bookkeeping system is read by a reviewed service account
 * and written to by the shared mailbox.
 */
export function systemLine(doc, lang = 'he') {
  const T = t(lang);
  const s = systemStats(doc);
  if (!s.systems) return '';
  const bits = [T.systemsLine({ systems: s.systems, written: s.written })];
  if (s.widest > 1) {
    bits.push(T.systemWidest({ n: s.widest, name: s.widestName ? named(s.widestName) : null }));
  } else if ((doc.agents || []).length > 1) {
    // Said out loud rather than left as an absence: a register in which no two
    // agents meet anywhere has nothing in it to cross-check.
    bits.push(esc(T.systemsNoMeeting));
  }
  if (s.crossAccount) bits.push(T.systemCrossAccount(s.crossAccount));
  return bits.join(lang === 'en' ? ' · ' : `${RLM} · ${RLM}`);
}

export function systemBlock(doc, lang = 'he') {
  const T = t(lang);
  const systems = readSystems(doc);
  if (!systems.length) return '';
  const rows = systems.map((system) => {
    const name = `<span class="n">${named(system.name)}</span>`;
    const agents = system.agents.length > 1
      ? `<span class="carry">${system.agents.length}</span> · ${joinIn([...new Set(system.agents)], lang)}`
      : joinIn(system.agents, lang);
    const write = system.written
      ? `${esc(T.writes)}${system.writtenBy.length < system.agents.length
        ? ` · ${joinIn([...new Set(system.writtenBy)], lang)}` : ''}`
      : `<span class="who">${esc(T.readOnly)}</span>`;
    const accounts = system.accounts.length
      ? joinIn(system.accounts, lang)
      : `<span class="open">${esc(T.noAccount)}</span>`;
    const subjects = [...new Set(system.declared.flatMap((d) => d.subjects))];
    const who = subjects.length
      ? joinIn(subjects, lang)
      : `<span class="open">${T.dash}</span>`;
    return `<tr><td>${name}</td><td>${agents}</td><td>${write}</td>`
      + `<td>${accounts}</td><td>${who}</td></tr>`;
  }).join('');
  const heads = T.systemCols.map((label) => `<th class="h">${esc(label)}</th>`).join('');
  return `<h2>${esc(T.systemsHeading)}</h2>
<p class="counts">${systemLine(doc, lang)}</p>
<div class="ids"><table><tr>
${heads}
</tr>${rows}</table></div>`;
}

/** Document 2 — the open questions. What nobody in the room could answer. */
export function renderQuestions(doc, lang = 'he') {
  const T = t(lang);
  const lines = sheetLines(doc);
  const reg = readRegister(doc);
  const counts = sheetCounts(doc);
  const head = `<h1>${esc(T.questionsTitle)}</h1>
<p class="meta">${said(reg.org.name || T.orgFallback, lang)} · ${said(reg.org.date || '', lang)}</p>
${notices(doc, lang)}
<p class="counts">${T.sheetCounts(counts)}</p>`;

  const bySection = SECTIONS.map((section) => {
    const mine = lines.filter((line) => line.section === section.id);
    if (!mine.length) return '';
    const items = mine.map((line) => {
      const text = lang === 'en' && line.en ? line.en : line.he;
      const hintText = lang === 'en' && line.hintEn !== undefined ? line.hintEn : (line.hint || '');
      const names = line.scope === 'org'
        ? `<span class="names">${esc(T.atOrgLevel)}</span>`
        : `<span class="names">${joinIn(line.agents, lang)}</span>`;
      const ask = line.ask.length
        ? `<span class="names"> · ${esc(T.askLabel)}: ${joinIn(line.ask, lang)}</span>`
        : '';
      const hint = hintText ? `<div class="hint">${said(hintText, lang)}</div>` : '';
      // A line the grouping raised has no entry in the question catalogue, so
      // it carries its own text and no references — it is not a question
      // somebody wrote, it is one the register noticed.
      if (line.scope === 'identity') {
        return `<li>${esc(text)}<div>${names}${ask}</div>${hint}</li>`;
      }
      const why = whyHtml({ law: byRef(line.id, 'law'), asi: byRef(line.id, 'asi') }, lang);
      return `<li>${esc(text)}<div>${names}${ask}</div>${hint}${why}</li>`;
    }).join('');
    return `<h2>${esc(sectionLabel(section, lang))}</h2><ol>${items}</ol>`;
  }).join('');

  return shell(T.questionsDocTitle, `${head}${
    lines.length ? bySection : `<p>${esc(T.noQuestions)}</p>`
  }`, lang);
}

function byQuestion(id) {
  return [...AGENT_QUESTIONS, ...ORG_QUESTIONS].find((x) => x.id === id);
}

function byRef(id, field) {
  const found = byQuestion(id);
  return found ? found[field] || [] : [];
}
