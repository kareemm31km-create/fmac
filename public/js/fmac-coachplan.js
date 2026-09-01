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

/** المدربون يكتبون الشدة ككسر (0.65) أو كـRPE (7). نوحّدها على مقياس 0–10.
 *  القيمة ≤ 1 تُقرأ كسراً — فـ«1» تعني الشدة القصوى لا RPE‑1. */
export function normIntensity(v) {
  const n = Number(v);
  if (!isFinite(n) || n <= 0) return NaN;
  if (n <= 1) return n * 10;
  if (n <= 10) return n;
  if (n <= 100) return n / 10;                 // مكتوبة نسبةً مئوية
  return NaN;
}

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
    const raw = NUM(cell(rows, valRow, c + 1));
    const d = {
      day: name,
      goal: cell(rows, valRow, c),
      intensity: raw,
      rpe: normIntensity(raw),
      volume: NUM(cell(rows, valRow, c + 2)),
      warm: warmRow >= 0 ? cell(rows, warmRow, c) : '',
      main: mainRow >= 0 ? cell(rows, mainRow, c) : '',
      cool: coolRow >= 0 ? cell(rows, coolRow, c) : '',
      note: noteRow >= 0 ? cell(rows, noteRow, c) : '',
      kind: typeRow >= 0 ? cell(rows, typeRow, c) : '',
      rest: restRow >= 0 ? NUM(cell(rows, restRow, c)) : NaN,
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

  return { ok: true, weeks, activeDays, sheetNames: names, header, kpis,
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
      sum += useVol && isFinite(d.volume) ? d.rpe * d.volume : d.rpe;
    }
    return Math.round(sum * 10) / 10;
  });
  const usable = loads.filter((x) => x > 0);
  let a2;
  if (usable.length < 2) {
    a2 = mk(2, null, 'أسابيع بحمل قابل للحساب: ' + usable.length + '.',
      'موجة الحمل تحتاج أسبوعين على الأقل بشدّة مكتوبة.',
      'اكتب الشدة لأيام أسبوعين على الأقل.');
  } else {
    const mean = usable.reduce((a, b) => a + b, 0) / usable.length;
    let changes = 0;
    for (let i = 1; i < loads.length; i++) {
      if (mean > 0 && Math.abs(loads[i] - loads[i - 1]) / mean >= 0.05) changes++;
    }
    const phase = weeks.filter((w) => has(w.phase)).length;
    const period = weeks.filter((w) => has(w.period)).length;
    a2 = mk(2, 100 * (0.5 * pct(changes, loads.length - 1) +
                      0.25 * pct(phase, weeks.length) + 0.25 * pct(period, weeks.length)),
      'أحمال الأسابيع (' + (useVol ? 'شدة × حجم' : 'الشدة وحدها — الحجم غير مكتوب') +
        '): ' + loads.join(' ← ') + '. تغيّر ملموس في ' + changes + ' من ' +
        (loads.length - 1) + '. المرحلة مكتوبة في ' + phase + ' والفترة في ' + period + '.',
      changes === 0 ? 'الحمل ثابت بين الأسابيع فلا تظهر موجة تدرّج.'
        : 'يوجد تدرّج بين الأسابيع.',
      changes === 0 ? 'غيّر الشدة أو الحجم بين الأسابيع بما يعكس مرحلة الموسم.'
        : (phase < weeks.length || period < weeks.length
          ? 'أكمل «المرحلة» و«الفترة» في كل ورقة أسبوع.' : 'لا مطلوب.'));
  }

  /* ── 3. تقنين الحمل ── */
  const wI = days.filter((d) => isFinite(d.rpe)).length;
  const wV = days.filter((d) => isFinite(d.volume)).length;
  const wR = days.filter((d) => isFinite(d.rest)).length;
  const a3 = !nd
    ? mk(3, null, 'لا أيام تدريب مكتوبة.', 'لا يمكن قياس الحمل بلا أيام.',
      'اكتب أيام التدريب مع الشدة والحجم والراحة.')
    : mk(3, 100 * (0.4 * pct(wI, nd) + 0.3 * pct(wV, nd) + 0.3 * pct(wR, nd)),
      'من ' + cnt(nd, 'day') + ': ' + wI + ' فيه شدة، و' + wV + ' فيه حجم، و' +
        wR + ' فيه راحة.',
      (wV && wR) ? 'الحمل مقنَّن بصورة تسمح بتجميعه ومقارنته.'
        : 'الحمل غير مكتمل التقنين، فلا يمكن تجميعه بدقّة.',
      [wI < nd ? 'الشدة في ' + (nd - wI) : '', wV < nd ? 'الحجم في ' + (nd - wV) : '',
        wR < nd ? 'الراحة في ' + (nd - wR) : ''].filter(Boolean).length
        ? ('أكمل: ' + [wI < nd ? 'الشدة في ' + cnt(nd - wI, 'day') : '',
          wV < nd ? 'الحجم في ' + cnt(nd - wV, 'day') : '',
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
