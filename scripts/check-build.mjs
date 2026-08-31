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
