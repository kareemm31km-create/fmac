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

/** كل الأرقام داخل نصّ، مع احترام فاصل الآلاف ووحدات القياس.
 *  «5,000م» ⇒ [5000] · «80–94%» ⇒ [80,94] · «0.65» ⇒ [0.65] */
export function numbersIn(t) {
  const s = S(t)
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/[٬]/g, '')
    .replace(/(\d),(\d{3})(?!\d)/g, '$1$2');       // 5,000 ⇒ 5000
  return (s.match(/\d+(?:\.\d+)?/g) || []).map(Number);
}

/** الشدة تُكتب رقماً أو نسبةً أو مدى: «0.65» · «7» · «85%» · «80–94%».
 *  المدى يُؤخذ بوسطه. ثم تُوحَّد على مقياس 0–10. */
export function parseIntensity(raw) {
  const nums = numbersIn(raw);
  if (!nums.length) return NaN;
  const v = nums.length >= 2 ? (nums[0] + nums[1]) / 2 : nums[0];
  return normIntensity(v);
}

/** المدربون يكتبون الشدة ككسر (0.65) أو كـRPE (7). نوحّدها على مقياس 0–10.
 *  القيمة ≤ 1 تُقرأ كسراً — فـ«1» تعني الشدة القصوى لا RPE‑1. */
export function normIntensity(v) {
  const n = Number(v);
  if (!isFinite(n) || n <= 0) return NaN;
  let r;
  if (n <= 1) r = n * 10;
  else if (n <= 10) r = n;
  else if (n <= 100) r = n / 10;               // مكتوبة نسبةً مئوية
  else return NaN;
  /* إكسل يكتب 0.55 أحياناً 0.55000000000000004 — نقرّب لمنزلتين */
  return Math.round(r * 100) / 100;
}

/** الحجم يُكتب رقماً أحياناً وكلمةً أحياناً («متوسط»).
 *  الوصفي لا يُجمَّع، فيأخذ نصف رصيد المحور — والـrubric تشترط
 *  «بديلاً عددياً قابلاً للتجميع». */
export function parseVolume(raw) {
  const t = S(raw).trim();
  if (!t) return { kind: '', value: NaN };
  const nums = numbersIn(t);
  /* «5,000م» و«4×50» رقميان قابلان للتجميع؛ «متوسط» وصفيّ */
  if (nums.length) return { kind: 'رقمي', value: nums[0] };
  return { kind: 'وصفي', value: NaN };
}
export const volumeKind = (raw) => parseVolume(raw).kind;

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
  /* صفّان مضافان في النموذج الموسّع — غيابهما لا يكسر القراءة */
  const typeRow = secRow(['نوع المحتوى']);
  const restRow = secRow(['الراحة']);

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
    const rawInt = cell(rows, valRow, c + 1);
    const rawVol = cell(rows, valRow, c + 2);
    const vol = parseVolume(rawVol);
    const d = {
      day: name,
      goal: cell(rows, valRow, c),
      intensity: rawInt,
      rpe: parseIntensity(rawInt),
      volume: vol.value,
      volumeText: rawVol,
      volumeKind: vol.kind,
      warm: warmRow >= 0 ? cell(rows, warmRow, c) : '',
      main: mainRow >= 0 ? cell(rows, mainRow, c) : '',
      cool: coolRow >= 0 ? cell(rows, coolRow, c) : '',
      note: noteRow >= 0 ? cell(rows, noteRow, c) : '',
      kind: typeRow >= 0 ? cell(rows, typeRow, c) : '',
      rest: restRow >= 0 ? NUM(cell(rows, restRow, c)) : NaN,
    };
    /* يوم بلا أي محتوى = راحة، لا يُحسب ضمن أيام التدريب */
    d.active = has(d.goal) || has(d.warm) || has(d.main) || has(d.cool) ||
               isFinite(d.rpe) || has(d.volumeText);
    out.days.push(d);
  }
  return out;
}

/* الأوراق المعروفة التي ليست أسابيع */
const NON_WEEK = ['بيانات الخطة', 'المؤشرات', 'تعليمات'];

/** يقرأ الملفّ كلّه.
 *  الورقة تُعَدّ أسبوعاً بمحتواها لا باسمها — المدربون يسمّونها
 *  «اسبوع 1» أو «اغسطس 1» أو غير ذلك، فالاسم ليس عقداً. */
export function parseCoachPlan(sheets) {
  const all = Object.keys(sheets).filter((n) => NON_WEEK.indexOf(n) < 0);
  const weeks = [];
  for (const n of all) {
    const w = parseWeekSheet(sheets[n], n);
    if (w && w.days.length) weeks.push(w);
  }
  /* الترتيب: برقم داخل الاسم إن وُجد، وإلا بترتيب الأوراق */
  weeks.sort((a, b) => {
    const x = weekNoOfSheet(a.sheet), y = weekNoOfSheet(b.sheet);
    if (x && y && x !== y) return x - y;
    return all.indexOf(a.sheet) - all.indexOf(b.sheet);
  });
  weeks.forEach((w, i) => { if (!w.no) w.no = i + 1; });

  if (!weeks.length) {
    return { ok: false,
      error: 'لم يُعثر على أوراق أسابيع. الورقة تحتاج صفّ «هدف التدريب» وأسماء الأيام.' };
  }
  const activeDays = weeks.reduce((s, w) => s + w.days.filter((d) => d.active).length, 0);

  /* ورقتان مضافتان — غيابهما يجعل محاورهما غير قابلة للقياس، ولا يمنع القراءة */
  const header = {};
  const hs = sheets['بيانات الخطة'];
  if (hs) for (const r of hs.slice(3)) { if (has(r[0])) header[S(r[0]).trim()] = S(r[1]).trim(); }

  const kpis = [];
  const ks = sheets['المؤشرات'];
  if (ks) {
    for (const r of ks.slice(3)) {
      if (S(r[0]).trim() === 'مثال') continue;
      if (has(r[1])) kpis.push({ name: S(r[1]), pre: S(r[2]), target: S(r[3]), tool: S(r[4]) });
    }
  }

  return { ok: true, weeks, activeDays, sheetNames: weeks.map((w) => w.sheet), header, kpis,
    hasHeaderSheet: !!hs, hasKpiSheet: !!ks };
}

/* ═══════════ التقييم على بنية هذا النموذج ═══════════ */
import { RUBRIC, gradeOf, priorityOf } from './fmac-monthly.js';

const pct = (a, b) => b > 0 ? a / b : 0;
const AR_N = {
  day: ['يوم واحد', 'يومان', 'أيام', 'يوماً'],
  week: ['أسبوع واحد', 'أسبوعان', 'أسابيع', 'أسبوعاً'],
  goal: ['هدف واحد', 'هدفان', 'أهداف', 'هدفاً'],
  kpi: ['مؤشر واحد', 'مؤشران', 'مؤشرات', 'مؤشراً'],
  field: ['حقل واحد', 'حقلان', 'حقول', 'حقلاً'],
};
const cnt = (n, kind) => {
  const f = AR_N[kind] || AR_N.day;
  if (n === 1) return f[0];
  if (n === 2) return f[1];
  if (n >= 3 && n <= 10) return n + ' ' + f[2];
  return n + ' ' + f[3];
};

const mk = (n, score, evidence, meaning, required) => {
  const def = RUBRIC.find((a) => a.n === n);
  const ok = score !== null && score !== undefined;
  const s = ok ? Math.max(0, Math.min(100, Math.round(score))) : null;
  return {
    n, name: def.name, weight: def.weight, source: 'محسوب',
    score: s, weighted: ok ? Math.round(s * def.weight * 10) / 10 : null,
    evidence, meaning, required,
    priority: ok ? priorityOf(s) : 'عالية',
  };
};

const CONTENT_TYPES = ['فني', 'بدني', 'خططي', 'نفسي'];
const HEAD_FIELDS = ['اسم المدرب', 'اللعبة', 'الفرع', 'الفئة', 'الشهر', 'عدد اللاعبين',
  'مرحلة الموسم', 'البطولة القادمة'];

export function evaluateCoachPlan(p) {
  const weeks = p.weeks;
  const days = [];
  for (const w of weeks) for (const d of w.days) if (d.active) days.push(d);
  const nd = days.length;

  /* ── 1. الأهداف ── */
  const allObj = weeks.reduce((a, w) => a.concat(w.objectives), []);
  const withNum = allObj.filter((t) => /[0-9٠-٩]/.test(t)).length;
  const wkWithObj = weeks.filter((w) => w.objectives.length).length;
  const a1 = !allObj.length
    ? mk(1, 0, 'لا أهداف مكتوبة في أي أسبوع.',
      'بلا أهداف لا يمكن الحكم على الخطة ولا قياس تحققها.',
      'اكتب أهداف كل أسبوع في أعلى ورقته، ولكل هدف مؤشر رقمي.')
    : mk(1, 100 * (0.5 * pct(wkWithObj, weeks.length) + 0.5 * pct(withNum, allObj.length)),
      cnt(allObj.length, 'goal') + ' في ' + cnt(wkWithObj, 'week') + ' من ' +
        cnt(weeks.length, 'week') + '، منها ' + withNum + ' فيه مؤشر رقمي.',
      withNum ? 'الأهداف مكتوبة وبعضها قابل للتحقق رقمياً.'
        : 'الأهداف مكتوبة لكن بلا رقم يثبت تحققها.',
      withNum < allObj.length
        ? ('أضف مؤشراً رقمياً داخل نصّ ' + cnt(allObj.length - withNum, 'goal') + '.')
        : 'لا مطلوب.');

  /* ── 2. البناء الدوري ── */
  const volCov = pct(days.filter((d) => isFinite(d.volume)).length, nd);
  const useVol = volCov >= 0.5;
  const loads = weeks.map((w) => {
    let sum = 0;
    for (const d of w.days) {
      if (!d.active || !isFinite(d.rpe)) continue;
      /* أساس واحد للأسبوع كلّه — خلط «شدة × حجم» مع «شدة» وحدها
         يجمع وحدتين مختلفتين في رقم بلا معنى */
      if (useVol) { if (isFinite(d.volume)) sum += d.rpe * d.volume; }
      else sum += d.rpe;
    }
    return Math.round(sum * 10) / 10;
  });
  const usable = loads.filter((x) => x > 0);

  /* الانتشار النسبي: (الأعلى − الأدنى) ÷ المتوسط — يقيس وجود موجة لا حدّتها */
  const spread = (arr) => {
    const v = arr.filter((x) => isFinite(x));
    if (v.length < 2) return null;
    const mean = v.reduce((a, b) => a + b, 0) / v.length;
    if (!(mean > 0)) return null;
    return (Math.max(...v) - Math.min(...v)) / mean;
  };

  /* الموجة داخل الأسبوع — التدرّج بين أيامه. المقياس السابق كان أعمى عنها. */
  const intra = [];
  for (const w of weeks) {
    const s = spread(w.days.filter((d) => d.active).map((d) => d.rpe));
    if (s !== null) intra.push(Math.min(1, s / 0.25));      // انتشار 25٪ ⇒ درجة كاملة
  }
  const intraAvg = intra.length ? intra.reduce((a, b) => a + b, 0) / intra.length : null;

  /* الاتجاه بين الأسابيع */
  const inter = spread(usable);
  const interScore = inter === null ? null : Math.min(1, inter / 0.15);

  let a2;
  if (intraAvg === null && interScore === null) {
    a2 = mk(2, null, 'لا شدّات مكتوبة تكفي لحساب الموجة.',
      'البناء الدوري يحتاج شدّات مكتوبة عبر الأيام أو الأسابيع.',
      'اكتب الشدة لأيام أسبوعين على الأقل.');
  } else {
    const phase = weeks.filter((w) => has(w.phase)).length;
    const period = weeks.filter((w) => has(w.period)).length;
    /* الوزن يُعاد توزيعه على المتاح حتى لا يُعاقَب غياب ما لا يُقاس */
    const parts = [];
    if (intraAvg !== null) parts.push([0.30, intraAvg]);
    if (interScore !== null) parts.push([0.25, interScore]);
    parts.push([0.25, pct(phase, weeks.length)]);
    parts.push([0.20, pct(period, weeks.length)]);
    const wSum = parts.reduce((s, [w]) => s + w, 0);
    const score = 100 * parts.reduce((s, [w, v]) => s + w * v, 0) / wSum;

    const pctS = (x) => Math.round(x * 100) + '٪';
    a2 = mk(2, score,
      'أحمال الأسابيع (' + (useVol ? 'شدة × حجم' : 'الشدة وحدها — الحجم غير مكتوب') +
        '): ' + loads.join(' ← ') + '. ' +
        (interScore !== null ? 'الانتشار بين الأسابيع ' + pctS(inter) + '. ' : '') +
        (intraAvg !== null ? 'الموجة داخل الأسبوع ' + pctS(intraAvg) + ' من التمام. ' : '') +
        'المرحلة مكتوبة في ' + phase + ' والفترة في ' + period + '.',
      (intraAvg !== null && intraAvg >= 0.8)
        ? 'التدرّج داخل الأسبوع واضح، والأسابيع مترابطة.'
        : (intraAvg !== null && intraAvg < 0.3)
          ? 'الشدة شبه ثابتة داخل الأسبوع فلا تظهر موجة حمل.'
          : 'يوجد تدرّج لكنه غير مكتمل.',
      (intraAvg !== null && intraAvg < 0.5)
        ? 'درّج الشدة بين أيام الأسبوع بدل تثبيتها.'
        : (interScore !== null && interScore < 0.5)
          ? 'ميّز أحمال الأسابيع عن بعضها بما يعكس مرحلة الموسم.'
          : (phase < weeks.length || period < weeks.length
            ? 'أكمل «المرحلة» و«الفترة» في كل ورقة أسبوع.' : 'لا مطلوب.'));
  }

  /* ── 3. تقنين الحمل ── */
  const wI = days.filter((d) => isFinite(d.rpe)).length;
  const vNum = days.filter((d) => d.volumeKind === 'رقمي').length;
  const vTxt = days.filter((d) => d.volumeKind === 'وصفي').length;
  const wR = days.filter((d) => isFinite(d.rest)).length;
  /* الوصفي مكتوب لكنه غير قابل للتجميع ⇒ نصف رصيد، عملاً بنصّ الـrubric:
     «الحجم والشدة والراحة وRPE أو بديل عددي قابل للتجميع» */
  const volScore = pct(vNum + vTxt * 0.5, nd);
  const a3 = !nd
    ? mk(3, null, 'لا أيام تدريب مكتوبة.', 'لا يمكن قياس الحمل بلا أيام.',
      'اكتب أيام التدريب مع الشدة والحجم والراحة.')
    : mk(3, 100 * (0.4 * pct(wI, nd) + 0.3 * volScore + 0.3 * pct(wR, nd)),
      'من ' + cnt(nd, 'day') + ': ' + wI + ' فيه شدة، و' +
        (vNum ? vNum + ' فيه حجم رقمي' : 'لا حجم رقمي') +
        (vTxt ? '، و' + vTxt + ' فيه حجم وصفي (كلمة لا رقم)' : '') +
        '، و' + wR + ' فيه راحة.',
      (vNum === nd && wR === nd) ? 'الحمل مقنَّن بصورة تسمح بتجميعه ومقارنته.'
        : vTxt ? 'الحجم موصوف بكلمة لا برقم، فلا يمكن جمعه ولا مقارنة الأسابيع به.'
          : 'الحمل غير مكتمل التقنين، فلا يمكن تجميعه بدقّة.',
      [wI < nd ? 'الشدة في ' + cnt(nd - wI, 'day') : '',
        vTxt ? 'حوّل الحجم الوصفي إلى رقم (دقائق أو تكرارات) في ' + cnt(vTxt, 'day') : '',
        (nd - vNum - vTxt) ? 'الحجم في ' + cnt(nd - vNum - vTxt, 'day') : '',
        wR < nd ? 'الراحة في ' + cnt(nd - wR, 'day') : ''].filter(Boolean).length
        ? ('أكمل: ' + [wI < nd ? 'الشدة في ' + cnt(nd - wI, 'day') : '',
          vTxt ? 'حوّل الحجم الوصفي إلى رقم (دقائق أو تكرارات) في ' + cnt(vTxt, 'day') : '',
          (nd - vNum - vTxt) ? 'الحجم في ' + cnt(nd - vNum - vTxt, 'day') : '',
          wR < nd ? 'الراحة في ' + cnt(nd - wR, 'day') : ''].filter(Boolean).join(' · ') + '.')
        : 'لا مطلوب.');

  /* ── 4. التكامل ── */
  const counts = {};
  for (const t of CONTENT_TYPES) counts[t] = 0;
  let tagged = 0;
  for (const d of days) {
    const t = CONTENT_TYPES.find((x) => S(d.kind).indexOf(x) >= 0);
    if (t) { counts[t]++; tagged++; }
  }
  let a4;
  if (!nd) {
    a4 = mk(4, null, 'لا أيام تدريب مكتوبة.', 'لا يمكن قياس التوازن بلا محتوى.',
      'اكتب الأيام وصنّف كل يوم في صفّ «نوع المحتوى».');
  } else if (!tagged) {
    a4 = mk(4, 0, 'لم يُصنَّف أي يوم في صفّ «نوع المحتوى».',
      'بلا تصنيف لا يمكن إثبات توازن المحتوى بين الجوانب الأربعة.',
      'صنّف كل يوم من القائمة المنسدلة: فني · بدني · خططي · نفسي.');
  } else {
    const present = CONTENT_TYPES.filter((t) => counts[t] > 0);
    const shares = present.map((t) => counts[t] / tagged);
    const even = Math.min(...shares) / Math.max(...shares);
    const missing = CONTENT_TYPES.filter((t) => !counts[t]);
    a4 = mk(4, 100 * (0.5 * pct(tagged, nd) + 0.3 * (present.length / 4) + 0.2 * even),
      'صُنِّف ' + tagged + ' من ' + cnt(nd, 'day') + ': ' +
        CONTENT_TYPES.map((t) => t + ' ' + counts[t]).join(' · ') + '.',
      missing.length ? ('غاب من الخطة: ' + missing.join(' و') + '.')
        : 'المحتوى متوازن بين الجوانب الأربعة.',
      missing.length ? ('أضف محتوى ' + missing.join(' و') + ' أو صنّف ما يقابلها.')
        : (tagged < nd ? 'صنّف الأيام المتبقية.' : 'لا مطلوب.'));
  }

  /* ── 5. بناء الوحدة ── */
  const full = days.filter((d) => has(d.warm) && has(d.main) && has(d.cool)).length;
  const a5 = !nd
    ? mk(5, null, 'لا أيام تدريب مكتوبة.', 'لا يمكن فحص بناء الوحدة بلا أقسام.',
      'اكتب الجزء التمهيدي والرئيسي والختامي لكل يوم.')
    : mk(5, 100 * pct(full, nd),
      full + ' من ' + cnt(nd, 'day') + ' فيه الأجزاء الثلاثة: التمهيدي والرئيسي والختامي.',
      full === nd ? 'بناء الوحدة مكتمل في كل الأيام.'
        : 'بعض الأيام ناقصة الأجزاء.',
      full < nd ? ('أكمل الأجزاء الناقصة في ' + cnt(nd - full, 'day') + '.') : 'لا مطلوب.');

  /* ── 6. المؤشرات ── */
  const K = p.kpis || [];
  let a6;
  if (!p.hasKpiSheet) {
    a6 = mk(6, null, 'ورقة «المؤشرات» غير موجودة في الملف.',
      'هذا المحور يحتاج ورقة المؤشرات في النموذج الموسّع.',
      'استعمل النموذج المحدَّث الذي يحوي ورقة «المؤشرات».');
  } else if (!K.length) {
    a6 = mk(6, 0, 'ورقة «المؤشرات» فارغة.',
      'بلا اختبارات قبلية وبعدية لا يمكن إثبات التطوّر.',
      'أضف مؤشرين على الأقل، ولكلٍّ قياس قبلي ومستهدف وأداة قياس.');
  } else {
    const pre = K.filter((x) => has(x.pre)).length;
    const tgt = K.filter((x) => has(x.target)).length;
    const tool = K.filter((x) => has(x.tool)).length;
    a6 = mk(6, 100 * (0.3 * Math.min(1, K.length / 2) + 0.3 * pct(pre, K.length) +
                      0.2 * pct(tgt, K.length) + 0.2 * pct(tool, K.length)),
      cnt(K.length, 'kpi') + ': ' + pre + ' له قياس قبلي، و' + tgt + ' له مستهدف، و' +
        tool + ' له أداة قياس.',
      pre === K.length ? 'التطوّر قابل للإثبات رقمياً قبل وبعد.'
        : 'المتابعة موجودة لكن التطوّر لا يُقاس بالكامل.',
      pre < K.length ? 'أكمل القياس القبلي لكل مؤشر.' : 'لا مطلوب.');
  }

  /* ── 7. الملاءمة والسلامة ── */
  const H = p.header || {};
  const cat = has(H['الفئة']);
  const rec = has(H['إجراءات الاستشفاء']);
  const saf = has(H['إجراءات السلامة والوقاية']);
  const coolCov = nd ? pct(days.filter((d) => has(d.cool)).length, nd) : 0;
  const a7 = !p.hasHeaderSheet
    ? mk(7, null, 'ورقة «بيانات الخطة» غير موجودة في الملف.',
      'الفئة والاستشفاء والسلامة تُكتب في ورقة بيانات الخطة.',
      'استعمل النموذج المحدَّث الذي يحوي ورقة «بيانات الخطة».')
    : mk(7, 100 * (0.25 * (cat ? 1 : 0) + 0.25 * (rec ? 1 : 0) +
                   0.25 * (saf ? 1 : 0) + 0.25 * coolCov),
      (cat ? 'الفئة مكتوبة' : 'الفئة غير مكتوبة') + ' · ' +
        (rec ? 'الاستشفاء موصوف' : 'الاستشفاء غير موصوف') + ' · ' +
        (saf ? 'السلامة موصوفة' : 'السلامة غير موصوفة') + ' · التهدئة في ' +
        Math.round(coolCov * 100) + '٪ من الأيام.',
      (cat && rec && saf) ? 'الخطة تراعي الفئة والسلامة والاستشفاء.'
        : 'نقص السلامة والاستشفاء يرفع خطر الإصابة والإجهاد.',
      [!cat ? 'الفئة' : '', !rec ? 'إجراءات الاستشفاء' : '',
        !saf ? 'إجراءات السلامة والوقاية' : ''].filter(Boolean).length
        ? ('أكمل: ' + [!cat ? 'الفئة' : '', !rec ? 'إجراءات الاستشفاء' : '',
          !saf ? 'إجراءات السلامة والوقاية' : ''].filter(Boolean).join(' · ') + '.')
        : 'لا مطلوب.');

  /* ── 8. التوثيق ── */
  const filled = HEAD_FIELDS.filter((f) => has(H[f]));
  const meta = weeks.filter((w) => has(w.trainingWeek) && has(w.phase) && has(w.period)).length;
  const a8 = mk(8, 100 * (0.6 * pct(filled.length, HEAD_FIELDS.length) +
                          0.4 * pct(meta, weeks.length)),
    (p.hasHeaderSheet
      ? (filled.length + ' من ' + cnt(HEAD_FIELDS.length, 'field') + ' مكتمل في بيانات الخطة')
      : 'ورقة بيانات الخطة غير موجودة') +
      '، و' + meta + ' من ' + cnt(weeks.length, 'week') +
      ' مكتمل البيانات (الأسبوع · المرحلة · الفترة).',
    filled.length === HEAD_FIELDS.length ? 'التوثيق مكتمل ويسمح بالأرشفة.'
      : 'نقص التوثيق يصعّب الأرشفة وربط الخطة بصاحبها.',
    HEAD_FIELDS.filter((f) => !has(H[f])).length
      ? ('أكمل: ' + HEAD_FIELDS.filter((f) => !has(H[f])).join(' · ') + '.')
      : (meta < weeks.length ? 'أكمل المرحلة والفترة في كل أسبوع.' : 'لا مطلوب.'));

  const axes = [a1, a2, a3, a4, a5, a6, a7, a8];
  const measured = axes.filter((a) => a.score !== null);
  const covW = measured.reduce((s, a) => s + a.weight, 0);
  const sum = measured.reduce((s, a) => s + a.score * a.weight, 0);
  const total = covW > 0 ? Math.round(sum / covW) : null;
  const g = total === null ? null : gradeOf(total);

  return {
    axes, total,
    coverage: Math.round(covW * 100),
    grade: g ? g.grade : '—',
    decision: g ? g.decision : 'بانتظار البيانات',
    action: g ? g.action : '—',
    weeks: weeks.length, activeDays: nd,
    at: new Date().toISOString(),
  };
}

/** نقطة الدخول: ملفّ ← تقييم */
export async function evaluateCoachFile(arrayBuffer, readXlsx) {
  let sheets;
  try { sheets = await readXlsx(arrayBuffer); }
  catch (e) { return { ok: false, error: 'تعذّرت قراءة الملف: ' + (e && e.message) }; }
  const plan = parseCoachPlan(sheets);
  if (!plan.ok) return plan;
  return { ok: true, plan, result: evaluateCoachPlan(plan) };
}
