/* المصادقة — دخول بالبريد وكلمة المرور، بديل أكواد ?u=  */
import { initializeApp } from '../vendor/firebase-app.js';
import {
  getAuth, signInWithEmailAndPassword, signOut,
  onAuthStateChanged, setPersistence, browserLocalPersistence,
  browserSessionPersistence, sendPasswordResetEmail, updatePassword,
} from '../vendor/firebase-auth.js';
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc,
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
} from '../vendor/firebase-firestore.js';
import { getStorage } from '../vendor/firebase-storage.js';
import { FIREBASE_CONFIG, BOOTSTRAP_UID, SHARED_PASSWORD, COL } from './fmac-config.js';
import * as UI from './fmac-login-ui.js';

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

const MSG = {
  'auth/invalid-email':        'صيغة البريد غير صحيحة.',
  'auth/user-disabled':        'هذا الحساب موقوف. راجع الإدارة.',
  'auth/user-not-found':       'لا يوجد حساب بهذا البريد.',
  'auth/wrong-password':       'كلمة المرور غير صحيحة.',
  'auth/invalid-credential':   'البريد أو كلمة المرور غير صحيحة.',
  'auth/too-many-requests':    'محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة.',
  'auth/weak-password':        'كلمة المرور ضعيفة — ثمانية محارف على الأقل.',
  'auth/requires-recent-login':'انتهت الجلسة. سجّل الدخول ثم أعد المحاولة.',
  'auth/network-request-failed':'تعذّر الاتصال بالشبكة.',
  'auth/configuration-not-found':
    'المصادقة غير مفعَّلة في مشروع Firebase. فعّل Email/Password من لوحة التحكم ← Authentication.',
  'auth/operation-not-allowed':
    'الدخول بالبريد وكلمة المرور غير مفعَّل. فعّله من لوحة Firebase ← Authentication ← Sign-in method.',
};
const say = (code) => MSG[code] || 'تعذّر الدخول. حاول مرّة أخرى.';

/* السطح الحالي — واحد لا أكثر، حتى لا تتراكم الشاشات فوق بعضها.
   الإزالةُ تمرّ بالواجهة لأنّ لها جذر React يُفكَّك؛ ومجرّدُ remove
   يترك الجذر معلّقاً. */
let box = null;
const drop = () => { if (box) { UI.destroy(); box = null; } };

/* سلوك شاشة الدخول والطلب — المبنى في fmac-login-ui.js والسلوك هنا */
function authScreen() {
  drop();
  box = UI.build('auth', {
    relang: () => authScreen(),
    /* تُرجع {ok} أو {ok:false,msg}. الانتظارُ والرسالةُ من شأن
       الواجهة؛ وكان هذا يُعدّل الزرّ والعُقَد بيده. */
    async signIn({ email, password, remember }) {
      try {
        /* «تذكّرني» مطفأة ⇒ الجلسة تنتهي بإغلاق التبويب */
        await setPersistence(auth,
          remember ? browserLocalPersistence : browserSessionPersistence);
        await signInWithEmailAndPassword(auth, email, password);
        /* onAuthStateChanged يكمل الباقي ويزيل الشاشة */
        return { ok: true };
      } catch (e) {
        return { ok: false, msg: say(e && e.code) };
      }
    },
    async reset(email) {
      try {
        await sendPasswordResetEmail(auth, email);
        return { ok: true, msg: UI.texts[UI.lang()].resetSent };
      } catch (e) { return { ok: false, msg: say(e && e.code) }; }
    },
    async request(v) {
      try {
        /* الحقول هي ما تقبله القاعدة حرفياً — أيّ زيادة تُرفض */
        await addDoc(collection(db, COL.signups), {
          name: String(v.name || '').trim().slice(0, 60),
          email: String(v.email || '').trim().slice(0, 120),
          sport: String(v.sport || '').slice(0, 40),
          phone: String(v.phone || '').trim().slice(0, 30),
          note: String(v.note || '').trim().slice(0, 400),
          at: new Date().toISOString(), state: 'جديد',
        });
        return { ok: true };
      } catch (e) {
        return { ok: false, msg: 'تعذّر إرسال الطلب: ' + ((e && e.message) || '') };
      }
    },
  });
  return box;
}

/* إلزام تغيير كلمة المرور الموحّدة — مرّة واحدة عند أوّل دخول */
function changeScreen(uid, resolve, profile) {
  drop();
  box = UI.build('change', {
    relang: () => changeScreen(uid, resolve, profile),
    async change({ a, b }) {
      const t = UI.texts[UI.lang()];
      if (a.length < 8) return { ok: false, msg: t.chShort };
      if (a === SHARED_PASSWORD) return { ok: false, msg: t.chSame };
      if (a !== b) return { ok: false, msg: t.chDiff };
      try {
        await updatePassword(auth.currentUser, a);
        /* القاعدة تتيح لصاحب الحساب هذا الحقل وحده */
        await updateDoc(doc(db, 'users', uid), { mustChange: false });
        PROFILE = Object.assign({}, profile, { mustChange: false });
        drop();
        resolve(PROFILE);
        return { ok: true };
      } catch (e) {
        return { ok: false, msg: say(e && e.code) + ' ' + ((e && e.message) || '') };
      }
    },
  });
  return box;
}

/* ينتظر مستخدماً مسجَّلاً وملفّاً صالحاً في users، ويرجع الملف.
   محفوظة: كل نداء يعيد الوعد نفسه، فلا يتراكم مستمع onAuthStateChanged. */
let _ready = null;
export function ready() {
  if (_ready) return _ready;
  _ready = new Promise((resolve) => {
    onAuthStateChanged(auth, async (u) => {
      if (!u) {
        PROFILE = null;
        if (!box) authScreen();
        return;
      }
      let snap;
      try {
        snap = await getDoc(doc(db, 'users', u.uid));
      } catch (e) {
        if (!box) authScreen();
        UI.setError('تعذّر قراءة ملفّ المستخدم.');
        return;
      }
      if (!snap.exists()) {
        /* حساب الإدارة الأوّل: يُنشأ ملفّه من هنا — القواعد تسمح لهذا المعرّف وحده */
        if (u.uid === BOOTSTRAP_UID) {
          try {
            const seed = {
              name: 'كريم زاهر', role: 'إدارة', admin: true, code: 'admin1',
              sport: '', branch: '', phone: '', note: '', photo: '',
              email: u.email || '', active: true,
            };
            await setDoc(doc(db, 'users', u.uid), seed, { merge: true });
            PROFILE = Object.assign({ uid: u.uid, email: u.email }, seed);
            drop();
            resolve(PROFILE);
            return;
          } catch (e) {
            if (!box) authScreen();
            UI.setError('تعذّر إنشاء ملفّ الإدارة: ' + (e && e.message));
            return;
          }
        }
        /* نعرض المعرّف نفسه — لأنّ إصلاح الحالة يحتاجه حرفياً */
        const badUid = u.uid;
        await signOut(auth);
        if (!box) authScreen();
        UI.setError({ html: 'الحساب موجود لكن بلا ملفّ في المستخدمين.<br>' +
          'المعرّف (UID):<code class="uid">' + badUid + '</code>' });
        console.log('FMAC uid =', badUid);
        return;
      }
      const data = snap.data();
      PROFILE = Object.assign({ uid: u.uid, email: u.email }, data);
      /* كلمة المرور الموحّدة لا تبقى: نُلزم بتغييرها قبل فتح الموقع */
      if (data.mustChange === true) {
        changeScreen(u.uid, resolve, PROFILE);
        return;
      }
      drop();
      resolve(PROFILE);
    });
  });
  return _ready;
}

export const logout = () => signOut(auth);
