/* طبقة النقل — تُحاكي عقد Apps Script فوق Firestore.
   الواجهة في index.html لا تتغيّر: كل نداء fetch(API,…) صار __fmacApi(API,…). */
import {
  collection, getDocs, doc, setDoc, deleteDoc, writeBatch,
} from '../vendor/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL } from '../vendor/firebase-storage.js';
import { db, storage, PROFILE, ready } from './fmac-auth.js';
import { COL, BUILD } from './fmac-config.js';

const S = (v) => (v === null || v === undefined) ? '' : String(v);
const nowISO = () => new Date().toISOString();

/* ── قراءة مجموعة كاملة ───────────────────────────────────────── */
async function readCol(name) {
  const snap = await getDocs(collection(db, name));
  const out = [];
  snap.forEach((d) => out.push(Object.assign({ k: d.id }, d.data())));
  return out;
}

/* خريطة بالمفتاح — مقابل mapOf_ في السكربت */
const toMap = (rows) => {
  const o = {};
  for (const r of rows) {
    const copy = Object.assign({}, r);
    delete copy.k;
    o[r.k] = copy;
  }
  return o;
};

/* ── تجميع حمولة init ─────────────────────────────────────────── */
const CACHE = { at: 0, data: null };

async function initPayload() {
  const me = PROFILE;
  if (!me) return { ok: false, error: 'bad_code' };

  const names = [
    COL.settings, COL.plans, COL.users, COL.subs, COL.cancels, COL.ticks,
    COL.items, COL.attend, COL.replies, COL.stages, COL.versions, COL.segs,
    COL.devs, COL.sess, COL.notes, COL.weeks, COL.results, COL.shields,
    COL.camps, COL.national, COL.agenda, COL.visits, COL.calendar,
    COL.acts, COL.audit,
  ];
  const got = await Promise.all(names.map((n) => readCol(n).catch(() => [])));
  const R = {};
  names.forEach((n, i) => { R[n] = got[i]; });

  /* الإعدادات وثيقة واحدة */
  const cfgDoc = R[COL.settings].find((d) => d.k === 'config') || {};
  const settings = Object.assign({
    week: '', dates: '', season: '', branch: '',
  }, cfgDoc);
  delete settings.k;

  /* المدرب يرى خططه وحده — مقابل السطر 494 في السكربت */
  const myCode = S(me.code || me.uid);
  let plans = R[COL.plans];
  if (!me.admin) plans = plans.filter((p) => S(p.coach) === myCode);

  const week = S(settings.week);
  const withCode = (u) => Object.assign({}, u, { code: u.k });

  const payload = {
    ok: true,
    user: me,
    settings: settings,
    plans: toMap(plans),
    users: R[COL.users].filter((u) => !u.admin).map(withCode),
    subs: R[COL.subs],
    cancels: R[COL.cancels],
    ticks: toMap(R[COL.ticks].filter((t) => !week || S(t.week) === week)),
    plans2: R[COL.items],
    attend: R[COL.attend],
    replies: R[COL.replies],
    stages: toMap(R[COL.stages]),
    versions: R[COL.versions],
    segs: toMap(R[COL.segs]),
    devs: R[COL.devs],
    sess: toMap(R[COL.sess]),
    notes: R[COL.notes],
    weeks: toMap(R[COL.weeks]),
    acts: toMap(R[COL.acts]),
    audit: me.admin ? R[COL.audit] : [],
    archive: R[COL.subs].filter((s) => me.admin || S(s.by) === myCode),
    results: R[COL.results],
    shields: R[COL.shields],
    camps: R[COL.camps],
    national: R[COL.national],
    staff: me.admin ? R[COL.users].map(withCode) : [],
    agenda: R[COL.agenda],
    visits: R[COL.visits],
    calendar: R[COL.calendar],
    history: R[COL.weeks],
    build: BUILD,
    ai: { on: false, model: '' },   // مزايا المساعد تحتاج Cloud Function
  };

  CACHE.at = Date.now();
  CACHE.data = payload;
  return payload;
}

/* ── صلاحيات ──────────────────────────────────────────────────── */
const deny = { ok: false, error: 'not_admin' };
const adminOnly = () => (PROFILE && PROFILE.admin) ? null : deny;

/* كتابة صفّ — معرّف الوثيقة هو المفتاح k */
async function put(col, key, data) {
  const id = S(key) || doc(collection(db, col)).id;
  const body = Object.assign({}, data, {
    by: S(PROFILE && (PROFILE.code || PROFILE.uid)),
    at: nowISO(),
  });
  delete body.action;
  delete body.u;
  delete body.k;
  delete body.file;
  await setDoc(doc(db, col, id), body, { merge: true });
  CACHE.data = null;
  return { ok: true, k: id };
}

async function drop(col, key) {
  await deleteDoc(doc(db, col, S(key)));
  CACHE.data = null;
  return { ok: true };
}

/* رفع ملف إلى Storage — يقابل media_/upload_ */
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

/* ── موزّع الإجراءات — يقابل doPost ──────────────────────────── */
const ADMIN = ['result', 'shield', 'targets', 'camp', 'natl', 'natlDrop',
  'user', 'userDrop', 'agenda', 'visit', 'cal', 'calDrop', 'closeweek', 'note'];

async function dispatch(body) {
  const a = S(body.action);

  if (ADMIN.indexOf(a) >= 0) {
    const d = adminOnly();
    if (d) return d;
  }

  switch (a) {
    case 'upload': {
      const url = body.file ? await putFile(body.file, body.name, 'media') : S(body.url);
      const row = Object.assign({}, body, { url: url });
      await put(COL.versions, body.k, row);
      return put(COL.subs, body.k, row);
    }
    case 'media': {
      const url = await putFile(body.file, body.name, 'media');
      return put(COL.subs, body.k, Object.assign({}, body, { url: url }));
    }
    case 'cancel': return put(COL.cancels, body.k, body);
    case 'attendance': return put(COL.attend, body.k, body);
    case 'reply': return put(COL.replies, body.k, body);
    case 'stage': return put(COL.stages, body.k, body);
    case 'segments': return put(COL.segs, body.k, body);
    case 'deviations': return put(COL.devs, body.k, body);
    case 'ack': return put(COL.acts, body.k, body);
    case 'session': return put(COL.sess, body.k, body);
    case 'note': return put(COL.notes, body.k, body);
    case 'closeweek': return put(COL.weeks, body.k || body.week, body);
    case 'result': return put(COL.results, body.k, body);
    case 'shield': return put(COL.shields, body.k, body);
    case 'camp': return put(COL.camps, body.k, body);
    case 'natl': return put(COL.national, body.k, body);
    case 'natlDrop': return drop(COL.national, body.k);
    case 'agenda': return put(COL.agenda, body.k, body);
    case 'visit': return put(COL.visits, body.k, body);
    case 'cal': return put(COL.calendar, body.k, body);
    case 'calDrop': return drop(COL.calendar, body.k);
    case 'user': return put(COL.users, body.code || body.k, body);
    case 'userDrop': return drop(COL.users, body.code || body.k);
    case 'targets': return put(COL.settings, 'config', body);

    /* مزايا المساعد كانت تنادي واجهة خارجية من Apps Script.
       لا يمكن نقلها للمتصفّح دون كشف المفتاح — تحتاج Cloud Function. */
    case 'ask':
    case 'airev':
    case 'aiweek':
    case 'aistatus':
      return { ok: false, error: 'ai_needs_function' };
    case 'weekdata':
      return { ok: true, rows: [] };

    /* بلا action ⇐ حفظ الرصد، مقابل saveTicks_ */
    case '': {
      const rows = body.ticks || body.rows || [];
      if (!Array.isArray(rows) || !rows.length) return { ok: true, n: 0 };
      const b = writeBatch(db);
      const stamp = {
        by: S(PROFILE && (PROFILE.code || PROFILE.uid)),
        at: nowISO(),
      };
      for (const t of rows) {
        b.set(doc(db, COL.ticks, S(t.k)), Object.assign({}, t, stamp), { merge: true });
      }
      await b.commit();
      CACHE.data = null;
      return { ok: true, n: rows.length };
    }

    default:
      return { ok: false, error: 'unknown_action' };   // حارس صريح، كما في السكربت
  }
}

/* ── نقطة الدخول: بديل fetch ─────────────────────────────────── */
const respond = (obj) => ({
  ok: true,
  status: 200,
  json: async () => obj,
  text: async () => JSON.stringify(obj),
});

export async function __fmacApi(url, opts) {
  try {
    await ready();
    /* fetch يفترض GET حين لا يُذكر method — ونداء init يمرّر {cache:'no-store'} فقط */
    const method = S(opts && opts.method).toUpperCase() || 'GET';
    if (method === 'GET') {
      return respond(await initPayload());
    }
    let body = {};
    try {
      body = JSON.parse(opts.body || '{}');
    } catch (e) {
      body = {};
    }
    return respond(await dispatch(body));
  } catch (e) {
    return respond({ ok: false, error: String((e && e.message) || e) });
  }
}

/* الوحدات مؤجَّلة، والسكربت الداخلي يعمل أثناء التحليل — لذا يوجد وسيط
   في index.html ينتظر هذا الوعد. نحلّه أوّلاً ثم نستبدل الوسيط بالدالة نفسها. */
if (typeof window.__fmacResolve === 'function') window.__fmacResolve(__fmacApi);
window.__fmacApi = __fmacApi;
export default __fmacApi;
