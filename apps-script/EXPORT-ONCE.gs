/**
 * FMAC — تصدير جدول جوجل مرّة واحدة قبل الانتقال إلى Firebase.
 *
 * الاستعمال:
 *   1. افتح جدول جوجل ← الإضافات ← Apps Script
 *   2. أنشئ ملفاً جديداً والصق هذا المحتوى
 *   3. شغّل  exportAll()  ووافق على الأذونات
 *   4. سيظهر رابط الملف في السجل (View ← Logs)، حمّله باسم FMAC-export.json
 *   5. ارفعه في صفحة  /_migrate.html  داخل الموقع
 *
 * هذا الملف للهجرة فقط — لا يُستعمل بعدها ولا يُنشر كتطبيق ويب.
 */

var EXPORT_TABS = [
  'المستخدمين', 'الخطط', 'سجل التقييم', 'سجل التسليم', 'الإعدادات',
  'سجل الإلغاء', 'بنود الخطط', 'سجل الحضور', 'ردود المدربين', 'دورة الخطة',
  'نسخ الخطط', 'زمن الأجزاء', 'سجل الانحراف', 'حالة المهام', 'بصمة الحصص',
  'الملاحظات الفنية', 'إغلاق الأسابيع', 'نتائج البطولات', 'دروع المواسم',
  'معسكرات المواسم', 'لاعبو المنتخب', 'أجندة القسم', 'الزيارات الفنية',
  'كالندر الموسم'
];

function exportAll() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var out = { exportedAt: new Date().toISOString(), tabs: {} };
  var summary = [];

  for (var i = 0; i < EXPORT_TABS.length; i++) {
    var name = EXPORT_TABS[i];
    var sh = ss.getSheetByName(name);
    if (!sh) { summary.push(name + ': (غير موجود)'); continue; }

    var values = sh.getDataRange().getValues();
    if (!values.length) { summary.push(name + ': فارغ'); continue; }

    var headers = values[0].map(function (h) { return String(h == null ? '' : h).trim(); });
    var rows = [];
    for (var r = 1; r < values.length; r++) {
      var row = values[r].map(function (c) {
        if (c instanceof Date) return Utilities.formatDate(c, 'Asia/Dubai', 'yyyy-MM-dd');
        return c == null ? '' : String(c);
      });
      // تخطّي الصفوف الفارغة تماماً
      var any = false;
      for (var c2 = 0; c2 < row.length; c2++) if (row[c2] !== '') { any = true; break; }
      if (any) rows.push(row);
    }
    out.tabs[name] = { headers: headers, rows: rows };
    summary.push(name + ': ' + rows.length + ' صفّاً');
  }

  var json = JSON.stringify(out);
  var file = DriveApp.createFile('FMAC-export.json', json, MimeType.PLAIN_TEXT);
  file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);

  Logger.log('تمّ التصدير:');
  Logger.log(summary.join('\n'));
  Logger.log('الحجم: ' + Math.round(json.length / 1024) + ' كيلوبايت');
  Logger.log('حمّل الملف من: ' + file.getUrl());

  try {
    SpreadsheetApp.getUi().alert(
      'تمّ التصدير\n\n' + summary.join('\n') +
      '\n\nالملف: FMAC-export.json في جذر Drive\n' + file.getUrl());
  } catch (e) { /* لا واجهة عند التشغيل من المحرّر */ }

  return file.getUrl();
}
