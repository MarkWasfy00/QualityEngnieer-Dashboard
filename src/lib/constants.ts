export const DEALERSHIP_NAME = process.env.NEXT_PUBLIC_DEALERSHIP_NAME || "إدارة الجودة - معرض السيارات";

// Codes stored in the DB (used for logic & colors) — always shown via label()
export const CONDITIONS = ["New", "Used"] as const;
export const ITEM_RESULTS = ["PASS", "FAIL", "NA"] as const;
export const SEVERITIES = ["Low", "Medium", "High", "Critical"] as const;
export const DEFECT_STATUSES = ["Open", "In Progress", "Fixed", "Closed"] as const;
export const JOB_STATUSES = ["Open", "In Progress", "Completed"] as const;
export const COMPLAINT_STATUSES = ["Open", "Investigating", "Resolved", "Closed"] as const;
export const PAYMENT_TYPES = ["Cash", "Installments", "Bank"] as const;
export const VISIT_OUTCOMES = ["Won", "FollowUp", "Lost"] as const;
export const VISIT_SOURCES = ["زيارة للمعرض", "مكالمة تليفون", "سوشيال ميديا", "ترشيح من عميل", "أخرى"] as const;

export const LABELS: Record<string, string> = {
  New: "زيرو", Used: "مستعملة",
  PASS: "مطابق", FAIL: "غير مطابق", NA: "لا ينطبق",
  Low: "بسيطة", Medium: "متوسطة", High: "عالية", Critical: "حرجة",
  Open: "مفتوحة", "In Progress": "جاري التنفيذ", Fixed: "اتصلحت", Closed: "مقفولة",
  Completed: "خلصت", Investigating: "تحت الفحص", Resolved: "اتحلت",
  Cash: "كاش", Installments: "تقسيط", Bank: "تمويل بنكي",
  Won: "اشترى", Lost: "مشتراش", FollowUp: "لسه بيفكر",
  Collected: "اتحصّلت", Returned: "مردودات", Installment: "قسط",
};
export const label = (code: string | null | undefined) => (code ? LABELS[code] ?? code : "");
export const options = (codes: readonly string[]) => codes.map((c) => ({ value: c, label: label(c) }));

// Free-text lists stored directly in Arabic
export const INSPECTION_TYPES = ["فحص ما قبل التسليم (PDI)", "فحص استلام مستعمل", "فحص قبل البيع"] as const;
export const DEFECT_CATEGORIES = [
  "الموتور", "الفتيس", "الفرامل", "العفشة", "الكهرباء", "الصاج والدهان",
  "الصالون الداخلي", "الكاوتش والجنوط", "التكييف", "الزيوت والتسريب", "أخرى",
] as const;
export const JOB_TYPES = [
  "تغيير زيت وفلاتر", "إصلاح فرامل", "كشف كمبيوتر", "إصلاح كهرباء", "سمكرة ودهان",
  "كاوتش وترصيص", "تجهيز عربية للبيع", "إصلاح ضمان", "أخرى",
] as const;
export const COMPLAINT_CATEGORIES = [
  "جودة العربية", "تأخير في الصيانة", "العطل رجع تاني", "تعامل الموظفين",
  "الفاتورة والحساب", "حالة العربية وقت التسليم", "أخرى",
] as const;

/** Default checklist used when creating a new inspection. */
export const DEFAULT_CHECKLIST: { category: string; items: string[] }[] = [
  { category: "الموتور", items: ["الدوران والسلانسيه مظبوطين", "مفيش لمبات إنذار", "السيور والخراطيم"] },
  { category: "الفرامل", items: ["سُمك التيل", "حالة الطنابير", "مستوى زيت الفرامل"] },
  { category: "الصاج والدهان", items: ["الصاج سليم من غير خبطات", "حالة الدهان", "الإزاز والمرايات"] },
  { category: "الكهرباء", items: ["حالة البطارية", "الفوانيس والإشارات", "الشاشة والكاسيت"] },
  { category: "الصالون الداخلي", items: ["الكراسي والفرش", "التابلوه والمفاتيح", "التكييف"] },
  { category: "الكاوتش والجنوط", items: ["عمق الدعاسة", "ضغط الهوا", "الزوايا والترصيص"] },
  { category: "الزيوت والتسريب", items: ["زيت الموتور", "مية الرادياتير", "مفيش تسريب ظاهر"] },
  { category: "تجربة على الطريق", items: ["الدريكسيون والثبات", "نقل السرعات", "مفيش أصوات غريبة"] },
];

/** Brand palette shared by the UI, Excel and PDF exports. */
export const BRAND = {
  navy: "1E2A44",
  blue: "2563EB",
  light: "EEF2FA",
  zebra: "F7F9FC",
  border: "D5DCE8",
  text: "1F2937",
  muted: "6B7280",
};

export const SEVERITY_COLORS: Record<string, { bg: string; fg: string }> = {
  Critical: { bg: "FDE2E1", fg: "B42318" },
  High: { bg: "FEEBD6", fg: "B54708" },
  Medium: { bg: "FEF6D3", fg: "93670B" },
  Low: { bg: "DCF5E6", fg: "067647" },
};

export const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  PASS: { bg: "DCF5E6", fg: "067647" },
  FAIL: { bg: "FDE2E1", fg: "B42318" },
  NA: { bg: "EEF0F3", fg: "4B5563" },
  Open: { bg: "FDE2E1", fg: "B42318" },
  "In Progress": { bg: "FEF6D3", fg: "93670B" },
  Investigating: { bg: "FEF6D3", fg: "93670B" },
  Fixed: { bg: "DCF5E6", fg: "067647" },
  Completed: { bg: "DCF5E6", fg: "067647" },
  Resolved: { bg: "DCF5E6", fg: "067647" },
  Collected: { bg: "DCF5E6", fg: "067647" },
  Returned: { bg: "EEF0F3", fg: "4B5563" },
  Closed: { bg: "E4E9F2", fg: "344054" },
  Won: { bg: "DCF5E6", fg: "067647" },
  FollowUp: { bg: "FEF6D3", fg: "93670B" },
  Lost: { bg: "FDE2E1", fg: "B42318" },
};
