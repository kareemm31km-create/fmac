/* تعديل النتائج وحذفها، والكالندر يفتح على الموسم الجاري. */
import { read, grab, S, runner } from './_lib.mjs';

const html = await read('public/index.html');
const fb = await read('public/js/fmac-firebase.js');
const P = await import(new URL('../../public/js/fmac-payload.js', import.meta.url));

const t = runner('النتائج: التعديل والحذف');

t.head('المفتاح في الحمولة');
const built = P.results([
  { k: 'abc', sport: 'الجودو', season: '2026-2027', name: 'بطولة أ', gold: 2, scope: 'محلي' },
  { k: 'xyz', sport: 'الجوجيتسو', season: '2026-2027', name: 'بطولة ب', silver: 1 },
  { sport: 'الجودو', season: '2026-2027', name: 'بلا مفتاح' },
]);
const judo = built['الجودو']['2026-2027'].championships;
t('المفتاح يصل الواجهة', judo[0].k === 'abc', judo[0].k);
t('بلا مفتاح ⇒ فراغ لا undefined', judo[1].k === '', judo[1].k);
t('لعبةٌ أخرى تبقى منفصلة',
  built['الجوجيتسو']['2026-2027'].championships[0].k === 'xyz');

t.head('الحذف في طبقة النقل');
t('resultDrop موجود', /case 'resultDrop':/.test(fb));
t('يحذف من مجموعة النتائج', /case 'resultDrop': return drop\(COL\.results/.test(fb));
t('للإدارة وحدها', /const ADMIN = \[[^\]]*'resultDrop'/.test(fb));
t('يقرأ المفتاح من result', /resultDrop: 'result'/.test(fb));
t('ولا تكرار لمفتاح result في NEST',
  (fb.match(/^  result: 'result'/gm) || []).length === 1,
  (fb.match(/^  result: 'result'/gm) || []).length);

t.head('الكالندر يفتح على الجاري');
const calSrc = grab(html, 'function calSeason()');
const mk = (sel, cur, cal) => new Function('calSeasonSel', 'curSeason', 'calendar',
  calSrc + '; return calSeason();')(sel, () => cur, cal);
const OLD = [{ season: '2024-2025' }, { season: '2025-2026' }];
t('الجاري ولو كشفه فارغ', mk('', '2026-2027', OLD) === '2026-2027', mk('', '2026-2027', OLD));
t('الجاري حين له كشف', mk('', '2025-2026', OLD) === '2025-2026');
t('اختيار المستخدم يغلب', mk('2024-2025', '2026-2027', OLD) === '2024-2025');
t('بلا موسمٍ جارٍ ⇒ أحدث كشف', mk('', '', OLD) === '2025-2026', mk('', '', OLD));
t('بلا شيء إطلاقاً ⇒ فراغ', mk('', '', []) === '');

t.head('أزرار التصحيح');
const actsSrc = grab(html, 'function resActs(x)');
const acts = (admin, x) => new Function('user', 'S', 'esc', 'di',
  actsSrc + '; return resActs(' + JSON.stringify(x) + ');')(
  { admin }, S, (v) => String(v), () => '<svg/>');
t('الإدارة ترى الزرّين', /data-resedit/.test(acts(true, { k: 'abc' })) &&
  /data-resdrop/.test(acts(true, { k: 'abc' })));
t('غير الإدارة لا ترى شيئاً', acts(false, { k: 'abc' }) === '');
t('ما جاء من ملفّ الموسم بلا مفتاح ⇒ بلا أزرار', acts(true, { name: 'قديمة' }) === '');
t('المفتاح الفارغ كذلك', acts(true, { k: '' }) === '');

t.head('التعديل لا يُنشئ نسخة');
t('الحفظ يمرّر المفتاح', /result:\{k:resEditK[,}]/.test(html));
t('التعديل يستبدل الصفّ لا يُضيفه', /if\(i>=0\) arr\[i\]=row; else arr\.push\(row\);/.test(html));
t('فتح النموذج يقبل مفتاحاً', /function openResult\(k[,)]/.test(html));
t('والإضافة تُصفّره', /resEditK = S\(k\);/.test(html));
t('الحذف يستأذن', /confirm\('حذف «'\+nm/.test(html));
t('والفشل يُسجَّل لا يُبتلع', /console\.error\('resultDrop'/.test(html));

export default t.done();
