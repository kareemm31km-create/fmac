/* الخطط الشهرية — الموعد النهائي، قراءة القالب، والتقييم المحسوب.
   المحاور الثمانية كلّها تُحسب من بنية الخطة — بلا ذكاء اصطناعي وبلا تكلفة.
   التصنيف الذي كان يحتاج حكماً (نوع المحتوى) صار إقراراً من المدرب في القالب،
   فصار قابلاً للعدّ. وما لا دليل عليه يبقى بلا رقم (القيد: الصدق في الأرقام). */
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

/* ── قراءة القالب ─────────────────────────────────────────── */
const SH = {
  head: 'بيانات الخطة', obj: 'الأهداف', weeks: 'الأسابيع',
  sess: 'الحصص', kpi: 'المؤشرات',
};
/* صفوف المثال معلَّمة بكلمة «مثال» في العمود الأول ⇒ تُتخطّى */
const isExample = (row) => S(row && row[0]).trim() === 'مثال';

export function parsePlan(sheets) {
  const miss = [];
  for (const k of Object.keys(SH)) if (!sheets[SH[k]]) miss.push(SH[k]);
  if (miss.length) return { ok: false, error: 'أوراق ناقصة: ' + miss.join(' · ') };

  /* بيانات الخطة — مفتاح/قيمة من الصفّ 4 فصاعداً */
  const header = {};
  for (const r of sheets[SH.head].slice(3)) {
    if (has(r[0])) header[S(r[0]).trim()] = S(r[1]).trim();
  }

  const objectives = sheets[SH.obj].slice(3)
    .filter((r) => !isExample(r) && has(r[1]))
    .map((r) => ({ text: S(r[1]), kpi: S(r[2]), when: S(r[3]) }));

  const weeks = sheets[SH.weeks].slice(3)
    .filter((r) => !isExample(r) && (has(r[1]) || has(r[2])))
    .map((r) => ({ no: NUM(r[0]), goal: S(r[1]), nature: S(r[2]), note: S(r[3]) }));

  const sessions = sheets[SH.sess].slice(3)
    .filter((r) => !isExample(r) && (has(r[4]) || has(r[6])))
    .map((r) => ({
      week: NUM(r[0]), day: S(r[1]), date: S(r[2]), goal: S(r[3]),
      section: S(r[4]), dur: NUM(r[5]), item: S(r[6]),
      volume: S(r[7]), rpe: NUM(r[8]), rest: NUM(r[9]), kind: S(r[10]),
    }));

  const kpis = sheets[SH.kpi].slice(3)
    .filter((r) => !isExample(r) && has(r[1]))
    .map((r) => ({ name: S(r[1]), pre: S(r[2]), target: S(r[3]), tool: S(r[4]) }));

  return { ok: true, header, objectives, weeks, sessions, kpis };
}

/* ── المحاور المحسوبة ─────────────────────────────────────── */
const pct = (a, b) => b > 0 ? a / b : 0;
const r0 = (x) => Math.round(x);

/* تمييز العدد في العربية — «هدف واحد» لا «1 هدفاً» */
const AR_N = {
  row: ['صفّ واحد', 'صفّان', 'صفوف', 'صفّاً'],
  goal: ['هدف واحد', 'هدفان', 'أهداف', 'هدفاً'],
  sess: ['حصة واحدة', 'حصتان', 'حصص', 'حصةً'],
  kpi: ['مؤشر واحد', 'مؤشران', 'مؤشرات', 'مؤشراً'],
  item: ['بند واحد', 'بندان', 'بنود', 'بنداً'],
  field: ['حقل واحد', 'حقلان', 'حقول', 'حقلاً'],
  week: ['أسبوع واحد', 'أسبوعان', 'أسابيع', 'أسبوعاً'],
};
const cnt = (n, kind) => {
  const f = AR_N[kind] || AR_N.row;
  if (n === 1) return f[0];
  if (n === 2) return f[1];
  if (n >= 3 && n <= 10) return n + ' ' + f[2];
  return n + ' ' + f[3];
};

const axis = (n, score, evidence, meaning, required) => {
  const def = RUBRIC.find((a) => a.n === n);
  const measured = score !== null && score !== undefined;
  return {
    n, name: def.name, weight: def.weight, source: 'محسوب',
    score: measured ? Math.max(0, Math.min(100, r0(score))) : null,
    weighted: measured ? Math.round(Math.max(0, Math.min(100, score)) * def.weight * 10) / 10 : null,
    evidence, meaning, required,
    priority: measured ? priorityOf(score) : 'عالية',
  };
};

/* محور 3 — تقنين الحمل (0.20) */
function axisLoad(p) {
  const rows = p.sessions;
  if (!rows.length) {
    return axis(3, null, 'لا توجد صفوف في ورقة «الحصص».',
      'لا يمكن قياس تقنين الحمل بلا حصص مكتوبة.',
      'اكتب حصص الشهر في ورقة «الحصص» مع الشدة والحجم والراحة.');
  }
  const withRpe = rows.filter((r) => isFinite(r.rpe) && r.rpe >= 1 && r.rpe <= 10).length;
  const withRest = rows.filter((r) => isFinite(r.rest)).length;
  const withVol = rows.filter((r) => has(r.volume) || isFinite(r.dur)).length;
  const score = 100 * (0.5 * pct(withRpe, rows.length) +
                       0.3 * pct(withRest, rows.length) +
                       0.2 * pct(withVol, rows.length));
  const gaps = [];
  if (withRpe < rows.length) gaps.push('الشدة ناقصة في ' + cnt(rows.length - withRpe, 'row'));
  if (withRest < rows.length) gaps.push('الراحة ناقصة في ' + cnt(rows.length - withRest, 'row'));
  if (withVol < rows.length) gaps.push('الحجم أو المدة ناقص في ' + cnt(rows.length - withVol, 'row'));
  return axis(3, score,
    'من ' + cnt(rows.length, 'row') + ': ' + withRpe + ' فيها شدة رقمية (1–10)، و' +
      withRest + ' فيها راحة، و' + withVol + ' فيها حجم أو مدة.',
    score >= 80 ? 'الحمل مقنَّن بصورة تسمح بتجميعه ومقارنته بين الأسابيع.'
      : 'الأساس موجود لكن لا يمكن تجميع الحمل رقمياً على كل الحصص.',
    gaps.length ? ('أكمل: ' + gaps.join(' · ') + '.') : 'لا مطلوب — المحور مكتمل.');
}

/* محور 2 — البناء الدوري (0.15) */
function axisPeriodisation(p) {
  const byWeek = {};
  for (const r of p.sessions) {
    if (!isFinite(r.week) || !isFinite(r.dur) || !isFinite(r.rpe)) continue;
    byWeek[r.week] = (byWeek[r.week] || 0) + r.dur * r.rpe;
  }
  const keys = Object.keys(byWeek).map(Number).sort((a, b) => a - b);
  const loads = keys.map((k) => byWeek[k]);

  if (loads.length < 2) {
    return axis(2, null,
      'عدد الأسابيع التي يمكن حساب حملها: ' + loads.length + '.',
      'موجة الحمل تحتاج أسبوعين على الأقل بشدّة ومدّة مكتوبتين.',
      'اكتب المدة والشدة لحصص أسبوعين على الأقل.');
  }

  const mean = loads.reduce((a, b) => a + b, 0) / loads.length;
  let changes = 0;
  for (let i = 1; i < loads.length; i++) {
    if (mean > 0 && Math.abs(loads[i] - loads[i - 1]) / mean >= 0.05) changes++;
  }
  const loadScore = 100 * pct(changes, loads.length - 1);
  const goalScore = 100 * pct(p.weeks.filter((w) => has(w.goal)).length, Math.max(1, p.weeks.length));
  const natScore = 100 * pct(p.weeks.filter((w) => has(w.nature)).length, Math.max(1, p.weeks.length));
  const score = 0.5 * loadScore + 0.3 * goalScore + 0.2 * natScore;

  return axis(2, score,
    'أحمال الأسابيع (مدة × شدة): ' + loads.map(r0).join(' ← ') + '. ' +
      'تغيّر ملموس في ' + changes + ' من ' + (loads.length - 1) + ' انتقالاً. ' +
      p.weeks.filter((w) => has(w.goal)).length + ' من ' + cnt(p.weeks.length, 'week') + ' له هدف مكتوب.',
    changes === 0 ? 'الحمل ثابت بين الأسابيع، فلا تظهر موجة تدرّج.'
      : score >= 80 ? 'الأسابيع مترابطة وموجة الحمل واضحة.'
        : 'يوجد تدرّج لكنه غير مكتمل أو غير موصوف.',
    changes === 0 ? 'غيّر الحجم أو الشدة بين الأسابيع بما يعكس مرحلة الموسم.'
      : 'أكمل هدف الأسبوع وطبيعته (تأسيس · رفع حمل · تخفيف · منافسة) لكل أسبوع.');
}

/* محور 5 — بناء الوحدة وتوزيع الزمن (0.10) */
const WARM = ['إحماء', 'تمهيد', 'تهيئة'];
const MAIN = ['رئيسي', 'أساسي'];
const COOL = ['تهدئة', 'ختام', 'استشفاء'];
const kindOf = (name) => {
  const t = S(name);
  if (WARM.some((x) => t.indexOf(x) >= 0)) return 'warm';
  if (MAIN.some((x) => t.indexOf(x) >= 0)) return 'main';
  if (COOL.some((x) => t.indexOf(x) >= 0)) return 'cool';
  return 'other';
};
function axisSession(p) {
  const rows = p.sessions;
  if (!rows.length) {
    return axis(5, null, 'لا توجد صفوف في ورقة «الحصص».',
      'لا يمكن فحص بناء الوحدة بلا أقسام مكتوبة.',
      'اكتب أقسام كل حصة: الإحماء والجزء الرئيسي والتهدئة.');
  }
  const sess = {};
  for (const r of rows) {
    const k = r.week + '|' + r.day + '|' + r.date;
    if (!sess[k]) sess[k] = { warm: 0, main: 0, cool: 0 };
    const kind = kindOf(r.section);
    if (kind !== 'other') sess[k][kind]++;
  }
  const all = Object.keys(sess);
  const complete = all.filter((k) => sess[k].warm && sess[k].main && sess[k].cool).length;
  const withDur = rows.filter((r) => isFinite(r.dur) && r.dur > 0).length;
  const score = 100 * (0.6 * pct(complete, all.length) + 0.4 * pct(withDur, rows.length));

  return axis(5, score,
    complete + ' من ' + cnt(all.length, 'sess') + ' فيها الإحماء والجزء الرئيسي والتهدئة معاً، و' +
      withDur + ' من ' + cnt(rows.length, 'row') + ' فيه مدة القسم.',
    score >= 80 ? 'بناء الوحدة واضح وزمنها موزَّع.'
      : 'بعض الحصص ناقصة الأقسام أو بلا توزيع زمني.',
    complete < all.length
      ? ('أكمل الأقسام الثلاثة في ' + cnt(all.length - complete, 'sess') + '، واكتب مدة كل قسم.')
      : 'أكمل مدة القسم في الصفوف الناقصة.');
}

/* محور 8 — جودة التوثيق (0.05) */
const HEAD_FIELDS = ['اسم المدرب', 'اللعبة', 'الفرع', 'الفئة', 'الشهر',
  'عدد اللاعبين', 'مرحلة الموسم', 'البطولة القادمة'];
function axisDocs(p) {
  const filled = HEAD_FIELDS.filter((f) => has(p.header[f]));
  const monthOk = !!monthKey(p.header['الشهر']);
  const score = 100 * (0.7 * pct(filled.length, HEAD_FIELDS.length) + 0.3 * (monthOk ? 1 : 0));
  const missing = HEAD_FIELDS.filter((f) => !has(p.header[f]));
  return axis(8, score,
    filled.length + ' من ' + cnt(HEAD_FIELDS.length, 'field') + ' مكتمل في «بيانات الخطة». ' +
      (monthOk ? 'الشهر مقروء: ' + monthLabel(monthKey(p.header['الشهر'])) + '.'
               : 'الشهر غير مقروء أو غير مكتوب.'),
    score >= 80 ? 'التوثيق مكتمل ويسمح بالأرشفة والمقارنة.'
      : 'نقص التوثيق يصعّب الأرشفة وربط الخطة بصاحبها.',
    missing.length ? ('أكمل: ' + missing.join(' · ') + '.')
      : (monthOk ? 'لا مطلوب.' : 'اكتب الشهر بصيغة «سبتمبر 2026».'));
}

/* محور 1 — وضوح الأهداف وقابليتها للقياس (0.15)
   «محدد زمنياً ويمكن التحقق منه» ⇒ مؤشر رقمي + موعد قياس */
const hasDigit = (t) => /[0-9٠-٩]/.test(S(t));
function axisGoals(p) {
  const o = p.objectives;
  if (!o.length) {
    return axis(1, 0, 'ورقة «الأهداف» فارغة.',
      'بلا أهداف مكتوبة لا يمكن الحكم على الخطة ولا قياس تحققها.',
      'اكتب أهداف الشهر، ولكل هدف مؤشر رقمي وموعد قياس.');
  }
  const withKpi = o.filter((x) => hasDigit(x.kpi)).length;
  const withWhen = o.filter((x) => has(x.when)).length;
  const score = 100 * (0.6 * pct(withKpi, o.length) + 0.4 * pct(withWhen, o.length));
  return axis(1, score,
    'من ' + cnt(o.length, 'goal') + ': ' + withKpi + ' له مؤشر رقمي، و' +
      withWhen + ' له موعد قياس.',
    score >= 80 ? 'الأهداف محددة زمنياً وقابلة للتحقق رقمياً.'
      : 'الأهداف موجودة لكن لا يمكن إثبات تحققها رقمياً.',
    withKpi < o.length
      ? ('أضف مؤشراً رقمياً لـ' + cnt(o.length - withKpi, 'goal') + ' (مثل: نجاح 8 من 10).')
      : (withWhen < o.length ? 'أضف موعد القياس لكل هدف.' : 'لا مطلوب.'));
}

/* محور 4 — التكامل الفني والبدني والخططي والنفسي (0.15)
   التصنيف إقرار المدرب في عمود «نوع المحتوى» لا تخمين. */
function axisIntegration(p) {
  const rows = p.sessions;
  if (!rows.length) {
    return axis(4, null, 'لا توجد صفوف في ورقة «الحصص».',
      'لا يمكن قياس التوازن بلا محتوى مكتوب.',
      'اكتب الحصص وصنّف كل بند في عمود «نوع المحتوى».');
  }
  const counts = {};
  for (const t of CONTENT_TYPES) counts[t] = 0;
  let tagged = 0;
  for (const r of rows) {
    const t = CONTENT_TYPES.find((x) => S(r.kind).indexOf(x) >= 0);
    if (t) { counts[t]++; tagged++; }
  }
  if (!tagged) {
    return axis(4, 0, 'لم يُصنَّف أي بند في عمود «نوع المحتوى».',
      'بلا تصنيف لا يمكن إثبات توازن المحتوى بين الفني والبدني والخططي والنفسي.',
      'صنّف كل بند من القائمة المنسدلة: فني · بدني · خططي · نفسي.');
  }
  const present = CONTENT_TYPES.filter((t) => counts[t] > 0);
  const shares = present.map((t) => counts[t] / tagged);
  const even = shares.length ? Math.min(...shares) / Math.max(...shares) : 0;
  const score = 100 * (0.5 * pct(tagged, rows.length) +
                       0.3 * (present.length / CONTENT_TYPES.length) +
                       0.2 * even);
  const missing = CONTENT_TYPES.filter((t) => !counts[t]);
  return axis(4, score,
    'صُنِّف ' + tagged + ' من ' + cnt(rows.length, 'item') + ': ' +
      CONTENT_TYPES.map((t) => t + ' ' + counts[t]).join(' · ') + '.',
    missing.length ? ('غاب من الخطة: ' + missing.join(' و') + '.')
      : (score >= 80 ? 'المحتوى متوازن بين الجوانب الأربعة.'
        : 'الجوانب الأربعة موجودة لكن التوزيع غير متوازن.'),
    missing.length ? ('أضف محتوى ' + missing.join(' و') + ' أو صنّف ما يقابلها.')
      : (tagged < rows.length ? ('صنّف ' + cnt(rows.length - tagged, 'item') + ' متبقياً.')
        : 'لا مطلوب.'));
}

/* محور 6 — مؤشرات القياس والاختبارات (0.10) */
function axisKpis(p) {
  const k = p.kpis;
  if (!k.length) {
    return axis(6, 0, 'ورقة «المؤشرات» فارغة.',
      'بلا اختبارات قبلية وبعدية لا يمكن إثبات التطوّر.',
      'أضف مؤشرين على الأقل، ولكلٍّ قياس قبلي ومستهدف وأداة قياس.');
  }
  const pre = k.filter((x) => has(x.pre)).length;
  const tgt = k.filter((x) => has(x.target)).length;
  const tool = k.filter((x) => has(x.tool)).length;
  const score = 100 * (0.3 * Math.min(1, k.length / 2) + 0.3 * pct(pre, k.length) +
                       0.2 * pct(tgt, k.length) + 0.2 * pct(tool, k.length));
  const gaps = [];
  if (pre < k.length) gaps.push('القياس القبلي ناقص في ' + (k.length - pre));
  if (tgt < k.length) gaps.push('المستهدف ناقص في ' + (k.length - tgt));
  if (tool < k.length) gaps.push('أداة القياس ناقصة في ' + (k.length - tool));
  return axis(6, score,
    cnt(k.length, 'kpi') + ': ' + pre + ' له قياس قبلي، و' + tgt + ' له مستهدف، و' +
      tool + ' له أداة قياس.',
    score >= 80 ? 'التطوّر قابل للإثبات رقمياً قبل وبعد.'
      : 'المتابعة موجودة لكن التطوّر لا يُقاس بالكامل.',
    gaps.length ? ('أكمل: ' + gaps.join(' · ') + '.') : 'لا مطلوب.');
}

/* محور 7 — ملاءمة الفئة والسلامة والاستشفاء (0.10) */
function axisSafety(p) {
  const rows = p.sessions;
  const cat = has(p.header['الفئة']);
  const recovery = has(p.header['إجراءات الاستشفاء']);
  const safety = has(p.header['إجراءات السلامة والوقاية']);
  if (!rows.length && !cat && !recovery && !safety) {
    return axis(7, null, 'لا بيانات فئة ولا استشفاء ولا حصص.',
      'لا يمكن الحكم على الملاءمة والسلامة بلا بيانات.',
      'اكتب الفئة وإجراءات الاستشفاء والسلامة، واذكر التهدئة في الحصص.');
  }
  const sess = {};
  for (const r of rows) {
    const k = r.week + '|' + r.day + '|' + r.date;
    if (!sess[k]) sess[k] = false;
    if (kindOf(r.section) === 'cool') sess[k] = true;
  }
  const all = Object.keys(sess);
  const cool = all.filter((k) => sess[k]).length;
  const coolFrac = all.length ? pct(cool, all.length) : 0;
  const score = 100 * (0.25 * (cat ? 1 : 0) + 0.25 * (recovery ? 1 : 0) +
                       0.25 * (safety ? 1 : 0) + 0.25 * coolFrac);
  const gaps = [];
  if (!cat) gaps.push('الفئة');
  if (!recovery) gaps.push('إجراءات الاستشفاء');
  if (!safety) gaps.push('إجراءات السلامة والوقاية');
  if (cool < all.length) gaps.push('التهدئة في ' + cnt(all.length - cool, 'sess'));
  return axis(7, score,
    (cat ? 'الفئة مكتوبة' : 'الفئة غير مكتوبة') + ' · ' +
      (recovery ? 'الاستشفاء موصوف' : 'الاستشفاء غير موصوف') + ' · ' +
      (safety ? 'السلامة موصوفة' : 'السلامة غير موصوفة') + ' · ' +
      cool + ' من ' + cnt(all.length, 'sess') + ' فيها تهدئة.',
    score >= 80 ? 'الخطة تراعي الفئة والسلامة والاستشفاء.'
      : 'نقص السلامة والاستشفاء يرفع خطر الإصابة والإجهاد.',
    gaps.length ? ('أكمل: ' + gaps.join(' · ') + '.') : 'لا مطلوب.');
}

/* ── التجميع ──────────────────────────────────────────────── */
export function evaluate(plan) {
  const axes = [
    axisGoals(plan), axisPeriodisation(plan), axisLoad(plan), axisIntegration(plan),
    axisSession(plan), axisKpis(plan), axisSafety(plan), axisDocs(plan),
  ].sort((a, b) => a.n - b.n);

  const measured = axes.filter((a) => a.score !== null);
  const covW = measured.reduce((s, a) => s + a.weight, 0);
  const sum = measured.reduce((s, a) => s + a.score * a.weight, 0);
  /* النتيجة تُطبَّع على أوزان المحاور المقيسة وحدها —
     المحور غير المقيس لا يُحسب صفراً (القيد: ما لا يُقاس يُعرض —) */
  const total = covW > 0 ? Math.round(sum / covW) : null;
  const g = total === null ? null : gradeOf(total);

  return {
    axes, total,
    coverage: Math.round(covW * 100),
    grade: g ? g.grade : '—',
    decision: g ? g.decision : 'بانتظار التقييم',
    action: g ? g.action : '—',
    at: new Date().toISOString(),
  };
}

/** يقرأ الملف ويقيّمه — نقطة الدخول الوحيدة للواجهة */
export async function evaluateFile(arrayBuffer, readXlsx) {
  let sheets;
  try {
    sheets = await readXlsx(arrayBuffer);
  } catch (e) {
    return { ok: false, error: 'تعذّرت قراءة الملف: ' + (e && e.message) };
  }
  const plan = parsePlan(sheets);
  if (!plan.ok) return plan;
  const result = evaluate(plan);
  return { ok: true, plan, result };
}
