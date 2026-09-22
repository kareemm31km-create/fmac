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
    slogan1: 'أكثر من نادٍ ..', slogan2: 'لصناعة جيل أقوى',
    sloganEn1: 'MORE THAN A CLUB ..', sloganEn2: 'A STRONGER TOMORROW',
    foot: 'من الفجيرة .. إلى العالمية', footEn: 'FROM FUJAIRAH .. TO THE WORLD',
    creed: ['DISCIPLINE', 'BUILDS', 'STRONGER', 'GENERATIONS'],
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
    slogan1: 'More than a club ..', slogan2: 'building a stronger generation',
    sloganEn1: 'MORE THAN A CLUB ..', sloganEn2: 'A STRONGER TOMORROW',
    foot: 'From Fujairah .. to the world', footEn: 'FROM FUJAIRAH .. TO THE WORLD',
    creed: ['DISCIPLINE', 'BUILDS', 'STRONGER', 'GENERATIONS'],
    needEmail: 'Type your email first, then press the link.',
    resetSent: 'A reset message was sent to your email.',
    needName: 'Name and email are required.',
    chTitle: 'Change your password', chSub: 'The current password is shared across ' +
      'accounts. Choose your own before continuing — asked once.',
    chNew: 'New password', chAgain: 'Repeat it',
    chGo: 'Save and continue', chShort: 'At least eight characters.',
    chSame: 'Same as the shared password — choose another.',
    chDiff: 'The two entries do not match.', chSaving: 'Saving…',
  },
};

export const STYLE = `
#fmacLogin{position:fixed;inset:0;z-index:99999;display:flex;overflow:auto;
  background:#08090c;color:#e9ecf1;font-family:Tajawal,'Segoe UI',system-ui,sans-serif}
#fmacLogin *{box-sizing:border-box}
#fmacLogin .side{flex:1 1 52%;position:relative;display:flex;flex-direction:column;
  justify-content:space-between;padding:34px 40px;min-height:100%;overflow:hidden;
  background:
    radial-gradient(120% 90% at 18% 8%, rgba(232,85,92,.20), transparent 58%),
    radial-gradient(90% 70% at 85% 100%, rgba(232,85,92,.10), transparent 60%),
    linear-gradient(200deg,#12161d 0%,#0a0d12 55%,#08090c 100%)}
/* الصورة إن وُجدت — وإن لم تُرفع بعد بقي التدرّج وحده ولم تظهر فجوة */
#fmacLogin .side.hashero::before{content:'';position:absolute;inset:0;
  background-image:url(./img/hero.jpg);background-size:cover;background-position:center;
  opacity:.72;z-index:0}
#fmacLogin .side::after{content:'';position:absolute;inset:0;z-index:1;
  background:linear-gradient(90deg,rgba(8,9,12,.50) 0%,rgba(8,9,12,.22) 42%,rgba(8,9,12,.86) 100%),
             linear-gradient(0deg,rgba(8,9,12,.82) 0%,rgba(8,9,12,.10) 46%,rgba(8,9,12,.55) 100%)}
#fmacLogin .side > *{position:relative;z-index:2}
/* الشعار يحمل اسم النادي والقسم معاً — النسخة الداكنة من ملفّ النادي */
#fmacLogin .logo{height:96px;width:auto;display:block;align-self:flex-start}
/* left لا inset-inline-start: اللوحة بصرية ثابتة مهما كان اتجاه النصّ */
#fmacLogin .creed{position:absolute;left:34px;top:46%;transform:translateY(-50%);
  z-index:2;display:flex;flex-direction:column;gap:9px;pointer-events:none}
#fmacLogin .creed span{font:600 14px/1 'Segoe UI',system-ui,sans-serif;letter-spacing:.3em;
  color:#e9ecf126;direction:ltr}
#fmacLogin .slog{padding-inline-end:170px}
#fmacLogin .slog h2{margin:0;font-size:clamp(24px,3vw,40px);font-weight:800;line-height:1.28}
#fmacLogin .slog h2 i{font-style:normal;color:#e8555c}
#fmacLogin .slog p{margin:12px 0 0;font:500 12.5px/1.9 'Segoe UI',system-ui,sans-serif;
  letter-spacing:.22em;color:#9aa3b0;direction:ltr;text-align:start}
/* direction:ltr — الصفّ بصري كما في التصميم: الجودو أوّله من اليسار */
#fmacLogin .sports{display:flex;flex-wrap:nowrap;gap:0;margin-top:24px;
  overflow:hidden;direction:ltr}
#fmacLogin .sports a{flex:1 1 0;min-width:0;display:flex;flex-direction:column;
  align-items:center;gap:6px;padding:6px 2px;border-radius:12px;text-decoration:none}
#fmacLogin .sports img{width:24px;height:24px;object-fit:contain;opacity:.6;
  filter:brightness(0) invert(1)}
#fmacLogin .sports span{font-size:9.5px;line-height:1.35;color:#9aa3b0;text-align:center;
  direction:rtl}
#fmacLogin .foot{display:flex;flex-wrap:wrap;gap:10px 18px;align-items:flex-end;
  justify-content:space-between;margin-top:22px;border-top:1px solid #ffffff10;padding-top:14px}
#fmacLogin .foot .f1{font-size:13px;color:#c7cdd6}
#fmacLogin .foot .f2{font:500 10.5px/1.6 'Segoe UI',system-ui,sans-serif;letter-spacing:.2em;
  color:#6b7482;direction:ltr}
#fmacLogin .foot .est{text-align:end;direction:ltr}
#fmacLogin .foot .est b{display:block;font:700 13px/1 'Segoe UI',system-ui,sans-serif;
  letter-spacing:.34em;color:#c7cdd6}
#fmacLogin .foot .est i{font-style:normal;font-size:9.5px;letter-spacing:.28em;color:#6b7482}

#fmacLogin .pane{flex:1 1 48%;display:flex;align-items:center;justify-content:center;
  padding:34px 28px;position:relative}
/* right لا inset-inline-end: موضعه أعلى يمين الشاشة في اللغتين */
#fmacLogin .langbtn{position:absolute;top:28px;right:32px;background:#ffffff08;
  color:#e9ecf1;border:1px solid #ffffff1c;border-radius:99px;padding:9px 16px;
  font:500 13px inherit;cursor:pointer;display:flex;align-items:center;gap:8px}
#fmacLogin .langbtn:hover{background:#ffffff12}
#fmacLogin .box{width:min(94vw,440px);background:#0e1218;
  border:1px solid #1c222c;border-radius:22px;padding:30px 30px 26px;
  box-shadow:0 24px 60px #00000066}
#fmacLogin .tabs{display:flex;gap:0;border-bottom:1px solid #1c222c;margin:-8px -8px 22px}
#fmacLogin .tabs button{flex:1;background:none;border:0;border-bottom:2px solid transparent;
  color:#8f98a6;font:600 14px inherit;padding:13px 6px;cursor:pointer}
#fmacLogin .tabs button[aria-selected="true"]{color:#fff;border-bottom-color:#e8555c;
  background:linear-gradient(180deg,#e8555c14,transparent)}
#fmacLogin h1{margin:0 0 6px;font-size:22px;font-weight:800}
#fmacLogin .lead{margin:0 0 20px;font-size:13px;color:#9aa3b0;line-height:1.8}
#fmacLogin .fld{position:relative;margin-top:12px}
#fmacLogin .fld input,#fmacLogin .fld select,#fmacLogin .fld textarea{
  width:100%;background:#161b23;color:#e9ecf1;border:1px solid #232a34;border-radius:14px;
  padding:14px 46px 14px 16px;font:14px inherit;font-family:inherit}
#fmacLogin[dir="rtl"] .fld input,#fmacLogin[dir="rtl"] .fld select{padding:14px 46px 14px 44px}
#fmacLogin .fld textarea{padding:14px 16px;min-height:74px;resize:vertical}
#fmacLogin .fld input::placeholder,#fmacLogin .fld textarea::placeholder{color:#6b7482}
#fmacLogin .fld input:focus,#fmacLogin .fld select:focus,#fmacLogin .fld textarea:focus{
  outline:none;border-color:#e8555c}
#fmacLogin .fld .ic{position:absolute;inset-inline-start:15px;top:50%;transform:translateY(-50%);
  width:18px;height:18px;color:#6b7482;pointer-events:none}
#fmacLogin .fld .eye{position:absolute;inset-inline-end:12px;top:50%;transform:translateY(-50%);
  background:none;border:0;color:#6b7482;cursor:pointer;padding:6px;line-height:0}
#fmacLogin .fld.mail input,#fmacLogin .fld.pass input{direction:ltr;text-align:start}
#fmacLogin .row{display:flex;align-items:center;justify-content:space-between;gap:12px;
  margin-top:14px;font-size:12.5px}
#fmacLogin .row label{display:flex;align-items:center;gap:8px;color:#c7cdd6;cursor:pointer}
#fmacLogin .row input[type=checkbox]{width:16px;height:16px;accent-color:#e8555c;margin:0}
#fmacLogin .row a{color:#e8555c;text-decoration:none;cursor:pointer}
#fmacLogin .go{width:100%;margin-top:20px;background:linear-gradient(180deg,#ee5b62,#d8353d);
  color:#fff;border:0;border-radius:14px;padding:14px;font:700 15px inherit;cursor:pointer;
  display:flex;align-items:center;justify-content:center;gap:10px}
#fmacLogin .go:hover{filter:brightness(1.06)}
#fmacLogin .go:disabled{opacity:.6;cursor:default;filter:none}
#fmacLogin .msg{margin-top:14px;font-size:12.5px;color:#ff6b74;min-height:18px;line-height:1.7}
#fmacLogin .msg.ok{color:#22c07f}
#fmacLogin .alt{margin-top:18px;text-align:center;font-size:12.5px;color:#8f98a6}
#fmacLogin .alt a{color:#e8555c;text-decoration:underline;cursor:pointer;margin-inline-start:4px}
#fmacLogin code.uid{display:block;user-select:all;margin-top:8px;padding:8px 10px;
  background:#161b23;border-radius:10px;font-size:12px;color:#e9ecf1;word-break:break-all;
  direction:ltr}
@media (max-width:900px){
  #fmacLogin{flex-direction:column}
  #fmacLogin .side{flex:0 0 auto;min-height:auto;padding:22px 20px 26px}
  #fmacLogin .creed{display:none}
  #fmacLogin .slog{padding-inline-end:0}
  #fmacLogin .logo{height:60px}
  /* العمود لا يضيق تحت أعرض ابن له، فنسمح للصفّ بالالتفاف صراحةً */
  #fmacLogin .side > div{min-width:0}
  #fmacLogin .sports{flex-wrap:wrap;margin-top:18px}
  #fmacLogin .sports a{flex:0 0 20%;padding:8px 2px}
  /* اللوحة صفّ في العرض الواسع، فلو بقيت صفّاً جلس زرّ اللغة بجانب البطاقة */
  #fmacLogin .pane{flex-direction:column;align-items:stretch;padding:22px 16px 40px}
  #fmacLogin .box{margin:0 auto}
  #fmacLogin .langbtn{position:static;align-self:flex-start;margin:0 0 16px}
  #fmacLogin .box{padding:24px 20px 20px}
}
`;

const IC = {
  mail: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.7"><rect x="2.5" y="4.5" width="19" height="15" rx="3"/>' +
    '<path d="m3.5 7 7.4 5.3a2 2 0 0 0 2.2 0L20.5 7"/></svg>',
  lock: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.7"><rect x="4" y="10" width="16" height="11" rx="3"/>' +
    '<path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
  user: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.7"><circle cx="12" cy="8" r="3.6"/>' +
    '<path d="M4.5 20c1.2-3.6 4-5.4 7.5-5.4S18.3 16.4 19.5 20"/></svg>',
  globe: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" ' +
    'stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/>' +
    '<path d="M3 12h18M12 3c2.6 2.6 2.6 15.4 0 18M12 3c-2.6 2.6-2.6 15.4 0 18"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" ' +
    'stroke="currentColor" stroke-width="2"><path d="M14 6l6 6-6 6M20 12H4"/></svg>',
  eye: '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" ' +
    'stroke="currentColor" stroke-width="1.7"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12' +
    ' 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff: '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" ' +
    'stroke="currentColor" stroke-width="1.7"><path d="M2.5 12S6 5.5 12 5.5c1.6 0 3 .4 4.2 1"/>' +
    '<path d="M20 8.6c1 1.2 1.5 2.2 1.5 2.2S18 18.5 12 18.5c-1.9 0-3.5-.6-4.8-1.4"/>' +
    '<path d="M3 3l18 18"/></svg>',
};

export const lang = () => {
  try { return localStorage.getItem('fmac.lang') === 'en' ? 'en' : 'ar'; }
  catch (e) { return 'ar'; }
};
const setLang = (v) => { try { localStorage.setItem('fmac.lang', v); } catch (e) { /* لا شيء */ } };

/* لوحة النادي — ثابتة في كل الحالات */
function sidePanel(t) {
  return '<aside class="side">' +
    '<img class="logo" src="./img/fmac-logo.png" ' +
    'alt="نادي الفجيرة للفنون القتالية — قسم الإعداد الفني">' +
    '<div class="creed">' + t.creed.map((c) => '<span>' + c + '</span>').join('') + '</div>' +
    '<div><div class="slog"><h2>' + esc(t.slogan1) + '<br><i>' + esc(t.slogan2) + '</i></h2>' +
    '<p>' + esc(t.sloganEn1) + '<br>' + esc(t.sloganEn2) + '</p></div>' +
    '<div class="sports">' + SPORTS.map(([ar, slug]) =>
      '<a title="' + esc(ar) + '"><img src="./img/sports/' + slug + '.png" alt="' +
      esc(ar) + '"><span>' + esc(ar) + '</span></a>').join('') + '</div>' +
    '<div class="foot"><div><div class="f1">' + esc(t.foot) + '</div>' +
    '<div class="f2">' + esc(t.footEn) + '</div></div>' +
    '<div class="est"><b>FMAC</b><i>EST. 2017</i></div></div></div></aside>';
}

const field = (cls, icon, inner) =>
  '<div class="fld ' + cls + '">' + icon + inner + '</div>';

function signInForm(t) {
  return '<h1>' + esc(t.hi) + '</h1><p class="lead">' + esc(t.hiSub) + '</p>' +
    field('mail', IC.mail, '<input id="fmEmail" type="email" autocomplete="username" ' +
      'inputmode="email" placeholder="' + esc(t.email) + '">') +
    field('pass', IC.lock, '<input id="fmPass" type="password" ' +
      'autocomplete="current-password" placeholder="' + esc(t.pass) + '">' +
      '<button class="eye" id="fmEye" type="button" aria-label="' + esc(t.pass) + '">' +
      IC.eye + '</button>') +
    '<div class="row"><label><input type="checkbox" id="fmRem" checked>' +
    esc(t.remember) + '</label><a id="fmReset">' + esc(t.forgot) + '</a></div>' +
    '<button class="go" id="fmGo">' + esc(t.go) + IC.arrow + '</button>' +
    '<div class="msg" id="fmErr"></div>' +
    '<div class="alt">' + esc(t.noAcc) + '<a data-tab="up">' + esc(t.ask) + '</a></div>';
}

function requestForm(t) {
  return '<h1>' + esc(t.reqTitle) + '</h1><p class="lead">' + esc(t.reqSub) + '</p>' +
    field('', IC.user, '<input id="rqName" type="text" placeholder="' + esc(t.name) + '">') +
    field('mail', IC.mail, '<input id="rqEmail" type="email" inputmode="email" ' +
      'placeholder="' + esc(t.email) + '">') +
    '<div class="fld"><select id="rqSport"><option value="">' + esc(t.sport) + '</option>' +
    SPORTS.map(([ar]) => '<option>' + esc(ar) + '</option>').join('') + '</select></div>' +
    '<div class="fld"><input id="rqPhone" type="text" inputmode="tel" placeholder="' +
    esc(t.phone) + '"></div>' +
    '<div class="fld"><textarea id="rqNote" placeholder="' + esc(t.note) +
    '" maxlength="400"></textarea></div>' +
    '<button class="go" id="rqGo">' + esc(t.send) + IC.arrow + '</button>' +
    '<div class="msg" id="rqMsg"></div>' +
    '<div class="alt">' + esc(t.haveAcc) + '<a data-tab="in">' + esc(t.backIn) + '</a></div>';
}

function changeForm(t) {
  return '<h1>' + esc(t.chTitle) + '</h1><p class="lead">' + esc(t.chSub) + '</p>' +
    field('pass', IC.lock, '<input id="chA" type="password" autocomplete="new-password" ' +
      'placeholder="' + esc(t.chNew) + '">' +
      '<button class="eye" id="chEye" type="button">' + IC.eye + '</button>') +
    field('pass', IC.lock, '<input id="chB" type="password" autocomplete="new-password" ' +
      'placeholder="' + esc(t.chAgain) + '">') +
    '<button class="go" id="chGo">' + esc(t.chGo) + IC.arrow + '</button>' +
    '<div class="msg" id="chMsg"></div>';
}

/**
 * يبني السطح كاملاً. `mode` إمّا 'auth' (دخول/طلب) أو 'change' (إلزام التغيير).
 * يرجع العنصر، وعلى النداء أن يربط السلوك عبر `on`.
 */
export function build(mode, on) {
  const t = T[lang()];
  if (!document.getElementById('fmacLoginStyle')) {
    const st = document.createElement('style');
    st.id = 'fmacLoginStyle';
    st.textContent = STYLE;
    document.head.appendChild(st);
  }
  const w = document.createElement('div');
  w.id = 'fmacLogin';
  w.dir = t.dir;

  const tabs = (mode === 'change') ? '' :
    '<div class="tabs" role="tablist">' +
    '<button role="tab" data-tab="in" aria-selected="true">' + esc(t.tabIn) + '</button>' +
    '<button role="tab" data-tab="up" aria-selected="false">' + esc(t.tabUp) + '</button>' +
    '</div>';

  /* البطاقة أوّلاً: في RTL يقع أوّل عنصر يميناً، وهو موضعها في التصميم */
  w.innerHTML = '<main class="pane">' +
    '<button class="langbtn" id="fmLang">' + IC.globe + '<span>' + esc(t.lang) +
    '</span></button>' +
    '<div class="box" id="fmBox">' + tabs +
    '<div id="fmForm">' + (mode === 'change' ? changeForm(t) : signInForm(t)) + '</div>' +
    '</div></main>' + sidePanel(t);

  document.body.appendChild(w);

  /* الصورة اختيارية: تُضاف حين تُرفع، وقبلها يبقى التدرّج وحده
     ولا يُسجَّل طلب فاشل في سجلّ المتصفّح. */
  const probe = new Image();
  probe.onload = () => { const a = w.querySelector('.side'); if (a) a.classList.add('hashero'); };
  probe.src = './img/hero.jpg';

  w.querySelector('#fmLang').addEventListener('click', () => {
    setLang(lang() === 'ar' ? 'en' : 'ar');
    on.relang();
  });

  const eyeWire = (btnId, inputId) => {
    const b = w.querySelector('#' + btnId), i = w.querySelector('#' + inputId);
    if (!b || !i) return;
    b.addEventListener('click', () => {
      const show = i.type === 'password';
      i.type = show ? 'text' : 'password';
      b.innerHTML = show ? IC.eyeOff : IC.eye;
      i.focus();
    });
  };

  function showTab(which) {
    w.querySelectorAll('.tabs button').forEach((b) =>
      b.setAttribute('aria-selected', String(b.dataset.tab === which)));
    w.querySelector('#fmForm').innerHTML =
      which === 'up' ? requestForm(t) : signInForm(t);
    wire(which);
  }

  function wire(which) {
    w.querySelectorAll('[data-tab]').forEach((el) => {
      if (el.closest('.tabs')) return;
      el.addEventListener('click', () => showTab(el.dataset.tab));
    });
    if (which === 'up') {
      w.querySelector('#rqGo').addEventListener('click', () => on.request(w, t));
      return;
    }
    eyeWire('fmEye', 'fmPass');
    const go = w.querySelector('#fmGo');
    go.addEventListener('click', () => on.signIn(w, t));
    w.querySelector('#fmPass').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') on.signIn(w, t);
    });
    w.querySelector('#fmEmail').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') w.querySelector('#fmPass').focus();
    });
    w.querySelector('#fmReset').addEventListener('click', () => on.reset(w, t));
    setTimeout(() => { const el = w.querySelector('#fmEmail'); if (el) el.focus(); }, 60);
  }

  if (mode === 'change') {
    eyeWire('chEye', 'chA');
    w.querySelector('#chGo').addEventListener('click', () => on.change(w, t));
    w.querySelector('#chB').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') on.change(w, t);
    });
    setTimeout(() => { const el = w.querySelector('#chA'); if (el) el.focus(); }, 60);
  } else {
    w.querySelectorAll('.tabs button').forEach((b) =>
      b.addEventListener('click', () => showTab(b.dataset.tab)));
    wire('in');
  }

  return w;
}

export const texts = T;
export default { build, texts: T, lang, SPORTS };
