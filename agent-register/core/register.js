import { AGENT_QUESTIONS, ORG_QUESTIONS, applies, byId } from './questions.js';
import { LAW } from './refs.js';

const isEmpty = (v) => {
  if (v === undefined || v === null) return true;
  if (Array.isArray(v)) return v.filter((x) => String(x).trim() !== '').length === 0;
  return String(v).trim() === '';
};

const asList = (v) =>
  Array.isArray(v) ? v.filter((x) => String(x).trim() !== '').map(String) : [];

/** One agent, read through the question set: what was answered, what stayed open. */
export function readAgent(agent) {
  const answers = agent.answers || {};
  const asked = AGENT_QUESTIONS.filter((x) => applies(x, answers));
  const answered = asked.filter((x) => !isEmpty(answers[x.id]));
  const open = asked.filter((x) => isEmpty(answers[x.id]));
  // A question the gate switched off was not skipped by the room — it does not
  // belong in either count, or an agent that touches no personal data would look
  // like the worst-documented one in the register.
  const notAsked = AGENT_QUESTIONS.filter((x) => !applies(x, answers));
  return {
    name: agent.name || 'סוכן בלי שם',
    answers,
    asked, answered, open, notAsked,
    owner: isEmpty(answers.owner) ? null : String(answers.owner),
  };
}

export function readRegister(doc) {
  const agents = (doc.agents || []).map(readAgent);
  const orgAnswers = (doc.org && doc.org.answers) || {};
  const orgOpen = ORG_QUESTIONS.filter((x) => isEmpty(orgAnswers[x.id]));
  return {
    org: {
      name: (doc.org && doc.org.name) || '',
      date: (doc.org && doc.org.date) || '',
      answers: orgAnswers,
      open: orgOpen,
    },
    agents,
  };
}

/**
 * The questions sheet. A question asked about four agents is ONE line carrying
 * four names — the same merge the Amendment 13 inventory needed, for the same
 * reason: eight copies of one sentence reads as a long list and gets skimmed.
 */
export function openQuestions(doc) {
  const reg = readRegister(doc);
  const byQuestion = new Map();
  for (const agent of reg.agents) {
    for (const question of agent.open) {
      if (!byQuestion.has(question.id)) {
        byQuestion.set(question.id, { question, agents: [], owners: new Set() });
      }
      const row = byQuestion.get(question.id);
      row.agents.push(agent.name);
      if (agent.owner) row.owners.add(agent.owner);
    }
  }
  const lines = [...byQuestion.values()].map((row) => ({
    id: row.question.id,
    he: row.question.he,
    hint: row.question.hint || '',
    section: row.question.section,
    agents: row.agents,
    ask: row.owners.size ? [...row.owners] : [],
    scope: 'agent',
  }));
  const orgLines = reg.org.open.map((question) => ({
    id: question.id,
    he: question.he,
    hint: question.hint || '',
    section: question.section,
    agents: [],
    ask: [],
    scope: 'org',
  }));
  return [...orgLines, ...lines];
}

export function stats(doc) {
  const reg = readRegister(doc);
  const asked = reg.agents.reduce((n, a) => n + a.asked.length, 0);
  const answered = reg.agents.reduce((n, a) => n + a.answered.length, 0);
  const questions = openQuestions(doc);
  const believed = reg.org.answers.agents_believed;
  return {
    agents: reg.agents.length,
    asked,
    answered,
    open: asked - answered,
    // Lines on the sheet, which is smaller than `open` whenever one question is
    // open about several agents. That gap is the whole point of merging.
    lines: questions.length,
    believed: isEmpty(believed) ? null : String(believed),
  };
}

/**
 * What a question is here for, split the only way that matters to a CISO:
 * an Israeli obligation that binds today, versus a risk somebody catalogued.
 * Computed from the catalogue, never typed into a slide.
 */
export function hookCoverage(questions = AGENT_QUESTIONS) {
  const out = { binding: [], softLaw: [], riskOnly: [], neither: [] };
  for (const question of questions) {
    const laws = (question.law || []).map((k) => LAW[k]).filter(Boolean);
    const binding = laws.some((l) => l.status === 'binding');
    const soft = !binding && laws.length > 0;
    if (binding) out.binding.push(question.id);
    else if (soft) out.softLaw.push(question.id);
    else if ((question.asi || []).length) out.riskOnly.push(question.id);
    else out.neither.push(question.id);
  }
  return out;
}

export { asList, isEmpty, byId };
