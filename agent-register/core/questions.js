// The question set. One place, used by the page, the printable documents and the
// tests — so a question can never exist on the screen and be missing from the doc.
//
// Rule the whole tool is built on: a question states a fact or asks for one. It
// never grades the answer. "acts alone with a shared login" is a fact; "insecure"
// is a verdict, and a verdict belongs to whoever is paid to give it.

export const SECTIONS = [
  { id: 'identity', he: 'זהות וסמכות', en: "Identity and authority" },
  { id: 'reach', he: 'מה הסוכן מגיע אליו', en: "What the agent can reach" },
  { id: 'data', he: 'מידע אישי', en: "Personal data" },
  { id: 'control', he: 'בקרה ועצירה', en: "Oversight and stopping it" },
];

const q = (o) => ({ type: 'text', asks: 'owner', ...o });

export const AGENT_QUESTIONS = [
  q({
    id: 'purpose',
    en: "What the agent does, in one sentence",
    enHint: "What it is meant to achieve, not which technology it uses",
    section: 'identity',
    he: 'מה הסוכן עושה, במשפט אחד',
    hint: 'מה הוא נועד להשיג, לא באיזו טכנולוגיה',
    asi: [], law: [],
  }),
  q({
    id: 'owner',
    en: "Which person answers for it",
    enHint: "The name of a person. \"The data team\" is not an answer",
    section: 'identity',
    he: 'מי האדם שעונה עליו',
    hint: 'שם של אדם. "צוות הדאטה" הוא לא תשובה',
    asi: ['ASI10'], law: ['AMD13'],
  }),
  q({
    id: 'autonomy',
    en: "What it is allowed to do by itself",
    section: 'identity',
    he: 'מה הוא מורשה לעשות בעצמו',
    type: 'choice',
    options: [
      'מציע בלבד, אדם מבצע',
      'מבצע אחרי אישור אדם לכל פעולה',
      'מבצע לבד בתוך גבולות מוגדרים',
      'מבצע לבד, בלי גבולות מוגדרים',
    ],
    optionsEn: [
      "Proposes only, a person acts",
      "Acts after a person approves each action",
      "Acts alone within defined limits",
      "Acts alone, with no defined limits",
    ],
    asi: ['ASI09', 'ASI10'], law: [],
  }),
  q({
    id: 'identity_used',
    en: "Whose name it acts under in the systems",
    enHint: "This is the field that makes an agent an agent: a tool has permissions, an agent has an identity",
    section: 'identity',
    he: 'בשם מי הוא פועל במערכות',
    hint: 'זה השדה שהופך סוכן לסוכן: לכלי יש הרשאה, לסוכן יש זהות',
    type: 'choice',
    options: [
      'חשבון שירות משלו, על שמו',
      'ההרשאות של עובד מסוים',
      'חשבון משותף',
      'לא ידוע',
    ],
    optionsEn: [
      "Its own service account, in its name",
      "A specific employee's permissions",
      "A shared account",
      "Not known",
    ],
    asi: ['ASI03'], law: ['SEC2017'],
  }),
  q({
    id: 'identity_name',
    en: "The name of the account it acts as",
    enHint: "The account name only, as it appears in the access log. \"A shared account\" is a kind, not a name — two agents both recorded as a shared account may be one account or two, and the register cannot tell them apart without the name",
    section: 'identity',
    he: 'שם החשבון שבשמו הוא פועל',
    hint: 'שם החשבון בלבד, כפי שהוא מופיע ביומן הגישה. "חשבון משותף" הוא סוג, לא שם — '
      + 'שני סוכנים שרשום עליהם חשבון משותף יכולים להיות אותו חשבון או שני חשבונות, '
      + 'והרישום לא יודע להבדיל בלי השם',
    asi: ['ASI03'], law: ['SEC2017'],
  }),
  q({
    id: 'permissions_reviewed',
    en: "When its permissions were last reviewed, and by whom",
    section: 'identity',
    he: 'מתי נבדקו ההרשאות שלו בפעם האחרונה, ועל ידי מי',
    asi: ['ASI03'], law: ['SEC2017'],
  }),
  q({
    id: 'tools',
    en: "Which systems it can reach",
    section: 'reach',
    he: 'לאילו מערכות הוא יכול לפנות',
    type: 'list',
    asi: ['ASI02'], law: ['SEC2017'],
  }),
  q({
    id: 'write_actions',
    en: "In which of them it can change something, not only read",
    section: 'reach',
    he: 'באילו מהן הוא יכול לשנות משהו, לא רק לקרוא',
    type: 'list',
    asi: ['ASI02'], law: ['SEC2017'],
  }),
  q({
    id: 'external_content',
    en: "Does it read text that comes from outside the organisation",
    enHint: "An incoming email, a web page, a customer document, a message in a chat — text somebody else wrote",
    section: 'reach',
    he: 'האם הוא קורא תוכן שמגיע מחוץ לארגון',
    hint: 'מייל נכנס, דף אינטרנט, מסמך של לקוח, פנייה בצ׳אט — טקסט שמישהו אחר כתב',
    type: 'choice',
    options: ['כן', 'לא', 'לא ידוע'],
    optionsEn: ['Yes', 'No', 'Not known'],
    asi: ['ASI01'], law: [],
  }),
  q({
    id: 'code_execution',
    en: "Can it run code or commands",
    section: 'reach',
    he: 'האם הוא יכול להריץ קוד או פקודות',
    type: 'choice',
    options: ['כן', 'לא', 'לא ידוע'],
    optionsEn: ['Yes', 'No', 'Not known'],
    asi: ['ASI05'], law: [],
  }),
  q({
    id: 'other_agents',
    en: "Which other agents or tool servers it calls, and whose they are",
    enHint: "Including MCP and outside vendors",
    section: 'reach',
    he: 'אילו סוכנים או שרתי כלים אחרים הוא קורא להם, ושל מי הם',
    hint: 'כולל MCP וספקים חיצוניים',
    type: 'list',
    asi: ['ASI04', 'ASI07'], law: [],
  }),
  q({
    id: 'personal_data',
    en: "Does it touch information about identifiable people",
    enHint: "If the answer is no, most of the items below do not apply — and that is a good answer",
    section: 'data',
    he: 'האם הוא נוגע במידע על אנשים מזוהים',
    hint: 'אם התשובה לא, רוב הסעיפים בהמשך לא רלוונטיים — וזו תשובה טובה',
    type: 'choice',
    options: ['כן', 'לא', 'לא ידוע'],
    optionsEn: ['Yes', 'No', 'Not known'],
    asi: [], law: ['PPL', 'AMD13'],
  }),
  q({
    id: 'data_subjects',
    en: "Whose information",
    enHint: "Customers, employees, candidates, patients, suppliers",
    section: 'data',
    he: 'על מי המידע',
    hint: 'לקוחות, עובדים, מועמדים, מטופלים, ספקים',
    type: 'list',
    only: { personal_data: ['כן', 'לא ידוע'] },
    asi: [], law: ['PPL'],
  }),
  q({
    id: 'special_categories',
    en: "Is there sensitive information in it",
    enHint: "Health, biometrics, financial position, opinions, criminal record",
    section: 'data',
    he: 'האם יש שם מידע רגיש',
    hint: 'בריאות, ביומטריה, מצב כלכלי, דעות, עבר פלילי',
    type: 'list',
    only: { personal_data: ['כן', 'לא ידוע'] },
    asi: [], law: ['PPL', 'SEC2017'],
  }),
  q({
    id: 'volume',
    en: "How many people it can reach information about",
    enHint: "A number of people. An order of magnitude is enough — \"about 40,000\". A figure per period (\"about 2,000 a year\") is a different answer, and the register will ask for the number of people beside it",
    section: 'data',
    he: 'על כמה אנשים הוא יכול להגיע למידע',
    hint: 'מספר אנשים. סדר גודל מספיק — "כ-40,000". מספר לתקופה ("כ-2,000 בשנה") הוא '
      + 'תשובה אחרת, והרישום יבקש לידו את מספר האנשים',
    only: { personal_data: ['כן', 'לא ידוע'] },
    asi: ['ASI08'], law: ['AMD13', 'DPO'],
  }),
  q({
    id: 'memory',
    en: "What it remembers between conversations, where that is kept and for how long",
    section: 'data',
    he: 'מה הוא זוכר בין שיחות, איפה זה נשמר ולכמה זמן',
    asi: ['ASI06'], law: ['PPL', 'SEC2017'],
  }),
  q({
    id: 'vendor_training',
    en: "Does the model vendor train on what is sent to it",
    section: 'data',
    he: 'האם ספק המודל מתאמן על מה שנשלח אליו',
    type: 'choice',
    options: ['לא', 'כן', 'לא ידוע'],
    optionsEn: ['No', 'Yes', 'Not known'],
    only: { personal_data: ['כן', 'לא ידוע'] },
    asi: [], law: ['PPA_AI'],
  }),
  q({
    id: 'data_abroad',
    en: "Does the information leave Israel, and where to",
    section: 'data',
    he: 'האם המידע יוצא מישראל, ולאן',
    only: { personal_data: ['כן', 'לא ידוע'] },
    asi: [], law: ['PPL'],
  }),
  q({
    id: 'action_log',
    en: "Is every action of its recorded in its name, and who reads the record",
    enHint: "A record nobody reads is still an answer — write it down",
    section: 'control',
    he: 'האם כל פעולה שלו מתועדת על שמו, ומי קורא את התיעוד',
    hint: 'תיעוד שאף אחד לא קורא הוא עדיין תשובה — רשמו אותה',
    asi: ['ASI03', 'ASI10'], law: ['SEC2017'],
  }),
  q({
    id: 'kill_switch',
    en: "Who can stop it, within how long, and whether that was tried",
    section: 'control',
    he: 'מי יכול לעצור אותו, בתוך כמה זמן, והאם זה נבדק',
    asi: ['ASI10'], law: ['SEC2017'],
  }),
  q({
    id: 'blast_radius',
    en: "The worst thing it could do within the permissions it has today",
    enHint: "No attack scenario. What happens if it simply gets something badly wrong",
    section: 'control',
    he: 'הדבר הגרוע ביותר שהוא יכול לעשות בתוך ההרשאות שיש לו היום',
    hint: 'בלי תרחיש תקיפה. מה קורה אם הוא פשוט טועה בגדול',
    asi: ['ASI08'], law: [],
  }),
  q({
    id: 'approval_bypass',
    en: "Can it be asked to act without the usual approval",
    section: 'control',
    he: 'האם אפשר לבקש ממנו לפעול בלי האישור הרגיל',
    type: 'choice',
    options: ['לא', 'כן', 'לא ידוע'],
    optionsEn: ['No', 'Yes', 'Not known'],
    only: { autonomy: ['מבצע אחרי אישור אדם לכל פעולה', 'מבצע לבד בתוך גבולות מוגדרים'] },
    asi: ['ASI09'], law: [],
  }),
  q({
    id: 'listed_anywhere',
    en: "Does the agent appear on any other list in the organisation",
    enHint: "The database definitions document, an asset list, a security specification",
    section: 'control',
    he: 'האם הסוכן מופיע באיזו רשימה בארגון מלבד זו',
    hint: 'מסמך הגדרות המסד, רשימת נכסים, מפרט אבטחה',
    type: 'choice',
    options: ['כן', 'לא', 'לא ידוע'],
    optionsEn: ['Yes', 'No', 'Not known'],
    asi: ['ASI10'], law: ['SEC2017', 'AMD13'],
  }),
];

export const ORG_QUESTIONS = [
  q({
    id: 'dpo',
    en: "Has a privacy officer been appointed, and who",
    enHint: "Under the opinion of 14.07.2026 this is a person, not a company",
    section: 'identity',
    he: 'האם מונה ממונה הגנת הפרטיות, ומי',
    hint: 'לפי חוות הדעת מ-14.07.2026 מדובר באדם, לא בחברה',
    asi: [], law: ['AMD13', 'DPO'],
  }),
  q({
    id: 'agents_believed',
    en: "How many agents the organisation thinks it has",
    enHint: "That number and the number in the table are two different facts",
    section: 'identity',
    he: 'כמה סוכנים הארגון חושב שיש לו',
    hint: 'המספר הזה והמספר בטבלה הם שני נתונים שונים',
    asi: ['ASI10'], law: [],
  }),
  q({
    id: 'unapproved',
    en: "Is anyone running an agent the organisation never approved",
    section: 'control',
    he: 'האם מישהו מפעיל סוכן שהארגון לא אישר',
    type: 'choice',
    options: ['לא ידוע', 'כן', 'לא'],
    optionsEn: ['Not known', 'Yes', 'No'],
    asi: ['ASI10'], law: ['SEC2017'],
  }),
];

export const ALL_QUESTIONS = [...AGENT_QUESTIONS, ...ORG_QUESTIONS];

/** The stored value of "whose name it acts under" when the answer is a person's
 *  own login. It lives here, beside the option list it comes from, because both
 *  the account rollup and the system rollup compare against it and importing it
 *  from either one into the other would be a cycle. */
export const EMPLOYEE_CREDENTIAL = 'ההרשאות של עובד מסוים';

// A question is asked only when its `only` gate matches the answers given so far.
// "לא ידוע" always keeps the follow-up open: not knowing is not a way out.
export function applies(question, answers = {}) {
  if (!question.only) return true;
  return Object.entries(question.only).every(([field, accepted]) => {
    const given = answers[field];
    if (given === undefined || given === '') return true;
    return accepted.includes(given);
  });
}

export function byId(id) {
  return ALL_QUESTIONS.find((x) => x.id === id);
}

/**
 * The printed label of a chosen option.
 *
 * The stored value is always the Hebrew option string — the gates above,
 * `contributes()` in reach.js and EMPLOYEE_CREDENTIAL in identities.js all
 * compare against it, so it is the register's canonical value and nothing
 * translates it in storage. What translates is the label on the page, and only
 * for a `choice` question: those words are the tool's, picked from a list it
 * wrote. A typed answer is the room's sentence and is never touched.
 *
 * A stored value that is not one of the options was not picked from the list —
 * it was typed, or imported from somebody's JSON — so it is the room's word
 * too, and it is printed exactly as it came.
 */
export function optionLabel(question, value, lang = 'he') {
  if (lang !== 'en' || !question || question.type !== 'choice' || !question.optionsEn) return value;
  const index = (question.options || []).indexOf(value);
  return index >= 0 ? question.optionsEn[index] : value;
}
