// The shape the product was pitched on, and the one nobody had put in front of
// the page until night 5: ONE assistant, twelve tools, one login — the employee's
// own.
//
// Constructed, not observed. It is written to be the realistic version of what
// an MCP-wired assistant looks like inside a company today, and every answer in
// it is filled in: that is the point. A register in which the room answered all
// twenty-three questions used to print an empty questions sheet, because every
// check the tool had was a check on a blank field or on two agents sharing an
// account, and a single agent has neither.
//
// Nothing in here is a worst case. It is a tidy, well-run assistant. The widest
// thing in the company is simply what it is, and the register's job is to put
// it on a sheet rather than grade it.
export const ONE_ASSISTANT = {
  org: {
    name: 'דוגמה — עוזר אישי אחד, חברה קטנה (נתונים מומצאים)',
    date: '2026-11-02',
    answers: {
      dpo: 'לא מונה. 14 עובדים',
      agents_believed: '1',
      unapproved: 'לא ידוע',
    },
  },
  agents: [
    {
      name: 'עוזר אישי (צ׳אט + MCP)',
      answers: {
        purpose: 'עונה על מיילים, מסכם פגישות, מכין טיוטות, מעדכן משימות ומוציא דוחות',
        owner: 'נועם ב׳, מנכ"ל',
        autonomy: 'מבצע לבד בתוך גבולות מוגדרים',
        identity_used: 'ההרשאות של עובד מסוים',
        identity_name: 'noam@',
        permissions_reviewed: 'לא נבדק. הוא מחובר עם ההרשאות של נועם מיום ההתקנה',
        tools: [
          'Gmail', 'Google Calendar', 'Google Drive', 'Slack', 'Notion',
          'Jira', 'GitHub', 'HubSpot', 'Zoom', 'חשבשבת', 'Google Sheets', 'דפדפן',
        ],
        write_actions: ['Gmail', 'Google Calendar', 'Notion', 'Jira', 'GitHub', 'HubSpot', 'Google Sheets'],
        external_content: 'כן',
        code_execution: 'כן',
        other_agents: ['שרת MCP של Atlassian', 'שרת MCP של Google', 'שרת MCP מקומי לקבצים'],
        personal_data: 'כן',
        data_subjects: ['עובדים', 'לקוחות', 'מועמדים', 'ספקים'],
        special_categories: ['מצב כלכלי — שכר ותנאי עובדים בדיסק', 'דעות — חוות דעת על מועמדים'],
        volume: 'כ-5,000',
        memory: 'שומר הקשר של 30 יום בשירות של הספק',
        vendor_training: 'לא',
        data_abroad: 'כן — ארה"ב',
        action_log: 'אין יומן נפרד. בכל המערכות הפעולות נראות כאילו נועם עשה אותן',
        kill_switch: 'נועם, מיד — מבטל את החיבור. לא נבדק',
        blast_radius: 'שולח מייל בשם המנכ"ל לכל מי שבתיבה, או מוחק קובץ משותף',
        approval_bypass: 'כן',
        listed_anywhere: 'לא',
      },
    },
  ],
};
