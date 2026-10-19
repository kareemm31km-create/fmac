/* طبقة الحركة — Lenis وGSAP، حيث يعجز CSS لا حيث ينجح.
 *
 * ما لم أستبدله: كشفُ الكروت عند التمرير قائمٌ بمراقب التقاطع، له
 * تدرّجه وحارسه. استبداله بـScrollTrigger يُضيف 44 كيلوبايت للأثر
 * نفسه — صفقةٌ خاسرة.
 *
 * ما أضافاه فعلاً:
 *   Lenis — قصورٌ في التمرير. CSS لا يملكه: scroll-behavior تُنعّم
 *           القفزات المبرمجة وحدها، لا عجلة الفأرة.
 *   GSAP  — عدّ الأرقام. CSS لا يُحرّك نصّاً، والرقم الذي يصعد
 *           يُقرأ قبل أن يستقرّ.
 *
 * وكلاهما يصمت لمن طلب تقليل الحركة.
 */

const RM = matchMedia('(prefers-reduced-motion: reduce)');
const has = (n) => typeof window[n] !== 'undefined';

/* ── التمرير ───────────────────────────────────────────── */
let lenis = null;
function startScroll() {
  if (RM.matches || !has('Lenis') || lenis) return;
  lenis = new window.Lenis({
    duration: 0.9,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    /* اللمس يُترك لنظام الجهاز: قصورُه أصدق من أيّ محاكاة */
    smoothTouch: false,
  });
  const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
  /* النوافذ والقوائم تُمرَّر بنفسها — لا يخطفها التمرير العامّ */
  document.querySelectorAll('.modal,.sheet,.box,.seapanel,.bellpanel,.scroll')
    .forEach((el) => el.setAttribute('data-lenis-prevent', ''));
}
/* تُستدعى بعد كلّ رسمٍ يُنشئ أسطحاً جديدة */
export function rescan() {
  if (!lenis) return;
  document.querySelectorAll('.modal,.sheet,.box,.seapanel,.bellpanel,.scroll')
    .forEach((el) => el.setAttribute('data-lenis-prevent', ''));
}
export function stopScroll() { if (lenis) { lenis.destroy(); lenis = null; } }

/* ── عدّ الأرقام ──────────────────────────────────────────
   الرقم يحمل شكله: «0 / 39» و«3.6%» و«136,320». نفصل الأعداد عن
   السياق ونُحرّكها وحدها، فيبقى الشكل كما كُتب. */
const NUMS = /-?\d[\d,]*\.?\d*/g;
const seen = new WeakMap();

function countUp(el) {
  if (RM.matches || !has('gsap')) return;
  const target = el.dataset.countTo || el.textContent;
  if (seen.get(el) === target) return;
  seen.set(el, target);

  const parts = String(target).match(NUMS);
  if (!parts || !parts.length) return;
  /* رقمٌ واحد صفر لا يُعدّ: الصعود من صفرٍ إلى صفرٍ حركةٌ بلا خبر */
  if (parts.every((p) => parseFloat(p.replace(/,/g, '')) === 0)) return;

  const tmpl = String(target).split(NUMS);
  const vals = parts.map((p) => ({
    to: parseFloat(p.replace(/,/g, '')),
    dec: (p.split('.')[1] || '').length,
    grp: p.indexOf(',') >= 0,
  }));
  const state = vals.map(() => 0);

  const paint = () => {
    let out = '';
    for (let i = 0; i < tmpl.length; i++) {
      out += tmpl[i];
      if (i < state.length) {
        const v = vals[i];
        let n = state[i].toFixed(v.dec);
        if (v.grp) n = Number(n).toLocaleString('en-US',
          { minimumFractionDigits: v.dec, maximumFractionDigits: v.dec });
        out += n;
      }
    }
    el.textContent = out;
  };

  paint();
  window.gsap.to(state, {
    endArray: vals.map((v) => v.to),
    duration: 0.9,
    ease: 'power2.out',
    onUpdate: paint,
    onComplete: () => { el.textContent = target; },
  });
}

/* ما يُعدّ: أرقام المؤشّرات ونسبة الحلقة — لا كلّ رقمٍ في الصفحة */
const COUNTED = '.pcv, .stgring .v b, .npc b, .mk b';

let io = null;
export function count(root) {
  if (RM.matches || !has('gsap')) return;
  const scope = root && root.nodeType === 1 ? root : document;
  if (!io) {
    io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { countUp(e.target); io.unobserve(e.target); }
    }), { threshold: 0.3 });
  }
  scope.querySelectorAll(COUNTED).forEach((el) => {
    if (el.dataset.cnt) return;
    el.dataset.cnt = '1';
    io.observe(el);
  });
}

/* ── انتقال الأقسام ───────────────────────────────────────
   كان التبديل فوريّاً: يُخفى قسمٌ ويظهر آخر في الإطار نفسه، فلا يدري
   العين من أين جاء الجديد. حركةٌ قصيرة تربط الحالتين.
   ولا نُحرّك الخارج: إخفاؤه يسبق الرسم في منطق الواجهة، وتأخيرُه
   يعني تأخير ما بعده. */
export function view(el) {
  if (RM.matches || !has('gsap') || !el) return;
  window.gsap.fromTo(el,
    { opacity: 0, y: 8 },
    { opacity: 1, y: 0, duration: 0.26, ease: 'power2.out', clearProps: 'all' });
}

/* ── الرسوم تُرسم أمام العين ───────────────────────────────
   الخطّ يُمدّ من أوّله، والقوس يُلفّ من بدايته. والرقم في الوسط
   يعدّ معها — فتُقرأ الحركة كجملةٍ واحدة لا كثلاث. */
export function draw(root) {
  if (RM.matches || !has('gsap')) return;
  const scope = root && root.nodeType === 1 ? root : document;
  const g = window.gsap;

  /* خطوط المنحنى: طولها يُقاس ثمّ يُمدّ */
  scope.querySelectorAll('.mlchart .ln2, .lchart .ln2').forEach((p, i) => {
    let len = 0;
    try { len = p.getTotalLength(); } catch (e) { return; }
    if (!len) return;
    g.fromTo(p,
      { strokeDasharray: len, strokeDashoffset: len },
      { strokeDashoffset: 0, duration: 1, delay: i * 0.08,
        ease: 'power2.inOut', clearProps: 'strokeDasharray,strokeDashoffset' });
  });
  /* نقاط المنحنى تظهر بعد خطّها */
  scope.querySelectorAll('.mlchart .pt2').forEach((c, i) => {
    g.fromTo(c, { opacity: 0, scale: 0.4, transformOrigin: 'center' },
      { opacity: 1, scale: 1, duration: 0.3, delay: 0.5 + i * 0.02, ease: 'back.out(2)' });
  });

  /* أقواس الحلقة: كلٌّ يُلفّ من بدايته، واحداً بعد واحد */
  scope.querySelectorAll('.stgring svg').forEach((svg) => {
    const arcs = svg.querySelectorAll('circle.sg');
    arcs.forEach((a, i) => {
      const da = a.getAttribute('stroke-dasharray');
      if (!da) return;
      const seg = parseFloat(da.split(' ')[0]) || 0;
      const rest = parseFloat(da.split(' ')[1]) || 0;
      if (!seg) return;
      g.fromTo(a, { attr: { 'stroke-dasharray': '0 ' + (seg + rest) } },
        { attr: { 'stroke-dasharray': seg + ' ' + rest },
          duration: 0.7, delay: i * 0.1, ease: 'power2.out' });
    });
  });
}

/* ── الإقلاع ─────────────────────────────────────────────── */
export function init() {
  startScroll();
  count();
}
RM.addEventListener('change', () => { if (RM.matches) stopScroll(); });

window.__fmacMotion = { init, count, rescan, stopScroll, view, draw };
export default window.__fmacMotion;
