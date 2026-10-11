/* مُشغّل الفحوص — `npm test`.
   الفحوص داخل المستودع عمداً: عاشت أسابيع في مجلّدٍ مؤقّت فنظّفه
   النظام وضاعت. ما لا يُحفظ مع الكود ليس اختباراً، بل ذكرى. */
import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('./checks/', import.meta.url));
const files = (await readdir(dir)).filter((f) => f.endsWith('.mjs') && !f.startsWith('_')).sort();

let pass = 0, fail = 0;
for (const f of files) {
  const mod = await import(new URL('./checks/' + f, import.meta.url));
  const r = mod.default || { pass: 0, fail: 0 };
  pass += r.pass; fail += r.fail;
}

console.log('\n' + '─'.repeat(40));
console.log(fail
  ? ('فشل ' + fail + ' من ' + (pass + fail) + ' تأكيداً في ' + files.length + ' فحصاً')
  : ('نجح ' + pass + ' تأكيداً في ' + files.length + ' فحصاً'));
process.exit(fail ? 1 : 0);
