// The two languages the documents print in — and the line between them.
//
// Night 3's rule was that the register reads what the room wrote and never
// invents the part the room did not say. Translation is the same rule again,
// and it splits the page into three kinds of text:
//
//  1. The tool's own words — headings, questions, counts, the sentences the
//     arithmetic produces. The tool wrote them, so the tool can write them in
//     another language. They live here and in the question catalogue.
//  2. The room's words — every free-text and list answer. Those are facts
//     somebody said out loud, and translating a fact is inventing one. They are
//     printed exactly as typed, in whatever language they were typed in.
//  3. The option labels of a choice question — a third case, and the one worth
//     thinking about. "חשבון משותף" is not the room's sentence; it is a word the
//     tool put in a dropdown and the room pointed at. So it translates, and the
//     rule that decides is the schema, not a guess about the string.
//
// So an English register is bilingual by necessity: English questions, Hebrew
// answers. It says so on the page in one line, because a document that looks
// English and holds Hebrew facts without explaining itself reads like a bug.
//
// One thing this file deliberately does NOT do: translate the stored answer.
// The gates in `questions.js`, `contributes()` in `reach.js` and
// EMPLOYEE_CREDENTIAL in `identities.js` all compare against the Hebrew option
// strings, so the Hebrew value IS the stored value and the logic reads it.
// Language is a property of the printed document, not a mode of the register.

export const LANGS = ['he', 'en'];
export const DIR = { he: 'rtl', en: 'ltr' };

// The proven mechanism, mirrored. Night 1 found that Chromium prints a list of
// Latin names inside a Hebrew sentence in reverse order unless every separator
// is fenced with a right-to-left mark. An English document has exactly the same
// problem in the other direction — Hebrew answers inside an English sentence —
// and takes the same fix with the other mark.
export const MARK = { he: '‏', en: '‎' };

export const T = {
  he: {
    registerTitle: 'רישום סוכני AI',
    questionsTitle: 'שאלות פתוחות',
    questionsDocTitle: 'שאלות פתוחות — רישום סוכני AI',
    orgFallback: 'ארגון',
    orgHeading: 'הארגון',
    agentsHeading: 'הסוכנים',
    accountsHeading: 'החשבונות שבשמם הסוכנים פועלים',
    noAgents: 'לא נרשם אף סוכן.',
    noQuestions: 'אין שאלות פתוחות.',
    noOwner: 'אין אדם אחראי רשום',
    noAccount: 'לא נרשם חשבון',
    ownerIs: (name) => `אחראי: ${name}`,
    openCount: (n) => `${n} שאלות פתוחות`,
    allAnswered: 'כל השאלות נענו',
    atOrgLevel: 'ברמת הארגון',
    askLabel: 'לשאול',
    dash: '—',
    disclaimer:
      'הדף הזה רושם עובדות ושאלות פתוחות. הוא לא קובע אם משהו כאן חוקי, תקין או מאובטח — '
      + 'ההפניות לחוק הן מצביע לעורך הדין או לממונה, לא חוות דעת.',
    // Column heads of the account table.
    cols: ['החשבון', 'הסוכנים שפועלים בשמו', 'הסוג כפי שנרשם', 'כתיבה למערכות', 'מידע אישי', 'מי עונה'],
    yes: 'כן',
    counts: ({ agents, answered, asked, believed }) =>
      `בטבלה ${agents === 1 ? 'סוכן אחד' : `<b>${agents}</b> סוכנים`} · נענו <b>${answered}</b> מתוך `
      + `<b>${asked}</b> שאלות${believed ? ` · הארגון העריך <b>${believed}</b> סוכנים` : ''}`,
    sheetCounts: ({ lines, cases }) =>
      `<b>${lines}</b> שאלות, על <b>${cases}</b> מקרים — אותה שאלה על כמה סוכנים היא שורה אחת`,
    agentsActAs: ({ agents, identities }) =>
      `${agents === 1 ? 'סוכן אחד פועל' : `<b>${agents}</b> סוכנים פועלים`} בשם `
      + `${identities === 1 ? 'חשבון אחד' : `<b>${identities}</b> חשבונות`}`,
    widest: ({ n, name }) => `חשבון אחד נושא <b>${n}</b> סוכנים${name ? ` (${name})` : ''}`,
    onHumanCredentials: (n) => (n === 1
      ? 'חשבון אחד הוא הרשאות של עובד'
      : `<b>${n}</b> מהחשבונות הם הרשאות של עובד`),
    unnamed: (n) => (n === 1
      ? 'סוכן אחד בלי חשבון רשום'
      : `<b>${n}</b> סוכנים בלי חשבון רשום`),
    // The reach sentences. Every one of these is the tool's own arithmetic
    // talking, which is why it may be translated at all.
    reachRange: ({ floor, ceiling, overlap }) =>
      `בין <b>${floor}</b> ל-<b>${ceiling}</b> אנשים${overlap ? ', תלוי אם אלה אותם אנשים' : ''}`,
    reachFloorOnly: (floor) => `<b>${floor}</b> אנשים לפחות`,
    reachExact: (n) => `<b>${n}</b> אנשים`,
    reachRate: (text) => `${text} — מספר לתקופה, לא מספר אנשים`,
    reachNone: 'מספר האנשים שהסוכנים יכולים להגיע למידע עליהם לא נגזר מהרישום',
    reachHeadRange: ({ floor, ceiling }) =>
      `הסוכנים יכולים להגיע למידע על <b>${floor}</b> עד <b>${ceiling}</b> אנשים`,
    reachHeadFloor: (floor) => `הסוכנים יכולים להגיע למידע על <b>${floor}</b> אנשים לפחות`,
    // One figure, read exactly, with nothing behind it to add. Night 5: the
    // single-assistant register printed "בין 5,000 ל-5,000", which reads like a
    // bug and is one, even though the arithmetic was right.
    reachHeadExact: (n) => `הסוכנים יכולים להגיע למידע על <b>${n}</b> אנשים`,
    reachOverlapNote: 'הרישום לא מחבר את המספרים לפני שהחדר יענה אם אלה אותם אנשים',
    reachNoCeiling: (gaps) => `בלי גבול עליון: ${gaps}`,
    gapRates: (n) => `${n === 1 ? 'מספר אחד נרשם' : `${n} מספרים נרשמו`} לפי תקופה`,
    gapUnreadable: (n) => `${n === 1 ? 'בתשובה אחת' : `ב-${n} תשובות`} לא נמצא מספר`,
    gapMissing: (n) => `${n === 1 ? 'סוכן אחד' : `${n} סוכנים`} בלי מספר רשום`,
    // Lines the grouping and the arithmetic raise themselves.
    qConflict: 'אותו חשבון נרשם בשני תיאורים שונים — איזה מהם נכון',
    qNearMiss: 'שני שמות חשבון שנרשמו קרובים זה לזה — האם זה אותו חשבון',
    qOverlap: 'האם אותו חשבון מגיע לאותם אנשים בשני הסוכנים, או לשני קהלים שונים',
    qOverlapHint: (who) => `${who}. בלי התשובה הזו הרישום לא מחבר את המספרים`,
    qRate: 'המספר נרשם לפי תקופה — על כמה אנשים שונים מדובר בסך הכול',
    qUnreadable: 'בתשובה על מספר האנשים לא נמצא מספר — מה סדר הגודל',
    noAccountRecorded: 'בלי חשבון רשום',
    noName: 'סוכן בלי שם',
    // The third rollup: the same register read by system. Night 5 — an account
    // groups agents, so one agent is a group of one, and everything the tool had
    // built went quiet on a company with a single assistant.
    systemsHeading: 'המערכות שהסוכנים מגיעים אליהן',
    systemCols: ['המערכת', 'הסוכנים שמגיעים אליה', 'כתיבה', 'החשבונות', 'על מי המידע'],
    readOnly: 'קריאה בלבד',
    writes: 'כותב',
    systemsLine: ({ systems, written }) =>
      `${systems === 1 ? 'מערכת אחת' : `<b>${systems}</b> מערכות`} ברישום · `
      + `${written === 1 ? 'באחת' : `ב-<b>${written}</b>`} מהן סוכן יכול לשנות משהו`,
    systemWidest: ({ n, name }) =>
      `מערכת אחת נגישה ל-<b>${n}</b> סוכנים${name ? ` (${name})` : ''}`,
    systemCrossAccount: (n) => (n === 1
      ? 'מערכת אחת נגישה מיותר מחשבון אחד'
      : `<b>${n}</b> מערכות נגישות מיותר מחשבון אחד`),
    systemsNoMeeting: 'אף שתי סוכנים לא נפגשים באותה מערכת — אין ברישום מה להצליב',
    qSystemPopulations: 'שני סוכנים מגיעים לאותה מערכת ורשמו קהלים שונים — מה שמור בה',
    qSystemPopulationsHint: (who) =>
      `${who}. הרישום לא מאחד את הקהלים ולא בוחר ביניהם`,
    qSystemWriteAccounts: 'שני חשבונות כותבים לאותה מערכת — האם היומן שלה מבדיל ביניהם',
    qSystemOffList: 'מערכת נרשמה כמערכת שהסוכן משנה בה, ולא ברשימת המערכות שהוא מגיע אליהן — איזו רשימה חסרה',
    qSystemNearMiss: 'שני שמות מערכת שנרשמו קרובים זה לזה — האם זו אותה מערכת',
    qHumanCredential: 'הסוכן כותב למערכות בשם הלוגין האישי של עובד — אילו רשומות ביומן של כל מערכת הן שלו',
    qSpan: 'מספר האנשים נרשם פעם אחת לסוכן שמגיע לכמה מערכות — זה הגדול שבהם או כולם יחד',
    qSpanHint: (list) => list
      .map((a) => `${a.name}: ${a.answers.volume} על ${a.span} מערכות`)
      .join(' · '),
    bilingual: null,
    lawNote: null,
  },
  en: {
    registerTitle: 'AI agent register',
    questionsTitle: 'Open questions',
    questionsDocTitle: 'Open questions — AI agent register',
    orgFallback: 'Organisation',
    orgHeading: 'The organisation',
    agentsHeading: 'The agents',
    accountsHeading: 'The accounts the agents act as',
    noAgents: 'No agent recorded.',
    noQuestions: 'No open questions.',
    noOwner: 'no person recorded as answering for it',
    noAccount: 'no account recorded',
    ownerIs: (name) => `Answers for it: ${name}`,
    openCount: (n) => `${n} open question${n === 1 ? '' : 's'}`,
    allAnswered: 'every question answered',
    atOrgLevel: 'at organisation level',
    askLabel: 'ask',
    dash: '—',
    // Written to say the page gives no opinion, which is the one place the
    // words it refuses to use are allowed to appear.
    disclaimer:
      'This page records facts and open questions. It does not determine whether anything '
      + 'here is lawful, sound or secure — the statutory references are a pointer for the '
      + 'lawyer or the privacy officer, not an opinion.',
    cols: ['Account', 'Agents acting as it', 'Kind, as recorded', 'Writes to', 'Personal data', 'Answers for it'],
    yes: 'yes',
    counts: ({ agents, answered, asked, believed }) =>
      `${agents === 1 ? 'One agent' : `<b>${agents}</b> agents`} in the table · <b>${answered}</b> of `
      + `<b>${asked}</b> questions answered${believed ? ` · the organisation estimated <b>${believed}</b>` : ''}`,
    sheetCounts: ({ lines, cases }) =>
      `<b>${lines}</b> questions, over <b>${cases}</b> cases — one question open about several agents is one line`,
    agentsActAs: ({ agents, identities }) =>
      `${agents === 1 ? 'One agent acts as' : `<b>${agents}</b> agents act as`} `
      + `${identities === 1 ? 'one account' : `<b>${identities}</b> accounts`}`,
    widest: ({ n, name }) => `one account carries <b>${n}</b> agents${name ? ` (${name})` : ''}`,
    onHumanCredentials: (n) => (n === 1
      ? "one account is an employee's own permissions"
      : `<b>${n}</b> of the accounts are an employee's own permissions`),
    unnamed: (n) => (n === 1
      ? 'one agent with no account recorded'
      : `<b>${n}</b> agents with no account recorded`),
    reachRange: ({ floor, ceiling, overlap }) =>
      `between <b>${floor}</b> and <b>${ceiling}</b> people`
      + (overlap ? ', depending on whether they are the same people' : ''),
    reachFloorOnly: (floor) => `<b>${floor}</b> people at least`,
    reachExact: (n) => `<b>${n}</b> people`,
    reachRate: (text) => `${text} — a figure per period, not a number of people`,
    reachNone: 'The number of people the agents can reach information about does not follow from the register',
    reachHeadRange: ({ floor, ceiling }) =>
      `The agents can reach information about <b>${floor}</b> to <b>${ceiling}</b> people`,
    reachHeadFloor: (floor) => `The agents can reach information about <b>${floor}</b> people at least`,
    reachHeadExact: (n) => `The agents can reach information about <b>${n}</b> people`,
    reachOverlapNote: 'the register does not add the figures before the room answers whether they are the same people',
    reachNoCeiling: (gaps) => `no upper bound: ${gaps}`,
    gapRates: (n) => `${n === 1 ? 'one figure is recorded' : `${n} figures are recorded`} per period`,
    gapUnreadable: (n) => `no number was found in ${n === 1 ? 'one answer' : `${n} answers`}`,
    gapMissing: (n) => `${n === 1 ? 'one agent' : `${n} agents`} with no figure recorded`,
    qConflict: 'The same account was recorded under two different descriptions — which one is right',
    qNearMiss: 'Two account names recorded close to each other — is this the same account',
    qOverlap: 'Does the account reach the same people in both agents, or two different audiences',
    qOverlapHint: (who) => `${who}. Without that answer the register does not add the figures`,
    qRate: 'The figure was recorded per period — how many different people is it in total',
    qUnreadable: 'No number was found in the answer about how many people — what is the order of magnitude',
    noAccountRecorded: 'no account recorded',
    noName: 'agent with no name',
    systemsHeading: 'The systems the agents reach',
    systemCols: ['System', 'Agents reaching it', 'Writes', 'Accounts', 'Whose information'],
    readOnly: 'read only',
    writes: 'writes',
    systemsLine: ({ systems, written }) =>
      `${systems === 1 ? 'One system' : `<b>${systems}</b> systems`} in the register · `
      + `an agent can change something in ${written === 1 ? 'one' : `<b>${written}</b>`} of them`,
    systemWidest: ({ n, name }) =>
      `one system is reached by <b>${n}</b> agents${name ? ` (${name})` : ''}`,
    systemCrossAccount: (n) => (n === 1
      ? 'one system is reached from more than one account'
      : `<b>${n}</b> systems are reached from more than one account`),
    systemsNoMeeting: 'no two agents meet in the same system — there is nothing in this register to cross-check',
    qSystemPopulations: 'Two agents reach the same system and recorded different populations — what is held in it',
    qSystemPopulationsHint: (who) =>
      `${who}. The register does not merge the populations and does not pick between them`,
    qSystemWriteAccounts: "Two accounts write to the same system — does its own log tell them apart",
    qSystemOffList: 'A system was recorded as one the agent changes, and not on the list of systems it can reach — which list is incomplete',
    qSystemNearMiss: 'Two system names recorded close to each other — is this the same system',
    qHumanCredential: "The agent writes into systems under an employee's own login — which entries in each system's log are the agent's",
    qSpan: 'The number of people was recorded once for an agent that reaches several systems — is it the largest of them or all of them together',
    qSpanHint: (list) => list
      .map((a) => `${a.name}: ${a.answers.volume} across ${a.span} systems`)
      .join(' · '),
    // Why an English register still has Hebrew in it. Printed only when there
    // actually is: a register filled in English says nothing.
    bilingual:
      'The questions on this page are in English. The answers are printed in the language '
      + 'they were given in, word for word — translating what somebody said in the room '
      + 'would be writing down something nobody said.',
    // The statutory names stay in Hebrew because the English ones are not
    // settled. See refs.js.
    lawNote:
      'The statutory references are cited in Hebrew. The English names of these instruments '
      + 'are not uniform in use — the law itself is rendered both "Protection of Privacy Law" '
      + 'and "Privacy Protection Law" — so the Hebrew name is the one to quote.',
  },
};

export function t(lang) {
  return T[lang] || T.he;
}
