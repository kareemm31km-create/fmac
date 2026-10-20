/* واجهة ما قبل الدخول — الصفحة التي يراها من لم يُسجّل بعد.
   لوحة النادي على اليسار وبطاقة الدخول على اليمين، وتبويب ثانٍ لطلب حساب.

   طلب الحساب لا يُنشئ حساباً: يصل إلى الإدارة في signupRequests وتراجعه
   من صفحة الحسابات. وقواعد Firestore تقبل الإنشاء وحده بحقول محدودة،
   ولا تتيح لأحد قراءة الطلبات إلا الإدارة. */

const S = (v) => (v === null || v === undefined) ? '' : String(v).trim();
const esc = (s) => S(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const SPORTS = [
  ['الجودو', 'judo'], ['المصارعة', 'wrestling'], ['الجوجيتسو', 'jujitsu'],
  ['الكاراتيه', 'karate'], ['المبارزة', 'fencing'], ['القوس والسهم', 'archery'],
  ['السباحة', 'swimming'], ['الترياثلون', 'triathlon'],
  ['التايكوندو', 'taekwondo'], ['الملاكمة', 'boxing'],
];

/* نصوص الشاشة بلغتين — هذا السطح وحده، فما بعد الدخول له مبدّله */
const T = {
  ar: {
    dir: 'rtl', lang: 'العربية', other: 'English',
    tabIn: 'تسجيل الدخول', tabUp: 'طلب حساب جديد',
    hi: 'مرحباً بك', hiSub: 'سجّل الدخول للوصول إلى نظام نادي الفجيرة للفنون القتالية',
    email: 'البريد الإلكتروني', pass: 'كلمة المرور',
    remember: 'تذكّرني', forgot: 'نسيت كلمة المرور؟',
    go: 'تسجيل الدخول', going: 'جارٍ الدخول…',
    noAcc: 'ليس لديك حساب؟', ask: 'اطلب حساباً جديداً',
    reqTitle: 'طلب حساب', reqSub: 'يصل الطلب إلى الإدارة، ولا يُفتح حساب إلا بموافقتها.',
    name: 'الاسم الكامل', sport: 'اللعبة', phone: 'الموبايل', note: 'ملاحظة (اختياري)',
    send: 'أرسل الطلب', sending: 'جارٍ الإرسال…',
    sent: 'وصل طلبك إلى الإدارة. ستصلك رسالة على بريدك حين يُفتح الحساب.',
    haveAcc: 'لديك حساب؟', backIn: 'عُد لتسجيل الدخول',
    kicker: 'MORE THAN A CLUB',
    slogan1: 'من هنا تبدأ القوة…', slogan2: 'ومن هنا يُصنع الأبطال',
    /* اللسانان كانا يُعرَضان معاً — الجملةُ ثمّ صداها تحتها، والشعارُ
       مرّتين. وفي الصفحة زرُّ لغةٍ يختار، فالمعروضُ لسانٌ واحد. */
    foot: 'من الفجيرة … إلى العالمية',
    creed: ['DISCIPLINE', 'UNITY', 'EXCELLENCE'],
    needEmail: 'اكتب بريدك أوّلاً ثم اضغط الرابط.',
    resetSent: 'أُرسلت رسالة إعادة التعيين إلى بريدك.',
    needName: 'الاسم والبريد مطلوبان.',
    /* إلزام تغيير كلمة المرور */
    chTitle: 'غيّر كلمة المرور', chSub: 'كلمة المرور الحالية موحّدة لكل الحسابات. ' +
      'اختر كلمة خاصة بك قبل الدخول — تُطلب منك مرّة واحدة.',
    chNew: 'كلمة المرور الجديدة', chAgain: 'أعد كتابتها',
    chGo: 'احفظ وادخل', chShort: 'كلمة المرور ثمانية محارف على الأقل.',
    chSame: 'لا تُطابق كلمة المرور الموحّدة — اختر غيرها.',
    chDiff: 'الكلمتان غير متطابقتين.', chSaving: 'جارٍ الحفظ…',
    caps: 'تنبيه: مفتاح الحروف الكبيرة مُفعَّل.',
    failed: 'تعذَّر إتمام الطلب. أعد المحاولة.',
  },
  en: {
    dir: 'ltr', lang: 'English', other: 'العربية',
    tabIn: 'Sign in', tabUp: 'Request an account',
    hi: 'Welcome', hiSub: 'Sign in to reach the Fujairah Martial Arts Club system',
    email: 'Email', pass: 'Password',
    remember: 'Remember me', forgot: 'Forgot your password?',
    go: 'Sign in', going: 'Signing in…',
    noAcc: 'No account?', ask: 'Request one',
    reqTitle: 'Account request', reqSub: 'The request reaches the administration; ' +
      'no account opens without their approval.',
    name: 'Full name', sport: 'Sport', phone: 'Mobile', note: 'Note (optional)',
    send: 'Send request', sending: 'Sending…',
    sent: 'Your request reached the administration. You will be emailed once it opens.',
    haveAcc: 'Have an account?', backIn: 'Back to sign in',
    kicker: 'MORE THAN A CLUB',
    slogan1: 'Where strength begins…', slogan2: 'and champions are made.',
    foot: 'From Fujairah … to the world',
    creed: ['DISCIPLINE', 'UNITY', 'EXCELLENCE'],
    needEmail: 'Type your email first, then press the link.',
    resetSent: 'A reset message was sent to your email.',
    needName: 'Name and email are required.',
    chTitle: 'Change your password', chSub: 'The current password is shared across ' +
      'accounts. Choose your own before continuing — asked once.',
    chNew: 'New password', chAgain: 'Repeat it',
    chGo: 'Save and continue', chShort: 'At least eight characters.',
    chSame: 'Same as the shared password — choose another.',
    chDiff: 'The two entries do not match.', chSaving: 'Saving…',
    caps: 'Caps Lock is on.',
    failed: 'The request could not be completed. Try again.',
  },
};

/* المفتاح نفسه الذي يستعمله الموقع بعد الدخول، فاختيارك يتبعك */
const LANG_KEY = 'fmac.tracker.v2.lang';

export const lang = () => {
  try { return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'ar'; }
  catch (e) { return 'ar'; }
};
const setLang = (v) => { try { localStorage.setItem(LANG_KEY, v); } catch (e) { /* لا شيء */ } };

/* ورقةُ الأنماط تُوصَل مرّةً — تخدم React والاحتياطيَّ معاً */
function linkStyle() {
  if (document.getElementById('fmacLoginStyle')) return;
  const l = document.createElement('link');
  l.id = 'fmacLoginStyle';
  l.rel = 'stylesheet';
  l.href = './css/login.css';
  document.head.appendChild(l);
}

/* ═══ الاحتياطيّ ═══
   React يأتي من الشبكة. وهذه الشاشةُ هي البابُ إلى كلّ شيء، فلو
   تأخّر CDN أو حُجب لَبقي النادي خارج نظامه. هذا نموذجٌ عاريٌ
   بالقشرة نفسِها يفتح الباب على كلّ حال. */
function fallback(host, mode, t, on) {
  const F = (id, type, label, extra) =>
    '<div class="fld noic"><input id="' + id + '" type="' + type + '" ' +
    (extra || '') + ' placeholder=" " aria-label="' + esc(label) + '">' +
    '<label class="flbl" for="' + id + '">' + esc(label) + '</label></div>';

  host.innerHTML =
    '<main class="pane"><div class="box"><span class="boxtop"></span>' +
    '<h1>' + esc(mode === 'change' ? t.chTitle : t.hi) + '</h1>' +
    '<p class="lead">' + esc(mode === 'change' ? t.chSub : t.hiSub) + '</p>' +
    (mode === 'change'
      ? F('chA', 'password', t.chNew, 'autocomplete="new-password" dir="ltr"') +
        F('chB', 'password', t.chAgain, 'autocomplete="new-password" dir="ltr"')
      : F('fmEmail', 'email', t.email, 'autocomplete="username" dir="ltr"') +
        F('fmPass', 'password', t.pass, 'autocomplete="current-password" dir="ltr"') +
        '<div class="row"><label><input id="fmRem" type="checkbox" checked>' +
        esc(t.remember) + '</label></div>') +
    '<button class="go" id="fbGo">' + esc(mode === 'change' ? t.chGo : t.go) + '</button>' +
    '<div class="msg" id="' + (mode === 'change' ? 'chMsg' : 'fmErr') + '"></div>' +
    '</div></main>';

  const msg = host.querySelector('.msg');
  const btn = host.querySelector('#fbGo');
  const say = (x, ok) => {
    msg.className = 'msg' + (ok ? ' ok' : '');
    if (x && x.html) msg.innerHTML = x.html; else msg.textContent = x || '';
  };
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    say('');
    const r = mode === 'change'
      ? await on.change({ a: host.querySelector('#chA').value,
                          b: host.querySelector('#chB').value })
      : await on.signIn({ email: host.querySelector('#fmEmail').value.trim(),
                          password: host.querySelector('#fmPass').value,
                          remember: host.querySelector('#fmRem').checked });
    if (r && r.ok) return;
    btn.disabled = false;
    say((r && r.msg) || t.failed);
  });
  host.querySelectorAll('.fld input').forEach((i) => {
    const sync = () => i.parentElement.classList.toggle('filled', !!i.value);
    i.addEventListener('input', sync); sync();
  });
  return { error: say, destroy() { /* لا جذر */ } };
}

/* السطح الحيّ — واحدٌ لا أكثر */
let surface = null;

/**
 * يبني شاشة الدخول ويُرجع عنصرَها.
 * `mode`: 'auth' (دخول/طلب) أو 'change' (إلزام تغيير كلمة المرور).
 * `on`: عقدٌ قيميٌّ لا أمريّ — يستقبل قيماً ويُرجع {ok} أو {ok:false,msg}:
 *   relang()                                   يعيد البناء باللغة الأخرى
 *   signIn({email,password,remember})
 *   reset(email)            → {ok,msg}
 *   request({name,email,sport,phone,note})
 *   change({a,b})
 * الواجهةُ تملك حالتَها (انتظار، خطأ، تبويب)؛ ولا تُعدّلها المصادقةُ
 * بيدها كما كانت — فذلك يصطدم بإعادة رسم React.
 */
export function build(mode, on) {
  const t = T[lang()];
  linkStyle();

  const w = document.createElement('div');
  w.id = 'fmacLogin';
  w.dir = t.dir;
  document.body.appendChild(w);

  const handlers = Object.assign({}, on, {
    relang() { setLang(lang() === 'ar' ? 'en' : 'ar'); on.relang(); },
  });

  surface = { el: w, api: null, queued: null };

  import('./fmac-login-react.js')
    .then((M) => {
      if (surface && surface.el === w) {
        surface.api = M.mount(w, { mode, t, on: handlers, sports: SPORTS });
        if (surface.queued != null) surface.api.error(surface.queued);
      }
    })
    .catch((e) => {
      /* تُسجَّل ولا تُبتلع: إن حدثت فلها سبب يُقرأ */
      console.warn('FMAC: تعذّر تحميل واجهة React — النموذج الاحتياطيّ.', e);
      if (surface && surface.el === w) {
        surface.api = fallback(w, mode, t, handlers);
        if (surface.queued != null) surface.api.error(surface.queued);
      }
    });

  return w;
}

/* منفذٌ للمصادقة تكتب به رسالةً دون أن تلمس الشجرة.
   يقبل نصّاً أو {html} للحالة التي تحتاج ترميزاً (المعرّف الخام). */
export function setError(x) {
  if (!surface) return;
  if (surface.api) surface.api.error(x); else surface.queued = x;
}

/* يزيل السطح ويُفكّك جذر React — بلا هذا يبقى الجذر معلّقاً */
export function destroy() {
  if (!surface) return;
  if (surface.api && surface.api.destroy) surface.api.destroy();
  if (surface.el && surface.el.remove) surface.el.remove();
  surface = null;
}

export const texts = T;
export default { build, destroy, setError, texts: T, lang, SPORTS };
