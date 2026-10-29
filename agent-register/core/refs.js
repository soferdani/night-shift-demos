// Why each question exists. Two separate worlds, never blended:
//  - `law`  : Israeli obligations. Each carries its own status, because "binding"
//             and "a draft the regulator published" are not the same thing and a
//             CISO who is told they are stops trusting the rest of the page.
//  - `asi`  : OWASP's agentic risk list. A risk, not an obligation.
export const LAW = {
  PPL: {
    short: 'חוק הגנת הפרטיות',
    full: 'חוק הגנת הפרטיות, התשמ"א-1981',
    status: 'binding',
  },
  AMD13: {
    short: 'תיקון 13',
    full: 'תיקון 13 לחוק הגנת הפרטיות — בתוקף מ-14.08.2025',
    status: 'binding',
  },
  SEC2017: {
    short: 'תקנות אבטחת מידע',
    full: 'תקנות הגנת הפרטיות (אבטחת מידע), התשע"ז-2017',
    status: 'binding',
  },
  DPO: {
    short: 'חוות דעת ממונה',
    full: 'חוות דעת הרשות להגנת הפרטיות בנושא מינוי ממונה הגנת הפרטיות, 14.07.2026',
    status: 'opinion',
  },
  PPA_AI: {
    short: 'טיוטת הנחיית AI',
    full: 'טיוטת הנחיה: תחולת חוק הגנת הפרטיות על מערכות בינה מלאכותית, אפריל 2025',
    status: 'draft',
  },
};

export const LAW_STATUS_HE = {
  binding: 'מחייב',
  opinion: 'חוות דעת — לא חקיקה',
  draft: 'טיוטה — לא סופית',
};

// OWASP Top 10 for Agentic Applications, 2026 edition (OWASP GenAI Security
// Project, published 09.12.2025). Titles below are the published English ones.
export const ASI = {
  ASI01: 'Agent Goal Hijack',
  ASI02: 'Tool Misuse and Exploitation',
  ASI03: 'Identity and Privilege Abuse',
  ASI04: 'Agentic Supply Chain Vulnerabilities',
  ASI05: 'Unexpected Code Execution (RCE)',
  ASI06: 'Memory & Context Poisoning',
  ASI07: 'Insecure Inter-Agent Communication',
  ASI08: 'Cascading Failures',
  ASI09: 'Human-Agent Trust Exploitation',
  ASI10: 'Rogue Agents',
};
