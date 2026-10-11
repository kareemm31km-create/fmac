/* أدواتٌ مشتركة للفحوص.
   القاعدة: تُستخرج الدالّة الحقيقيّة من ملفّها بمطابقة الأقواس ولا
   تُنسخ. نسخةٌ في ملفّ الفحص تمرّ وإن تعطّل الأصل. */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const read = (p) => readFile(join(ROOT, p), 'utf8');

export const S = (v) => (v === null || v === undefined) ? '' : String(v).trim();

/** جسم دالّةٍ كاملاً من نصّ ملفّ — بعدّ الأقواس لا بتعبيرٍ نمطيّ */
export function grab(src, head) {
  const i = src.indexOf(head);
  if (i < 0) throw new Error('لا دالّة: ' + head);
  let d = 0;
  for (let k = src.indexOf('{', i); k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); }
  }
  throw new Error('قوس ناقص: ' + head);
}

/** عدّاد تأكيدات */
export function runner(title) {
  let pass = 0, fail = 0;
  console.log('\n══ ' + title + ' ══');
  const t = (msg, ok, got) => {
    if (ok) { pass++; console.log('  ✓ ' + msg); }
    else {
      fail++;
      console.log('  ✗ ' + msg + (got !== undefined ? '  ← ' + JSON.stringify(got) : ''));
    }
  };
  t.head = (h) => console.log('— ' + h + ' —');
  t.done = () => {
    console.log(fail ? ('فشل ' + fail + ' من ' + (pass + fail)) : ('نجح ' + pass + '/' + pass));
    return { pass, fail };
  };
  return t;
}
