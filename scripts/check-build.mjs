/* حارس النسخة — يتأكّد أن NEED_BUILD في الموقع = BUILD في سكربت جوجل */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));

const html = await readFile(join(ROOT, 'public', 'index.html'), 'utf8');
const gs   = await readFile(join(ROOT, 'apps-script', 'FMAC-Apps-Script.gs'), 'utf8');

const need  = html.match(/const\s+NEED_BUILD\s*=\s*(\d+)/);
const build = gs.match(/var\s+BUILD\s*=\s*(\d+)/);

if (!need)  { console.error('✗ لم يُعثر على NEED_BUILD في public/index.html'); process.exit(1); }
if (!build) { console.error('✗ لم يُعثر على BUILD في apps-script/FMAC-Apps-Script.gs'); process.exit(1); }

const a = Number(need[1]), b = Number(build[1]);
if (a !== b) {
  console.error(`✗ تعارض النسخة — NEED_BUILD=${a} بينما BUILD=${b}`);
  console.error('  ارفع الرقمين معاً كلما أُضيف شيت أو إجراء جديد.');
  process.exit(1);
}
console.log(`✓ النسخة متطابقة — BUILD = NEED_BUILD = ${a}`);
