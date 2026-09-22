/* الإعداد البدني — قراءة نموذج الخطة البدنية الأسبوعية.
   اللياقة ليست لعبة بل تخصّص عرضيّ يخدم الألعاب كلّها، فخطّتها تُكتب
   للعبة بعينها ويقرؤها مدربوها للمتابعة وحدها.

   لا تقييم هنا ولا درجات: معيار تقييم الإعداد البدني لم يُوضع بعد،
   ووضع رقم بلا معيار يوهم بما لا نعرف (§2 — الصدق في الأرقام).
   المقاسات المعروضة عدٌّ صريح لما في الملفّ لا حكم عليه. */

export const S = (v) => (v === null || v === undefined) ? '' : String(v).trim();

/* تسوية عربية للمطابقة: تُهمل التشكيل والتطويل وتوحّد الألف والهاء والياء */
export const norm = (v) => S(v)
  .replace(/[ً-ْـ]/g, '')
  .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/[ىئ]/g, 'ي')
  .replace(/\s+/g, ' ')
  .toLowerCase();

/* مرادفات كل حقل — الملفّ يأتي من أيدٍ مختلفة فلا نلزمهم بصيغة واحدة */
const HEAD = {
  sport:     ['اللعبه', 'اللعبة', 'الرياضه', 'target sport', 'sport'],
  week:      ['الاسبوع', 'اسم الاسبوع', 'week'],
  focus:     ['محور الاسبوع', 'المحور', 'التركيز', 'focus'],
  freq:      ['التردد', 'عدد الحصص', 'الحصص في الاسبوع', 'frequency'],
  block:     ['الكتله', 'الكتله التدريبيه', 'block', 'macrocycle'],
  coach:     ['مدرب اللياقه', 'المدرب', 'coach'],
};

const COLM = {
  no:    ['م', 'رقم', 'no', '#'],
  name:  ['التمرين', 'اسم التمرين', 'exercise', 'exercise name'],
  sets:  ['المجموعات', 'عدد المجموعات', 'sets'],
  reps:  ['التكرارات', 'التكرارات / الزمن', 'التكرارات او الزمن', 'الزمن',
          'reps', 'reps / time', 'time'],
  rest:  ['الراحه', 'زمن الراحه', 'rest'],
  goal:  ['الهدف', 'الهدف الخاص باللعبه', 'الهدف من التمرين',
          'specific objective', 'specific judo objective', 'objective'],
};

const isOneOf = (cell, list) => {
  const n = norm(cell);
  if (!n) return false;
  return list.some((w) => n === norm(w));
};

/* «الحصة 1» أو «الحصة الأولى» أو «Session 2» */
const SESSION_RE = /^(?:الحص[هة]|session)\s*(\d+)?/i;
const ORDINAL = ['الاولي', 'الثانيه', 'الثالثه', 'الرابعه', 'الخامسه', 'السادسه'];

function sessionNo(cell) {
  const raw = S(cell);
  const m = SESSION_RE.exec(norm(raw));
  if (!m) return 0;
  if (m[1]) return Number(m[1]);
  const ord = ORDINAL.findIndex((o) => norm(raw).indexOf(o) >= 0);
  return ord >= 0 ? ord + 1 : 1;
}

const blank = (row) => !row || !row.some((c) => S(c) !== '');

/**
 * يقرأ ورقة واحدة إلى { header, sessions }.
 * المواضع تُستخرج بالمحتوى لا برقم الصفّ — النماذج تُعدَّل وتُزاح صفوفها،
 * وربط القراءة برقم ثابت كان سبب رفض خطة مدرب كاملة من قبل.
 */
export function parseFitnessSheet(rows) {
  const header = {};
  const sessions = [];

  /* الترويسة: «الحقل» في خانة والقيمة في أوّل خانة غير فارغة بعدها */
  for (const row of rows || []) {
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      for (const key of Object.keys(HEAD)) {
        if (header[key] !== undefined) continue;
        if (!isOneOf(row[c], HEAD[key])) continue;
        for (let j = c + 1; j < row.length; j++) {
          if (S(row[j])) { header[key] = S(row[j]); break; }
        }
      }
    }
  }

  /* الحصص: كل صفّ يبدأ بـ«الحصة …» يفتح حصّة، وجدولها يليه */
  let cur = null;
  for (let r = 0; r < (rows || []).length; r++) {
    const row = rows[r] || [];
    const first = row.find((c) => S(c) !== '');
    const n = sessionNo(first);

    if (n) {
      /* بقية الخانات في صفّ العنوان: اليوم ثم الهدف */
      const rest = row.filter((c) => S(c) !== '').slice(1).map(S);
      cur = { n, title: S(first), day: rest[0] || '', objective: rest.slice(1).join(' — '),
              rows: [] };
      sessions.push(cur);
      continue;
    }

    /* «الهدف:» في سطر مستقلّ تحت عنوان الحصة */
    if (cur && !cur.objective && isOneOf(row[0], COLM.goal.concat(['الهدف']))) {
      const v = row.slice(1).filter((c) => S(c) !== '').map(S).join(' ');
      if (v) { cur.objective = v; continue; }
    }

    /* صفّ ترويسة الجدول: نحدّد الأعمدة بمسمّياتها لا بترتيبها */
    const idx = headerIndex(row);
    if (idx) {
      const t = readTable(rows, r + 1, idx);
      if (!cur) { cur = { n: sessions.length + 1, title: 'الحصة ' + (sessions.length + 1),
                          day: '', objective: '', rows: [] }; sessions.push(cur); }
      cur.rows = cur.rows.concat(t.rows);
      r = t.end - 1;
    }
  }

  return { header, sessions: sessions.filter((s) => s.rows.length) };
}

/* يرجع خريطة الأعمدة إن كان الصفّ ترويسة جدول تمارين، وإلا null */
function headerIndex(row) {
  const idx = {};
  for (let c = 0; c < (row || []).length; c++) {
    for (const key of Object.keys(COLM)) {
      if (idx[key] !== undefined) continue;
      if (isOneOf(row[c], COLM[key])) idx[key] = c;
    }
  }
  /* اسم التمرين وحده هو ما لا جدول بدونه */
  return idx.name === undefined ? null : idx;
}

function readTable(rows, from, idx) {
  const out = [];
  let r = from;
  for (; r < rows.length; r++) {
    const row = rows[r] || [];
    if (blank(row)) {
      /* فراغ واحد لا ينهي الجدول؛ فراغان ينهيانه */
      if (blank(rows[r + 1] || [])) break;
      continue;
    }
    if (sessionNo(row.find((c) => S(c) !== ''))) break;
    if (headerIndex(row)) break;
    const name = S(row[idx.name]);
    if (!name) continue;
    out.push({
      no:   idx.no   === undefined ? '' : S(row[idx.no]),
      name,
      sets: idx.sets === undefined ? '' : S(row[idx.sets]),
      reps: idx.reps === undefined ? '' : S(row[idx.reps]),
      rest: idx.rest === undefined ? '' : S(row[idx.rest]),
      goal: idx.goal === undefined ? '' : S(row[idx.goal]),
    });
  }
  return { rows: out, end: r };
}

/**
 * يختار الورقة التي تحمل جدول التمارين — بالمحتوى لا بالاسم.
 * إن حملت أكثر من ورقة جداول، تُدمج الحصص بترتيب الأوراق.
 */
export function parseFitnessPlan(sheets) {
  const names = Object.keys(sheets || {});
  if (!names.length) return { ok: false, error: 'الملفّ بلا أوراق.' };

  let header = {};
  let sessions = [];
  for (const nm of names) {
    const one = parseFitnessSheet(sheets[nm]);
    header = Object.assign({}, one.header, header);   /* أوّل ورقة تحسم الترويسة */
    sessions = sessions.concat(one.sessions.map((s) =>
      Object.assign({}, s, { sheet: nm })));
  }
  if (!sessions.length) {
    return { ok: false,
      error: 'لم نجد جدول تمارين. تأكّد أنّ في الملفّ صفّ ترويسة فيه «التمرين».' };
  }
  /* ترقيم متسلسل حين تتكرّر الأرقام عبر الأوراق */
  sessions.forEach((s, i) => { if (!s.n || sessions.filter((x) => x.n === s.n).length > 1) s.n = i + 1; });
  return { ok: true, header, sessions };
}

/** عدٌّ صريح لما في الخطة — لا حكم ولا درجة */
export function summarise(plan) {
  const sessions = (plan && plan.sessions) || [];
  const exercises = sessions.reduce((a, s) => a + s.rows.length, 0);
  let sets = 0, setsKnown = 0;
  for (const s of sessions) {
    for (const r of s.rows) {
      const n = Number(String(r.sets).replace(/[^\d.]/g, ''));
      if (isFinite(n) && n > 0) { sets += n; setsKnown++; }
    }
  }
  return {
    sessions: sessions.length,
    exercises,
    /* المجموع لا يُذكر إلا إذا عُرفت كل الخانات — وإلا فهو ناقص يوهم */
    sets: setsKnown === exercises && exercises > 0 ? sets : null,
    setsKnown, withGoal: sessions.reduce((a, s) =>
      a + s.rows.filter((r) => S(r.goal)).length, 0),
  };
}

/** مفتاح الوثيقة: لعبة + أسبوع — خطة واحدة لكلّ لعبة في الأسبوع */
export const planKey = (sport, week) =>
  S(sport).replace(/[/#?\[\]]/g, '_') + '__' + S(week).replace(/[/#?\[\]]/g, '_');

export default { parseFitnessSheet, parseFitnessPlan, summarise, planKey, norm, S };
