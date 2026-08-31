/* المصادقة — دخول بالبريد وكلمة المرور، بديل أكواد ?u=  */
import { initializeApp } from '../vendor/firebase-app.js';
import {
  getAuth, signInWithEmailAndPassword, signOut,
  onAuthStateChanged, setPersistence, browserLocalPersistence,
  sendPasswordResetEmail,
} from '../vendor/firebase-auth.js';
import {
  getFirestore, doc, getDoc,
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
} from '../vendor/firebase-firestore.js';
import { getStorage } from '../vendor/firebase-storage.js';
import { FIREBASE_CONFIG } from './fmac-config.js';

export const app = initializeApp(FIREBASE_CONFIG);
export const auth = getAuth(app);

/* كاش محلّي دائم — يبقي الموقع عاملاً داخل الصالة بلا شبكة */
let _db;
try {
  _db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
} catch (e) {
  _db = getFirestore(app);
}
export const db = _db;
export const storage = getStorage(app);

export let PROFILE = null;   // بيانات المستخدم من مجموعة users

const STYLE = `
#fmacLogin{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;
  justify-content:center;background:#08090c;color:#e9ecf1;
  font-family:Tajawal,'Segoe UI',system-ui,sans-serif;direction:rtl}
#fmacLogin .box{width:min(92vw,380px);background:#0f1115;border:1px solid #23272f;
  border-radius:20px;padding:28px 26px}
#fmacLogin h1{margin:0 0 4px;font-size:20px}
#fmacLogin p{margin:0 0 20px;font-size:13px;color:#9aa3b0}
#fmacLogin label{display:block;font-size:13px;margin:14px 0 6px;color:#c7cdd6}
#fmacLogin input{width:100%;box-sizing:border-box;background:#191d24;color:#e9ecf1;
  border:1px solid #2a2f38;border-radius:12px;padding:11px 13px;font-size:14px;
  font-family:inherit;direction:ltr;text-align:left}
#fmacLogin input:focus{outline:none;border-color:#e8555c}
#fmacLogin button{width:100%;margin-top:20px;background:#e8555c;color:#fff;border:0;
  border-radius:12px;padding:12px;font-size:15px;font-weight:700;cursor:pointer;
  font-family:inherit}
#fmacLogin button:disabled{opacity:.6;cursor:default}
#fmacLogin .err{margin-top:14px;font-size:13px;color:#ff4d59;min-height:18px}
#fmacLogin .lnk{margin-top:14px;font-size:12.5px;color:#5b8def;cursor:pointer;
  text-align:center}
`;

const MSG = {
  'auth/invalid-email':        'صيغة البريد غير صحيحة.',
  'auth/user-disabled':        'هذا الحساب موقوف. راجع الإدارة.',
  'auth/user-not-found':       'لا يوجد حساب بهذا البريد.',
  'auth/wrong-password':       'كلمة المرور غير صحيحة.',
  'auth/invalid-credential':   'البريد أو كلمة المرور غير صحيحة.',
  'auth/too-many-requests':    'محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة.',
  'auth/network-request-failed':'تعذّر الاتصال بالشبكة.',
  'no-profile':                'الحساب موجود لكن بلا ملفّ في المستخدمين. راجع الإدارة.',
};
const say = (code) => MSG[code] || 'تعذّر الدخول. حاول مرّة أخرى.';

function screen() {
  const st = document.createElement('style');
  st.textContent = STYLE;
  document.head.appendChild(st);

  const w = document.createElement('div');
  w.id = 'fmacLogin';
  w.innerHTML = `<div class="box">
    <h1>قسم الإعداد الفني</h1>
    <p>نادي الفجيرة للفنون القتالية</p>
    <label for="fmEmail">البريد الإلكتروني</label>
    <input id="fmEmail" type="email" autocomplete="username" inputmode="email">
    <label for="fmPass">كلمة المرور</label>
    <input id="fmPass" type="password" autocomplete="current-password">
    <button id="fmGo">دخول</button>
    <div class="err" id="fmErr"></div>
    <div class="lnk" id="fmReset">نسيت كلمة المرور؟</div>
  </div>`;
  document.body.appendChild(w);

  const email = w.querySelector('#fmEmail');
  const pass  = w.querySelector('#fmPass');
  const go    = w.querySelector('#fmGo');
  const err   = w.querySelector('#fmErr');

  const submit = async () => {
    err.textContent = '';
    go.disabled = true;
    go.textContent = 'جارٍ الدخول…';
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, email.value.trim(), pass.value);
      // onAuthStateChanged يكمل الباقي ويزيل الشاشة
    } catch (e) {
      err.textContent = say(e && e.code);
      go.disabled = false;
      go.textContent = 'دخول';
    }
  };

  go.addEventListener('click', submit);
  pass.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  email.addEventListener('keydown', (e) => { if (e.key === 'Enter') pass.focus(); });

  w.querySelector('#fmReset').addEventListener('click', async () => {
    const a = email.value.trim();
    if (!a) { err.textContent = 'اكتب بريدك أولاً ثم اضغط الرابط.'; return; }
    try {
      await sendPasswordResetEmail(auth, a);
      err.style.color = '#22c07f';
      err.textContent = 'أُرسلت رسالة إعادة التعيين إلى بريدك.';
    } catch (e) { err.textContent = say(e && e.code); }
  });

  setTimeout(() => email.focus(), 50);
  return w;
}

/* ينتظر مستخدماً مسجَّلاً وملفّاً صالحاً في users، ويرجع الملف.
   محفوظة: كل نداء يعيد الوعد نفسه، فلا يتراكم مستمع onAuthStateChanged. */
let _ready = null;
export function ready() {
  if (_ready) return _ready;
  _ready = new Promise((resolve) => {
    let box = null;
    onAuthStateChanged(auth, async (u) => {
      if (!u) {
        PROFILE = null;
        if (!box) box = screen();
        return;
      }
      let snap;
      try {
        snap = await getDoc(doc(db, 'users', u.uid));
      } catch (e) {
        if (!box) box = screen();
        const el = document.getElementById('fmErr');
        if (el) el.textContent = 'تعذّر قراءة ملفّ المستخدم.';
        return;
      }
      if (!snap.exists()) {
        await signOut(auth);
        if (!box) box = screen();
        const el = document.getElementById('fmErr');
        if (el) el.textContent = say('no-profile');
        return;
      }
      PROFILE = Object.assign({ uid: u.uid, email: u.email }, snap.data());
      if (box) { box.remove(); box = null; }
      resolve(PROFILE);
    });
  });
  return _ready;
}

export const logout = () => signOut(auth);
