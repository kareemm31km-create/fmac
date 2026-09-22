/* وحدة زيارات المدارس — المنطق الخالص: النموذج والتجميع والتحويل.
   لا DOM هنا ولا Firebase، فيُختبر وحده.

   قاعدتان تحكمان الوحدة:
   · الحالة قيمة تُخزَّن وتُرشَّح ويُبنى عليها تقرير، لا لون في الواجهة.
   · التاريخ الأصلي لا يُمحى عند التأجيل — كما في جدول مشاركات الموسم. */

export const S = (v) => (v === null || v === undefined) ? '' : String(v).trim();
const N = (v) => { const x = Number(v); return isFinite(x) && x >= 0 ? x : 0; };

/* ── الحالات ─────────────────────────────────────────────── */
export const STATUS = ['مخططة', 'مؤكدة', 'تمت الزيارة', 'مؤجلة', 'ملغاة'];
export const DONE = 'تمت الزيارة';
export const MOVED = 'مؤجلة';
export const OFF = 'ملغاة';
/* المستقبلية: ما لم تتمّ ولم تُلغَ */
export const isUpcoming = (v) => S(v.status) === 'مخططة' || S(v.status) === 'مؤكدة';

/* ── النموذج ─────────────────────────────────────────────── */
export function visit(r) {
  const o = r || {};
  const by = o.bySport && typeof o.bySport === 'object' ? o.bySport : {};
  const out = {
    k: S(o.k), season: S(o.season),
    school: S(o.school), area: S(o.area),
    date: S(o.date), time: S(o.time),
    sports: Array.isArray(o.sports) ? o.sports.map(S).filter(Boolean) : [],
    team: S(o.team), goal: S(o.goal), note: S(o.note),
    status: STATUS.indexOf(S(o.status)) >= 0 ? S(o.status) : 'مخططة',
    /* نقل الموعد — التاريخ الأصلي يُكتب مرّة ولا يُستبدل */
    date0: S(o.date0), datePrev: S(o.datePrev), movedAt: S(o.movedAt), reason: S(o.reason),
    offAt: S(o.offAt), offReason: S(o.offReason), offBy: S(o.offBy),
    /* ما بعد الزيارة */
    students: o.students === '' || o.students === null || o.students === undefined
      ? null : N(o.students),
    bySport: {},
    outcome: S(o.outcome), techNote: S(o.techNote),
    files: Array.isArray(o.files) ? o.files.filter((f) => f && S(f.url))
      .map((f) => ({ name: S(f.name), url: S(f.url) })) : [],
    log: Array.isArray(o.log) ? o.log.filter((x) => x && S(x.text))
      .map((x) => ({ at: S(x.at), by: S(x.by), text: S(x.text) })) : [],
    by: S(o.by), at: S(o.at),
  };
  for (const sp of Object.keys(by)) {
    const v = by[sp] || {};
    const joined = v.joined === '' || v.joined === null || v.joined === undefined
      ? null : N(v.joined);
    const picked = v.picked === '' || v.picked === null || v.picked === undefined
      ? null : N(v.picked);
    if (joined === null && picked === null) continue;
    out.bySport[S(sp)] = { joined, picked };
  }
  return out;
}

export const list = (rows) => (rows || []).filter((r) => S(r.k) && S(r.school)).map(visit);

/* المشاركون: المعلن صراحةً، وإلا مجموع ما وُزّع على الألعاب.
   وما لم يُسجَّل يبقى null — لا يُحوَّل إلى صفر (Null ≠ Zero). */
export function students(v) {
  if (v.students !== null && v.students !== undefined) return v.students;
  const ks = Object.keys(v.bySport);
  const vals = ks.map((sp) => v.bySport[sp].joined).filter((x) => x !== null);
  return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
}
export function picked(v) {
  const ks = Object.keys(v.bySport);
  const vals = ks.map((sp) => v.bySport[sp].picked).filter((x) => x !== null);
  return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
}

const add = (a, b) => (a === null && b === null) ? null : (a || 0) + (b || 0);

/* ── ملخّص الموسم ───────────────────────────────────────── */
export function summary(rows, season) {
  const vs = season ? rows.filter((v) => v.season === season) : rows;
  const done = vs.filter((v) => v.status === DONE);
  let joined = null, sel = null;
  for (const v of done) { joined = add(joined, students(v)); sel = add(sel, picked(v)); }
  return {
    visits: vs.length,
    done: done.length,
    upcoming: vs.filter(isUpcoming).length,
    moved: vs.filter((v) => v.status === MOVED).length,
    off: vs.filter((v) => v.status === OFF).length,
    /* «مدرسة في الخطة» غير «مدرسة تمّت تغطيتها» — التغطية ما وقع لا ما نُوي */
    schools: [...new Set(vs.map((v) => v.school).filter(Boolean))].length,
    covered: [...new Set(done.map((v) => v.school).filter(Boolean))].length,
    /* المشاركون والمختارون من الزيارات التي تمّت وحدها — غيرها لم يقع بعد */
    students: joined,
    picked: sel,
    /* التغطية: كم زيارةً تمّت ولها أرقام مسجَّلة */
    measured: done.filter((v) => students(v) !== null).length,
  };
}

/* ── تحليل حسب اللعبة ───────────────────────────────────── */
export function bySport(rows, season) {
  const vs = (season ? rows.filter((v) => v.season === season) : rows)
    .filter((v) => v.status === DONE);
  const out = {};
  for (const v of vs) {
    /* اللعبة تُحسب زيارةً إن كانت مستهدفةً أو لها أرقام */
    const names = [...new Set(v.sports.concat(Object.keys(v.bySport)))];
    for (const sp of names) {
      if (!out[sp]) out[sp] = { sport: sp, visits: 0, joined: null, picked: null };
      out[sp].visits++;
      const b = v.bySport[sp];
      if (b) {
        out[sp].joined = add(out[sp].joined, b.joined);
        out[sp].picked = add(out[sp].picked, b.picked);
      }
    }
  }
  return Object.keys(out).map((k) => out[k])
    .sort((a, b) => (b.picked || 0) - (a.picked || 0) || b.visits - a.visits);
}

/* ── تحليل حسب المنطقة/الفرع ───────────────────────────── */
export function byArea(rows, season) {
  const vs = season ? rows.filter((v) => v.season === season) : rows;
  const out = {};
  for (const v of vs) {
    const a = v.area || '— بلا منطقة —';
    if (!out[a]) out[a] = { area: a, visits: 0, done: 0, schools: new Set(),
      joined: null, picked: null };
    out[a].visits++;
    if (v.school) out[a].schools.add(v.school);
    if (v.status === DONE) {
      out[a].done++;
      out[a].joined = add(out[a].joined, students(v));
      out[a].picked = add(out[a].picked, picked(v));
    }
  }
  return Object.keys(out).map((k) => ({
    area: out[k].area, visits: out[k].visits, done: out[k].done,
    schools: out[k].schools.size, joined: out[k].joined, picked: out[k].picked,
  })).sort((a, b) => b.visits - a.visits);
}

/* ── ملفّ كل مدرسة ──────────────────────────────────────── */
export function schools(rows, season) {
  const vs = season ? rows.filter((v) => v.season === season) : rows;
  const out = {};
  for (const v of vs) {
    const n = v.school;
    if (!out[n]) out[n] = { school: n, area: v.area, visits: 0, done: 0,
      last: '', sports: new Set(), joined: null, picked: null, notes: [] };
    const o = out[n];
    o.visits++;
    if (!o.area && v.area) o.area = v.area;
    if (v.status === DONE) {
      o.done++;
      if (v.date > o.last) o.last = v.date;
      v.sports.forEach((sp) => o.sports.add(sp));
      Object.keys(v.bySport).forEach((sp) => o.sports.add(sp));
      o.joined = add(o.joined, students(v));
      o.picked = add(o.picked, picked(v));
      if (v.techNote) o.notes.push({ date: v.date, text: v.techNote });
    }
  }
  return Object.keys(out).map((k) => {
    const o = out[k];
    return { school: o.school, area: o.area, visits: o.visits, done: o.done,
      last: o.last, sports: [...o.sports], joined: o.joined, picked: o.picked,
      notes: o.notes.sort((a, b) => String(b.date).localeCompare(String(a.date))) };
  }).sort((a, b) => (b.picked || 0) - (a.picked || 0) || b.visits - a.visits);
}

/** نسبة التحويل من مشارك إلى مختار — «—» حين لا مقام (Null ≠ Zero) */
export const rate = (joined, sel) =>
  (joined && joined > 0 && sel !== null && sel !== undefined)
    ? Math.round(sel / joined * 100) : null;

/* ── تصدير CSV ──────────────────────────────────────────── */
const cell = (v) => {
  const t = (v === null || v === undefined) ? '' : String(v);
  return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
};
export function csv(rows) {
  const head = ['المدرسة', 'المنطقة', 'التاريخ', 'الوقت', 'الحالة', 'التاريخ الأصلي',
    'الألعاب', 'الفريق', 'المشاركون', 'المختارون', 'النتيجة', 'ملاحظة فنية'];
  const body = rows.map((v) => [
    v.school, v.area, v.date, v.time, v.status, v.date0,
    v.sports.join(' · '), v.team,
    students(v) === null ? '—' : students(v),
    picked(v) === null ? '—' : picked(v),
    v.outcome, v.techNote,
  ]);
  /* BOM حتى يفتح إكسل العربية سليمةً */
  return '﻿' + [head, ...body].map((r) => r.map(cell).join(',')).join('\r\n');
}

export default { STATUS, visit, list, summary, bySport, byArea, schools,
  students, picked, rate, csv, isUpcoming, DONE, MOVED, OFF, S };

/* ════════════════════════════════════════════════════════════
   استمارة اختيار لاعبي المدارس — يرفعها المدرب إكسل.
   الأعمدة تُعرف بمسمّياتها لا بمواضعها: النماذج تُعدَّل وتُزاح
   أعمدتها، وربط القراءة برقم عمود ثابت يكسرها عند أوّل تعديل.
   ════════════════════════════════════════════════════════════ */

/* سنة الميلاد: يقبل سنةً أو تاريخاً كاملاً أو رقم إكسل تسلسلياً */
export function birthYear(v) {
  const t = S(v);
  if (!t) return '';
  const y = t.match(/(19|20)\d{2}/);
  if (y) return y[0];
  const n = Number(t);
  if (isFinite(n) && n > 20000 && n < 80000) {
    const d = new Date(Math.round((n - 25569) * 86400000));
    if (!isNaN(d.getTime())) return String(d.getUTCFullYear());
  }
  return t;
}

export function player(r) {
  const o = r || {};
  return {
    k: S(o.k), season: S(o.season), sport: S(o.sport), visit: S(o.visit),
    name: S(o.name), birth: S(o.birth), nat: S(o.nat),
    school: S(o.school), phone: S(o.phone), weight: S(o.weight), grade: S(o.grade),
    note: S(o.note), by: S(o.by), at: S(o.at),
  };
}
export const players = (rows) => (rows || [])
  .filter((r) => S(r.k) && S(r.name)).map(player);

/** تجميع اللاعبين — بالمدرسة وباللعبة وبسنة الميلاد */
export function rosterStats(rows) {
  const bySchool = {}, bySport = {}, byYear = {};
  for (const p of rows) {
    const sc = p.school || '— بلا مدرسة —';
    bySchool[sc] = (bySchool[sc] || 0) + 1;
    if (p.sport) bySport[p.sport] = (bySport[p.sport] || 0) + 1;
    if (p.birth) byYear[p.birth] = (byYear[p.birth] || 0) + 1;
  }
  const arr = (o) => Object.keys(o).map((k) => ({ key: k, n: o[k] }))
    .sort((a, b) => b.n - a.n || String(a.key).localeCompare(String(b.key), 'ar'));
  return {
    total: rows.length,
    schools: arr(bySchool), sports: arr(bySport),
    years: Object.keys(byYear).map((k) => ({ key: k, n: byYear[k] })).sort(
      (a, b) => String(a.key).localeCompare(String(b.key))),
    /* التغطية: كم صفّاً بلا هاتف — التقارير تحتاجه للتواصل */
    noPhone: rows.filter((p) => !S(p.phone)).length,
  };
}

export function rosterCsv(rows) {
  const head = ['م', 'اسم اللاعب', 'تاريخ الميلاد', 'الجنسية', 'اسم المدرسة',
    'رقم التليفون', 'الوزن', 'الصف', 'اللعبة', 'الموسم'];
  const body = rows.map((p, i) => [i + 1, p.name, p.birth, p.nat, p.school,
    p.phone, p.weight, p.grade, p.sport, p.season]);
  return '\uFEFF' + [head, ...body].map((r) => r.map(cell).join(',')).join('\r\n');
}

/** أسماء المدارس المعروفة — من الزيارات ومن اللاعبين، بلا تكرار */
export function schoolNames(visits, playerRows) {
  const set = new Set();
  (visits || []).forEach((v) => { if (S(v.school)) set.add(S(v.school)); });
  (playerRows || []).forEach((p) => { if (S(p.school)) set.add(S(p.school)); });
  return [...set].sort((x, y) => x.localeCompare(y, 'ar'));
}
