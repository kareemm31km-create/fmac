/* إنشاء حسابات المدربين — الإدارة تنشئ الحساب وملفّه معاً.
   المشكلة: createUserWithEmailAndPassword يبدّل جلسة المنشئ.
   الحل: نسخة تطبيق ثانوية لها جلستها المستقلّة، فتبقى جلسة الإدارة كما هي. */
import { initializeApp, deleteApp } from '../vendor/firebase-app.js';
import {
  getAuth, createUserWithEmailAndPassword, signOut,
  sendPasswordResetEmail,
} from '../vendor/firebase-auth.js';
import {
  collection, getDocs, doc, setDoc, deleteDoc, getDoc, updateDoc,
} from '../vendor/firebase-firestore.js';
import { FIREBASE_CONFIG, COL, SHARED_PASSWORD } from './fmac-config.js';
import { db, auth } from './fmac-auth.js';

const S = (v) => (v === null || v === undefined) ? '' : String(v).trim();

export const AUTH_MSG = {
  'auth/email-already-in-use': 'هذا البريد مستعمل بالفعل.',
  'auth/invalid-email': 'صيغة البريد غير صحيحة.',
  'auth/weak-password': 'كلمة المرور ضعيفة — ستّة محارف على الأقل.',
  'auth/operation-not-allowed': 'الدخول بالبريد وكلمة المرور غير مفعَّل في لوحة Firebase.',
  'auth/configuration-not-found':
    'المصادقة غير مفعَّلة في مشروع Firebase — فعّل Email/Password أوّلاً.',
  'auth/network-request-failed': 'تعذّر الاتصال بالشبكة.',
};
export const say = (code) => AUTH_MSG[code] || ('تعذّر الإنشاء (' + (code || 'خطأ') + ')');

/* قراءة كل الملفّات */
export async function listUsers() {
  const snap = await getDocs(collection(db, COL.users));
  const out = [];
  snap.forEach((d) => out.push(Object.assign({ uid: d.id }, d.data())));
  out.sort((a, b) => (b.admin ? 1 : 0) - (a.admin ? 1 : 0) ||
    S(a.name).localeCompare(S(b.name), 'ar'));
  return out;
}

/* الملفّات المهاجَرة التي لم تُربط بحساب بعد — معرّفها كودها القديم لا uid */
export const legacyOnly = (users) => users.filter((u) => !u.email);

/**
 * ينشئ حساب دخول + وثيقة users/{uid}.
 * إن مُرِّر legacyCode نُقلت حقول الملفّ القديم ثم حُذف، مع إبقاء
 * الكود نفسه في الحقل code حتى تبقى الخطط مربوطةً بمدرّبها.
 */
export async function createAccount(opts) {
  const email = S(opts.email), password = S(opts.password);
  if (!email || password.length < 6) {
    return { ok: false, error: 'البريد وكلمة المرور (ستّة محارف فأكثر) مطلوبان.' };
  }

  let legacy = null;
  const legacyCode = S(opts.legacyCode);
  if (legacyCode) {
    try {
      const snap = await getDoc(doc(db, COL.users, legacyCode));
      if (snap.exists()) legacy = snap.data();
    } catch (e) { /* تُتجاهل: يُنشأ ملفّ جديد */ }
  }

  /* نسخة ثانوية حتى لا تُبدَّل جلسة الإدارة */
  const second = initializeApp(FIREBASE_CONFIG, 'fmac-admin-' + Date.now());
  const secondAuth = getAuth(second);
  let uid = '';
  try {
    const cred = await createUserWithEmailAndPassword(secondAuth, email, password);
    uid = cred.user.uid;
  } catch (e) {
    try { await deleteApp(second); } catch (e2) { /* لا شيء */ }
    return { ok: false, error: say(e && e.code) };
  }

  const profile = Object.assign({}, legacy || {}, {
    name: S(opts.name) || (legacy && legacy.name) || email,
    role: S(opts.role) || (legacy && legacy.role) || 'مدرب',
    admin: !!opts.admin,
    fitness: !!opts.fitness,
    physio: !!opts.physio,
    /* كلمة المرور الموحّدة لا تبقى: أوّل دخول يطالب بتغييرها */
    mustChange: opts.mustChange !== false && password === SHARED_PASSWORD,
    sport: S(opts.sport) || (legacy && legacy.sport) || '',
    branch: S(opts.branch) || (legacy && legacy.branch) || '',
    phone: S(opts.phone) || (legacy && legacy.phone) || '',
    note: S(opts.note) || (legacy && legacy.note) || '',
    photo: (legacy && legacy.photo) || '',
    email,
    /* الكود القديم يبقى — الخطط تشير إلى المدرب به */
    code: legacyCode || uid,
    active: true,
  });

  try {
    await setDoc(doc(db, COL.users, uid), profile, { merge: true });
    if (legacyCode && legacy) await deleteDoc(doc(db, COL.users, legacyCode));
  } catch (e) {
    try { await signOut(secondAuth); await deleteApp(second); } catch (e2) { /* لا شيء */ }
    return { ok: false, error: 'أُنشئ الحساب لكن تعذّر حفظ الملفّ: ' + (e && e.message) +
      ' — أعد المحاولة بربط الحساب.' };
  }

  try { await signOut(secondAuth); await deleteApp(second); } catch (e) { /* لا شيء */ }
  return { ok: true, uid, profile };
}

/* تعديل ملفّ قائم */
export async function saveProfile(uid, patch) {
  await setDoc(doc(db, COL.users, S(uid)), patch, { merge: true });
  return { ok: true };
}

/* منع الدخول: يُحذف الملفّ فيُرفض الدخول عند التحقّق.
   حساب Auth نفسه لا يمكن حذفه من المتصفّح — يُحذف من لوحة Firebase. */
export async function revoke(uid) {
  const users = await listUsers();
  const admins = users.filter((u) => u.admin);
  const target = users.filter((u) => u.uid === uid)[0];
  if (target && target.admin && admins.length <= 1) {
    return { ok: false, error: 'لا يمكن حذف آخر حساب إدارة.' };
  }
  await deleteDoc(doc(db, COL.users, S(uid)));
  return { ok: true };
}

export const resetPassword = (email) => sendPasswordResetEmail(auth, S(email));

/* ── إنشاء جماعي من جدول ملصوق ──────────────────────────────
   كل سطر: الاسم <tab> البريد <tab> اللعبة [<tab> الفرع] [<tab> الموبايل]
   والفاصل قد يكون tab أو فاصلة أو فاصلة منقوطة. كلمة المرور موحّدة،
   وكل حساب يُعلَّم mustChange فيُطالب صاحبه بتغييرها أوّل دخول. */
export function parseRoster(text) {
  const rows = [];
  const errs = [];
  const lines = S(text).split(/\r?\n/);
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const c = line.split(/\t|,|;|\s{2,}/).map((x) => x.trim()).filter((x) => x !== '');
    if (c.length < 2) { errs.push('سطر ' + (i + 1) + ': ناقص — الاسم والبريد مطلوبان.'); return; }
    /* البريد قد يأتي أوّلاً أو ثانياً — نأخذه من موضعه لا من ترتيبه */
    const ei = c.findIndex((x) => x.indexOf('@') > 0);
    if (ei < 0) { errs.push('سطر ' + (i + 1) + ': لا بريد في السطر.'); return; }
    const email = c[ei];
    const rest = c.filter((_, k) => k !== ei);
    if (!rest.length) { errs.push('سطر ' + (i + 1) + ': لا اسم مع البريد.'); return; }
    rows.push({
      name: rest[0], email,
      sport: rest[1] || '', branch: rest[2] || '', phone: rest[3] || '',
      line: i + 1,
    });
  });
  /* تكرار البريد داخل اللصقة نفسها يُقال قبل المحاولة لا بعدها */
  const seen = {};
  for (const r of rows) {
    const k = r.email.toLowerCase();
    if (seen[k]) errs.push('البريد ' + r.email + ' مكرّر (سطر ' + seen[k] + ' و' + r.line + ').');
    else seen[k] = r.line;
  }
  return { rows, errs };
}

/** ينشئ الصفوف واحداً بعد واحد ويُبلّغ بعد كلّ واحد عبر onStep */
export async function createRoster(rows, opts, onStep) {
  const password = S((opts || {}).password) || SHARED_PASSWORD;
  const role = S((opts || {}).role) || 'مدرب';
  const out = [];
  for (const r of rows) {
    const res = await createAccount({
      email: r.email, password, name: r.name,
      sport: r.sport, branch: r.branch, phone: r.phone,
      role, admin: role === 'إدارة', fitness: role === 'مدرب لياقة بدنية',
      physio: role === 'معالج طبيعي',
    });
    out.push(Object.assign({}, r, res));
    if (onStep) onStep(out[out.length - 1], out.length, rows.length);
  }
  return out;
}

/* ── طلبات فتح الحساب ─────────────────────────────────────── */
export async function listSignups() {
  const snap = await getDocs(collection(db, COL.signups));
  const out = [];
  snap.forEach((d) => out.push(Object.assign({ id: d.id }, d.data())));
  out.sort((a, b) => S(b.at).localeCompare(S(a.at)));
  return out;
}
export const markSignup = (id, state) =>
  updateDoc(doc(db, COL.signups, S(id)), { state: S(state) });
export const dropSignup = (id) => deleteDoc(doc(db, COL.signups, S(id)));
