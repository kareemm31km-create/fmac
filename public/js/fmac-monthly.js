/* الخطط الشهرية — الموعد النهائي، قراءة القالب، والتقييم المحسوب.
   محاور التقييم والتقديرات والتواريخ. القراءة والتقييم في fmac-coachplan.js.
   المحاور الثمانية كلّها محسوبة — بلا ذكاء اصطناعي وبلا تكلفة.
   وما لا دليل عليه يبقى بلا رقم (القيد: الصدق في الأرقام). */
import { AR_MONTHS, S } from './fmac-payload.js';

/* الخانة الفارغة ترجع NaN لا صفراً — الفرق بين «لم يكتب» و«كتب صفراً»
   جوهري في التقييم: الأولى نقص توثيق، والثانية قيمة حقيقية. */
const NUM = (v) => {
  const s = String(v ?? '').replace(/[٬،\s]/g, '')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
  if (s === '') return NaN;
  const n = Number(s);
  return isFinite(n) ? n : NaN;
};
const has = (v) => S(v).trim() !== '';

/* ── محاور التقييم — منقولة عن ورقة «آلية التقييم» ── */
export const RUBRIC = [
  { n: 1, name: 'وضوح الأهداف وقابليتها للقياس', weight: 0.15, auto: true },
  { n: 2, name: 'البناء الدوري والتدرج بين الأسابيع', weight: 0.15, auto: true },
  { n: 3, name: 'تقنين الحمل: الحجم والشدة والراحة', weight: 0.20, auto: true },
  { n: 4, name: 'التكامل الفني والبدني والخططي والنفسي', weight: 0.15, auto: true },
  { n: 5, name: 'بناء الوحدة التدريبية وتوزيع الزمن', weight: 0.10, auto: true },
  { n: 6, name: 'مؤشرات القياس والاختبارات والمتابعة', weight: 0.10, auto: true },
  { n: 7, name: 'ملاءمة الفئة والسلامة والاستشفاء', weight: 0.10, auto: true },
  { n: 8, name: 'جودة التوثيق واتساق البيانات', weight: 0.05, auto: true },
];

/* أنواع المحتوى — يعلنها المدرب في عمود «نوع المحتوى» */
export const CONTENT_TYPES = ['فني', 'بدني', 'خططي', 'نفسي'];

export const GRADES = [
  { min: 90, grade: 'متميز', decision: 'اعتماد كمرجع', action: 'تعميم أفضل الممارسات' },
  { min: 80, grade: 'جيد جداً', decision: 'اعتماد', action: 'تحسينات محدودة' },
  { min: 70, grade: 'جيد', decision: 'اعتماد مشروط', action: 'إغلاق نقاط التحسين' },
  { min: 60, grade: 'مقبول', decision: 'إعادة ضبط جزئي', action: 'إعادة تقديم الخطة بعد التعديل' },
  { min: 0, grade: 'يحتاج تطوير', decision: 'إعادة بناء', action: 'مراجعة فنية قبل الاعتماد' },
];
export const gradeOf = (score) => GRADES.find((g) => score >= g.min) || GRADES[GRADES.length - 1];

/* الأولوية — عن ورقة «شرح التقييم» */
export const priorityOf = (score) =>
  score < 60 ? 'عالية' : score < 80 ? 'متوسطة' : 'منخفضة';

/* ── الشهر والموعد النهائي ─────────────────────────────────── */
/** «سبتمبر 2026» ⇒ '2026-09' */
export function monthKey(label) {
  const t = S(label);
  const y = t.match(/(20\d\d)/);
  let mo = 0;
  for (let i = 0; i < AR_MONTHS.length; i++) if (t.indexOf(AR_MONTHS[i]) >= 0) mo = i + 1;
  if (!y || !mo) return '';
  return y[1] + '-' + String(mo).padStart(2, '0');
}
export function monthLabel(key) {
  const m = S(key).match(/^(\d{4})-(\d{2})$/);
  if (!m) return S(key);
  return AR_MONTHS[Number(m[2]) - 1] + ' ' + m[1];
}
/** الأسبوع ينتمي لشهره تلقائياً — لا ربط يدوي */
export const monthOfWeek = (weekLabel) => monthKey(weekLabel);

/**
 * الموعد النهائي لخطة شهر: آخر يوم في الشهر السابق ناقص يوم واحد.
 * خطة سبتمبر 2026 ⇒ أغسطس 31 يوماً ⇒ الموعد 30 أغسطس.
 */
export function dueDateFor(key) {
  const m = S(key).match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]);
  /* اليوم صفر من الشهر الحالي = آخر يوم في الشهر السابق */
  const lastPrev = new Date(Date.UTC(y, mo - 1, 0));
  lastPrev.setUTCDate(lastPrev.getUTCDate() - 1);
  lastPrev.setUTCHours(23, 59, 59, 999);
  return lastPrev;
}
export function dueLabel(key) {
  const d = dueDateFor(key);
  if (!d) return '—';
  return d.getUTCDate() + ' ' + AR_MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
}
/** الرفع بعد الموعد يُقبل ويُوسم — لا يُمنع */
export function lateness(key, uploadedISO) {
  const due = dueDateFor(key);
  if (!due) return { state: '—', days: 0 };
  const up = new Date(uploadedISO || Date.now());
  if (isNaN(up.getTime())) return { state: '—', days: 0 };
  if (up <= due) return { state: 'في الموعد', days: 0 };
  const days = Math.ceil((up - due) / 86400000);
  return { state: 'متأخرة', days };
}

/* قراءة النموذج وتقييمه في fmac-coachplan.js — هذا الملف للـrubric والتواريخ. */
