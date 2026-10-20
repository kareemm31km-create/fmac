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
    sloganEn1: 'WHERE STRENGTH BEGINS…', sloganEn2: 'AND CHAMPIONS ARE MADE.',
    foot: 'من الفجيرة … إلى العالمية', footEn: 'FROM FUJAIRAH … TO THE WORLD',
    /* كانت creed وvalues نسختين من ثلاث كلمات: واحدةٌ عموديّةٌ
       شبحيّةٌ على الصورة وأخرى أفقيّةٌ تحت العنوان. الشعارُ يُقال
       مرّةً واحدة. */
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
    sloganEn1: 'من هنا تبدأ القوة…', sloganEn2: 'ومن هنا يُصنع الأبطال',
    /* كان السطران جملةً واحدةً مرّتين — بحروفٍ صغيرةٍ ثمّ كبيرة.
       الثاني يصير العربيّةَ، كما يفعل الشعارُ في هذا الوضع. */
    foot: 'From Fujairah … to the world', footEn: 'من الفجيرة … إلى العالمية',
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
  },
};

/* شاشةُ الدخول كانت على اللوحة الزرقاء القديمة: تدرّجاتٌ
   زرقاءُ مكتوبةٌ صراحةً وحجابٌ كحليٌّ واحتياطيّاتٌ من لوحةٍ ماتت،
   وSegoe UI يزاحم Tajawal. وكانت ساكنةً تماماً. أُعيدت على لوحة
   الدوجو، بسُلَّمِ الحجم نفسِه، وبحركةٍ تدخل مرّةً ثمّ تهدأ:
   صعودٌ متدرّجٌ للأجزاء، وتنفُّسٌ بطيءٌ للصورة، ووهجٌ يسبح خلف
   البطاقة — وكلُّها تسقط عند طلب تقليل الحركة. */
export const STYLE = `
#fmacLogin{position:fixed;inset:0;z-index:99999;display:flex;overflow:auto;
  background:var(--bg-deep);color:var(--ink-deep);
  font-family:'Tajawal',system-ui,sans-serif;font-variant-numeric:tabular-nums;
  --ease-o:cubic-bezier(.22,1,.36,1);
  --ease-s:cubic-bezier(.34,1.3,.64,1)}
#fmacLogin *{box-sizing:border-box}

/* ═══ اللوحة اليُمنى: الصورة والهويّة ═══ */
#fmacLogin .side{flex:1 1 52%;position:relative;display:flex;flex-direction:column;
  justify-content:space-between;gap:28px;padding:40px 46px;min-height:100%;overflow:hidden;
  background:linear-gradient(200deg,var(--surface-soft) 0%,var(--canvas) 58%,var(--bg-deep) 100%)}

/* الصورة تتنفّس: تكبيرٌ بطيءٌ لا يكاد يُرى، فالثباتُ التامُّ يبدو
   صورةً معلّقةً والحركةُ الظاهرةُ تُلهي عن النموذج. */
#fmacLogin .side.hashero::before{content:'';position:absolute;inset:-2%;
  background-image:url(./img/hero.jpg);background-size:cover;background-position:center 42%;
  opacity:.66;z-index:0;transform-origin:62% 46%;
  animation:fmBreathe 26s var(--ease-o) infinite alternate both}
@keyframes fmBreathe{from{transform:scale(1)}to{transform:scale(1.07)}}

/* الحجابُ أسودٌ دافئ كلوحة الموقع — كان كحليّاً فيُفسد الدفء */
#fmacLogin .side::after{content:'';position:absolute;inset:0;z-index:1;pointer-events:none;
  background:
    radial-gradient(115% 85% at 16% 6%, color-mix(in srgb,var(--brand) 16%,transparent), transparent 56%),
    linear-gradient(90deg,rgba(18,17,16,.34) 0%,rgba(18,17,16,.16) 38%,rgba(18,17,16,.90) 100%),
    linear-gradient(0deg,rgba(18,17,16,.92) 0%,rgba(18,17,16,.06) 48%,rgba(18,17,16,.62) 100%)}
#fmacLogin .side > *{position:relative;z-index:2}

#fmacLogin .logo{height:88px;width:auto;display:block}
#fmacLogin .sbody{position:relative;isolation:isolate;
  display:flex;flex-direction:column;align-items:flex-start}
/* الشعارُ والعنوانُ يقعان على سترةٍ بيضاءَ في الصورة فيضيعان.
   تعتيمُ الصورة كلِّها يقتلها؛ فهالةٌ داكنةٌ تحت النصّ وحدَه. */
#fmacLogin .sbody::before{content:'';position:absolute;inset:-30px -40px;z-index:-1;
  pointer-events:none;
  background:radial-gradient(76% 128% at 32% 52%,rgba(18,17,16,.80),rgba(18,17,16,.46) 52%,transparent 76%)}

/* القبسة: خطٌّ نحاسيٌّ يُرسَم ثمّ الكلمات */
#fmacLogin .kick{display:inline-flex;align-items:center;gap:14px;direction:ltr;
  font:700 12px/1 'Tajawal',system-ui,sans-serif;letter-spacing:.38em;
  color:var(--ink);margin-bottom:18px}
#fmacLogin .kick i{display:block;width:64px;height:2px;border-radius:2px;background:var(--brand);
  transform-origin:left center;animation:fmRule .7s var(--ease-o) .35s both}
@keyframes fmRule{from{transform:scaleX(0)}to{transform:scaleX(1)}}

#fmacLogin .side h2{margin:0;font-size:clamp(24px,2.9vw,40px);font-weight:800;line-height:1.3;
  letter-spacing:-.5px;color:var(--ink-deep);text-shadow:0 2px 18px rgba(18,17,16,.5)}
#fmacLogin .side h2 em{font-style:normal;color:var(--brand)}
/* اللسانُ الآخر: أصغرُ وأخفت، فالأوّلُ هو الذي يُقرأ */
#fmacLogin .alt2{margin:14px 0 0;font:500 16px/1.85 'Tajawal',system-ui,sans-serif;
  color:var(--charcoal);text-shadow:0 1px 12px rgba(18,17,16,.5);
  unicode-bidi:plaintext;text-align:start}
/* الشعارُ مرّةً واحدةً أفقيّاً — وكان يُقال مرّتين */
#fmacLogin .creed{display:flex;align-items:center;gap:14px;flex-wrap:wrap;
  margin:22px 0 0;font:700 12px/1 'Tajawal',system-ui,sans-serif;letter-spacing:.3em;
  /* كان stone فبلغ ٣٫٨٩ على أفتح بكسلٍ تحته — دون العتبة */
  color:var(--charcoal);direction:ltr}
#fmacLogin .creed i{display:block;width:5px;height:5px;border-radius:999px;
  background:var(--brand);flex:none}

#fmacLogin .sfootwrap{display:flex;flex-direction:column;gap:18px}
/* صفُّ الألعاب: بصريٌّ من اليسار في اللسانين */
#fmacLogin .sports{display:flex;flex-wrap:nowrap;gap:2px;direction:ltr}
#fmacLogin .sports a{flex:1 1 0;min-width:0;display:flex;flex-direction:column;
  align-items:center;gap:7px;padding:10px 2px;border-radius:14px;text-decoration:none;
  border:1px solid transparent;
  transition:background .25s var(--ease-o),border-color .25s var(--ease-o),transform .25s var(--ease-o)}
#fmacLogin .sports a:hover{background:rgba(247,243,236,.05);border-color:var(--hairline);
  transform:translateY(-3px)}
#fmacLogin .sports img{width:26px;height:26px;object-fit:contain;opacity:.62;
  filter:brightness(0) invert(1);transition:opacity .25s var(--ease-o)}
#fmacLogin .sports a:hover img{opacity:1}
#fmacLogin .sports span{font-size:12px;line-height:1.35;color:var(--steel);text-align:center;
  direction:rtl;transition:color .25s var(--ease-o)}
#fmacLogin .sports a:hover span{color:var(--ink)}

#fmacLogin .foot{display:flex;flex-wrap:wrap;gap:10px 18px;align-items:flex-end;
  justify-content:space-between;border-top:1px solid rgba(247,243,236,.09);padding-top:16px}
#fmacLogin .foot .f1{font-size:14px;color:var(--charcoal)}
#fmacLogin .foot .f2{font:500 12px/1.6 'Tajawal',system-ui,sans-serif;letter-spacing:.18em;
  color:var(--steel);margin-top:3px;unicode-bidi:plaintext;text-align:start}
#fmacLogin .foot .est{text-align:end;direction:ltr;flex:none}
#fmacLogin .foot .est b{display:block;font:800 14px/1 'Tajawal',system-ui,sans-serif;
  letter-spacing:.34em;color:var(--charcoal)}
#fmacLogin .foot .est i{font-style:normal;font-size:12px;letter-spacing:.26em;color:var(--steel)}

/* ═══ اللوحة اليُسرى: النموذج ═══ */
#fmacLogin .pane{flex:1 1 48%;display:flex;align-items:center;justify-content:center;
  padding:40px 32px;position:relative;isolation:isolate}
/* وهجان نحاسيّان يسبحان ببطء خلف البطاقة — عمقٌ لا زينة */
#fmacLogin .pane::before{content:'';position:absolute;inset:0;z-index:-1;pointer-events:none;
  background:
    radial-gradient(42% 38% at 24% 22%, color-mix(in srgb,var(--brand) 13%,transparent), transparent 70%),
    radial-gradient(38% 34% at 78% 82%, color-mix(in srgb,var(--brand) 9%,transparent), transparent 72%);
  animation:fmDrift 24s ease-in-out infinite alternate both}
@keyframes fmDrift{from{transform:translate3d(0,0,0) scale(1)}
  to{transform:translate3d(2.5%,-3%,0) scale(1.1)}}

#fmacLogin .langbtn{position:absolute;top:26px;inset-inline-start:30px;z-index:3;
  background:rgba(247,243,236,.04);color:var(--ink-deep);
  border:1px solid rgba(247,243,236,.12);border-radius:999px;padding:9px 16px;
  font:500 14px 'Tajawal',system-ui,sans-serif;cursor:pointer;
  display:flex;align-items:center;gap:8px;
  transition:background .2s var(--ease-o),border-color .2s var(--ease-o),transform .2s var(--ease-o)}
#fmacLogin .langbtn:hover{background:rgba(247,243,236,.09);border-color:var(--edge);
  transform:translateY(-1px)}

#fmacLogin .box{width:min(94vw,452px);background:var(--surface);
  border:1px solid var(--hairline);border-radius:20px;padding:34px 34px 28px;
  box-shadow:0 30px 70px rgba(0,0,0,.52),0 2px 0 rgba(247,243,236,.04) inset}

#fmacLogin .tabs{display:flex;gap:0;border-bottom:1px solid var(--hairline);margin:-10px -10px 24px}
#fmacLogin .tabs button{position:relative;flex:1;background:none;border:0;
  color:var(--steel);font:700 16px 'Tajawal',system-ui,sans-serif;padding:14px 6px;cursor:pointer;
  transition:color .22s var(--ease-o)}
#fmacLogin .tabs button:hover{color:var(--ink)}
/* الخطُّ ينمو تحت التبويب المختار بدل أن يَظهر فجأة */
#fmacLogin .tabs button::after{content:'';position:absolute;inset-inline:0;bottom:-1px;height:2px;
  background:var(--brand);border-radius:2px;transform:scaleX(0);
  transition:transform .3s var(--ease-o)}
#fmacLogin .tabs button[aria-selected="true"]{color:var(--ink-deep)}
#fmacLogin .tabs button[aria-selected="true"]::after{transform:scaleX(1)}

#fmacLogin h1{margin:0 0 8px;font-size:28px;font-weight:800;letter-spacing:-.4px}
#fmacLogin .lead{margin:0 0 22px;font-size:14px;color:var(--steel);line-height:1.8}

#fmacLogin .fld{position:relative;margin-top:14px}
#fmacLogin .fld input,#fmacLogin .fld select,#fmacLogin .fld textarea{
  width:100%;background:var(--field-bg);color:var(--ink-deep);
  border:1px solid var(--field-edge);border-radius:13px;
  padding:14px 16px;padding-inline-start:46px;
  font:16px 'Tajawal',system-ui,sans-serif;
  transition:border-color .2s var(--ease-o),box-shadow .2s var(--ease-o),background .2s var(--ease-o)}
/* العينُ تجلس عند النهاية، فحقلُ المرور يترك لها مكاناً */
#fmacLogin .fld.pass input{padding-inline-end:46px}
#fmacLogin .fld textarea{padding:14px 16px;min-height:76px;resize:vertical}
#fmacLogin .fld input::placeholder,#fmacLogin .fld textarea::placeholder{color:var(--field-ph)}
#fmacLogin .fld input:focus,#fmacLogin .fld select:focus,#fmacLogin .fld textarea:focus{
  outline:none;border-color:var(--brand);
  box-shadow:0 0 0 3px color-mix(in srgb,var(--brand) 22%,transparent)}
#fmacLogin .fld .ic{position:absolute;inset-inline-start:15px;top:50%;transform:translateY(-50%);
  width:18px;height:18px;color:var(--field-ph);pointer-events:none;
  transition:color .2s var(--ease-o)}
#fmacLogin .fld:focus-within .ic{color:var(--brand)}
#fmacLogin .fld .eye{position:absolute;inset-inline-end:12px;top:50%;transform:translateY(-50%);
  background:none;border:0;color:var(--field-ph);cursor:pointer;padding:6px;line-height:0;
  border-radius:8px;transition:color .2s var(--ease-o)}
#fmacLogin .fld .eye:hover{color:var(--ink)}
#fmacLogin .fld.mail input,#fmacLogin .fld.pass input{direction:ltr;text-align:start}

#fmacLogin .row{display:flex;align-items:center;justify-content:space-between;gap:12px;
  margin-top:16px;font-size:14px}
#fmacLogin .row label{display:flex;align-items:center;gap:8px;color:var(--charcoal);cursor:pointer}
#fmacLogin .row input[type=checkbox]{width:16px;height:16px;accent-color:var(--brand);margin:0}
#fmacLogin .row a{color:var(--brand);text-decoration:none;cursor:pointer;
  transition:opacity .2s var(--ease-o)}
#fmacLogin .row a:hover{opacity:.78;text-decoration:underline}

#fmacLogin .go{position:relative;overflow:hidden;width:100%;margin-top:22px;
  background:var(--brand);color:var(--on-brand);border:0;border-radius:13px;padding:15px;
  font:800 16px 'Tajawal',system-ui,sans-serif;cursor:pointer;
  display:flex;align-items:center;justify-content:center;gap:10px;
  transition:transform .2s var(--ease-s),box-shadow .25s var(--ease-o),background .2s var(--ease-o)}
#fmacLogin .go:hover{background:var(--brand-dark);transform:translateY(-2px);
  box-shadow:0 12px 26px color-mix(in srgb,var(--brand) 32%,transparent)}
#fmacLogin .go:active{transform:translateY(0)}
#fmacLogin .go svg{transition:transform .25s var(--ease-o)}
#fmacLogin[dir="rtl"] .go svg{transform:scaleX(-1)}
#fmacLogin .go:hover svg{transform:translateX(4px)}
#fmacLogin[dir="rtl"] .go:hover svg{transform:scaleX(-1) translateX(4px)}
#fmacLogin .go:disabled{opacity:.62;cursor:default;transform:none;box-shadow:none;
  background:var(--brand)}
/* أثناء الانتظار: بريقٌ يعبر الزرّ فيُعلَم أنّه يعمل */
#fmacLogin .go:disabled::after{content:'';position:absolute;inset:0;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.26),transparent);
  animation:fmSheen 1.25s linear infinite}
@keyframes fmSheen{from{transform:translateX(-100%)}to{transform:translateX(100%)}}

#fmacLogin .msg{margin-top:15px;font-size:14px;color:var(--critical);min-height:18px;line-height:1.7}
#fmacLogin .msg:not(:empty){animation:fmShakeIn .4s var(--ease-o) both}
@keyframes fmShakeIn{0%{opacity:0;transform:translateX(0)}
  35%{opacity:1;transform:translateX(-4px)}65%{transform:translateX(3px)}100%{transform:none}}
#fmacLogin .msg.ok{color:var(--success)}
#fmacLogin .msg.ok:not(:empty){animation:fmRise .4s var(--ease-o) both}

#fmacLogin .alt{margin-top:20px;text-align:center;font-size:14px;color:var(--steel)}
#fmacLogin .alt a{color:var(--brand);text-decoration:underline;cursor:pointer;margin-inline-start:4px}
#fmacLogin code.uid{display:block;user-select:all;margin-top:8px;padding:8px 10px;
  background:var(--field-bg);border-radius:12px;font-size:14px;color:var(--ink-deep);
  word-break:break-all;direction:ltr}

/* ═══ الدخول: كلُّ جزءٍ يصعد في دوره ═══ */
@keyframes fmRise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes fmCard{from{opacity:0;transform:translateY(22px) scale(.985)}to{opacity:1;transform:none}}
@keyframes fmFade{from{opacity:0}to{opacity:1}}
#fmacLogin .logo  {animation:fmRise .7s var(--ease-o) .10s both}
#fmacLogin .kick  {animation:fmRise .7s var(--ease-o) .22s both}
#fmacLogin .side h2{animation:fmRise .8s var(--ease-o) .32s both}
#fmacLogin .alt2  {animation:fmRise .8s var(--ease-o) .42s both}
#fmacLogin .creed {animation:fmRise .8s var(--ease-o) .50s both}
#fmacLogin .sports{animation:fmRise .8s var(--ease-o) .58s both}
#fmacLogin .foot  {animation:fmRise .8s var(--ease-o) .66s both}
#fmacLogin .box   {animation:fmCard .75s var(--ease-o) .18s both}
#fmacLogin .langbtn{animation:fmFade .6s var(--ease-o) .55s both}
#fmacLogin .side.hashero::before{animation:fmBreathe 26s var(--ease-o) infinite alternate both,
  fmFade 1.1s ease-out both}

/* الحركةُ اختيارٌ لا فرض: من طلب السكون نالَه كاملاً */
@media (prefers-reduced-motion: reduce){
  #fmacLogin *,#fmacLogin *::before,#fmacLogin *::after{
    animation:none!important;transition:none!important}
}

@media (max-width:900px){
  #fmacLogin{flex-direction:column}
  #fmacLogin .side{flex:0 0 auto;min-height:auto;padding:24px 20px 28px;gap:20px}
  #fmacLogin .logo{height:62px}
  #fmacLogin .side > div{min-width:0}
  #fmacLogin .side h2{font-size:24px}
  #fmacLogin .alt2{font-size:14px}
  #fmacLogin .sports{flex-wrap:wrap}
  #fmacLogin .sports a{flex:0 0 20%;padding:8px 2px}
  #fmacLogin .sports span{font-size:12px}
  #fmacLogin .pane{flex-direction:column;align-items:stretch;padding:24px 16px 40px}
  #fmacLogin .box{margin:0 auto;padding:26px 22px 22px}
  #fmacLogin h1{font-size:20px}
  #fmacLogin .langbtn{position:static;align-self:flex-start;margin:0 0 16px}
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

/* المفتاح نفسه الذي يستعمله الموقع بعد الدخول، فاختيارك يتبعك */
const LANG_KEY = 'fmac.tracker.v2.lang';

export const lang = () => {
  try { return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'ar'; }
  catch (e) { return 'ar'; }
};
const setLang = (v) => { try { localStorage.setItem(LANG_KEY, v); } catch (e) { /* لا شيء */ } };

/* لوحة النادي — ثابتة في كل الحالات */
function sidePanel(t) {
  return '<aside class="side">' +
    '<div class="shead">' +
      '<img class="logo" src="./img/fmac-logo.png" ' +
      'alt="نادي الفجيرة للفنون القتالية — قسم الإعداد الفني">' +
    '</div>' +
    '<div class="sbody">' +
      '<span class="kick"><i></i>' + esc(t.kicker) + '</span>' +
      '<h2>' + esc(t.slogan1) + '<br><em>' + esc(t.slogan2) + '</em></h2>' +
      '<p class="alt2">' + esc(t.sloganEn1) + '<br>' + esc(t.sloganEn2) + '</p>' +
      '<p class="creed">' + t.creed.map(esc).join('<i></i>') + '</p>' +
    '</div>' +
    '<div class="sfootwrap">' +
      '<div class="sports">' + SPORTS.map(([ar, slug]) =>
        '<a title="' + esc(ar) + '"><img src="./img/sports/' + slug + '.png" alt="' +
        esc(ar) + '"><span>' + esc(ar) + '</span></a>').join('') + '</div>' +
      '<div class="foot"><div class="fl"><div class="f1">' + esc(t.foot) + '</div>' +
      '<div class="f2">' + esc(t.footEn) + '</div></div>' +
      '<div class="est"><b>FMAC</b><i>EST. 2017</i></div></div>' +
    '</div></aside>';
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
