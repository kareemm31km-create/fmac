/* يولّد نموذج الخطة البدنية الأسبوعية (xlsx) بلا مكتبات — القيد §3.
   ملف xlsx أرشيف zip؛ نكتبه بمدخلات مخزَّنة (method 0) فلا نحتاج ضاغطاً،
   وقارئ الموقع يقرأ المخزَّن كما يقرأ المضغوط.

   التشغيل:  node scripts/make-fitness-template.mjs
*/
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const OUT = path.join('public', 'templates', 'FMAC-نموذج-الخطة-البدنية-الأسبوعية.xlsx');

/* ── الصفوف: المحتوى هو ما يقرؤه المدرب، والقارئ يجدها بالمسمّى لا بالموضع ── */
const HEADER_ROW = ['م', 'التمرين', 'المجموعات', 'التكرارات / الزمن', 'الراحة',
  'الهدف الخاص باللعبة'];

const ROWS = [
  ['نموذج الخطة البدنية الأسبوعية — نادي الفجيرة للفنون القتالية'],
  ['يُملأ ما بين القوسين ثم تُحذف الأقواس. لا تُغيّر مسمّيات الأعمدة، ' +
   'فالموقع يجدها بمسمّياتها.'],
  [],
  ['اللعبة', '(اكتب اللعبة — مثال: الجودو)'],
  ['الأسبوع', '(مثال: الأسبوع 1 — سبتمبر 2026)'],
  ['محور الأسبوع', '(مثال: التأسيس والمدى الحركي)'],
  ['الكتلة التدريبية', '(مثال: استشفاء نشط وإعداد عام)'],
  ['عدد الحصص', '2'],
  ['مدرب اللياقة', '(الاسم)'],
  [],
  ['الحصة 1', '(اليوم — مثال: الاثنين)',
   '(هدف الحصة — مثال: توسيع المدى الحركي وبناء قاعدة هوائية ثابتة)'],
  HEADER_ROW,
  ['1', 'إطالات ديناميكية للورك والعضلة الخلفية', '3', '12 تكراراً لكل جانب',
   '45 ثانية', 'مرونة الورك للدخول العميق والدفاع'],
  ['2', 'حركية حزام الكتف (دوائر ومرور بالعصا)', '3', '15 تكراراً', '45 ثانية',
   'سلامة الكتف في صراع المسك'],
  ['3', 'جري هوائي منخفض الشدّة (منطقة 2)', '1', '15 دقيقة', '—',
   'قاعدة هوائية تكفي زمن النزال'],
  ['4', 'توازن على قدم واحدة (بعينين مغمضتين)', '3', '30 ثانية لكل جانب',
   '45 ثانية', 'إحساس بالوضع وثبات في الوقوف والأرضي'],
  [],
  [],
  ['الحصة 2', '(اليوم — مثال: الجمعة)',
   '(هدف الحصة — مثال: تحمّل عضلي وصحّة مفاصل بحمل منخفض وتكرار عالٍ)'],
  HEADER_ROW,
  ['1', 'جسر المقعدة', '3', '15 تكراراً', '45 ثانية', 'تفعيل السلسلة الخلفية للرمي'],
  ['2', 'بلانك أمامي وجانبي', '3', '45 ثانية', '45 ثانية', 'ثبات الجذع تحت الضغط'],
  ['3', 'تعليق من العقلة (تركيز على القبضة)', '3', '30 ثانية', '60 ثانية',
   'تحمّل القبضة في صراع المسك'],
  ['4', 'طعنات مع دوران الجذع', '3', '10 تكرارات لكل جانب', '60 ثانية',
   'ربط الرجلين بالجذع في الدوران'],
  [],
  [],
  ['زد حصصاً بنسخ كتلة «الحصة» بترويسة أعمدتها. الموقع يقرأ ما وجد، ' +
   'ولا يلزمك عدد ثابت.'],
];

/* ── بناء ورقة XML بسلاسل داخلية (لا sharedStrings) ── */
const xesc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const colRef = (i) => {
  let n = i + 1, s = '';
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = (n - r - 1) / 26; }
  return s;
};

function sheetXml(rows) {
  const body = rows.map((cells, r) => {
    const tds = (cells || []).map((v, c) => {
      const t = String(v === null || v === undefined ? '' : v);
      if (!t) return '';
      return '<c r="' + colRef(c) + (r + 1) + '" t="inlineStr"><is><t xml:space="preserve">' +
        xesc(t) + '</t></is></c>';
    }).join('');
    return '<row r="' + (r + 1) + '">' + tds + '</row>';
  }).join('');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetViews><sheetView rightToLeft="1" workbookViewId="0"/></sheetViews>' +
    '<cols>' +
    '<col min="1" max="1" width="5"/><col min="2" max="2" width="42"/>' +
    '<col min="3" max="3" width="13"/><col min="4" max="4" width="22"/>' +
    '<col min="5" max="5" width="13"/><col min="6" max="6" width="46"/>' +
    '</cols><sheetData>' + body + '</sheetData></worksheet>';
}

const FILES = {
  '[Content_Types].xml':
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    '</Types>',
  '_rels/.rels':
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>',
  'xl/workbook.xml':
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheets><sheet name="الخطة البدنية" sheetId="1" r:id="rId1"/></sheets></workbook>',
  'xl/_rels/workbook.xml.rels':
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
    '</Relationships>',
  'xl/styles.xml':
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>' +
    '<fills count="1"><fill><patternFill patternType="none"/></fill></fills>' +
    '<borders count="1"><border/></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>' +
    '</styleSheet>',
  'xl/worksheets/sheet1.xml': sheetXml(ROWS),
};

/* ── zip مخزَّن ── */
function zip(files) {
  const chunks = [], central = [];
  let offset = 0;
  for (const name of Object.keys(files)) {
    const nameBuf = Buffer.from(name, 'utf8');
    const data = Buffer.from(files[name], 'utf8');
    const crc = zlib.crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);            // النسخة المطلوبة
    local.writeUInt16LE(0x0800, 6);        // علم UTF-8 للأسماء
    local.writeUInt16LE(0, 8);             // مخزَّن
    local.writeUInt16LE(0, 10); local.writeUInt16LE(0, 12);   // وقت/تاريخ ثابتان
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    chunks.push(local, nameBuf, data);

    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0);
    cen.writeUInt16LE(20, 4); cen.writeUInt16LE(20, 6);
    cen.writeUInt16LE(0x0800, 8);
    cen.writeUInt16LE(0, 10);
    cen.writeUInt16LE(0, 12); cen.writeUInt16LE(0, 14);
    cen.writeUInt32LE(crc, 16);
    cen.writeUInt32LE(data.length, 20);
    cen.writeUInt32LE(data.length, 24);
    cen.writeUInt16LE(nameBuf.length, 28);
    cen.writeUInt16LE(0, 30); cen.writeUInt16LE(0, 32); cen.writeUInt16LE(0, 34);
    cen.writeUInt16LE(0, 36); cen.writeUInt32LE(0, 38);
    cen.writeUInt32LE(offset, 42);
    central.push(cen, nameBuf);

    offset += local.length + nameBuf.length + data.length;
  }
  const cenBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4); end.writeUInt16LE(0, 6);
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(cenBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...chunks, cenBuf, end]);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, zip(FILES));
console.log('✓ ' + OUT + ' — ' + fs.statSync(OUT).size + ' بايت');
