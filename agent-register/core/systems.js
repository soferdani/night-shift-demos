// The third way to read the same register.
//
// Night 2 grouped the agents by the account they act as, and that rollup is
// what the access log sees. Night 5 found where it goes silent: it needs a
// second agent. Fill this register with ONE assistant — twelve tools, one
// employee's own login, writes to seven of them, no separate log — and every
// structural check the tool had built returned nothing. One account, nothing
// shared, no conflicting descriptions, no two audiences to disagree about, and
// because the room answered all twenty-three questions, an empty questions
// sheet. The shape the whole product was pitched on printed as the tidiest
// company in the catalogue.
//
// The reason is the unit. An account groups agents, so one agent is a group of
// one. What varies inside a single assistant is the *systems* it reaches, and
// `tools` and `write_actions` were two free-text lists nothing ever read back.
// Grouped by system, that one assistant is twelve rows — and in a register with
// several agents, a system is the one place where two agents who never share an
// account still meet.
//
// Same refusals as everywhere else in this tool: it does not decide that two
// spellings are one system, it does not decide that two populations are the
// same people, and it never grades what it finds. It groups what it can and
// puts the rest on the sheet as a question.
import { isEmpty, asList } from './register.js';
import { EMPLOYEE_CREDENTIAL } from './questions.js';
import { T } from './i18n.js';

/** The canonical form of a system name: case and whitespace only, exactly the
 *  normalisation `identityKey` does for an account. "Google  Sheets" and
 *  "google sheets" are one system; nothing else is merged here. */
export function systemKey(name) {
  return String(name).trim().replace(/\s+/g, ' ').toLowerCase();
}

/** A looser key, used ONLY to raise a question — never to merge. Separators and
 *  punctuation come out, so "WhatsApp-Business" collides with "WhatsApp
 *  Business". It deliberately does not know that "Sheets" and "Google Sheets"
 *  are the same thing: that is a judgement about a vendor's product names, and
 *  the room makes it, not the register. */
export function spellingKey(name) {
  return systemKey(name).replace(/[^\p{L}\p{N}]+/gu, '');
}

const listOf = (raw) => (Array.isArray(raw) ? asList(raw) : isEmpty(raw) ? [] : [String(raw).trim()]);
const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

/**
 * Every system named in the register, in the order it first appears.
 *
 * A system enters the list from either free-text list. Appearing only under
 * "where it can change something" is kept as its own fact: a write target that
 * is not on the list of systems the agent can reach means one of the two lists
 * is incomplete, and which one is a question for the room.
 */
export function readSystems(doc) {
  const order = [];
  const seen = new Map();

  for (const raw of doc.agents || []) {
    const agent = { name: raw.name || T.he.noName, answers: raw.answers || {} };
    const reaches = listOf(agent.answers.tools);
    const writes = listOf(agent.answers.write_actions);
    const account = isEmpty(agent.answers.identity_name)
      ? null
      : String(agent.answers.identity_name).trim();
    const subjects = listOf(agent.answers.data_subjects);
    const touches = String(agent.answers.personal_data || '').trim();

    const named = [];
    for (const name of [...reaches, ...writes]) {
      const key = systemKey(name);
      if (!key || named.includes(key)) continue;
      named.push(key);
      if (!seen.has(key)) {
        seen.set(key, {
          key,
          name: String(name).trim(),
          spellings: [],
          agents: [],
          writtenBy: [],
          accounts: [],
          unnamedAccountAgents: [],
          // Only here because somebody listed it as a write target.
          offReachList: [],
          declared: [],
          personalData: [],
        });
        order.push(key);
      }
      const system = seen.get(key);
      const spelling = String(name).trim();
      if (!system.spellings.includes(spelling)) system.spellings.push(spelling);
      system.agents.push(agent.name);
      if (writes.some((w) => systemKey(w) === key)) system.writtenBy.push(agent.name);
      if (!reaches.some((r) => systemKey(r) === key)) system.offReachList.push(agent.name);
      if (account) {
        if (!system.accounts.includes(account)) system.accounts.push(account);
      } else system.unnamedAccountAgents.push(agent.name);
      if (!system.personalData.includes(touches) && touches) system.personalData.push(touches);
      // The population each agent declared, kept per agent rather than merged.
      // The union is what a careless rollup would print, and the union is
      // precisely the number the register is not allowed to invent.
      if (subjects.length) system.declared.push({ agent: agent.name, subjects });
    }
  }

  return order.map((key) => {
    const system = seen.get(key);
    const first = system.declared[0];
    return {
      ...system,
      shared: system.agents.length > 1,
      written: system.writtenBy.length > 0,
      // Two named accounts write into the same system. Both may be entitled to;
      // the question is whether the system's own log tells them apart.
      writeAccounts: [...new Set((doc.agents || [])
        .filter((a) => system.writtenBy.includes(a.name || T.he.noName))
        .map((a) => (isEmpty((a.answers || {}).identity_name)
          ? null : String(a.answers.identity_name).trim())))],
      touchesPersonalData: system.personalData.includes('כן'),
      // The named accounts that write into this system AND are a person's own
      // login rather than the agent's. Where those two facts meet, the system's
      // log cannot tell the agent's action from the person's.
      humanCredentialWrites: [...new Set((doc.agents || [])
        .filter((a) => system.writtenBy.includes(a.name || T.he.noName)
          && String((a.answers || {}).identity_used || '').trim() === EMPLOYEE_CREDENTIAL
          && !isEmpty((a.answers || {}).identity_name))
        .map((a) => String(a.answers.identity_name).trim()))],
      // Two agents reached this system and wrote down different populations.
      // Computed, and only from what both of them said.
      populationsDiffer: system.declared.length > 1
        && system.declared.some((d) => !sameSet(d.subjects, first.subjects)),
    };
  });
}

export function systemStats(doc) {
  const systems = readSystems(doc);
  const widest = systems.reduce(
    (best, s) => (!best || s.agents.length > best.agents.length ? s : best), null,
  );
  return {
    systems: systems.length,
    written: systems.filter((s) => s.written).length,
    shared: systems.filter((s) => s.shared).length,
    // The most-reached system in the register. 1 means no two agents meet
    // anywhere, which is the single-assistant case as well as a tidy one.
    widest: widest ? widest.agents.length : 0,
    widestName: widest && widest.agents.length > 1 ? widest.name : null,
    crossAccount: systems.filter((s) => s.accounts.length > 1).length,
  };
}

/**
 * How many systems one agent's single answer covers.
 *
 * `volume` asks how many people the AGENT can reach, and an assistant on twelve
 * systems answers it once. The honest reading of that figure was the night's
 * one real design call: it would have been easy to downgrade it to a floor and
 * print "5,000 at least", and that is the register reinterpreting an answer it
 * was given — the same mistake as adding two audiences together, in the other
 * direction. The room may well have meant the total. So the number is printed
 * exactly as it was read, and the sheet asks which it is.
 */
export function spanOf(agent) {
  const answers = agent.answers || {};
  const systems = new Set();
  for (const name of [...listOf(answers.tools), ...listOf(answers.write_actions)]) {
    const key = systemKey(name);
    if (key) systems.add(key);
  }
  return systems.size;
}

/** Lines the system rollup raises. Shaped like every other sheet line, with
 *  `scope: 'identity'` — a question the register noticed rather than one
 *  somebody wrote into the catalogue. Evidence is quoted, so it is never
 *  translated. */
export function systemQuestions(doc) {
  const systems = readSystems(doc);
  const out = [];

  for (const system of systems) {
    if (!system.populationsDiffer) continue;
    const who = system.declared.map((d) => `${d.agent}: ${d.subjects.join(', ')}`).join(' / ');
    out.push({
      id: `system_populations:${system.key}`,
      he: T.he.qSystemPopulations, en: T.en.qSystemPopulations,
      hint: T.he.qSystemPopulationsHint(`${system.name} — ${who}`),
      hintEn: T.en.qSystemPopulationsHint(`${system.name} — ${who}`),
      section: 'data', agents: [...new Set(system.agents)],
      ask: [], scope: 'identity',
    });
  }

  for (const system of systems) {
    const accounts = system.writeAccounts.filter(Boolean);
    if (accounts.length < 2) continue;
    out.push({
      id: `system_write_accounts:${system.key}`,
      he: T.he.qSystemWriteAccounts, en: T.en.qSystemWriteAccounts,
      hint: `${system.name} — ${accounts.join(' / ')}`,
      section: 'control', agents: [...new Set(system.writtenBy)],
      ask: [], scope: 'identity',
    });
  }

  const offList = systems.filter((s) => s.offReachList.length);
  if (offList.length) {
    out.push({
      id: 'system_off_reach_list',
      he: T.he.qSystemOffList, en: T.en.qSystemOffList,
      hint: offList.map((s) => `${s.name} (${[...new Set(s.offReachList)].join(', ')})`).join(' · '),
      section: 'reach',
      agents: [...new Set(offList.flatMap((s) => s.offReachList))],
      ask: [], scope: 'identity',
    });
  }

  // An agent acting as a person's own login, writing into systems. The
  // catalogue already asks whether the agent's actions are recorded in its own
  // name, and this register's room ANSWERED that one — "no separate log, the
  // actions look like Noam's". That is a fact in the table, and nothing used to
  // follow from it. What follows is this, and only the room can answer it: in
  // those systems' own logs, which entries are the agent's. It is asked per
  // account, with the systems named, because that is how somebody would go and
  // look.
  const onPeople = systems.filter((s) => s.humanCredentialWrites.length);
  if (onPeople.length) {
    const byAccount = new Map();
    for (const system of onPeople) {
      for (const account of system.humanCredentialWrites) {
        if (!byAccount.has(account)) byAccount.set(account, []);
        byAccount.get(account).push(system.name);
      }
    }
    out.push({
      id: 'system_human_credential',
      he: T.he.qHumanCredential, en: T.en.qHumanCredential,
      hint: [...byAccount.entries()].map(([a, list]) => `${a} — ${list.join(', ')}`).join(' · '),
      section: 'control',
      agents: [...new Set(onPeople.flatMap((s) => s.writtenBy))],
      ask: [], scope: 'identity',
    });
  }

  // Two spellings of one system. Merging them would invent a shared system;
  // leaving them apart hides one. Same refusal as two spellings of one account.
  const bySpelling = new Map();
  for (const system of systems) {
    const key = spellingKey(system.name);
    if (!key) continue;
    if (!bySpelling.has(key)) bySpelling.set(key, []);
    bySpelling.get(key).push(system);
  }
  for (const group of bySpelling.values()) {
    if (group.length < 2) continue;
    out.push({
      id: `system_nearmiss:${group.map((s) => s.key).join('|')}`,
      he: T.he.qSystemNearMiss, en: T.en.qSystemNearMiss,
      hint: group.map((s) => s.name).join(' / '),
      section: 'reach',
      agents: [...new Set(group.flatMap((s) => s.agents))],
      ask: [], scope: 'identity',
    });
  }

  return out;
}

/**
 * The question an agent raises by answering everything: one figure for how many
 * people it can reach, and several systems for it to have come from. Merged
 * into one line like any other, because a register of twelve assistants would
 * otherwise print it twelve times.
 */
export function spanQuestions(doc) {
  const wide = (doc.agents || [])
    .map((a) => ({ name: a.name || T.he.noName, answers: a.answers || {}, span: spanOf(a) }))
    .filter((a) => a.span > 1
      && String(a.answers.personal_data || '').trim() !== 'לא'
      && !isEmpty(a.answers.volume));
  if (!wide.length) return [];
  return [{
    id: 'reach_span',
    he: T.he.qSpan, en: T.en.qSpan,
    // The agent's name and the figure it gave are quoted. "N systems" is the
    // tool counting, so that half is written in each language.
    hint: T.he.qSpanHint(wide),
    hintEn: T.en.qSpanHint(wide),
    section: 'data',
    agents: wide.map((a) => a.name),
    ask: [], scope: 'identity',
  }];
}
