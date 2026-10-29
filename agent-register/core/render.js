import { AGENT_QUESTIONS, ORG_QUESTIONS, SECTIONS, applies } from './questions.js';
import { LAW, LAW_STATUS_HE, ASI } from './refs.js';
import { readRegister, openQuestions, stats, isEmpty, asList } from './register.js';

const RLM = '‏'; // Chromium prints a list of Latin names inside a Hebrew
// sentence in reverse order. Fencing every separator with a right-to-left mark
// is the fix; the Amendment 13 inventory shipped two nights with the bug.

export const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function joinHe(items) {
  return items.map((x) => esc(x)).join(`${RLM} · ${RLM}`);
}

function valueHtml(question, raw) {
  if (isEmpty(raw)) return '<span class="open">—</span>';
  if (question.type === 'list') {
    const items = Array.isArray(raw) ? asList(raw) : [String(raw)];
    return joinHe(items);
  }
  return esc(raw);
}

function whyHtml(question) {
  const laws = (question.law || []).map((k) => LAW[k]).filter(Boolean);
  const risks = (question.asi || []).filter((k) => ASI[k]);
  const bits = [];
  for (const law of laws) {
    bits.push(`<span class="ref law ${law.status}">${esc(law.short)} · ${esc(LAW_STATUS_HE[law.status])}</span>`);
  }
  for (const key of risks) {
    bits.push(`<span class="ref risk">${esc(key)} ${esc(ASI[key])}</span>`);
  }
  return bits.join(' ');
}

const CSS = `
:root{--ink:#14110d;--muted:#6a6358;--line:#d9d3c9;--open:#a8421f;--bg:#fff}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);direction:rtl;
  font:13px/1.6 "Segoe UI","Noto Sans Hebrew",Arial,sans-serif}
.page{max-width:760px;margin:0 auto;padding:28px 26px 50px}
h1{font-size:1.45rem;margin:0 0 2px}
h2{font-size:1rem;margin:22px 0 8px;padding-bottom:4px;border-bottom:1px solid var(--line)}
.meta{color:var(--muted);font-size:.84rem;margin:0 0 14px}
.note{border:1px solid var(--line);border-right:3px solid var(--ink);
  padding:9px 11px;margin:0 0 18px;font-size:.84rem;color:var(--muted)}
.agent{border:1px solid var(--line);border-radius:7px;padding:12px 14px;margin:0 0 12px}
.agent h3,.agent .who,.sect{break-after:avoid;page-break-after:avoid}
.agent table{break-inside:avoid;page-break-inside:avoid}
.agent h3{margin:0 0 2px;font-size:1rem}
.agent .who{color:var(--muted);font-size:.82rem;margin:0 0 9px}
table{width:100%;border-collapse:collapse}
tr{border-bottom:1px dotted var(--line)}
tr:last-child{border-bottom:0}
th,td{text-align:right;vertical-align:top;padding:5px 0;font-size:.86rem}
th{width:42%;font-weight:600;color:var(--muted);padding-left:14px}
.open{color:var(--open);font-weight:600}
.sect{color:var(--muted);font-size:.74rem;letter-spacing:.02em;margin:10px 0 2px}
ol{padding-right:20px;margin:0}
li{margin:0 0 10px;break-inside:avoid}
li .names{color:var(--muted);font-size:.82rem}
li .hint{color:var(--muted);font-size:.8rem}
.ref{display:inline-block;font-size:.7rem;border:1px solid var(--line);border-radius:99px;
  padding:1px 7px;margin:3px 0 0 4px;color:var(--muted)}
.ref.law.binding{border-color:#8d8375;color:#4a4238}
.ref.law.draft,.ref.law.opinion{border-style:dashed}
.counts{font-size:.84rem;color:var(--muted);margin:0 0 16px}
.counts b{color:var(--ink)}
@media print{
  body{font-size:11.5px}
  .page{max-width:none;padding:0}
  @page{size:A4;margin:14mm 12mm}
}
`;

function shell(title, body) {
  return `<!doctype html>
<html lang="he" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><style>${CSS}</style></head>
<body><div class="page">${body}</div></body></html>`;
}

export const DISCLAIMER =
  'הדף הזה רושם עובדות ושאלות פתוחות. הוא לא קובע אם משהו כאן חוקי, תקין או מאובטח — ' +
  'ההפניות לחוק הן מצביע לעורך הדין או לממונה, לא חוות דעת.';

/** Document 1 — the register. What the organisation keeps. */
export function renderRegister(doc) {
  const reg = readRegister(doc);
  const s = stats(doc);
  const head = `<h1>רישום סוכני AI</h1>
<p class="meta">${esc(reg.org.name || 'ארגון')} · ${esc(reg.org.date || '')}</p>
<div class="note">${esc(DISCLAIMER)}</div>
<p class="counts">בטבלה <b>${s.agents}</b> סוכנים · נענו <b>${s.answered}</b> מתוך <b>${s.asked}</b> שאלות${
    s.believed ? ` · הארגון העריך <b>${esc(s.believed)}</b> סוכנים` : ''
  }</p>`;

  const orgBlock = ORG_QUESTIONS.map((question) => {
    const raw = reg.org.answers[question.id];
    return `<tr><th>${esc(question.he)}</th><td>${valueHtml(question, raw)}</td></tr>`;
  }).join('');

  const agents = reg.agents.map((agent) => {
    const rows = SECTIONS.map((section) => {
      const asked = AGENT_QUESTIONS.filter(
        (x) => x.section === section.id && applies(x, agent.answers),
      );
      if (!asked.length) return '';
      const body = asked.map((question) =>
        `<tr><th>${esc(question.he)}</th><td>${valueHtml(question, agent.answers[question.id])}</td></tr>`,
      ).join('');
      return `<p class="sect">${esc(section.he)}</p><table>${body}</table>`;
    }).join('');
    const openCount = agent.open.length;
    return `<div class="agent"><h3>${esc(agent.name)}</h3>
<p class="who">${agent.owner ? `אחראי: ${esc(agent.owner)}` : '<span class="open">אין אדם אחראי רשום</span>'}${
      openCount ? ` · ${openCount} שאלות פתוחות` : ' · כל השאלות נענו'
    }</p>${rows}</div>`;
  }).join('');

  return shell('רישום סוכני AI', `${head}
<h2>הארגון</h2><table>${orgBlock}</table>
<h2>הסוכנים</h2>${agents || '<p class="open">לא נרשם אף סוכן.</p>'}`);
}

/** Document 2 — the open questions. What nobody in the room could answer. */
export function renderQuestions(doc) {
  const lines = openQuestions(doc);
  const reg = readRegister(doc);
  const s = stats(doc);
  const head = `<h1>שאלות פתוחות</h1>
<p class="meta">${esc(reg.org.name || 'ארגון')} · ${esc(reg.org.date || '')}</p>
<div class="note">${esc(DISCLAIMER)}</div>
<p class="counts"><b>${s.lines}</b> שאלות, על <b>${s.open}</b> מקרים — אותה שאלה על כמה סוכנים היא שורה אחת</p>`;

  const bySection = SECTIONS.map((section) => {
    const mine = lines.filter((line) => line.section === section.id);
    if (!mine.length) return '';
    const items = mine.map((line) => {
      const names = line.scope === 'org'
        ? '<span class="names">ברמת הארגון</span>'
        : `<span class="names">${joinHe(line.agents)}</span>`;
      const ask = line.ask.length ? `<span class="names"> · לשאול: ${joinHe(line.ask)}</span>` : '';
      const hint = line.hint ? `<div class="hint">${esc(line.hint)}</div>` : '';
      const why = whyHtml({ law: byRef(line.id, 'law'), asi: byRef(line.id, 'asi') });
      return `<li>${esc(line.he)}<div>${names}${ask}</div>${hint}${why}</li>`;
    }).join('');
    return `<h2>${esc(section.he)}</h2><ol>${items}</ol>`;
  }).join('');

  return shell('שאלות פתוחות — רישום סוכני AI', `${head}${
    lines.length ? bySection : '<p>אין שאלות פתוחות.</p>'
  }`);
}

function byRef(id, field) {
  const all = [...AGENT_QUESTIONS, ...ORG_QUESTIONS];
  const found = all.find((x) => x.id === id);
  return found ? found[field] || [] : [];
}
