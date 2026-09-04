/* التوجيه — مسار حقيقي لكل صفحة بدل صفحة ساكنة واحدة.
   الوحدة تُعطي التحويل بين المسار والحالة فقط؛ ووصلُها بالتطبيق
   في index.html، لأن setView وحالة الصفحات داخل نطاقه المغلق.

   تنبيه: في ذلك النطاق متغيّر history يحجب window.history
   (الخطأ المسجَّل في §9 من وثيقة المشروع)، فيجب استعمال
   window.history صراحةً عند الدفع والاستبدال. */

const S = (v) => (v === null || v === undefined) ? '' : String(v);

/* أسماء لطيفة للألعاب في الرابط — وما لم يُذكر يُرمَّز كما هو */
export const SPORT_SLUG = {
  'التايكوندو': 'taekwondo',
  'الجودو': 'judo',
  'المبارزة': 'fencing',
  'الترياثلون': 'triathlon',
  'الجوجيتسو': 'jujitsu',
  'السباحة': 'swimming',
  'القوس والسهم': 'archery',
  'الكاراتيه': 'karate',
  'المصارعة': 'wrestling',
  'الملاكمة': 'boxing',
};
const SLUG_SPORT = {};
for (const k of Object.keys(SPORT_SLUG)) SLUG_SPORT[SPORT_SLUG[k]] = k;

export const sportToSlug = (sport) =>
  SPORT_SLUG[S(sport)] || encodeURIComponent(S(sport));
export const slugToSport = (slug) => {
  const s = S(slug);
  if (SLUG_SPORT[s]) return SLUG_SPORT[s];
  try { return decodeURIComponent(s); } catch (e) { return s; }
};

/* المسار الأول ← الصفحة. الترتيب هو ترتيب الأقسام في التنقّل. */
export const ROUTES = [
  { path: '',          view: 'home',     label: 'الرئيسية' },
  { path: 'plan',      view: 'plan',     label: 'متابعة التنفيذ', param: 'sport' },
  { path: 'monthly',   view: 'monthly',  label: 'الخطط الشهرية' },
  { path: 'calendar',  view: 'calendar', label: 'تقويم الأسبوع' },
  { path: 'sports',    view: 'sport',    label: 'الألعاب', param: 'sport' },
  { path: 'visits',    view: 'visit',    label: 'المتابعة الفنية' },
  { path: 'season',    view: 'season',   label: 'كالندر الموسم' },
  { path: 'reports',   view: 'reports',  label: 'التقارير', param: 'tab' },
  { path: 'archive',   view: 'archive',  label: 'الأرشيف' },
  { path: 'review',    view: 'review',   label: 'المراجعة' },
  { path: 'todo',      view: 'todo',     label: 'ما يحتاج مراجعتك' },
  { path: 'coaches',   view: 'coaches',  label: 'المدربون' },
  { path: 'audit',     view: 'audit',    label: 'سجل التدقيق' },
  { path: 'settings',  view: 'settings', label: 'الإعدادات' },
];

const BY_PATH = {};
const BY_VIEW = {};
for (const r of ROUTES) { BY_PATH[r.path] = r; BY_VIEW[r.view] = r; }

/* الجذر الذي يُنشر تحته الموقع — يدعم النشر في مجلد فرعي */
export function basePath() {
  const p = location.pathname;
  const i = p.indexOf('/index.html');
  if (i >= 0) return p.slice(0, i) || '/';
  /* الجذر هو ما قبل أوّل مقطع معروف */
  const segs = p.split('/').filter(Boolean);
  for (let n = segs.length; n > 0; n--) {
    if (BY_PATH[segs[n - 1]] !== undefined) {
      return '/' + segs.slice(0, n - 1).join('/');
    }
  }
  return p.endsWith('/') ? p.slice(0, -1) : p;
}

/** المسار الحالي ← { view, sport, tab } */
export function parse(pathname, base) {
  const b = base === undefined ? basePath() : base;
  let p = S(pathname || location.pathname);
  if (b && b !== '/' && p.indexOf(b) === 0) p = p.slice(b.length);
  p = p.replace(/^\/+|\/+$/g, '');
  if (p === 'index.html') p = '';

  const segs = p ? p.split('/') : [];
  const first = segs[0] || '';
  const r = BY_PATH[first];
  if (!r) return { view: 'home', sport: '', tab: '', unknown: !!first };

  const out = { view: r.view, sport: '', tab: '', unknown: false };
  const second = segs[1] || '';
  if (second) {
    if (r.param === 'sport') out.sport = slugToSport(second);
    else if (r.param === 'tab') out.tab = second;
  }
  return out;
}

/** الحالة ← المسار */
export function build(view, opts, base) {
  const o = opts || {};
  const b = base === undefined ? basePath() : base;
  const r = BY_VIEW[S(view)] || BY_VIEW.home;
  let p = r.path;
  if (r.param === 'sport' && S(o.sport)) p += '/' + sportToSlug(o.sport);
  else if (r.param === 'tab' && S(o.tab) && S(o.tab) !== 'month') p += '/' + S(o.tab);
  const root = (b === '/' ? '' : b);
  return (root + '/' + p).replace(/\/+$/, '') || '/';
}

/** يدفع المسار إن اختلف — window.history صراحةً (انظر التنبيه أعلاه) */
export function push(view, opts) {
  const url = build(view, opts);
  if (url === location.pathname) return false;
  try { window.history.pushState({ view, opts }, '', url); } catch (e) { return false; }
  return true;
}
export function replace(view, opts) {
  const url = build(view, opts);
  try { window.history.replaceState({ view, opts }, '', url); } catch (e) { return false; }
  return true;
}

export const labelOf = (view) => (BY_VIEW[S(view)] || {}).label || '';

window.__fmacRouter = {
  ROUTES, parse, build, push, replace, basePath,
  sportToSlug, slugToSport, labelOf, SPORT_SLUG,
};
export default window.__fmacRouter;
