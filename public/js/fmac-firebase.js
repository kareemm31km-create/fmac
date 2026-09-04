/* طبقة النقل — تُحاكي عقد Apps Script فوق Firestore.
   الواجهة في index.html لا تتغيّر: كل نداء fetch(API,…) صار __fmacApi(API,…). */
import {
  collection, getDocs, doc, setDoc, deleteDoc, writeBatch,
} from '../vendor/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL } from '../vendor/firebase-storage.js';
import { db, storage, PROFILE, ready } from './fmac-auth.js';
import { COL, BUILD } from './fmac-config.js';
import * as P from './fmac-payload.js';

const S = P.S;
const NUM = (v) => Number(v) || 0;
const nowISO = () => new Date().toISOString();

async function readCol(name) {
  const snap = await getDocs(collection(db, name));
  const out = [];
  snap.forEach((d) => out.push(Object.assign({ k: d.id }, d.data())));
  return out;
}

/* خريطة بالمفتاح مع مُشكِّل — مقابل mapOf_ */
const mapOf = (rows, fn) => {
  const o = {};
  for (const r of rows) { if (S(r.k)) o[S(r.k)] = fn(r); }
  return o;
};

/* ── حمولة init ───────────────────────────────────────────── */
async function initPayload() {
  const me = PROFILE;
  if (!me) return { ok: false, error: 'bad_code' };

  const map = {
    settings: COL.settings, plans: COL.plans, users: COL.users, subs: COL.subs,
    cancels: COL.cancels, ticks: COL.ticks, items: COL.items, attend: COL.attend,
    replies: COL.replies, stages: COL.stages, versions: COL.versions,
    segs: COL.segs, devs: COL.devs, sess: COL.sess, notes: COL.notes,
    weeks: COL.weeks, results: COL.results, shields: COL.shields,
    camps: COL.camps, national: COL.national, agenda: COL.agenda,
    visits: COL.visits, calendar: COL.calendar, acts: COL.acts, audit: COL.audit,
    monthly: COL.monthly, reviews: COL.reviews,
  };
  const keys = Object.keys(map);
  const got = await Promise.all(keys.map((k) => readCol(map[k]).catch(() => [])));
  const R = {};
  keys.forEach((k, i) => { R[k] = got[i]; });

  const settings = P.buildSettings(R.settings.find((d) => d.k === 'config'));
  const week = P.weekNow(settings).label;

  const user = {
    code: S(me.code || me.uid), name: S(me.name), admin: !!me.admin,
    sport: S(me.sport), branch: S(me.branch), phone: S(me.phone),
    photo: S(me.photo), email: S(me.email), uid: S(me.uid),
  };

  return {
    ok: true,
    user,
    settings,
    plans: P.planMap(R.plans),          // غير مُرشَّحة — كما في doGet
    users: P.userList(R.users),
    subs: P.subsList(R.subs),
    cancels: P.cancelList(R.cancels),
    ticks: P.readTicks(R.ticks, week),
    plans2: P.planItems(R.items, week),
    attend: P.attendList(R.attend),
    replies: P.replyList(R.replies),
    stages: mapOf(R.stages, (r) => ({
      stage: S(r.stage), note: S(r.note), by: S(r.by), at: S(r.at) })),
    versions: R.versions.filter((r) => S(r.k)).map((r) => ({
      k: S(r.k), plan: S(r.planId), week: S(r.week), n: NUM(r.n) || 1,
      at: S(r.at), by: S(r.by), file: S(r.file), url: S(r.url),
      days: NUM(r.days), items: NUM(r.items), shape: S(r.shape) })),
    segs: mapOf(R.segs, (r) => ({
      planned: NUM(r.planned), actual: NUM(r.actual), by: S(r.by), at: S(r.at) })),
    devs: R.devs.filter((r) => S(r.k)).map((r) => ({
      plan: S(r.planId), week: S(r.week), day: NUM(r.day), section: S(r.section),
      item: S(r.item), kind: S(r.kind), actual: S(r.actual),
      by: S(r.by), at: S(r.at) })),
    sess: mapOf(R.sess, (r) => ({
      planned: NUM(r.planned), intensity: NUM(r.intensity), goal: S(r.goal),
      exec: NUM(r.exec), tPlan: NUM(r.tPlan), tAct: NUM(r.tAct),
      by: S(r.by), at: S(r.at), goalKind: S(r.goalKind) })),
    notes: R.notes.filter((r) => S(r.k)).map((r) => ({
      k: S(r.k), plan: S(r.planId), week: S(r.week), day: S(r.day),
      dayName: S(r.dayName), text: S(r.text), state: S(r.state),
      by: S(r.by), at: S(r.at) })),
    weeks: mapOf(R.weeks, (r) => ({
      state: S(r.state), note: S(r.note), by: S(r.by), at: S(r.at) })),
    acts: mapOf(R.acts, (r) => ({ state: S(r.state), by: S(r.by), at: S(r.at) })),
    audit: user.admin ? P.audit(R) : [],
    archive: P.archive(R, user, week),
    results: P.results(R.results),
    shields: P.shields(R.shields),
    camps: P.camps(R.camps),
    national: P.national(R.national),
    staff: user.admin ? P.allUsers(R.users) : [],
    agenda: P.agendaList(R.agenda),
    visits: P.visitsList(R.visits),
    calendar: P.calendarList(R.calendar),
    history: P.history(R),
    /* الخطط الشهرية — المدرب يرى خططه وحدها، والإدارة ترى الجميع */
    monthly: R.monthly
      .filter((m) => user.admin || S(m.coach) === user.code)
      .map((m) => Object.assign({}, m, { k: S(m.k) }))
      .sort((a, b) => S(b.month).localeCompare(S(a.month))),
    monthlyReviews: mapOf(R.reviews, (r) => ({
      axes: Array.isArray(r.axes) ? r.axes : [],
      total: r.total === null || r.total === undefined ? null : NUM(r.total),
      coverage: NUM(r.coverage), grade: S(r.grade),
      decision: S(r.decision), action: S(r.action), at: S(r.at),
    })),
    build: BUILD,
    ai: { on: false, model: '' },   // مزايا المساعد تحتاج Cloud Function
  };
}

/* ── بنود أسبوع بعينه — مقابل weekData_ ───────────────────── */
async function weekData(body) {
  const wk = S(body.week);
  if (!wk) return { ok: false, error: 'no_week' };
  const me = PROFILE || {};
  const [items, cancels, attend, ticks] = await Promise.all([
    readCol(COL.items), readCol(COL.cancels),
    readCol(COL.attend), readCol(COL.ticks),
  ]);
  let plans = P.planItems(items, wk);
  if (!me.admin) plans = plans.filter((p) => S(p.coach) === S(me.code || me.uid));
  const canc = {}, att = {};
  for (const r of cancels) {
    const k = S(r.k);
    if (k && k.split('|')[0] === wk) {
      canc[k] = { reason: S(r.reason), by: S(r.by), at: S(r.at) };
    }
  }
  for (const r of attend) {
    const k = S(r.k);
    if (k && k.split('|')[0] === wk) {
      att[k] = { planned: NUM(r.planned), actual: NUM(r.actual) };
    }
  }
  return { ok: true, week: wk, plans, cancels: canc, attend: att,
    ticks: P.readTicks(ticks, wk) };
}

/* ── صلاحيات ──────────────────────────────────────────────── */
const deny = { ok: false, error: 'not_admin' };
const adminOnly = () => (PROFILE && PROFILE.admin) ? null : deny;

async function put(col, key, data) {
  const id = S(key) || doc(collection(db, col)).id;
  const body = Object.assign({}, data, {
    by: S(PROFILE && (PROFILE.name || PROFILE.code || PROFILE.uid)),
    at: nowISO(),
  });
  delete body.action; delete body.u; delete body.k; delete body.file;
  await setDoc(doc(db, col, id), body, { merge: true });
  return { ok: true, k: id, at: body.at };
}
async function drop(col, key) {
  await deleteDoc(doc(db, col, S(key)));
  return { ok: true };
}

async function putFile(b64, name, folder) {
  if (!b64) return '';
  const comma = b64.indexOf(',');
  const raw = comma >= 0 ? b64.slice(comma + 1) : b64;
  const bin = atob(raw);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  const path = folder + '/' + Date.now() + '-' + S(name || 'file');
  const r = ref(storage, path);
  await uploadBytes(r, buf);
  return await getDownloadURL(r);
}

/* ── موزّع الإجراءات — يقابل doPost ──────────────────────── */
const ADMIN = ['result', 'shield', 'targets', 'camp', 'natl', 'natlDrop',
  'user', 'userDrop', 'agenda', 'visit', 'cal', 'calDrop', 'closeweek', 'note'];

/* اسم المفتاح الذي تأتي تحته بيانات كل إجراء في index.html.
   لا يطابق اسم الإجراء غالباً: natl ⇒ player · user ⇒ userRow ·
   attendance ⇒ attend · segments ⇒ segs · deviations ⇒ devs. */
const NEST = {
  cancel: 'cancel', attendance: 'attend', reply: 'reply', stage: 'stage',
  session: 'session', note: 'note', ack: 'ack', closeweek: 'week',
  result: 'result', shield: 'shield', camp: 'camp',
  natl: 'player', natlDrop: 'player',
  user: 'userRow', userDrop: 'userRow',
  agenda: 'agenda', visit: 'visit', cal: 'cal', calDrop: 'cal',
  targets: 'targets', media: 'media',
};
/* الكيان ومعرّفه — المفتاح يأتي داخل الكيان لا في جذر الحمولة */
const entOf = (body, a) => {
  const v = body[NEST[a]];
  return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {};
};
const idOf = (ent, body) => S(ent.k) || S(ent.code) || S(body.k) || '';

/* الملفّ يصل ككائن {name,type,data} لا كنصّ base64 */
const fileOf = (body) => {
  const f = body.file;
  if (!f) return null;
  if (typeof f === 'string') return { data: f, name: S(body.name) };
  return { data: S(f.data), name: S(f.name) || S(body.name) };
};

async function dispatch(body) {
  const a = S(body.action);
  if (ADMIN.indexOf(a) >= 0) { const d = adminOnly(); if (d) return d; }

  switch (a) {
    case 'upload': {
      /* حمولة الرفع مسطّحة في الجذر، والملفّ كائن */
      const f = fileOf(body);
      const url = f ? await putFile(f.data, f.name, 'media') : S(body.url);
      const row = {
        at: nowISO(), code: S(PROFILE && (PROFILE.code || PROFILE.uid)),
        name: S(body.coach) || S(PROFILE && PROFILE.name), sport: S(body.sport),
        branch: S(body.branch), category: S(body.category), week: S(body.week),
        players: NUM(body.players), slot: NUM(body.slot),
        file: f ? f.name : '', url, note: S(body.note),
      };
      const key = S(row.code) + '__' + S(row.week) + '__' + S(row.category);
      await put(COL.versions, key, Object.assign({ planId: '', n: 1 }, row));
      return put(COL.subs, key, row);
    }
    case 'media': {
      const e = entOf(body, a);
      const f = fileOf(body);
      const url = f ? await putFile(f.data, f.name, 'media') : '';
      const key = idOf(e, body) || (S(e.sport) + '__' + S(e.week) + '__' + S(e.day));
      return put(COL.subs, key, Object.assign({}, e, { url, file: f ? f.name : '' }));
    }
    case 'cancel': case 'attendance': case 'reply': case 'stage':
    case 'segments': case 'deviations': case 'ack': case 'session':
    case 'note': case 'closeweek': case 'result': case 'shield':
    case 'camp': case 'natl': case 'agenda': case 'visit': case 'user': {
      const COLS = {
        cancel: COL.cancels, attendance: COL.attend, reply: COL.replies,
        stage: COL.stages, ack: COL.acts, session: COL.sess, note: COL.notes,
        closeweek: COL.weeks, result: COL.results, shield: COL.shields,
        camp: COL.camps, natl: COL.national, agenda: COL.agenda,
        visit: COL.visits, user: COL.users,
      };
      /* صفوف متعدّدة: زمن الأجزاء وسجل الانحراف يُرسلان دفعةً */
      if (a === 'segments' || a === 'deviations') {
        const rows = body[a === 'segments' ? 'segs' : 'devs'] || [];
        if (!Array.isArray(rows) || !rows.length) return { ok: true, n: 0 };
        const col = a === 'segments' ? COL.segs : COL.devs;
        const b = writeBatch(db);
        const stamp = { by: S(PROFILE && (PROFILE.name || PROFILE.uid)), at: nowISO() };
        for (const r of rows) {
          const row = Object.assign({}, r, stamp);
          delete row.k;
          b.set(doc(db, col, S(r.k)), row, { merge: true });
        }
        await b.commit();
        return { ok: true, n: rows.length, at: stamp.at };
      }
      const e = entOf(body, a);
      /* إغلاق الأسبوع: المفتاح هو مسمّى الأسبوع نفسه */
      const key = a === 'closeweek' ? (S(e.week) || S(body.k)) : idOf(e, body);
      let row = Object.assign({}, e);
      /* الدروع: أسماء الحقول في الواجهة تختلف عن أسماء القراءة */
      if (a === 'shield') {
        row.rival = S(e.nextClub); row.rivalPoints = NUM(e.nextPoints);
        delete row.nextClub; delete row.nextPoints;
      }
      /* المستخدمون: الكود هو معرّف الوثيقة ويبقى حقلاً كذلك */
      if (a === 'user') row.code = S(e.code) || key;
      return put(COLS[a], key, row);
    }
    case 'natlDrop': return drop(COL.national, idOf(entOf(body, a), body));
    case 'userDrop': return drop(COL.users, idOf(entOf(body, a), body));
    case 'calDrop': return drop(COL.calendar, idOf(entOf(body, a), body));
    case 'targets': return put(COL.settings, 'config', entOf(body, a));

    /* استيراد كشف اتحاد: صفوف كثيرة دفعةً واحدة — مقابل calSave_ */
    case 'cal': {
      const rows = body.calendar || [body.cal || {}];
      if (!rows.length) return { ok: false, error: 'missing' };
      const at = nowISO(), out = [];
      const b = writeBatch(db);
      const by = S(PROFILE && (PROFILE.name || PROFILE.uid));
      for (let i = 0; i < rows.length; i++) {
        const c = rows[i] || {};
        if (!S(c.name) || !S(c.season)) continue;
        const k = S(c.k) || ('CL' + Date.now() + i);
        const row = Object.assign({}, c, { by, at });
        delete row.k;
        b.set(doc(db, COL.calendar, k), row, { merge: true });
        out.push(k);
      }
      if (!out.length) return { ok: false, error: 'missing' };
      await b.commit();
      return { ok: true, at, k: out[0], keys: out, n: out.length };
    }

    case 'weekdata': return weekData(body);

    /* الخطة الشهرية: الملفّ إلى Storage، والبيانات والتقييم وثيقتان */
    case 'monthly': {
      const m = body.monthly || {};
      if (!S(m.month)) return { ok: false, error: 'missing_month' };
      const me = PROFILE || {};
      /* المدرب لا يرفع باسم غيره */
      const coach = me.admin ? (S(m.coach) || S(me.code)) : S(me.code || me.uid);
      const id = S(m.k) || (coach + '__' + S(m.month));
      let url = S(m.url);
      if (body.file) url = await putFile(body.file, body.name, 'monthly');

      const row = Object.assign({}, m, {
        month: S(m.month), coach, coachName: S(me.admin ? m.coachName : me.name),
        url, file: S(body.name || m.file),
        uploadedAt: S(m.uploadedAt) || nowISO(),
      });
      delete row.k; delete row.axes;
      await put(COL.monthly, id, row);

      if (body.review) {
        const rv = body.review;
        await put(COL.reviews, id, {
          axes: rv.axes || [], total: rv.total, coverage: rv.coverage,
          grade: S(rv.grade), decision: S(rv.decision), action: S(rv.action),
          month: S(m.month), coach,
        });
      }
      return { ok: true, k: id, url };
    }
    case 'monthlyDrop': {
      const d = adminOnly(); if (d) return d;
      const k = S((body.monthly || {}).k || body.k);
      if (!k) return { ok: false, error: 'missing' };
      await drop(COL.monthly, k);
      await drop(COL.reviews, k).catch(() => null);
      return { ok: true };
    }

    /* مزايا المساعد كانت تنادي واجهة خارجية من Apps Script.
       لا يمكن نقلها للمتصفّح دون كشف المفتاح — تحتاج Cloud Function. */
    case 'ask': case 'airev': case 'aiweek': case 'aistatus':
      return { ok: false, error: 'ai_needs_function' };

    /* بلا action ⇐ حفظ الرصد. الواجهة ترسلها تحت المفتاح changes،
       وكانت الطبقة تقرأ ticks/rows فترجع ok بلا حفظ — صمتاً. */
    case '': {
      const rows = body.changes || body.ticks || body.rows || [];
      if (!Array.isArray(rows) || !rows.length) return { ok: true, n: 0 };
      const b = writeBatch(db);
      const stamp = {
        by: S(PROFILE && (PROFILE.name || PROFILE.code || PROFILE.uid)),
        at: nowISO(),
      };
      for (const t of rows) {
        const row = Object.assign({}, t, stamp);
        delete row.k;
        b.set(doc(db, COL.ticks, S(t.k)), row, { merge: true });
      }
      await b.commit();
      return { ok: true, n: rows.length };
    }

    default:
      return { ok: false, error: 'unknown_action' };   // حارس صريح، كما في السكربت
  }
}

/* ── نقطة الدخول: بديل fetch ─────────────────────────────── */
const respond = (obj) => ({
  ok: true, status: 200,
  json: async () => obj,
  text: async () => JSON.stringify(obj),
});

export async function __fmacApi(url, opts) {
  try {
    await ready();
    /* fetch يفترض GET حين لا يُذكر method — ونداء init يمرّر {cache:'no-store'} فقط */
    const method = S(opts && opts.method).toUpperCase() || 'GET';
    if (method === 'GET') return respond(await initPayload());
    let body = {};
    try { body = JSON.parse(opts.body || '{}'); } catch (e) { body = {}; }
    return respond(await dispatch(body));
  } catch (e) {
    return respond({ ok: false, error: String((e && e.message) || e) });
  }
}

if (typeof window.__fmacResolve === 'function') window.__fmacResolve(__fmacApi);
window.__fmacApi = __fmacApi;

/* نبدأ المصادقة فوراً حتى تظهر شاشة الدخول أوّلاً، لا بوّابة الأكواد القديمة.
   الشرط يمنع ظهور شاشة الدخول فوق صفحات الفحص التي تستورد الوحدة للقراءة فقط؛
   صفحات الإدارة تنادي ready() بنفسها. */
if (document.getElementById('gate')) window.__fmacAuthReady = ready();
window.__fmacLogout = () => import('./fmac-auth.js').then((m) => m.logout());

export default __fmacApi;
