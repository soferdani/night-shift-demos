// The question set. One place, used by the page, the printable documents and the
// tests — so a question can never exist on the screen and be missing from the doc.
//
// Rule the whole tool is built on: a question states a fact or asks for one. It
// never grades the answer. "acts alone with a shared login" is a fact; "insecure"
// is a verdict, and a verdict belongs to whoever is paid to give it.

export const SECTIONS = [
  { id: 'identity', he: 'זהות וסמכות' },
  { id: 'reach', he: 'מה הסוכן מגיע אליו' },
  { id: 'data', he: 'מידע אישי' },
  { id: 'control', he: 'בקרה ועצירה' },
];

const q = (o) => ({ type: 'text', asks: 'owner', ...o });

export const AGENT_QUESTIONS = [
  q({
    id: 'purpose',
    section: 'identity',
    he: 'מה הסוכן עושה, במשפט אחד',
    hint: 'מה הוא נועד להשיג, לא באיזו טכנולוגיה',
    asi: [], law: [],
  }),
  q({
    id: 'owner',
    section: 'identity',
    he: 'מי האדם שעונה עליו',
    hint: 'שם של אדם. "צוות הדאטה" הוא לא תשובה',
    asi: ['ASI10'], law: ['AMD13'],
  }),
  q({
    id: 'autonomy',
    section: 'identity',
    he: 'מה הוא מורשה לעשות בעצמו',
    type: 'choice',
    options: [
      'מציע בלבד, אדם מבצע',
      'מבצע אחרי אישור אדם לכל פעולה',
      'מבצע לבד בתוך גבולות מוגדרים',
      'מבצע לבד, בלי גבולות מוגדרים',
    ],
    asi: ['ASI09', 'ASI10'], law: [],
  }),
  q({
    id: 'identity_used',
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
    asi: ['ASI03'], law: ['SEC2017'],
  }),
  q({
    id: 'permissions_reviewed',
    section: 'identity',
    he: 'מתי נבדקו ההרשאות שלו בפעם האחרונה, ועל ידי מי',
    asi: ['ASI03'], law: ['SEC2017'],
  }),
  q({
    id: 'tools',
    section: 'reach',
    he: 'לאילו מערכות הוא יכול לפנות',
    type: 'list',
    asi: ['ASI02'], law: ['SEC2017'],
  }),
  q({
    id: 'write_actions',
    section: 'reach',
    he: 'באילו מהן הוא יכול לשנות משהו, לא רק לקרוא',
    type: 'list',
    asi: ['ASI02'], law: ['SEC2017'],
  }),
  q({
    id: 'external_content',
    section: 'reach',
    he: 'האם הוא קורא תוכן שמגיע מחוץ לארגון',
    hint: 'מייל נכנס, דף אינטרנט, מסמך של לקוח, פנייה בצ׳אט — טקסט שמישהו אחר כתב',
    type: 'choice',
    options: ['כן', 'לא', 'לא ידוע'],
    asi: ['ASI01'], law: [],
  }),
  q({
    id: 'code_execution',
    section: 'reach',
    he: 'האם הוא יכול להריץ קוד או פקודות',
    type: 'choice',
    options: ['כן', 'לא', 'לא ידוע'],
    asi: ['ASI05'], law: [],
  }),
  q({
    id: 'other_agents',
    section: 'reach',
    he: 'אילו סוכנים או שרתי כלים אחרים הוא קורא להם, ושל מי הם',
    hint: 'כולל MCP וספקים חיצוניים',
    type: 'list',
    asi: ['ASI04', 'ASI07'], law: [],
  }),
  q({
    id: 'personal_data',
    section: 'data',
    he: 'האם הוא נוגע במידע על אנשים מזוהים',
    hint: 'אם התשובה לא, רוב הסעיפים בהמשך לא רלוונטיים — וזו תשובה טובה',
    type: 'choice',
    options: ['כן', 'לא', 'לא ידוע'],
    asi: [], law: ['PPL', 'AMD13'],
  }),
  q({
    id: 'data_subjects',
    section: 'data',
    he: 'על מי המידע',
    hint: 'לקוחות, עובדים, מועמדים, מטופלים, ספקים',
    type: 'list',
    only: { personal_data: ['כן', 'לא ידוע'] },
    asi: [], law: ['PPL'],
  }),
  q({
    id: 'special_categories',
    section: 'data',
    he: 'האם יש שם מידע רגיש',
    hint: 'בריאות, ביומטריה, מצב כלכלי, דעות, עבר פלילי',
    type: 'list',
    only: { personal_data: ['כן', 'לא ידוע'] },
    asi: [], law: ['PPL', 'SEC2017'],
  }),
  q({
    id: 'volume',
    section: 'data',
    he: 'על כמה אנשים הוא יכול להגיע למידע',
    hint: 'סדר גודל מספיק',
    only: { personal_data: ['כן', 'לא ידוע'] },
    asi: ['ASI08'], law: ['AMD13', 'DPO'],
  }),
  q({
    id: 'memory',
    section: 'data',
    he: 'מה הוא זוכר בין שיחות, איפה זה נשמר ולכמה זמן',
    asi: ['ASI06'], law: ['PPL', 'SEC2017'],
  }),
  q({
    id: 'vendor_training',
    section: 'data',
    he: 'האם ספק המודל מתאמן על מה שנשלח אליו',
    type: 'choice',
    options: ['לא', 'כן', 'לא ידוע'],
    only: { personal_data: ['כן', 'לא ידוע'] },
    asi: [], law: ['PPA_AI'],
  }),
  q({
    id: 'data_abroad',
    section: 'data',
    he: 'האם המידע יוצא מישראל, ולאן',
    only: { personal_data: ['כן', 'לא ידוע'] },
    asi: [], law: ['PPL'],
  }),
  q({
    id: 'action_log',
    section: 'control',
    he: 'האם כל פעולה שלו מתועדת על שמו, ומי קורא את התיעוד',
    hint: 'תיעוד שאף אחד לא קורא הוא עדיין תשובה — רשמו אותה',
    asi: ['ASI03', 'ASI10'], law: ['SEC2017'],
  }),
  q({
    id: 'kill_switch',
    section: 'control',
    he: 'מי יכול לעצור אותו, בתוך כמה זמן, והאם זה נבדק',
    asi: ['ASI10'], law: ['SEC2017'],
  }),
  q({
    id: 'blast_radius',
    section: 'control',
    he: 'הדבר הגרוע ביותר שהוא יכול לעשות בתוך ההרשאות שיש לו היום',
    hint: 'בלי תרחיש תקיפה. מה קורה אם הוא פשוט טועה בגדול',
    asi: ['ASI08'], law: [],
  }),
  q({
    id: 'approval_bypass',
    section: 'control',
    he: 'האם אפשר לבקש ממנו לפעול בלי האישור הרגיל',
    type: 'choice',
    options: ['לא', 'כן', 'לא ידוע'],
    only: { autonomy: ['מבצע אחרי אישור אדם לכל פעולה', 'מבצע לבד בתוך גבולות מוגדרים'] },
    asi: ['ASI09'], law: [],
  }),
  q({
    id: 'listed_anywhere',
    section: 'control',
    he: 'האם הסוכן מופיע באיזו רשימה בארגון מלבד זו',
    hint: 'מסמך הגדרות המסד, רשימת נכסים, מפרט אבטחה',
    type: 'choice',
    options: ['כן', 'לא', 'לא ידוע'],
    asi: ['ASI10'], law: ['SEC2017', 'AMD13'],
  }),
];

export const ORG_QUESTIONS = [
  q({
    id: 'dpo',
    section: 'identity',
    he: 'האם מונה ממונה הגנת הפרטיות, ומי',
    hint: 'לפי חוות הדעת מ-14.07.2026 מדובר באדם, לא בחברה',
    asi: [], law: ['AMD13', 'DPO'],
  }),
  q({
    id: 'agents_believed',
    section: 'identity',
    he: 'כמה סוכנים הארגון חושב שיש לו',
    hint: 'המספר הזה והמספר בטבלה הם שני נתונים שונים',
    asi: ['ASI10'], law: [],
  }),
  q({
    id: 'unapproved',
    section: 'control',
    he: 'האם מישהו מפעיל סוכן שהארגון לא אישר',
    type: 'choice',
    options: ['לא ידוע', 'כן', 'לא'],
    asi: ['ASI10'], law: ['SEC2017'],
  }),
];

export const ALL_QUESTIONS = [...AGENT_QUESTIONS, ...ORG_QUESTIONS];

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
