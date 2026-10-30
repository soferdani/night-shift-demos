// The register's rows are agents. Its rollup is identities — because the thing
// that makes an agent an agent is that it acts as somebody, and "somebody" is
// shared more often than anyone in the room expects.
//
// Night 1 asked what KIND of identity an agent uses (own service account, an
// employee's permissions, a shared account, not known). That is not enough to
// group by: two agents both marked "shared account" may be one credential or
// two, and the register could not tell. `identity_name` is the field that makes
// the rollup possible, and this module is what it is for.
import { readRegister, openQuestions, isEmpty, asList } from './register.js';

export const EMPLOYEE_CREDENTIAL = 'ההרשאות של עובד מסוים';

/** Two spellings of one login are one login. A capital letter and a trailing
 *  space are not a second credential. */
export function identityKey(name) {
  return String(name).trim().replace(/\s+/g, ' ').toLowerCase();
}

const listOf = (raw) => (Array.isArray(raw) ? asList(raw) : isEmpty(raw) ? [] : [String(raw).trim()]);

function addAll(target, items) {
  for (const item of items) if (!target.includes(item)) target.push(item);
}

/**
 * Every identity the register knows about, in the order it first appears.
 *
 * An agent whose account was never named gets an identity of its own. Merging
 * the unnamed ones would invent a shared credential out of a blank field, and
 * the blank field is the question, not the answer.
 */
export function readIdentities(doc) {
  const reg = readRegister(doc);
  const order = [];
  const seen = new Map();

  reg.agents.forEach((agent, index) => {
    const raw = agent.answers.identity_name;
    const named = !isEmpty(raw);
    const key = named ? `named:${identityKey(raw)}` : `unnamed:${index}`;
    if (!seen.has(key)) {
      seen.set(key, {
        key,
        name: named ? String(raw).trim() : null,
        named,
        agents: [], kinds: [], owners: [],
        tools: [], writeTools: [], subjects: [], special: [], volumes: [],
        personalData: [],
        open: 0,
      });
      order.push(key);
    }
    const id = seen.get(key);
    id.agents.push(agent.name);
    id.open += agent.open.length;
    addAll(id.kinds, listOf(agent.answers.identity_used));
    if (agent.owner) addAll(id.owners, [agent.owner]);
    addAll(id.tools, listOf(agent.answers.tools));
    addAll(id.writeTools, listOf(agent.answers.write_actions));
    addAll(id.subjects, listOf(agent.answers.data_subjects));
    addAll(id.special, listOf(agent.answers.special_categories));
    addAll(id.volumes, listOf(agent.answers.volume));
    addAll(id.personalData, listOf(agent.answers.personal_data));
  });

  return order.map((key) => {
    const id = seen.get(key);
    return {
      ...id,
      // Facts about the grouping, each one readable off the register itself.
      shared: id.agents.length > 1,
      humanCredential: id.kinds.includes(EMPLOYEE_CREDENTIAL),
      // One account, two descriptions. Not a verdict — a disagreement inside
      // the register, which is a question for the room.
      conflict: id.kinds.length > 1,
      touchesPersonalData: id.personalData.includes('כן'),
    };
  });
}

export function identityStats(doc) {
  const ids = readIdentities(doc);
  const widest = ids.reduce((best, id) => (!best || id.agents.length > best.agents.length ? id : best), null);
  return {
    identities: ids.length,
    named: ids.filter((id) => id.named).length,
    unnamed: ids.filter((id) => !id.named).length,
    shared: ids.filter((id) => id.shared).length,
    onHumanCredentials: ids.filter((id) => id.humanCredential).length,
    conflicts: ids.filter((id) => id.conflict).length,
    // The most-loaded credential in the register: how many agents answer to one
    // account. 1 means every agent has its own.
    widest: widest ? widest.agents.length : 0,
    widestName: widest && widest.agents.length > 1 ? widest.name : null,
  };
}

/**
 * Open questions the grouping itself raises — one account described two ways.
 * Shaped like the lines `openQuestions` produces, so the sheet can print them
 * next to the rest without knowing where they came from.
 */
export function identityQuestions(doc) {
  const ids = readIdentities(doc);
  const conflicts = ids
    .filter((id) => id.conflict)
    .map((id) => ({
      id: `identity_conflict:${id.key}`,
      he: 'אותו חשבון נרשם בשני תיאורים שונים — איזה מהם נכון',
      hint: `${id.name}: ${id.kinds.join(' / ')}`,
      section: 'identity',
      agents: id.agents,
      ask: id.owners,
      scope: 'identity',
    }));
  return [...conflicts, ...nearMissQuestions(ids)];
}

/** The head of an account name: what is left before the first space or dash.
 *  `support@ (שירות)` and `support@` share a head; `svc-recon` and `svc-cicd`
 *  do not, because the split is on a dash with spaces around it. */
export function nameHead(name) {
  return identityKey(name).split(/\s+[—–-]\s+|\s+/)[0];
}

/**
 * Two names that are probably one account — and the tool refuses to decide.
 * Merging them would invent a shared credential; leaving them apart hides one.
 * So it does neither and puts the question on the sheet, which is what the
 * whole tool does with everything it cannot know.
 */
export function nearMissQuestions(ids) {
  const named = ids.filter((id) => id.named);
  const out = [];
  for (let i = 0; i < named.length; i += 1) {
    for (let j = i + 1; j < named.length; j += 1) {
      const a = named[i];
      const b = named[j];
      if (a.key === b.key) continue;
      const head = nameHead(a.name);
      if (!head || head !== nameHead(b.name)) continue;
      out.push({
        id: `identity_nearmiss:${a.key}|${b.key}`,
        he: 'שני שמות חשבון שנרשמו קרובים זה לזה — האם זה אותו חשבון',
        hint: `${a.name} / ${b.name}`,
        section: 'identity',
        agents: [...a.agents, ...b.agents],
        ask: [...new Set([...a.owners, ...b.owners])],
        scope: 'identity',
      });
    }
  }
  return out;
}

/**
 * Every line that goes on the open-questions sheet: the question set's own,
 * plus the ones the identity grouping raises. Both printed numbers on that
 * sheet are counted off this one array, so the count and the rows can never
 * disagree.
 */
export function sheetLines(doc) {
  return [...openQuestions(doc), ...identityQuestions(doc)];
}

/** Lines on the sheet, and the cases behind them — one question open about
 *  four agents is one line and four cases. An organisation-level line is one
 *  case: the organisation. */
export function sheetCounts(doc) {
  const lines = sheetLines(doc);
  return {
    lines: lines.length,
    cases: lines.reduce((n, line) => n + Math.max(line.agents.length, 1), 0),
  };
}
