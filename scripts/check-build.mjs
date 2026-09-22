/* حارس النسخة — NEED_BUILD في الواجهة = BUILD في طبقة Firebase.
   (كان يقارن بسكربت جوجل؛ صار يقارن بالطبقة بعد الانتقال) */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const fail = (m) => { console.error('✗ ' + m); process.exit(1); };

const html = await readFile(join(ROOT, 'public', 'index.html'), 'utf8');
const cfg = await readFile(join(ROOT, 'public', 'js', 'fmac-config.js'), 'utf8');

const need = html.match(/const\s+NEED_BUILD\s*=\s*(\d+)/);
const build = cfg.match(/BUILD\s*=\s*(\d+)/);

if (!need) fail('لم يُعثر على NEED_BUILD في public/index.html');
if (!build) fail('لم يُعثر على BUILD في public/js/fmac-config.js');

const a = Number(need[1]), b = Number(build[1]);
if (a !== b) {
  fail(`تعارض النسخة — NEED_BUILD=${a} بينما BUILD=${b}\n` +
       '  ارفع الرقمين معاً كلما تغيّر شكل الحمولة.');
}

/* لا يجوز أن يبقى نداء fetch(API مباشر — كلّها تمرّ بالطبقة */
const stray = (html.match(/fetch\(API/g) || []).length;
if (stray) fail(`بقي ${stray} نداءً مباشراً fetch(API — يجب أن تمرّ بـ__fmacApi`);

/* ولا أثر لعنوان Apps Script */
if (html.indexOf('script.google.com') >= 0) fail('ما زال هناك عنوان Apps Script في الواجهة');

const shim = (html.match(/__fmacApi\(API/g) || []).length;
console.log(`✓ النسخة متطابقة — BUILD = NEED_BUILD = ${a}`);
console.log(`✓ ${shim} نداءً يمرّ بطبقة Firebase، ولا نداء مباشر`);
console.log('✓ لا أثر لـApps Script في الواجهة');

/* ثلاث قوائم للصفحات يجب أن تتّفق: VIEWS تُظهر القسم، وPG_TITLE تعنونه،
   وROUTES تعطيه مساراً. افترقت مرّةً فبقي عنوان «الرئيسية» فوق قسمين. */
const viewsSrc = html.match(/const VIEWS=\{([\s\S]*?)\};/);
const titleSrc = html.match(/const PG_TITLE=\{([\s\S]*?)\n\};/);
const routesSrc = await readFile(join(ROOT, 'public/js/fmac-router.js'), 'utf8');
if (!viewsSrc || !titleSrc) fail('تعذّر قراءة VIEWS أو PG_TITLE');
const keys = (src) => [...src.matchAll(/(?:^|[{,\s])([a-zA-Z][a-zA-Z0-9_]*)\s*:/g)].map((m) => m[1]);
const views = new Set(keys(viewsSrc[1]));
const titles = new Set(keys(titleSrc[1]));
const routes = new Set([...routesSrc.matchAll(/view:\s*'([^']+)'/g)].map((m) => m[1]));
const missT = [...views].filter((v) => !titles.has(v));
const missR = [...views].filter((v) => !routes.has(v));
if (missT.length) fail('أقسام بلا عنوان في PG_TITLE: ' + missT.join('، '));
if (missR.length) fail('أقسام بلا مسار في ROUTES: ' + missR.join('، '));
console.log(`✓ ${views.size} قسماً، لكلٍّ عنوانٌ ومسار`);
