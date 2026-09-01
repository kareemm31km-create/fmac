/* قارئ xlsx داخل المتصفّح — بلا مكتبات خارجية (القيد §3).
   ملف xlsx هو أرشيف zip، والمتصفّح يفكّ الضغط بـDecompressionStream. */

const dv = (buf) => new DataView(buf);
const u16 = (v, o) => v.getUint16(o, true);
const u32 = (v, o) => v.getUint32(o, true);

/* ── فكّ الأرشيف عبر الفهرس المركزي (أدقّ من مسح الترويسات المحلّية) ── */
async function unzip(arrayBuffer) {
  const v = dv(arrayBuffer);
  const len = arrayBuffer.byteLength;

  /* نهاية الفهرس المركزي: نبحث عنها من الآخر */
  let eocd = -1;
  const from = Math.max(0, len - 66000);
  for (let i = len - 22; i >= from; i--) {
    if (u32(v, i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('ليس ملف xlsx صالحاً (لا فهرس مركزي)');

  const count = u16(v, eocd + 10);
  let p = u32(v, eocd + 16);

  const files = {};
  const dec = new TextDecoder('utf-8');
  for (let n = 0; n < count; n++) {
    if (u32(v, p) !== 0x02014b50) break;
    const method = u16(v, p + 10);
    const compSize = u32(v, p + 20);
    const nameLen = u16(v, p + 28);
    const extraLen = u16(v, p + 30);
    const commentLen = u16(v, p + 32);
    const localOff = u32(v, p + 42);
    const name = dec.decode(new Uint8Array(arrayBuffer, p + 46, nameLen));

    /* بداية البيانات تُحسب من الترويسة المحلّية — أطوالها تختلف عن المركزية */
    const lNameLen = u16(v, localOff + 26);
    const lExtraLen = u16(v, localOff + 28);
    const dataStart = localOff + 30 + lNameLen + lExtraLen;
    const raw = new Uint8Array(arrayBuffer, dataStart, compSize);

    files[name] = { method, raw };
    p += 46 + nameLen + extraLen + commentLen;
  }

  const out = {};
  for (const name of Object.keys(files)) {
    const f = files[name];
    if (f.method === 0) { out[name] = dec.decode(f.raw); continue; }
    if (f.method !== 8) continue;                       // طرق ضغط أخرى غير مدعومة
    const ds = new DecompressionStream('deflate-raw');
    const stream = new Blob([f.raw]).stream().pipeThrough(ds);
    out[name] = await new Response(stream).text();
  }
  return out;
}

const unesc = (s) => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
  .replace(/&amp;/g, '&');

const colNum = (ref) => {
  const m = String(ref).match(/^([A-Z]+)/);
  if (!m) return 0;
  let n = 0;
  for (const ch of m[1]) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
};

/* تاريخ إكسل الرقمي ← نصّ ISO */
export function serialToDate(n) {
  const num = Number(n);
  if (!isFinite(num) || num < 20000 || num > 80000) return '';
  const ms = Math.round((num - 25569) * 86400000);
  const d = new Date(ms);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

/**
 * يقرأ ملف xlsx ويرجع { sheetName: rows[][] } — كل صفّ مصفوفة نصوص
 * بترتيب الأعمدة، والفراغات محفوظة في مواضعها.
 */
export async function readXlsx(arrayBuffer) {
  const files = await unzip(arrayBuffer);

  /* السلاسل المشتركة */
  const strings = [];
  const ssXml = files['xl/sharedStrings.xml'];
  if (ssXml) {
    for (const m of ssXml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
      const parts = [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]);
      strings.push(unesc(parts.join('')));
    }
  }

  /* أسماء الأوراق ← ملفّاتها عبر rels */
  const relsXml = files['xl/_rels/workbook.xml.rels'] || '';
  const rels = {};
  for (const m of relsXml.matchAll(/<Relationship([^>]*)\/>/g)) {
    const id = (m[1].match(/Id="([^"]+)"/) || [])[1];
    const target = (m[1].match(/Target="([^"]+)"/) || [])[1];
    if (id && target) rels[id] = target.replace(/^\/?xl\//, '').replace(/^\//, '');
  }

  const wbXml = files['xl/workbook.xml'] || '';
  const sheets = {};
  for (const m of wbXml.matchAll(/<sheet([^>]*)\/>/g)) {
    const attrs = m[1];
    const name = unesc((attrs.match(/name="([^"]+)"/) || [])[1] || '');
    const rid = (attrs.match(/r:id="([^"]+)"/) || [])[1];
    const target = rels[rid];
    if (!name || !target) continue;
    const xml = files['xl/' + target];
    if (!xml) continue;

    const rows = [];
    for (const rm of xml.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
      const rowIdx = Number(rm[1]) - 1;
      const cells = [];
      for (const cm of rm[2].matchAll(/<c r="([A-Z]+\d+)"([^>]*)>([\s\S]*?)<\/c>/g)) {
        const ci = colNum(cm[1]) - 1;
        const attrs2 = cm[2], body = cm[3];
        let val = '';
        if (/t="s"/.test(attrs2)) {
          const vm = body.match(/<v>([\s\S]*?)<\/v>/);
          if (vm) val = strings[Number(vm[1])] ?? '';
        } else if (/t="inlineStr"/.test(attrs2)) {
          const im = body.match(/<t[^>]*>([\s\S]*?)<\/t>/);
          if (im) val = unesc(im[1]);
        } else {
          const vm = body.match(/<v>([\s\S]*?)<\/v>/);
          if (vm) val = unesc(vm[1]);
        }
        cells[ci] = String(val).trim();
      }
      rows[rowIdx] = cells;
    }
    /* سدّ الفجوات حتى تكون المصفوفة متّسقة */
    for (let i = 0; i < rows.length; i++) if (!rows[i]) rows[i] = [];
    sheets[name] = rows;
  }
  return sheets;
}
