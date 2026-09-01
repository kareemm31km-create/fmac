/* قراءة نموذج الخطة الشهرية المعتمد في النادي.
   ورقة لكل أسبوع · الأيام عبر الأعمدة (ثلاثة أعمدة لكل يوم) · الأقسام في الصفوف.
   صفوف الأوراق مزحزحة عن بعضها، فالمواضع تُستدلّ بالمحتوى لا برقم الصف. */
import { S } from './fmac-payload.js';

const has = (v) => S(v).trim() !== '';
const NUM = (v) => {
  const s = S(v).replace(/[٬،\s]/g, '').replace(/[٠-٩]/g,
    (d) => String(d.charCodeAt(0) - 1632));
  if (s === '') return NaN;
  const n = Number(s);
  return isFinite(n) ? n : NaN;
};

/* أوّل رقم داخل نصّ — «الأسبوع التدريبي رقم : 34» ⇒ 34 */
const firstNum = (t) => {
  const m = S(t).replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632)).match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : NaN;
};
/* ما بعد النقطتين — «المرحلة : الاعداد» ⇒ «الاعداد» */
const afterColon = (t) => {
  const s = S(t);
  const i = s.indexOf(':');
  return i >= 0 ? s.slice(i + 1).trim() : '';
};

export const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
/* كل يوم ثلاثة أعمدة: هدف التدريب · الشدة · الحجم */
const DAY_SPAN = 3;

const cell = (rows, r, c) => (rows[r] && rows[r][c] !== undefined) ? S(rows[r][c]) : '';
const rowText = (rows, r) => (rows[r] || []).join(' ');

/* أوّل صفّ يحقّق الشرط */
function findRow(rows, test, from, to) {
  const a = from || 0, b = to === undefined ? rows.length : to;
  for (let r = a; r < b; r++) if (test(rows[r] || [], r)) return r;
  return -1;
}

export function isWeekSheet(name) {
  return /(اسبوع|أسبوع)\s*\d+/.test(S(name));
}
export const weekNoOfSheet = (name) => {
  const n = firstNum(name);
  return isFinite(n) ? n : 0;
};

/** يقرأ ورقة أسبوع واحدة */
export function parseWeekSheet(rows, sheetName) {
  const out = {
    sheet: S(sheetName), no: weekNoOfSheet(sheetName),
    trainingWeek: '', phase: '', period: '',
    objectives: [], days: [],
  };

  /* صفّ العناوين الفرعية: يحوي «هدف التدريب» — والقيم في الصفّ التالي */
  const subRow = findRow(rows, (r) => r.some((c) => S(c).indexOf('هدف التدريب') >= 0));
  if (subRow < 0) return null;                       // ليست ورقة خطة
  const valRow = subRow + 1;

  /* صفّ أسماء الأيام: آخر صفّ قبل العناوين الفرعية يحوي اسم يوم */
  let dayRow = -1;
  for (let r = subRow - 1; r >= 0; r--) {
    if ((rows[r] || []).some((c) => DAY_NAMES.indexOf(S(c).trim()) >= 0)) { dayRow = r; break; }
  }
  if (dayRow < 0) return null;

  /* بيانات الأسبوع — في صفّ واحد قبل جدول الأيام */
  const metaRow = findRow(rows, (r) =>
    r.some((c) => S(c).indexOf('الأسبوع التدريبي رقم') >= 0), 0, dayRow);
  if (metaRow >= 0) {
    for (const c of rows[metaRow] || []) {
      const t = S(c);
      if (t.indexOf('الأسبوع التدريبي رقم') >= 0 && !out.trainingWeek) {
        out.trainingWeek = afterColon(t);
      } else if (t.indexOf('المرحلة') >= 0 && !out.phase) {
        out.phase = afterColon(t);
      } else if (t.indexOf('الفترة') >= 0 && !out.period) {
        out.period = afterColon(t);
      }
    }
  }

  /* الأهداف: العمود الأول رقم 1..8 والنصّ في العمود الثاني */
  for (let r = 0; r < dayRow; r++) {
    const n = NUM(cell(rows, r, 0));
    if (!isFinite(n) || n < 1 || n > 20) continue;
    const txt = cell(rows, r, 1) || cell(rows, r, 2);
    if (has(txt)) out.objectives.push(S(txt));
  }

  /* أقسام الوحدة — تُستدلّ بالكلمة المميّزة في العمودين الأولين */
  const secRow = (kw) => findRow(rows, (r) => {
    const t = (S(r[0]) + ' ' + S(r[1]));
    return kw.some((k) => t.indexOf(k) >= 0);
  }, subRow);
  const warmRow = secRow(['التمهيدي', 'الإعدادي', 'الاعدادي', 'الإحماء']);
  const mainRow = secRow(['الرئيسي']);
  const coolRow = secRow(['الختامي', 'التهدئة']);
  const noteRow = secRow(['ملاحظات']);

  /* أعمدة الأيام: تبدأ من أوّل عمود فيه اسم يوم، ثم كل ثلاثة أعمدة */
  const dayCells = rows[dayRow] || [];
  let firstCol = -1;
  for (let c = 0; c < dayCells.length; c++) {
    if (DAY_NAMES.indexOf(S(dayCells[c]).trim()) >= 0) { firstCol = c; break; }
  }
  if (firstCol < 0) return null;

  for (let c = firstCol; c < firstCol + DAY_SPAN * 7; c += DAY_SPAN) {
    const name = S(dayCells[c]).trim();
    if (!name || DAY_NAMES.indexOf(name) < 0) continue;
    const d = {
      day: name,
      goal: cell(rows, valRow, c),
      intensity: NUM(cell(rows, valRow, c + 1)),
      volume: NUM(cell(rows, valRow, c + 2)),
      warm: warmRow >= 0 ? cell(rows, warmRow, c) : '',
      main: mainRow >= 0 ? cell(rows, mainRow, c) : '',
      cool: coolRow >= 0 ? cell(rows, coolRow, c) : '',
      note: noteRow >= 0 ? cell(rows, noteRow, c) : '',
    };
    /* يوم بلا أي محتوى = راحة، لا يُحسب ضمن أيام التدريب */
    d.active = has(d.goal) || has(d.warm) || has(d.main) || has(d.cool) ||
               isFinite(d.intensity) || isFinite(d.volume);
    out.days.push(d);
  }
  return out;
}

/** يقرأ الملفّ كلّه — كل ورقة «اسبوع ن» */
export function parseCoachPlan(sheets) {
  const names = Object.keys(sheets).filter(isWeekSheet)
    .sort((a, b) => weekNoOfSheet(a) - weekNoOfSheet(b));
  if (!names.length) {
    return { ok: false,
      error: 'لم يُعثر على أوراق الأسابيع. المتوقَّع أوراق باسم «اسبوع 1» … «اسبوع 4».' };
  }
  const weeks = [];
  for (const n of names) {
    const w = parseWeekSheet(sheets[n], n);
    if (w) weeks.push(w);
  }
  if (!weeks.length) {
    return { ok: false, error: 'أوراق الأسابيع موجودة لكن تخطيطها غير متوقَّع.' };
  }
  const activeDays = weeks.reduce((s, w) => s + w.days.filter((d) => d.active).length, 0);
  return { ok: true, weeks, activeDays, sheetNames: names };
}
