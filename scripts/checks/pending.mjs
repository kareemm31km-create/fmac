/* البطولة المؤكَّدة في الكشف تنزل إلى كشف النتائج، وعدد المشاركين،
   و«بلا ميداليات». */
import { read, grab, S, runner } from './_lib.mjs';

const html = await read('public/index.html');
const P = await import(new URL('../../public/js/fmac-payload.js', import.meta.url));

const norm = (v) => S(v).replace(/\s+/g, ' ').trim();
const normSeason = new Function('S', grab(html, 'function normSeason(v){') +
  '; return normSeason;')(S);
const aliasSrc = html.slice(html.indexOf('const SPORT_ALIAS={'),
  html.indexOf('};', html.indexOf('const SPORT_ALIAS={')) + 2);
const sportKey = new Function('S', aliasSrc + ';' +
  grab(html, 'function sportKey(v){') + '; return sportKey;')(S);
const seasonOf = new Function(grab(html, 'function seasonOf(d){') + '; return seasonOf;')();

const spDataSrc = grab(html, 'function spData(sp,y){');
const mkSpData = (cal, res) => new Function(
  'S', 'norm', 'normSeason', 'sportKey', 'seasonOf', 'SEAS', 'EXTRA_RESULTS',
  'EXTRA_SHIELDS', 'EXTRA_CAMPS', 'NATL', 'scopeOf', 'sumCh', 'calendar',
  spDataSrc + '; return spData;')(
  S, norm, normSeason, sportKey, seasonOf,
  { sports: {} }, () => res, () => ({}), () => ({}), () => [],
  (c) => (c && c.scope) ? c.scope : 'محلي',
  (l) => ({ gold: 0, silver: 0, bronze: 0, events: l.length }), cal);

const t = runner('بانتظار النتيجة');

t.head('الحمولة');
const R = P.results([
  { k: 'r1', sport: 'الجودو', season: '2026-2027', name: 'أ', calK: 'c1', men: 12, women: 3 },
  { k: 'r2', sport: 'الجودو', season: '2026-2027', name: 'ب', noMedals: true },
  { k: 'r3', sport: 'الجودو', season: '2026-2027', name: 'ج' },
])['الجودو']['2026-2027'].championships;
t('الرابط بالكشف يصل', R[0].calK === 'c1');
t('المشاركون يصلون', R[0].men === 12 && R[0].women === 3);
t('«بلا ميداليات» علمٌ صريح', R[1].noMedals === true && R[0].noMedals === false);
t('من لم يُعدّ مشاركوه ⇒ null لا صفر', R[2].men === null && R[2].women === null,
  [R[2].men, R[2].women]);

t.head('هجاء اللعبة');
t('الجيوجيتسو ⇒ الجوجيتسو', sportKey('الجيوجيتسو') === 'الجوجيتسو', sportKey('الجيوجيتسو'));
t('الكراتيه ⇒ الكاراتيه', sportKey('الكراتيه') === 'الكاراتيه');
t('المصارعه ⇒ المصارعة', sportKey('المصارعه') === 'المصارعة');
t('التايكواندو ⇒ التايكوندو', sportKey('التايكواندو') === 'التايكوندو');
t('«القوس و السهم» ⇒ «القوس والسهم»', sportKey('القوس و السهم') === 'القوس والسهم');
t('والمعتمد يبقى كما هو', sportKey('الجوجيتسو') === 'الجوجيتسو');
t('واسمٌ مجهول يبقى كما كُتب', sportKey('الكيوكوشن') === 'الكيوكوشن');

t.head('الموسم يُكتب باليد');
t('أرقامٌ عربيّة', normSeason('٢٠٢٦-٢٠٢٧') === '2026-2027', normSeason('٢٠٢٦-٢٠٢٧'));
t('مسافاتٌ حول الشرطة', normSeason('2026 - 2027') === '2026-2027');
t('شرطةٌ طويلة', normSeason('2026–2027') === '2026-2027');
t('وكلامٌ قبلها', normSeason('موسم 2026-2027') === '2026-2027');

t.head('المرشّح');
const CAL = [
  { k: 'c1', sport: 'الجودو', season: '2026-2027', name: 'بطولة أ', status: 'مؤكدة', date: '2026-10-01' },
  { k: 'c2', sport: 'الجودو', season: '2026-2027', name: 'بطولة ب', status: 'قادمة', date: '2026-10-05' },
  { k: 'c3', sport: 'الجودو', season: '2026-2027', name: 'بطولة ج', status: 'انتهت', date: '2026-09-01' },
  { k: 'c4', sport: 'الجودو', season: '2026-2027', name: 'بطولة د', status: 'ملغاة', date: '2026-10-09' },
  { k: 'c5', sport: 'الكاراتيه', season: '2026-2027', name: 'بطولة هـ', status: 'مؤكدة' },
];
const d0 = mkSpData(CAL, { 'الجودو': { '2026-2027': { championships: [] } } })('الجودو', '2026-2027');
const names = (d0.pending || []).map((x) => x.name);
t('المؤكَّدة تظهر', names.includes('بطولة أ'), names);
t('والمنتهية معها', names.includes('بطولة ج'));
t('القادمة لا تظهر', !names.includes('بطولة ب'));
t('والملغاة لا تظهر', !names.includes('بطولة د'));
t('ولعبةٌ أخرى لا تظهر', !names.includes('بطولة هـ'));
t('مرتّبة بالتاريخ', names[0] === 'بطولة ج', names);

const d1 = mkSpData(CAL, { 'الجودو': { '2026-2027': { championships:
  [{ k: 'r1', calK: 'c1', name: 'اسمٌ مختلف تماماً', scope: 'محلي' }] } } })('الجودو', '2026-2027');
t('ما سُجّلت نتيجته يخرج — بالرابط لا بالاسم',
  !(d1.pending || []).some((x) => x.name === 'بطولة أ'));

const d2 = mkSpData(CAL, { 'الجودو': { '2026-2027': { championships:
  [{ k: 'r9', name: '  بطولة   أ ', scope: 'محلي' }] } } })('الجودو', '2026-2027');
t('وبالاسم لما لا رابط', !(d2.pending || []).some((x) => x.name === 'بطولة أ'));

const dg = mkSpData([{ k: 'g1', sport: 'الجيوجيتسو', season: '2026-2027',
  name: 'بطولة ه', status: 'انتهت' }], {})('الجوجيتسو', '2026-2027');
t('كشفٌ بهجاءٍ آخر يظهر في صفحة اللعبة',
  dg && (dg.pending || []).some((x) => x.name === 'بطولة ه'),
  dg && (dg.pending || []).map((x) => x.name));

t.head('لعبة بلا نتائج بعد');
const d3 = mkSpData(CAL, {})('الجودو', '2026-2027');
t('لا تُرجع null وللعبةِ بطولةٌ معلَّقة', d3 !== null);
t('والمعلَّقتان فيها', d3 && (d3.pending || []).length === 2,
  d3 && (d3.pending || []).map((x) => x.name));
t('ولا شيء معلَّق ⇒ null كما كان',
  mkSpData([{ k: 'z', sport: 'الجودو', season: '2026-2027', name: 'س', status: 'قادمة' }], {})('الجودو', '2026-2027') === null);
t('ولا كشف إطلاقاً ⇒ null', mkSpData([], {})('الجودو', '2026-2027') === null);

t.head('عدد المشاركين');
const partSrc = grab(html, 'function partLine(x)');
const part = (x) => new Function('esc', 'di', partSrc + '; return partLine(' +
  JSON.stringify(x) + ');')((v) => String(v), () => '');
t('بلا عدّ ⇒ لا سطر', part({ men: null, women: null }) === '');
t('undefined كذلك', part({}) === '');
t('المجموع يُحسب', /<b>15<\/b>/.test(part({ men: 12, women: 3 })));
t('ذكورٌ وحدهم يُقبلون', /<b>12<\/b>/.test(part({ men: 12, women: null })));
t('وصفرٌ مُعلَن يظهر', /<b>0<\/b>/.test(part({ men: 0, women: 0 })));

t.head('الوصل');
t('زرّ «بلا ميداليات»', /data-resnone/.test(html));
t('وله معالج', /markNoMedals\(rnn\.dataset\.resnone\)/.test(html));
t('يُسجّل صفراً مُعلَناً', /noMedals:true/.test(html));
t('والخانة تُعطّل حقول الميداليات', /e\.disabled=on; if\(on\) e\.value=0;/.test(html));
t('المجموع يتحدّث مع الكتابة', /e\.target\.id==='resM'\|\|e\.target\.id==='resF'/.test(html));
t('الحفظ يحمل الرابط والمشاركين',
  /calK:resCalK[\s\S]{0,140}men:men,women:women,noMedals:none/.test(html));
t('العرض يقول «بلا ميداليات»', /x\.noMedals[\s\S]{0,60}بلا ميداليات/.test(html));

export default t.done();
