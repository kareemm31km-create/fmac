/* إنشاء حسابات المدربين — الإدارة تنشئ الحساب وملفّه معاً.
   المشكلة: createUserWithEmailAndPassword يبدّل جلسة المنشئ.
   الحل: نسخة تطبيق ثانوية لها جلستها المستقلّة، فتبقى جلسة الإدارة كما هي. */
import { initializeApp, deleteApp } from '../vendor/firebase-app.js';
import {
  getAuth, createUserWithEmailAndPassword, signOut,
  sendPasswordResetEmail,
} from '../vendor/firebase-auth.js';
import {
  collection, getDocs, doc, setDoc, deleteDoc, getDoc,
} from '../vendor/firebase-firestore.js';
import { FIREBASE_CONFIG, COL } from './fmac-config.js';
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
