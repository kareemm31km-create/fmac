/**
 * نادي الفجيرة للفنون القتالية — نظام متابعة الخطط التدريبية
 * الإصدار 2 — يضيف: رفع ملفات الخطط على درايف، سجل التسليم، وإعدادات الأسبوع
 *
 * أول مرة:  Run > setup  ثم  نشر > عملية نشر جديدة > تطبيق ويب
 *           (تنفيذ باسم: أنا  |  من لديه إمكانية الوصول: أي شخص)
 * بعد أي تعديل:  نشر > إدارة عمليات النشر > تعديل > إصدار جديد
 */

var SH_USERS = 'المستخدمين';
var SH_PLANS = 'الخطط';
var SH_TICKS = 'سجل التقييم';
var SH_SUBS  = 'سجل التسليم';
var SH_CFG   = 'الإعدادات';
var SH_CANC  = 'سجل الإلغاء';
var SH_ITEMS = 'بنود الخطط';
var SH_ATT   = 'سجل الحضور';
var SH_REPLY = 'ردود المدربين';
var SH_STAGE = 'دورة الخطة';
var SH_VER   = 'نسخ الخطط';
var SH_SEG   = 'زمن الأجزاء';
var SH_DEV   = 'سجل الانحراف';
var SH_ACT   = 'حالة المهام';
var SH_SESS  = 'بصمة الحصص';
var SH_NOTE  = 'الملاحظات الفنية';
var SH_WEEK  = 'إغلاق الأسابيع';
var SH_RES   = 'نتائج البطولات';
var SH_SHD   = 'دروع المواسم';
var SH_CMP   = 'معسكرات المواسم';
var SH_NAT   = 'لاعبو المنتخب';
var SH_AGN   = 'أجندة القسم';
var SH_VIS   = 'الزيارات الفنية';
var SH_CAL   = 'كالندر الموسم';
var FOLDER   = 'FMAC — خطط مرفوعة';
var MEDIA    = 'FMAC — شواهد الحصص';
var TZ       = 'Asia/Dubai';
/* رقم نسخة السكربت — الموقع يقارنه ليعرف أن النشر محدَّث.
   ارفعه كلما أضفت شيتاً أو إجراءً جديداً. */
var BUILD    = 7;
var AR_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس',
                 'سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

var PLAN_ROWS = [["judo_main", "الجودو", "الجودو — الفريق الأساسي", "الأسبوع 4", 50], ["judo_girls", "الجودو", "الجودو — بنات تحت 15 سنة", "الأسبوع 4", 16], ["bjj_kids_1_2", "الجوجيتسو", "الجوجيتسو — الأطفال 1-2", "الأسبوع 4", 73], ["bjj_biggners", "الجوجيتسو", "الجوجيتسو — المبتدئين", "الأسبوع 4", 113], ["bjj_advansed", "الجوجيتسو", "الجوجيتسو — المتقدمين", "الأسبوع 4", 127], ["karate", "الكاراتيه", "الكاراتيه", "الأسبوع 4", 18], ["fencing_beg_1", "المبارزة", "المبارزة — مبتدئين", "الأسبوع 1", 20], ["fencing_beg_2", "المبارزة", "المبارزة — مبتدئين", "الأسبوع 2", 23], ["fencing_beg_3", "المبارزة", "المبارزة — مبتدئين", "الأسبوع 3", 33], ["fencing_beg_4", "المبارزة", "المبارزة — مبتدئين", "الأسبوع 4", 25], ["wrest_cd_4", "المصارعة", "المصارعة — فريق C & D", "الأسبوع 4", 33], ["fencing_main", "المبارزة", "المبارزة — الفريق", "الأسبوع 4", 77], ["wrest_c_1", "المصارعة", "المصارعة — فريق C", "الأسبوع 1", 52], ["wrest_c_2", "المصارعة", "المصارعة — فريق C", "الأسبوع 2", 38], ["wrest_c_3", "المصارعة", "المصارعة — فريق C", "الأسبوع 3", 52], ["wrest_c_4", "المصارعة", "المصارعة — فريق C", "الأسبوع 4", 37], ["archery", "القوس والسهم", "القوس والسهم", "الأسبوع 4", 55], ["judo_beginners", "الجودو", "الجودو — مبتدئين", "الأسبوع 4", 28], ["taekwondo", "التايكوندو", "التايكوندو", "الأسبوع 4", 58]];

/* ============================ الإعداد ============================ */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  renameTicks_(ss);

  var u = sheet_(ss, SH_USERS, ['الكود','الاسم','الصلاحية','اللعبة','الفرع','الموبايل',
                                'ملاحظات','الصورة']);
  if (u.getLastRow() < 2) {
    u.getRange(2,1,2,7).setValues([
      ['admin1','كريم زاهر','إدارة','','','',''],
      ['admin2','المشرف الفني','إدارة','','','','']
    ]);
  }

  var p = sheet_(ss, SH_PLANS, ['كود الخطة','اللعبة','الخطة','الأسبوع','الفرع','كود المدرب',
                                'عدد اللاعبين','الفئة','عدد البنود','الحصة']);
  var have = {};
  if (p.getLastRow() > 1)
    p.getRange(2,1,p.getLastRow()-1,1).getValues().forEach(function(r){ have[r[0]] = true; });
  var add = PLAN_ROWS.filter(function(r){ return !have[r[0]]; })
                     .map(function(r){ return [r[0],r[1],r[2],r[3],'','','','',r[4],'']; });
  if (add.length) p.getRange(p.getLastRow()+1,1,add.length,10).setValues(add);
  // عدد البنود للخطط المزروعة — يُملأ مرّة واحدة إن كان فارغاً
  if (p.getLastRow() > 1) {
    var cnt = {}; PLAN_ROWS.forEach(function(r){ cnt[r[0]] = r[4]; });
    var rg = p.getRange(2,1,p.getLastRow()-1,10), vs = rg.getValues(), touched = false;
    vs.forEach(function(r){ var id=S(r[0]);
      if (id && cnt[id] && !Number(r[8])) { r[8] = cnt[id]; touched = true; } });
    if (touched) rg.setValues(vs);
  }

  sheet_(ss, SH_TICKS, ['المفتاح','الأسبوع','كود الخطة','اللعبة','الخطة','اليوم','القسم',
                        'بند التمرين','الحالة','ملاحظة','القائم بالتقييم','التاريخ']);
  migrateTickKeys_(ss);

  sheet_(ss, SH_ITEMS, ['كود الخطة','الأسبوع','اللعبة','اسم الخطة','الفئة','الفرع','كود المدرب',
                        'رقم اليوم','اليوم','التاريخ','هدف اليوم','الشدة','الحجم',
                        'القسم','زمن القسم','ترتيب البند','البند']);
  sheet_(ss, SH_ATT,   ['وقت التسجيل','المفتاح','كود الخطة','الأسبوع','رقم اليوم','اليوم',
                        'العدد المخطط','العدد الفعلي','المسجِّل']);
  sheet_(ss, SH_REPLY, ['المفتاح','كود الخطة','الأسبوع','البند','رد المدرب','المدرب','وقت التسجيل']);
  sheet_(ss, SH_STAGE, ['المفتاح','كود الخطة','الأسبوع','المرحلة','ملاحظة الإدارة',
                        'بواسطة','وقت التغيير']);
  sheet_(ss, SH_VER,   ['المفتاح','كود الخطة','الأسبوع','رقم النسخة','وقت الرفع','بواسطة',
                        'اسم الملف','رابط الملف','عدد الأيام','عدد البنود','البنية']);
  sheet_(ss, SH_SEG,   ['المفتاح','كود الخطة','الأسبوع','رقم اليوم','اليوم','القسم',
                        'الزمن المخطط','الزمن الفعلي','المسجِّل','وقت التسجيل']);
  sheet_(ss, SH_DEV,   ['المفتاح','كود الخطة','الأسبوع','رقم اليوم','القسم','البند',
                        'نوع التعديل','الفعلي','بواسطة','وقت التسجيل']);
  sheet_(ss, SH_ACT,   ['المفتاح','الحالة','بواسطة','وقت التسجيل']);
  sheet_(ss, SH_NOTE,  ['المفتاح','كود الخطة','الأسبوع','رقم اليوم','اليوم','الملاحظة',
                        'الحالة','بواسطة','وقت التسجيل']);
  sheet_(ss, SH_RES,   ['المفتاح','اللعبة','الموسم','البطولة','ذهب','فضة','برونز',
                        'بواسطة','التاريخ','النطاق','تاريخ البطولة','المكان']);
  sheet_(ss, SH_SHD,   ['المفتاح','اللعبة','الموسم','نوع الدرع','الترتيب','النقاط',
                        'النادي التالي','نقاطه','بواسطة','وقت التسجيل']);
  sheet_(ss, SH_CMP,   ['المفتاح','اللعبة','الموسم','المعسكر','التاريخ','المكان',
                        'داخلي / خارجي','تابع لـ','عدد اللاعبين','بواسطة','وقت التسجيل']);
  sheet_(ss, SH_NAT,   ['المفتاح','اللعبة','الموسم','اسم اللاعب','الفئة','ملاحظة',
                        'بواسطة','وقت التسجيل']);
  sheet_(ss, SH_AGN,   ['المفتاح','التاريخ','الوقت','النوع','العنوان','التفاصيل','الفرع',
                        'الحالة','بواسطة','وقت التسجيل']);
  sheet_(ss, SH_VIS,   ['المفتاح','التاريخ','اللعبة','الفرع','المدرب','الالتزام بالخطة',
                        'الالتزام بالموعد','التنظيم','التجهيزات','الملاحظة',
                        'الإجراء التصحيحي','الحالة','بواسطة','وقت التسجيل',
                        'الوقت','المكان','القائم بالزيارة','مفتاح الموعد']);
  sheet_(ss, SH_CAL,   ['المفتاح','الموسم','التاريخ','البطولة','اللعبة','النطاق',
                        'الاتحاد','المكان','الحالة','التاريخ الأصلي','سبب التأجيل',
                        'ملاحظة','بواسطة','وقت التسجيل']);
  sheet_(ss, SH_WEEK,  ['الأسبوع','الحالة','ملاحظة','بواسطة','وقت التغيير']);
  sheet_(ss, SH_SESS,  ['المفتاح','كود الخطة','الأسبوع','رقم اليوم','اليوم',
                        'الشدة المخططة','الشدة الفعلية','تحقق الهدف','نسبة التنفيذ',
                        'الزمن المخطط','الزمن الفعلي','المسجِّل','وقت التسجيل',
                        'نوع الهدف']);
  sheet_(ss, SH_SUBS,  ['التاريخ','كود المدرب','المدرب','اللعبة','الفرع','الفئة','الأسبوع',
                        'عدد اللاعبين','اسم الملف','رابط الملف','ملاحظات']);

  sheet_(ss, SH_CANC,  ['المفتاح','كود الخطة','اللعبة','الخطة','اليوم','تاريخ اليوم',
                        'سبب الإلغاء','المسؤول','وقت التسجيل']);

  var c = sheet_(ss, SH_CFG, ['المفتاح','القيمة']);
  if (c.getLastRow() < 2) {
    c.getRange(2,1,4,2).setValues([
      ['الأسبوع التدريبي',''],      // اتركه فارغاً ليُحسب تلقائياً من الأحد إلى الجمعة
      ['تاريخ الأسبوع',''],
      ['إيميل الإشعارات', Session.getActiveUser().getEmail() || ''],
      ['اسم النادي','نادي الفجيرة للفنون القتالية']
    ]);
  }
  installTriggers();
  var msg = 'تم الإعداد ✅  |  التبويبات: ' + SH_USERS + ' · ' + SH_PLANS + ' · '
          + SH_TICKS + ' · ' + SH_ITEMS + ' · ' + SH_SUBS + ' · ' + SH_CFG
          + '  |  الخطوة الجاية: نشر > إدارة عمليات النشر > تعديل > إصدار جديد';
  Logger.log(msg);
  try { SpreadsheetApp.getActive().toast(msg, 'FMAC', 8); } catch (x) {}
  return msg;
}

function sheet_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  sh.setRightToLeft(true);
  migrate_(sh, name);
  var w = Math.max(sh.getLastColumn(), headers.length);
  var cur = sh.getRange(1,1,1,w).getValues()[0].map(S);
  var same = headers.every(function(h,i){ return cur[i] === h; });
  if (!same) {
    sh.getRange(1,1,1,headers.length).setValues([headers])
      .setFontWeight('bold').setBackground('#0a1317').setFontColor('#ffffff');
  }
  sh.setFrozenRows(1);
  return sh;
}

/**
 * ترقية الشيتات القديمة من الإصدار 1 من غير ما تضيع أي بيانات:
 *  • «المستخدمين»: كان 4 أعمدة (…الصلاحية | ملاحظات) — نزوّد 3 أعمدة قبل «ملاحظات»
 *  • «الخطط»: كان 6 أعمدة — «عدد اللاعبين» بيتزاد في آخر عمود تلقائياً
 */
function migrate_(sh, name) {
  var last = sh.getLastColumn();
  if (!last) return;
  var cur = sh.getRange(1,1,1,last).getValues()[0].map(S);
  if (name === SH_USERS && cur.indexOf('اللعبة') < 0 && cur[3] === 'ملاحظات') {
    sh.insertColumnsAfter(3, 3);       // اللعبة | الفرع | الموبايل
  }
  if (name === SH_SUBS && cur.indexOf('عدد اللاعبين') < 0 && cur[6] === 'اسم الملف') {
    sh.insertColumnsAfter(6, 1);       // عدد اللاعبين
    cur = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(S);
  }
  if (name === SH_SUBS && cur.indexOf('الفئة') < 0 && cur[5] === 'الأسبوع') {
    sh.insertColumnsAfter(5, 1);       // الفئة قبل الأسبوع
  }
  if (name === SH_TICKS && cur.indexOf('الأسبوع') < 0 && cur[1] === 'كود الخطة') {
    sh.insertColumnsAfter(1, 1);       // الأسبوع بعد المفتاح
  }
}

/**
 * ترحيل مفاتيح التقييم القديمة إلى الصيغة الجديدة «الأسبوع|كود الخطة|اليوم|القسم|البند».
 * السجلات القديمة تُنسب إلى أسبوع خطتها كما هو مسجَّل في تبويب «الخطط».
 */
function migrateTickKeys_(ss) {
  var sh = ss.getSheetByName(SH_TICKS);
  if (!sh || sh.getLastRow() < 2) return 0;
  var weekOf = {};
  rows_(ss, SH_PLANS, 10).forEach(function(r){ if (S(r[0])) weekOf[S(r[0])] = S(r[3]); });
  var fallback = cfg_(ss).week || weekAuto_().label;
  var rg = sh.getRange(2,1,sh.getLastRow()-1,3), vs = rg.getValues(), n = 0;
  vs.forEach(function(r){
    var k = S(r[0]); if (!k) return;
    if (k.split('|').length !== 4) return;      // مُرحَّل سلفاً
    var id = k.split('|')[0];
    var wk = weekOf[id] || fallback;
    r[0] = wk + '|' + k;
    r[1] = wk;
    n++;
  });
  if (n) rg.setValues(vs);
  return n;
}

/** رجّع اسم تبويب «التيك» القديم لـ «سجل التقييم» مع الحفاظ على كل الصفوف */
function renameTicks_(ss) {
  var oldSh = ss.getSheetByName('التيك');
  if (oldSh && !ss.getSheetByName(SH_TICKS)) oldSh.setName(SH_TICKS);
}

/* كل طلب يقرأ الشيت مرة واحدة ويحتفظ به في الذاكرة حتى ينتهي.
   قبل هذا كان الطلب الواحد يقرأ «سجل التقييم» مرة لكل أسبوع، فيبطؤ مع كل أسبوع يمرّ. */
var RCACHE = {};
function rows_(ss, name, cols) {
  var hit = RCACHE[name];
  if (hit && hit.cols >= cols) return hit.v;
  var sh = ss.getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) { RCACHE[name] = { cols: 9999, v: [] }; return []; }
  var w = Math.max(cols, sh.getLastColumn());
  var v = sh.getRange(2,1,sh.getLastRow()-1,w).getValues();
  RCACHE[name] = { cols: w, v: v };
  return v;
}
/** يُستدعى بعد كل كتابة حتى لا نقرأ صفوفاً قديمة في الطلب نفسه */
function bust_(name) { if (name) delete RCACHE[name]; else RCACHE = {}; }
/* جوجل شيتس يحوّل «2026-08-26 12:26» إلى تاريخ حقيقي، فتعود القراءة بنصّ
   مثل «Wed Aug 26 2026 12:26:00 GMT+0400». نعيدها إلى صيغتها المكتوبة. */
function S(v){
  if (v == null) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') {
    if (isNaN(v.getTime())) return '';
    var hm = Utilities.formatDate(v, TZ, 'HH:mm');
    return Utilities.formatDate(v, TZ, 'yyyy-MM-dd') + (hm === '00:00' ? '' : ' ' + hm);
  }
  return String(v).trim();
}

/* ============================ القراءة ============================ */
function doGet(e) {
  try {
    var code = S(e && e.parameter && e.parameter.u);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var user = findUser_(ss, code);
    if (!user) return json_({ ok:false, error:'bad_code' });
    return json_({
      ok:true, user:user,
      settings: cfg_(ss),
      plans: planMap_(ss),
      users: userList_(ss),
      subs:  subsList_(ss),
      cancels: cancelList_(ss),
      ticks: readTicks_(ss, weekNow_(ss).label),
      plans2: planItems_(ss),
      attend: attendList_(ss),
      replies: replyList_(ss),
      stages: mapOf_(ss, SH_STAGE, 7, function(r){
        return { stage:S(r[3]), note:S(r[4]), by:S(r[5]), at:S(r[6]) }; }),
      versions: listOf_(ss, SH_VER, 11, function(r){
        return { k:S(r[0]), plan:S(r[1]), week:S(r[2]), n:Number(r[3])||1, at:S(r[4]),
                 by:S(r[5]), file:S(r[6]), url:S(r[7]), days:Number(r[8])||0,
                 items:Number(r[9])||0, shape:S(r[10]) }; }),
      segs: mapOf_(ss, SH_SEG, 10, function(r){
        return { planned:Number(r[6])||0, actual:Number(r[7])||0, by:S(r[8]), at:S(r[9]) }; }),
      devs: listOf_(ss, SH_DEV, 10, function(r){
        return { plan:S(r[1]), week:S(r[2]), day:Number(r[3])||0, section:S(r[4]),
                 item:S(r[5]), kind:S(r[6]), actual:S(r[7]), by:S(r[8]), at:S(r[9]) }; }),
      sess: mapOf_(ss, SH_SESS, 14, function(r){
        return { planned:Number(r[5])||0, intensity:Number(r[6])||0, goal:S(r[7]),
                 exec:Number(r[8])||0, tPlan:Number(r[9])||0, tAct:Number(r[10])||0,
                 by:S(r[11]), at:S(r[12]), goalKind:S(r[13]) }; }),
      notes: listOf_(ss, SH_NOTE, 9, function(r){
        return { k:S(r[0]), plan:S(r[1]), week:S(r[2]), day:S(r[3]), dayName:S(r[4]),
                 text:S(r[5]), state:S(r[6]), by:S(r[7]), at:S(r[8]) }; }),
      weeks: mapOf_(ss, SH_WEEK, 5, function(r){
        return { state:S(r[1]), note:S(r[2]), by:S(r[3]), at:S(r[4]) }; }),
      audit: audit_(ss),
      archive: archive_(ss, user),
      results: results_(ss),
      shields: shields_(ss),
      camps: camps_(ss),
      national: national_(ss),
      staff: user.admin ? allUsers_(ss) : [],
      agenda:  agenda_(ss),
      visits:  visits_(ss),
      calendar: calendar_(ss),
      build: BUILD,
      ai: { on: aiOn_(), model: aiOn_() ? aiModel_() : '' },
      acts: mapOf_(ss, SH_ACT, 4, function(r){
        return { state:S(r[1]), by:S(r[2]), at:S(r[3]) }; }),
      history: history_(ss)
    });
  } catch (err) { return json_({ ok:false, error:String(err) }); }
}

function cfg_(ss) {
  var o = {};
  rows_(ss, SH_CFG, 2).forEach(function(r){ if (S(r[0])) o[S(r[0])] = S(r[1]); });
  var n = function(key){ var v = Number(o[key]); return v > 0 ? v : null; };
  return { week:o['الأسبوع التدريبي']||'', dates:o['تاريخ الأسبوع']||'',
           club:o['اسم النادي']||'نادي الفجيرة للفنون القتالية',
           targets:{ plan:n('مستهدف الالتزام بالخطة'), exec:n('مستهدف تنفيذ الحصص'),
                     intensity:n('مستهدف الشدة'), volume:n('مستهدف الحجم'),
                     goals:n('مستهدف تحقق الأهداف') } };
}
function findUser_(ss, code) {
  if (!code) return null;
  var rs = rows_(ss, SH_USERS, 8);
  for (var i=0;i<rs.length;i++) {
    if (S(rs[i][0]) && S(rs[i][0]) === code) {
      var role = S(rs[i][2]);
      return { code:code, name:S(rs[i][1]),
               admin:(role.indexOf('إدارة')===0 || role.toLowerCase()==='admin'),
               sport:S(rs[i][3]), branch:S(rs[i][4]), phone:S(rs[i][5]),
               photo:photoUrl_(rs[i][7]) };
    }
  }
  return null;
}
function userList_(ss) {
  return rows_(ss, SH_USERS, 8).filter(function(r){
    var role = S(r[2]);
    return S(r[0]) && !(role.indexOf('إدارة')===0 || role.toLowerCase()==='admin');
  }).map(function(r){
    return { code:S(r[0]), name:S(r[1]), sport:S(r[3]), branch:S(r[4]), phone:S(r[5]),
             photo:photoUrl_(r[7]) };
  });
}
/** رابط الصورة الشخصية — يقبل رابط درايف كما تنسخه ويحوّله إلى صورة تُعرض مباشرة */
function photoUrl_(v) {
  var u = S(v);
  if (!u) return '';
  var m = u.match(/\/file\/d\/([A-Za-z0-9_-]{10,})/)      /* .../file/d/ID/view   */
       || u.match(/[?&]id=([A-Za-z0-9_-]{10,})/)            /* ...open?id=ID        */
       || u.match(/^([A-Za-z0-9_-]{25,})$/);                /* المعرّف وحده          */
  if (m) return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w240';
  return /^https?:\/\//.test(u) ? u : '';
}
function planMap_(ss) {
  var out = {};
  rows_(ss, SH_PLANS, 10).forEach(function(r){
    var id = S(r[0]);
    if (id) out[id] = { branch:S(r[4]), coach:S(r[5]),
                        players:Number(r[6])||0, category:S(r[7]),
                        items:Number(r[8])||0, slot:Number(r[9])||0 };
  });
  return out;
}

/* ================== الأرشيف ================== */
/* فهرس خفيف لكل أسبوع سبق الأسبوع الجاري — يُرسل مع التحميل الأول.
   أمّا بنود أسبوع بعينه فتُجلب عند فتحه فقط، كي يبقى الموقع سريعاً مهما طال الأرشيف. */
function archive_(ss, user) {
  var only = (user && !user.admin) ? S(user.code) : '';
  var now = weekNow_(ss).label;
  var closed = {}, byWeek = {};
  rows_(ss, SH_WEEK, 5).forEach(function(r){
    if (S(r[0])) closed[S(r[0])] = { state:S(r[1]), by:S(r[3]), at:S(r[4]) }; });

  var itemsOf = {}, sportOf = {}, catOf = {}, coachOf = {};
  rows_(ss, SH_PLANS, 10).forEach(function(r){
    var id = S(r[0]); if (!id) return;
    sportOf[id] = S(r[1]); coachOf[id] = S(r[5]);
    catOf[id] = S(r[7]); itemsOf[id] = Number(r[8])||0; });

  /* عدد البنود ومعلومات الخطة من «بنود الخطط» — أدقّ لأنه مقسَّم بالأسبوع */
  /* الحصص الملغاة تُستبعد من البسط والمقام — تماماً كما يحسبها الموقع */
  var cancDay = {}, canc = {};
  rows_(ss, SH_CANC, 9).forEach(function(r){
    var a = S(r[0]).split('|'); if (a.length < 3) return;
    cancDay[a[0] + '|' + a[1] + '|' + a[2]] = 1;
    canc[a[0] + '|' + a[1]] = (canc[a[0] + '|' + a[1]] || 0) + 1; });

  var cnt = {};
  rows_(ss, SH_ITEMS, 17).forEach(function(r){
    var id = S(r[0]), w = S(r[1]); if (!id || !w || !S(r[16])) return;
    var di = Math.max(1, Number(r[7]) || 1) - 1;          /* رقم اليوم في الجدول يبدأ من 1 */
    var k = w + '|' + id;
    if (!cnt[k]) cnt[k] = { n:0, days:{}, sport:S(r[2]), name:S(r[3]),
                            cat:S(r[4]), branch:S(r[5]), coach:S(r[6]) };
    cnt[k].days[di] = 1;
    if (cancDay[w + '|' + id + '|' + di]) return;         /* يوم ملغى: لا يدخل المقام */
    cnt[k].n++;
  });

  var done = {};
  rows_(ss, SH_TICKS, 12).forEach(function(r){
    var key = S(r[0]), w = S(r[1]), id = S(r[2]), st = S(r[8]);
    if (!w || !id || !st) return;
    var a = String(key).split('|');
    if (a.length >= 3 && cancDay[w + '|' + id + '|' + a[2]]) return;
    var k = w + '|' + id;
    done[k] = (done[k] || 0) + (st.indexOf('جزئ') >= 0 ? 0.5 : (st.indexOf('لم') >= 0 ? 0 : 1));
  });

  var stage = {};
  rows_(ss, SH_STAGE, 7).forEach(function(r){
    if (S(r[1]) && S(r[2])) stage[S(r[2]) + '|' + S(r[1])] = S(r[3]); });

  /* الرصد لكل خطة — تُشتقّ منه المرحلة بعد الاعتماد */
  var ratedDay = {}, ratedN = {};
  rows_(ss, SH_TICKS, 12).forEach(function(r){
    var a = S(r[0]).split('|');
    if (a.length < 5 || !S(r[8])) return;
    var k = a[0] + '|' + a[1] + '|' + a[2];
    ratedDay[k] = 1;
    ratedN[k] = (ratedN[k] || 0) + 1;
  });
  /* عدد بنود كل يوم — يُميّز «بدأ الرصد» عن «اكتمل» */
  var dayItems = {};
  rows_(ss, SH_ITEMS, 17).forEach(function(r){
    var id = S(r[0]), w = S(r[1]); if (!id || !w || !S(r[16])) return;
    var k = w + '|' + id + '|' + (Math.max(1, Number(r[7]) || 1) - 1);
    dayItems[k] = (dayItems[k] || 0) + 1;
  });

  var files = {};
  rows_(ss, SH_VER, 11).forEach(function(r){
    if (S(r[1]) && S(r[2])) files[S(r[2]) + '|' + S(r[1])] = { url:S(r[7]), file:S(r[6]) }; });

  var users = {};
  userList_(ss).forEach(function(u){ users[u.code] = u.name; });

  Object.keys(cnt).forEach(function(k){
    var a = k.split('|'), w = a[0], id = a[1], c = cnt[k];
    if (w === now) return;                          /* الأسبوع الجاري ليس أرشيفاً */
    if (only && S(c.coach || coachOf[id]) !== only) return;   /* المدرب يرى خططه وحدها */
    byWeek[w] = byWeek[w] || { week:w, plans:[], total:0, done:0, days:0, cancelled:0,
                               state:(closed[w] && closed[w].state) || 'مفتوح',
                               by:(closed[w] && closed[w].by) || '',
                               at:(closed[w] && closed[w].at) || '' };
    var nd = 0; for (var x in c.days) nd++;
    var dn = done[k] || 0, cc = canc[k] || 0;
    var f  = files[k] || {};
    byWeek[w].plans.push({ id:id, sport:c.sport || sportOf[id] || '—',
      name:c.name, cat:c.cat || catOf[id] || '', branch:c.branch || '',
      coach:users[c.coach || coachOf[id]] || '—', coachCode:c.coach || coachOf[id] || '',
      items:c.n, days:nd, done:Math.round(dn*10)/10, cancelled:cc,
      pct:c.n ? Math.round(dn / c.n * 100) : 0,
      stage:autoStage_(stage[k] || 'مرفوعة', w, id, c.days, cancDay, ratedDay,
                       (closed[w] && closed[w].state) === 'مغلق', ratedN, dayItems),
      url:f.url || '', file:f.file || '' });
    byWeek[w].total     += c.n;
    byWeek[w].done      += dn;
    byWeek[w].days      += nd;
    byWeek[w].cancelled += cc;
  });

  var out = Object.keys(byWeek).map(function(w){
    var x = byWeek[w];
    x.pct = x.total ? Math.round(x.done / x.total * 100) : 0;
    x.done = Math.round(x.done * 10) / 10;
    x.plans.sort(function(a,b){ return a.sport < b.sport ? -1 : a.sport > b.sport ? 1 : 0; });
    return x;
  });
  out.sort(function(a,b){ return weekNo_(b.week) - weekNo_(a.week) ||
                                 (a.week < b.week ? 1 : -1); });
  return out.slice(0, 12);
}
/** بعد الاعتماد تتقدّم المرحلة وحدها: رُصدت حصة ← جارٍ التنفيذ · رُصدت كلها ← مكتملة ·
 *  أُغلق الأسبوع ← مغلقة. أما القرارات (مرفوعة/تحتاج تعديل) فتبقى كما سجّلها الإنسان. */
function autoStage_(raw, week, id, days, cancDay, ratedDay, weekClosed, ratedN, dayItems) {
  var AUTO = { 'معتمدة':1, 'جاري التنفيذ':1, 'مكتملة':1, 'مغلقة':1 };
  if (!AUTO[raw]) return raw;
  if (weekClosed) return 'مغلقة';
  var due = 0, touched = 0, full = 0;
  for (var d in days) {
    var k = week + '|' + id + '|' + d;
    if (cancDay[k]) continue;
    due++;
    if (ratedDay[k]) touched++;
    var n = dayItems ? dayItems[k] : 0;
    if (n && ratedN && (ratedN[k] || 0) >= n) full++;
  }
  if (due && full >= due) return 'مكتملة';
  if (touched) return 'جاري التنفيذ';
  return 'معتمدة';
}

function weekNo_(w) {
  var m = String(w).match(/\d+/);
  var y = String(w).match(/(20\d\d)/);
  var mo = 0;
  for (var i = 0; i < AR_MONTHS.length; i++) if (String(w).indexOf(AR_MONTHS[i]) >= 0) mo = i + 1;
  return (y ? Number(y[1]) : 0) * 10000 + mo * 100 + (m ? Number(m[0]) : 0);
}

/** بنود أسبوع بعينه — تُطلب عند فتح الأسبوع في الأرشيف */
function weekData_(ss, user, body) {
  var wk = S(body.week);
  if (!wk) return json_({ ok:false, error:'no_week' });
  var plans = planItems_(ss, wk);
  if (!user.admin) plans = plans.filter(function(p){ return S(p.coach) === S(user.code); });
  var canc = {}, att = {};
  rows_(ss, SH_CANC, 9).forEach(function(r){
    var k = S(r[0]); if (k && k.split('|')[0] === wk)
      canc[k] = { reason:S(r[6]), by:S(r[7]), at:S(r[8]) }; });
  rows_(ss, SH_ATT, 9).forEach(function(r){
    var k = S(r[1]); if (k && k.split('|')[0] === wk)
      att[k] = { planned:Number(r[6])||0, actual:Number(r[7])||0 }; });
  return json_({ ok:true, week:wk, plans:plans, cancels:canc, attend:att,
                 ticks: readTicks_(ss, wk) });
}

/* ================== صفحة الأسبوع داخل الجدول ================== */
/* تبويب مستقل لكل أسبوع: كل لعبة كتلة، وتحتها أيامها ببنودها وحالة تنفيذها.
   يُنشأ تلقائياً كل جمعة مساءً، أو بأمر من قائمة FMAC. */
var WK_PREFIX = '▸ ';                 /* يميّز تبويبات الأسابيع عن تبويبات البيانات */
/* الحالة تُخزَّن بالعربية وقد تختلف تشكيلاً — نميّزها بالمعنى لا بالحرف */
function stKind_(st) {
  var t = S(st); if (!t) return '';
  if (t.indexOf('جزئ') >= 0) return 'part';
  if (t.indexOf('لم')  >= 0) return 'miss';
  return 'done';
}
var ST_COL = { done:'#1f8f5f', part:'#c99400', miss:'#c8323c' };
var ST_ICO = { done:'✓',       part:'◐',       miss:'✗' };

function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('FMAC')
      .addItem('أنشئ صفحة الأسبوع الحالي', 'weekPageNow')
      .addItem('أنشئ صفحة أسبوع سابق…', 'weekPageAsk')
      .addSeparator()
      .addItem('إعداد النظام (setup)', 'setup')
      .addToUi();
  } catch (e) {}
}
function weekPageNow() { var m = weekPage_(SpreadsheetApp.getActiveSpreadsheet(), '');
  try { SpreadsheetApp.getActive().toast(m, 'FMAC', 8); } catch (x) {} return m; }
function weekPageAsk() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt('صفحة أسبوع سابق', 'اكتب اسم الأسبوع كما هو في الجدول، مثل: الأسبوع 3 — أغسطس 2026',
                    ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var m = weekPage_(SpreadsheetApp.getActiveSpreadsheet(), S(r.getResponseText()));
  ui.alert(m);
}
/** يُستدعى من المشغّل الزمني كل جمعة مساءً */
function weekPage() { return weekPage_(SpreadsheetApp.getActiveSpreadsheet(), ''); }

function weekPage_(ss, week) {
  var wk = S(week) || weekNow_(ss).label;
  var plans = planItems_(ss, wk);
  if (!plans.length) return 'لا توجد بنود مسجَّلة لـ «' + wk + '».';

  var ticks = readTicks_(ss, wk), canc = {}, att = {}, stage = {}, dates = {};
  rows_(ss, SH_CANC, 9).forEach(function(r){
    if (S(r[0])) canc[S(r[0])] = { reason:S(r[6]), by:S(r[7]) }; });
  rows_(ss, SH_ATT, 9).forEach(function(r){
    if (S(r[1])) att[S(r[1])] = { planned:Number(r[6])||0, actual:Number(r[7])||0 }; });
  rows_(ss, SH_STAGE, 7).forEach(function(r){
    if (S(r[2]) === wk) stage[S(r[1])] = S(r[3]); });
  var ratedD = {}, ratedNw = {}, dayItemsW = {}, closedWk = false;
  rows_(ss, SH_TICKS, 12).forEach(function(r){
    var a = S(r[0]).split('|');
    if (a.length >= 5 && S(r[8])) { var k = a[0]+'|'+a[1]+'|'+a[2];
      ratedD[k] = 1; ratedNw[k] = (ratedNw[k]||0) + 1; } });
  plans.forEach(function(pp){ pp.days.forEach(function(d,i){
    dayItemsW[wk+'|'+pp.id+'|'+i] = (d.sections||[]).reduce(function(a,x){
      return a + ((x.items||[]).length); }, 0); }); });
  rows_(ss, SH_WEEK, 5).forEach(function(r){
    if (S(r[0]) === wk && S(r[1]) === 'مغلق') closedWk = true; });
  var wkDates = '';
  rows_(ss, SH_SUBS, 11).forEach(function(r){ if (S(r[6]) === wk) wkDates = wkDates || ''; });
  var cfg = cfg_(ss);
  if (cfg.week === wk && cfg.dates) wkDates = cfg.dates;
  if (!wkDates) wkDates = weekAuto_().dates;

  var users = {};
  userList_(ss).forEach(function(u){ users[u.code] = u.name; });

  /* ---- بناء الصفوف ---- */
  var rowsOut = [], fmt = [];        /* fmt: {r, kind, extra} */
  function push(cells, kind, extra) {
    rowsOut.push(cells);
    fmt.push({ r: rowsOut.length, kind: kind, extra: extra || null });
  }
  var gTot = 0, gDone = 0, gDays = 0, gCanc = 0;

  push(['نادي الفجيرة للفنون القتالية — تنفيذ الخطط التدريبية', '', '', '', '', ''], 'title');
  push([wk, wkDates, '', '', '', ''], 'sub');
  push(['', '', '', '', '', ''], 'gap');
  var hdrRow = rowsOut.length;       /* يُملأ الملخّص بعد الحساب */
  push(['', '', '', '', '', ''], 'kpi');
  push(['', '', '', '', '', ''], 'gap');

  plans.forEach(function(p){
    var pTot = 0, pDone = 0;
    var body = [];

    p.days.forEach(function(d, di){
      if (!d.sections.length && !d.day) return;
      gDays++;
      var ck = wk + '|' + p.id + '|' + di;
      var nm = d.day || ('اليوم ' + (di+1));
      if (canc[ck]) {
        gCanc++;
        body.push({ cells:[nm, d.date || '', '⊘ أُلغيت الحصة',
                    'السبب: ' + canc[ck].reason, canc[ck].by || '', ''], kind:'canc' });
        return;
      }
      var meta = [];
      if (d.intensity) meta.push('شدة ' + d.intensity);
      if (d.volume)    meta.push('حجم ' + d.volume);
      var a = att[wk + '|' + p.id + '|' + di];
      if (a && a.actual) meta.push('حضور ' + a.actual + '/' + (a.planned || '—'));
      body.push({ cells:[nm, d.date || '', d.goal || '', meta.join('  ·  '), '', ''], kind:'day' });

      d.sections.forEach(function(sec, si){
        body.push({ cells:['', sec.name, sec.dur || '', '', '', ''], kind:'sec' });
        sec.items.forEach(function(it, ii){
          var t = ticks[wk + '|' + p.id + '|' + di + '|' + si + '|' + ii] || {};
          var st = S(t.s), kd = stKind_(st);
          pTot++;
          pDone += kd === 'part' ? 0.5 : (kd === 'done' ? 1 : 0);
          body.push({ cells:['', '', (ST_ICO[kd] || '·'), it, st || 'لم يُرصد', S(t.n)],
                      kind:'item', st:kd });
        });
      });
    });

    gTot += pTot; gDone += pDone;
    var pct = pTot ? Math.round(pDone / pTot * 100) : 0;
    push([p.sport + (p.category ? ' — ' + p.category : ''),
          users[p.coach] || p.coach || '—',
          p.branch || '',
          (function(){ var dd={}; p.days.forEach(function(_,i){ dd[i]=1; });
            return autoStage_(stage[p.id] || 'مرفوعة', wk, p.id, dd, canc, ratedD, closedWk,
                              ratedNw, dayItemsW); })(),
          pTot ? pct + '%' : '—', ''], 'plan', pct);
    push(['اليوم', 'الجزء / التاريخ', 'الحالة', 'البند', 'التنفيذ', 'ملاحظة'], 'head');
    body.forEach(function(b){ push(b.cells, b.kind, b.st); });
    push(['', '', '', '', '', ''], 'gap');
  });

  var gPct = gTot ? Math.round(gDone / gTot * 100) : 0;
  rowsOut[hdrRow] = ['تنفيذ النادي: ' + gPct + '%',
                     plans.length + ' خطة',
                     gDays + ' حصة',
                     gCanc + ' ملغاة',
                     gTot + ' بنداً', ''];

  /* ---- الكتابة والتنسيق ---- */
  var name = WK_PREFIX + wk;
  var sh = ss.getSheetByName(name);
  if (sh) ss.deleteSheet(sh);
  sh = ss.insertSheet(name, ss.getNumSheets());
  sh.setRightToLeft(true);
  sh.getRange(1, 1, rowsOut.length, 6).setValues(rowsOut);
  sh.setColumnWidth(1, 110); sh.setColumnWidth(2, 190); sh.setColumnWidth(3, 70);
  sh.setColumnWidth(4, 420); sh.setColumnWidth(5, 110); sh.setColumnWidth(6, 240);
  sh.getRange(1, 1, rowsOut.length, 6)
    .setFontFamily('Arial').setFontSize(10).setVerticalAlignment('middle');

  fmt.forEach(function(f){
    var rg = sh.getRange(f.r, 1, 1, 6);
    if (f.kind === 'title') { sh.getRange(f.r,1,1,6).merge();
      rg.setBackground('#0a1317').setFontColor('#ffffff').setFontSize(14)
        .setFontWeight('bold').setHorizontalAlignment('center'); sh.setRowHeight(f.r, 34); }
    else if (f.kind === 'sub') rg.setFontColor('#5b6b78').setFontSize(11);
    else if (f.kind === 'kpi') rg.setBackground('#eef3f6').setFontWeight('bold')
        .setFontColor('#16212a');
    else if (f.kind === 'plan') {
      rg.setBackground('#16212a').setFontColor('#ffffff').setFontWeight('bold').setFontSize(11.5);
      sh.setRowHeight(f.r, 26);
      var c = f.extra >= 75 ? '#7ee2b8' : f.extra >= 50 ? '#ffd479' : '#ff9aa2';
      sh.getRange(f.r, 5).setFontColor(c);
    }
    else if (f.kind === 'head') rg.setBackground('#dfe7ec').setFontWeight('bold')
        .setFontSize(9.5).setFontColor('#3d4b57');
    else if (f.kind === 'day') { rg.setBackground('#f5f8fa').setFontWeight('bold');
      sh.getRange(f.r, 4).setFontWeight('normal').setFontColor('#5b6b78'); }
    else if (f.kind === 'sec') sh.getRange(f.r, 2, 1, 2).setFontColor('#5b6b78')
        .setFontStyle('italic');
    else if (f.kind === 'canc') rg.setBackground('#fdf0f1').setFontColor('#8f2029');
    else if (f.kind === 'item') {
      var col = ST_COL[f.extra] || '#9aa7b1';
      sh.getRange(f.r, 3).setFontColor(col).setFontWeight('bold')
        .setHorizontalAlignment('center');
      sh.getRange(f.r, 5).setFontColor(col).setFontSize(9);
      sh.getRange(f.r, 6).setFontColor('#5b6b78').setFontSize(9);
    }
  });
  sh.setFrozenRows(5);
  sh.getRange(1, 1, rowsOut.length, 6).setWrap(false);
  sh.getRange(1, 4, rowsOut.length, 1).setWrap(true);
  sh.getRange(1, 6, rowsOut.length, 1).setWrap(true);
  try { sh.setTabColor(gPct >= 75 ? '#1f8f5f' : gPct >= 50 ? '#c99400' : '#c8323c'); } catch (x) {}

  return 'أُنشئت صفحة «' + wk + '» — ' + plans.length + ' خطة · تنفيذ ' + gPct + '%';
}

/* ======================= مساعد Claude ======================= */
/* المفتاح يُحفظ في إعدادات الأسكريبت ولا يظهر في المتصفح إطلاقاً:
   إعدادات المشروع ⚙ ← خصائص الأسكريبت ← إضافة خاصية
     ANTHROPIC_API_KEY = sk-ant-...            (إلزامية)
     ANTHROPIC_MODEL   = claude-sonnet-5       (اختيارية) */
var AI_URL = 'https://api.anthropic.com/v1/messages';
var AI_VER = '2023-06-01';
var AI_DEF = 'claude-sonnet-5';

function aiKey_()   { return S(PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY')); }
function aiModel_() { return S(PropertiesService.getScriptProperties().getProperty('ANTHROPIC_MODEL')) || AI_DEF; }
function aiOn_()    { return !!aiKey_(); }

/** نداء واحد إلى Claude — يعيد {ok, text} أو {ok:false, error} */
function aiCall_(system, prompt, maxTok) {
  var key = aiKey_();
  if (!key) return { ok:false, error:'ai_off' };
  var payload = {
    model: aiModel_(),
    max_tokens: maxTok || 1200,
    system: system,
    messages: [{ role:'user', content: prompt }]
  };
  try {
    var res = UrlFetchApp.fetch(AI_URL, {
      method:'post', contentType:'application/json',
      headers:{ 'x-api-key':key, 'anthropic-version':AI_VER },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    var code = res.getResponseCode(), txt = res.getContentText();
    if (code !== 200) {
      var msg = '';
      try { msg = S((JSON.parse(txt).error || {}).message); } catch (x) { msg = txt.slice(0, 180); }
      return { ok:false, error: code === 401 ? 'ai_badkey'
                              : code === 429 ? 'ai_busy'
                              : code === 400 && /credit|balance/i.test(msg) ? 'ai_nocredit'
                              : 'ai_error', detail: msg, code: code };
    }
    var j = JSON.parse(txt), out = '';
    (j.content || []).forEach(function(b){ if (b.type === 'text') out += b.text; });
    return { ok:true, text: out.trim(), model: S(j.model),
             usage: j.usage || {} };
  } catch (err) {
    return { ok:false, error:'ai_net', detail:String(err) };
  }
}

/** يستخرج أول كائن JSON من ردّ النموذج ولو حُفَّ بنصّ */
function aiJson_(t) {
  var s = S(t);
  var a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch (x) { return null; }
}

var AI_SYS_BASE =
  'أنت المساعد الفني الآلي لقسم الإعداد الفني في نادي الفجيرة للفنون القتالية بدولة الإمارات. '
+ 'تكتب بالعربية الفصحى فقط، بلا عامية ولا رموز تعبيرية. '
+ 'أسلوبك موجز ومهني ومباشر، وتخاطب مدير القسم الفني. '
+ 'تبني كل جملة على الأرقام والنصوص المعطاة لك، ولا تخترع رقماً ولا اسماً غير موجود فيها. '
+ 'إن كانت البيانات لا تكفي للحكم فقل ذلك صراحة بدل التخمين.';

/** سؤال حرّ عن أداء الخطط */
function aiAsk_(ss, user, body) {
  if (!user.admin) return json_({ ok:false, error:'not_admin' });
  var q = S(body.q).slice(0, 1200);
  if (!q) return json_({ ok:false, error:'no_question' });
  var ctx = S(body.ctx).slice(0, 60000);
  var r = aiCall_(
    AI_SYS_BASE + ' تجيب في حدود مئة وخمسين كلمة، وتبدأ بالجواب المباشر ثم سببه من الأرقام. '
    + 'وإن كان في الجواب توصية فاجعلها سطراً أخيراً يبدأ بكلمة «المقترح:».',
    'هذه بيانات النادي للأسبوع الجاري:\n\n' + ctx + '\n\nالسؤال: ' + q,
    900);
  if (!r.ok) return json_(r);
  return json_({ ok:true, text:r.text, model:r.model, usage:r.usage });
}

/** مراجعة مضمون خطة — تعيد ملاحظات مصنَّفة */
function aiReview_(ss, user, body) {
  if (!user.admin) return json_({ ok:false, error:'not_admin' });
  var pid = S(body.planId), sig = S(body.sig);
  var txt = S(body.plan).slice(0, 40000);
  if (!txt) return json_({ ok:false, error:'no_plan' });

  var cache = CacheService.getScriptCache();
  var ck = 'airev_' + slug_(pid + '_' + sig).slice(0, 200);
  var hit = cache.get(ck);
  if (hit && !body.force) {
    var o = aiJson_(hit); if (o) { o.cached = true; o.ok = true; return json_(o); }
  }

  var r = aiCall_(
    AI_SYS_BASE + ' مهمتك مراجعة مضمون خطة تدريبية أسبوعية: هل التمارين تخدم هدف اليوم، '
    + 'وهل تسلسل الأجزاء سليم، وهل توزيع الحمل والاستشفاء عبر الأسبوع منطقي، '
    + 'وهل الإحماء والتهدئة مناسبان لطبيعة الجلسة. '
    + 'لا تعلّق على البيانات الناقصة (زمن أو شدة أو حجم غير مكتوب) فذلك يفحصه النظام آلياً. '
    + 'أعِد كائن JSON فقط بلا أي نص خارجه، بهذا الشكل: '
    + '{"verdict":"اعتماد" أو "إرجاع","summary":"جملة واحدة","notes":['
    + '{"lvl":0 أو 1 أو 2,"day":"اسم اليوم أو فارغ","txt":"الملاحظة في جملة واحدة"}]} '
    + 'حيث lvl صفر لخلل يضرّ باللاعب، وواحد لخلل فني مؤثر، واثنان لملاحظة تحسينية. '
    + 'أقصى عدد للملاحظات خمس، وإن كانت الخطة سليمة فأعِد notes فارغة وverdict اعتماد.',
    txt, 1400);
  if (!r.ok) return json_(r);

  var o = aiJson_(r.text);
  if (!o) return json_({ ok:false, error:'ai_parse', detail:r.text.slice(0, 300) });
  var out = { ok:true, verdict:S(o.verdict) === 'إرجاع' ? 'إرجاع' : 'اعتماد',
              summary:S(o.summary), notes:[], model:r.model, usage:r.usage };
  (o.notes || []).slice(0, 5).forEach(function(n){
    var t = S(n.txt); if (!t) return;
    var lv = Number(n.lvl); if (!isFinite(lv)) lv = 1;
    out.notes.push({ lvl: Math.max(0, Math.min(2, Math.round(lv))), day:S(n.day), txt:t });
  });
  try { cache.put(ck, JSON.stringify(out), 21600); } catch (x) {}
  return json_(out);
}

/** خلاصة الأسبوع مكتوبة */
function aiWeek_(ss, user, body) {
  if (!user.admin) return json_({ ok:false, error:'not_admin' });
  var ctx = S(body.ctx).slice(0, 60000);
  if (!ctx) return json_({ ok:false, error:'no_context' });
  var cache = CacheService.getScriptCache();
  var ck = 'aiwk_' + slug_(S(body.week) + '_' + ctx.length).slice(0, 200);
  var hit = cache.get(ck);
  if (hit && !body.force) return json_({ ok:true, text:hit, cached:true });

  var r = aiCall_(
    AI_SYS_BASE + ' اكتب خلاصة الأسبوع لمدير القسم الفني في حدود مئتي كلمة، '
    + 'بأربع فقرات قصيرة معنونة هكذا بالضبط وبلا ترقيم: '
    + '«ما تحسّن» ثم «ما تراجع» ثم «ما يستحق تدخلك» ثم «المقترح للأسبوع القادم». '
    + 'اذكر الأرقام والأسماء كما وردت، ولا تضف رقماً غير موجود.',
    'بيانات الأسبوع:\n\n' + ctx, 1100);
  if (!r.ok) return json_(r);
  try { cache.put(ck, r.text, 21600); } catch (x) {}
  return json_({ ok:true, text:r.text, model:r.model, usage:r.usage });
}

/** حالة المساعد — يُستدعى من صفحة الإعدادات */
function aiStatus_(ss, user, body) {
  if (!user.admin) return json_({ ok:false, error:'not_admin' });
  if (!aiOn_()) return json_({ ok:true, on:false, reason:'no_key' });
  if (!body.test) return json_({ ok:true, on:true, model:aiModel_() });
  var r = aiCall_('أجب بكلمة واحدة.', 'قل: جاهز', 16);
  return json_({ ok:true, on:r.ok, model:aiModel_(),
                 reason:r.ok ? '' : r.error, detail:r.ok ? S(r.text) : S(r.detail) });
}

/* ============================ حساب الأسبوع ============================ */
function weekAuto_(d) {
  var t = d ? new Date(d) : new Date();
  var day = Number(Utilities.formatDate(t, TZ, 'u')) % 7;      // 7=الأحد → 0
  var start = new Date(t.getTime() - day*86400000);
  var end   = new Date(start.getTime() + 5*86400000);
  var sD = Number(Utilities.formatDate(start, TZ, 'd'));
  var eD = Number(Utilities.formatDate(end,   TZ, 'd'));
  var sM = Number(Utilities.formatDate(start, TZ, 'M')) - 1;
  var eM = Number(Utilities.formatDate(end,   TZ, 'M')) - 1;
  var sY = Utilities.formatDate(start, TZ, 'yyyy');
  var eY = Utilities.formatDate(end,   TZ, 'yyyy');
  var no = Math.floor((sD - 1) / 7) + 1;
  var dates = (sM === eM) ? (sD + ' – ' + eD + ' ' + AR_MONTHS[sM] + ' ' + sY)
                          : (sD + ' ' + AR_MONTHS[sM] + ' – ' + eD + ' ' + AR_MONTHS[eM] + ' ' + eY);
  return { no:no, label:'الأسبوع ' + no + ' — ' + AR_MONTHS[sM] + ' ' + sY, dates:dates };
}
function weekNow_(ss) {
  var c = cfg_(ss);
  return c.week ? { label:c.week, dates:c.dates } : weekAuto_();
}

/* ==================== بنود الخطط المرفوعة ==================== */
/** يعيد خطط الأسبوع الجاري مبنيّة من تبويب «بنود الخطط» */
function planItems_(ss, week) {
  var wk = week || weekNow_(ss).label;
  var byPlan = {}, order = [];
  rows_(ss, SH_ITEMS, 17).forEach(function(r){
    var id = S(r[0]), w = S(r[1]), item = S(r[16]);
    if (!id || !item || w !== wk) return;
    var p = byPlan[id];
    if (!p) {
      p = byPlan[id] = { id:id, sport:S(r[2]), name:S(r[3]), week:w, category:S(r[4]),
                         branch:S(r[5]), coach:S(r[6]), source:'رفع المدرب',
                         objectives:[], days:[] };
      order.push(id);
    }
    var di = Math.max(1, Number(r[7]) || 1);
    while (p.days.length < di)
      p.days.push({ day:'', date:'', goal:'', intensity:'', volume:'', duration:'', notes:'', sections:[] });
    var d = p.days[di-1];
    if (S(r[8]))  d.day = S(r[8]);
    if (S(r[9]))  d.date = S(r[9]);
    if (S(r[10])) d.goal = S(r[10]);
    if (S(r[11])) d.intensity = S(r[11]);
    if (S(r[12])) d.volume = S(r[12]);
    var sn = S(r[13]) || 'التمارين', sec = null;
    for (var i=0;i<d.sections.length;i++) if (d.sections[i].name === sn) sec = d.sections[i];
    if (!sec) { sec = { name:sn, dur:S(r[14]), items:[] }; d.sections.push(sec); }
    if (!sec.dur && S(r[14])) sec.dur = S(r[14]);
    sec.items.push(item);
  });
  return order.map(function(k){ return byPlan[k]; });
}

function attendList_(ss) {
  var out = {};
  rows_(ss, SH_ATT, 9).forEach(function(r){
    var k = S(r[1]); if (!k) return;
    out[k] = { planned:Number(r[6])||0, actual:Number(r[7])||0, by:S(r[8]), at:S(r[0]) };
  });
  return out;
}
function replyList_(ss) {
  var out = {};
  rows_(ss, SH_REPLY, 7).forEach(function(r){
    var k = S(r[0]), t = S(r[4]); if (!k || !t) return;
    out[k] = { text:t, by:S(r[5]), at:S(r[6]) };
  });
  return out;
}

/** تجميع النتائج أسبوعياً — للاتجاه عبر الأسابيع ومؤشر الالتزام */
function history_(ss) {
  var pm = {}, sportOf = {}, coachOf = {}, itemsOf = {};
  rows_(ss, SH_PLANS, 10).forEach(function(r){
    var id = S(r[0]); if (!id) return;
    sportOf[id] = S(r[1]); coachOf[id] = S(r[5]); itemsOf[id] = Number(r[8])||0;
  });
  rows_(ss, SH_ITEMS, 17).forEach(function(r){
    var id = S(r[0]); if (!id) return;
    if (!sportOf[id]) sportOf[id] = S(r[2]);
    if (!coachOf[id]) coachOf[id] = S(r[6]);
  });
  var W = {};
  function slot(wk, kind, name) {
    W[wk] = W[wk] || { week:wk, done:0, total:0, sports:{}, coaches:{}, plans:{} };
    var g = W[wk][kind];
    if (name) { g[name] = g[name] || { done:0, total:0 }; return g[name]; }
    return W[wk];
  }
  rows_(ss, SH_TICKS, 12).forEach(function(r){
    var wk = S(r[1]), id = S(r[2]), st = S(r[8]);
    if (!wk || !st) return;
    var v = st.indexOf('جزئ') >= 0 ? 0.5 : (st.indexOf('لم') >= 0 ? 0 : 1);
    slot(wk).done += v;
    slot(wk, 'sports',  sportOf[id] || S(r[3]) || '—').done += v;
    slot(wk, 'coaches', coachOf[id] || '—').done += v;
    slot(wk, 'plans',   id).done += v;
  });
  /* المقام: عدد بنود كل خطة، لا عدد ما رُصد فقط — بمرور واحد على السجل */
  var seenWk = {};
  rows_(ss, SH_TICKS, 12).forEach(function(r){
    var wk = S(r[1]), id = S(r[2]);
    if (!wk || !id || !W[wk]) return;
    var k = wk + '|' + id;
    if (seenWk[k]) return;
    seenWk[k] = true;
    var n = itemsOf[id] || 0; if (!n) return;
    W[wk].total += n;
    slot(wk, 'sports',  sportOf[id] || '—').total += n;
    slot(wk, 'coaches', coachOf[id] || '—').total += n;
    slot(wk, 'plans',   id).total += n;
  });
  function pct(o){ return o.total ? Math.round(o.done / o.total * 100) : 0; }
  var keys = Object.keys(W).sort(function(a,b){ return weekNo_(a) - weekNo_(b); });
  if (keys.length > 16) keys = keys.slice(keys.length - 16);
  return keys.map(function(wk){
    var w = W[wk], sp = {}, co = {};
    Object.keys(w.sports).forEach(function(k){ sp[k] = pct(w.sports[k]); });
    Object.keys(w.coaches).forEach(function(k){ co[k] = pct(w.coaches[k]); });
    return { week:wk, score:pct(w), items:w.total, sports:sp, coaches:co };
  });
}
function subsList_(ss) {
  return rows_(ss, SH_SUBS, 11).filter(function(r){ return S(r[1]); }).map(function(r){
    return { at:S(r[0]), code:S(r[1]), name:S(r[2]), sport:S(r[3]), branch:S(r[4]),
             category:S(r[5]), week:S(r[6]), players:Number(r[7])||0,
             file:S(r[8]), url:S(r[9]), note:S(r[10]) };
  });
}

/** جدول بمفتاح في العمود الأول */
function mapOf_(ss, name, cols, fn) {
  var out = {};
  rows_(ss, name, cols).forEach(function(r){
    var k = S(r[0]); if (!k) return;
    out[k] = fn(r);
  });
  return out;
}
function listOf_(ss, name, cols, fn) {
  return rows_(ss, name, cols).filter(function(r){ return S(r[0]); }).map(fn);
}

/** سجل إلغاء أيام الخطة — المفتاح: كود الخطة|رقم اليوم */
function cancelList_(ss) {
  var out = {};
  rows_(ss, SH_CANC, 9).forEach(function(r){
    var k = S(r[0]); if (!k) return;
    var reason = S(r[6]);
    if (reason) out[k] = { reason:reason, by:S(r[7]), at:S(r[8]) };
  });
  return out;
}
/** فهارس الأعمدة من صف العناوين — تقرأ الجدول صحيحاً قبل الترقية وبعدها */
function colIdx_(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh || !sh.getLastColumn()) return {};
  var h = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(S);
  var o = {};
  h.forEach(function(v,i){ if (v && o[v] === undefined) o[v] = i; });
  o.__w = h.length;
  return o;
}
/* week فارغة = كل السجل · وإلا فأسبوع واحد.
   الصفحة لا تحتاج إلا الأسبوع الجاري؛ وأسابيع الأرشيف تُجلب عند فتحها. */
function wkNum_(w) { var m = String(w||'').match(/\d+/); return m ? m[0] : ''; }
function sameWk_(a, b, bNum) {
  var an = wkNum_(a), bn = (bNum === undefined ? wkNum_(b) : bNum);
  if (an && bn) return an === bn;
  return S(a) === S(b);
}
function readTicks_(ss, week) {
  var out = {}, c = colIdx_(ss, SH_TICKS);
  var iS = c['الحالة'],  iN = c['ملاحظة'];
  if (iS === undefined) { iS = 7; iN = 8; }          // تخطيط الإصدار السابق
  var w = Math.max(c.__w || 0, iS + 1, iN + 1);
  var only = S(week), onlyN = wkNum_(only);
  rows_(ss, SH_TICKS, w).forEach(function(r){
    var k = S(r[0]); if (!k) return;
    /* المقارنة برقم الأسبوع لا بنصّه — «الأسبوع 4» و«الأسبوع 4 — أغسطس 2026» أسبوع واحد،
       واختلاف المسمّى كان يُخفي التقييمات وكأنها لم تُحفظ */
    if (only && S(r[1]) && !sameWk_(S(r[1]), only, onlyN)) return;
    var st = S(r[iS]), n = (iN === undefined ? '' : S(r[iN]));
    if (st || n) out[k] = { s:st, n:n };
  });
  return out;
}


/** نتائج البطولات المُدخَلة داخل الموقع — تُدمج فوق ملفات المواسم */
function results_(ss) {
  var out = {};
  rows_(ss, SH_RES, 12).forEach(function(r){
    var sp = S(r[1]), y = S(r[2]), nm = S(r[3]);
    if (!sp || !y || !nm) return;
    if (!out[sp]) out[sp] = {};
    if (!out[sp][y]) out[sp][y] = { championships: [] };
    out[sp][y].championships.push({ name: nm, gold: Number(r[4]) || 0,
      silver: Number(r[5]) || 0, bronze: Number(r[6]) || 0,
      scope: S(r[9]) || 'محلي', date: S(r[10]), place: S(r[11]), added: true });
  });
  return out;
}
/* لاعبو المنتخب الوطني — تُملأ يدوياً من الموقع بالاسم والفئة */
function national_(ss) {
  var out = {};
  rows_(ss, SH_NAT, 8).forEach(function(r){
    var sp = S(r[1]), y = S(r[2]), nm = S(r[3]);
    if (!sp || !y || !nm) return;
    if (!out[sp]) out[sp] = {};
    if (!out[sp][y]) out[sp][y] = { players: [] };
    out[sp][y].players.push({ k:S(r[0]), name:nm, cat:S(r[4]), note:S(r[5]),
                              by:S(r[6]), at:S(r[7]) });
  });
  return out;
}
function national_save_(ss, user, body) {
  if (!user.admin) return json_({ ok:false, error:'not_admin' });
  var p = body.player || {};
  if (!S(p.sport) || !S(p.season) || !S(p.name))
    return json_({ ok:false, error:'missing' });
  var at = stamp_();
  var k = S(p.k) || ('NT' + at.replace(/\D/g, '') + Math.floor(Math.random() * 900 + 100));
  upsert_(ss.getSheetByName(SH_NAT), 1, k,
    [k, S(p.sport), S(p.season), S(p.name), S(p.cat), S(p.note), user.name, at], 8);
  return json_({ ok:true, at:at, k:k });
}
function national_drop_(ss, user, body) {
  if (!user.admin) return json_({ ok:false, error:'not_admin' });
  var k = S((body.player || {}).k);
  if (!k) return json_({ ok:false, error:'missing' });
  var sh = ss.getSheetByName(SH_NAT);
  if (!sh) return json_({ ok:false, error:'no_sheet' });
  var last = sh.getLastRow();
  if (last > 1) {
    var ks = sh.getRange(2, 1, last - 1, 1).getValues();
    for (var i = ks.length - 1; i >= 0; i--) if (S(ks[i][0]) === k) sh.deleteRow(i + 2);
  }
  bust_(SH_NAT);
  return json_({ ok:true, at:stamp_() });
}
/* إضافة مستخدم أو تعديله من داخل الموقع — إدارة أو مدرب */
function userSave_(ss, user, body) {
  if (!user.admin) return json_({ ok:false, error:'not_admin' });
  var u = body.userRow || {};
  var code = S(u.code), name = S(u.name);
  if (!code || !name) return json_({ ok:false, error:'missing' });
  if (!/^[A-Za-z0-9_-]{2,20}$/.test(code)) return json_({ ok:false, error:'bad_code_format' });
  var sh = ss.getSheetByName(SH_USERS);
  if (!sh) return json_({ ok:false, error:'no_sheet' });
  var rs = rows_(ss, SH_USERS, 8), old = null;
  for (var i = 0; i < rs.length; i++) if (S(rs[i][0]) === code) old = rs[i];
  if (old && !S(u.edit)) return json_({ ok:false, error:'code_taken' });
  var role = S(u.role) || 'مدرب';
  if (code === user.code && role.indexOf('إدارة') !== 0)
    return json_({ ok:false, error:'self_demote' });
  upsert_(sh, 1, code,
    [code, name, role, S(u.sport), S(u.branch), S(u.phone),
     S(u.note) || (old ? S(old[6]) : ''), S(u.photo) || (old ? S(old[7]) : '')], 8);
  return json_({ ok:true, at:stamp_(), code:code, updated:!!old });
}
/* حذف مستخدم — لا يُحذف صاحب الجلسة ولا آخر إداريّ */
function userDrop_(ss, user, body) {
  if (!user.admin) return json_({ ok:false, error:'not_admin' });
  var code = S((body.userRow || {}).code);
  if (!code) return json_({ ok:false, error:'missing' });
  if (code === user.code) return json_({ ok:false, error:'self_delete' });
  var sh = ss.getSheetByName(SH_USERS);
  if (!sh) return json_({ ok:false, error:'no_sheet' });
  var last = sh.getLastRow();
  if (last < 2) return json_({ ok:false, error:'not_found' });
  var vals = sh.getRange(2, 1, last - 1, 3).getValues();
  var admins = 0, row = 0;
  for (var i = 0; i < vals.length; i++) {
    if (S(vals[i][2]).indexOf('إدارة') === 0) admins++;
    if (S(vals[i][0]) === code) row = i + 2;
  }
  if (!row) return json_({ ok:false, error:'not_found' });
  if (S(vals[row - 2][2]).indexOf('إدارة') === 0 && admins <= 1)
    return json_({ ok:false, error:'last_admin' });
  sh.deleteRow(row);
  bust_(SH_USERS);
  return json_({ ok:true, at:stamp_() });
}
/* قائمة كل المستخدمين — للإدارة وحدها، تشمل الإداريين */
function allUsers_(ss) {
  return rows_(ss, SH_USERS, 8).filter(function(r){ return S(r[0]); }).map(function(r){
    var role = S(r[2]);
    return { code:S(r[0]), name:S(r[1]), role:role || 'مدرب',
             admin:(role.indexOf('إدارة')===0 || role.toLowerCase()==='admin'),
             sport:S(r[3]), branch:S(r[4]), phone:S(r[5]), note:S(r[6]),
             photo:photoUrl_(r[7]) };
  });
}
/* المعسكرات المُسجَّلة من الموقع — يُذكر إن كانت للنادي أو للمنتخب */
function camps_(ss) {
  var out = {};
  rows_(ss, SH_CMP, 11).forEach(function(r){
    var sp = S(r[1]), y = S(r[2]), nm = S(r[3]);
    if (!sp || !y || !nm) return;
    if (!out[sp]) out[sp] = {};
    if (!out[sp][y]) out[sp][y] = { camps: [] };
    out[sp][y].camps.push({ name:nm, date:S(r[4]), place:S(r[5]),
      kind:S(r[6]) || 'داخلي', scope:S(r[7]) || 'نادي',
      players:Number(r[8]) || 0, added:true });
  });
  return out;
}
function camp_(ss, user, body) {
  if (!user.admin) return json_({ ok:false, error:'not_admin' });
  var c = body.camp || {};
  if (!S(c.sport) || !S(c.season) || !S(c.name))
    return json_({ ok:false, error:'missing' });
  var at = stamp_();
  var k = S(c.sport) + '|' + S(c.season) + '|' + S(c.name);
  upsert_(ss.getSheetByName(SH_CMP), 1, k,
    [k, S(c.sport), S(c.season), S(c.name), S(c.date), S(c.place),
     S(c.kind) || 'داخلي', S(c.scope) || 'نادي', Number(c.players) || 0,
     user.name, at], 11);
  return json_({ ok:true, at:at });
}
/* الدروع المُسجَّلة من الموقع — للبطولات المحلية وحدها */
function shields_(ss) {
  var out = {};
  rows_(ss, SH_SHD, 10).forEach(function(r){
    var sp = S(r[1]), y = S(r[2]), kind = S(r[3]);
    if (!sp || !y || !kind) return;
    var rank = Number(r[4]) || 1, pts = Number(r[5]) || 0;
    var table = [{ rank: rank, club: 'نادي الفجيرة للفنون القتالية', points: pts }];
    if (S(r[6])) table.push({ rank: rank === 1 ? 2 : 1, club: S(r[6]),
                              points: Number(r[7]) || 0 });
    table.sort(function(a, b){ return a.rank - b.rank; });
    if (!out[sp]) out[sp] = {};
    if (!out[sp][y]) out[sp][y] = { shields: [] };
    out[sp][y].shields.push({ kind: kind, table: table, added: true });
  });
  return out;
}
/** أجندة القسم — كل ما يعمله القسم لا الخطط وحدها */
/** كالندر الموسم — كشوفات الاتحادات وحالة كل بطولة */
function calendar_(ss) {
  return listOf_(ss, SH_CAL, 14, function(r){
    if (!S(r[0])) return null;
    return { k:S(r[0]), season:S(r[1]), date:S(r[2]), name:S(r[3]), sport:S(r[4]),
             scope:S(r[5]) || 'محلي', fed:S(r[6]), place:S(r[7]),
             status:S(r[8]) || 'قادمة', date0:S(r[9]), reason:S(r[10]),
             note:S(r[11]), by:S(r[12]), at:S(r[13]) };
  }).filter(function(x){ return x; });
}
function calSave_(ss, user, body) {
  if (!user.admin) return json_({ ok:false, error:'not_admin' });
  var rows = body.calendar;
  if (!rows) rows = [body.cal || {}];
  if (!rows.length) return json_({ ok:false, error:'missing' });
  var sh = ss.getSheetByName(SH_CAL), at = stamp_(), out = [];
  for (var i = 0; i < rows.length; i++) {
    var c = rows[i] || {};
    if (!S(c.name) || !S(c.season)) continue;
    var k = S(c.k) || ('CL' + at.replace(/\D/g, '') + i +
                       Math.floor(Math.random() * 900 + 100));
    upsert_(sh, 1, k,
      [k, S(c.season), S(c.date), S(c.name), S(c.sport), S(c.scope) || 'محلي',
       S(c.fed), S(c.place), S(c.status) || 'قادمة', S(c.date0), S(c.reason),
       S(c.note), user.name, at], 14);
    out.push(k);
  }
  if (!out.length) return json_({ ok:false, error:'missing' });
  return json_({ ok:true, at:at, k:out[0], keys:out, n:out.length });
}
function calDrop_(ss, user, body) {
  if (!user.admin) return json_({ ok:false, error:'not_admin' });
  var k = S((body.cal || {}).k || body.k);
  if (!k) return json_({ ok:false, error:'missing' });
  var sh = ss.getSheetByName(SH_CAL);
  var v = sh.getDataRange().getValues();
  for (var i = v.length - 1; i >= 1; i--) {
    if (S(v[i][0]) === k) { sh.deleteRow(i + 1); break; }
  }
  bust_();
  return json_({ ok:true });
}
function agenda_(ss) {
  return listOf_(ss, SH_AGN, 10, function(r){
    if (!S(r[0])) return null;
    return { k:S(r[0]), date:S(r[1]), time:S(r[2]), kind:S(r[3]), title:S(r[4]),
             detail:S(r[5]), branch:S(r[6]), state:S(r[7]) || 'مفتوح',
             by:S(r[8]), at:S(r[9]) };
  });
}
/** الزيارات الميدانية على الفروع */
function visits_(ss) {
  /* الأعمدة 15–18 أُضيفت مع جدولة الزيارات — الصفوف القديمة تقرأ فارغةً بلا كسر */
  return listOf_(ss, SH_VIS, 18, function(r){
    if (!S(r[0])) return null;
    var st = S(r[11]) || 'مفتوحة';
    if (st === 'ملغاة') return null;
    return { k:S(r[0]), date:S(r[1]), sport:S(r[2]), branch:S(r[3]), coach:S(r[4]),
             plan:S(r[5]), time:S(r[14]), org:S(r[7]), gear:S(r[8]),
             note:S(r[9]), action:S(r[10]), state:st,
             by:S(r[12]), at:S(r[13]),
             venue:S(r[15]), owner:S(r[16]), agn:S(r[17]) };
  }).filter(function(x){ return x; });
}

function result_(ss, user, body) {
  if (!user.admin) return json_({ ok:false, error:'not_admin' });
  var r = body.result || {};
  if (!S(r.sport) || !S(r.season) || !S(r.name))
    return json_({ ok:false, error:'missing' });
  var at = stamp_();
  var k = S(r.sport) + '|' + S(r.season) + '|' + S(r.name);
  upsert_(ss.getSheetByName(SH_RES), 1, k,
    [k, S(r.sport), S(r.season), S(r.name), Number(r.gold)||0, Number(r.silver)||0,
     Number(r.bronze)||0, user.name, at, S(r.scope) || 'محلي', S(r.date), S(r.place)], 12);
  return json_({ ok:true, at:at });
}
function shield_(ss, user, body) {
  if (!user.admin) return json_({ ok:false, error:'not_admin' });
  var d = body.shield || {};
  if (!S(d.sport) || !S(d.season) || !S(d.kind))
    return json_({ ok:false, error:'missing' });
  var at = stamp_();
  var k = S(d.sport) + '|' + S(d.season) + '|' + S(d.kind);
  upsert_(ss.getSheetByName(SH_SHD), 1, k,
    [k, S(d.sport), S(d.season), S(d.kind), Number(d.rank)||1, Number(d.points)||0,
     S(d.nextClub), Number(d.nextPoints)||0, user.name, at], 10);
  return json_({ ok:true, at:at });
}
function agendaSave_(ss, user, body) {
  if (!user.admin) return json_({ ok:false, error:'not_admin' });
  var a = body.agenda || {};
  if (!S(a.title) || !S(a.date)) return json_({ ok:false, error:'missing' });
  var at = stamp_();
  var k = S(a.k) || ('AG' + at.replace(/\D/g, '') + Math.floor(Math.random() * 900 + 100));
  upsert_(ss.getSheetByName(SH_AGN), 1, k,
    [k, S(a.date), S(a.time), S(a.kind) || 'مهمة', S(a.title), S(a.detail),
     S(a.branch), S(a.state) || 'مفتوح', user.name, at], 10);
  return json_({ ok:true, at:at, k:k });
}
function visitSave_(ss, user, body) {
  if (!user.admin) return json_({ ok:false, error:'not_admin' });
  var v = body.visit || {};
  if (!S(v.date) || !S(v.branch)) return json_({ ok:false, error:'missing' });
  var at = stamp_();
  var k = S(v.k) || ('VS' + at.replace(/\D/g, '') + Math.floor(Math.random() * 900 + 100));
  var st = S(v.state) || 'مفتوحة';
  var agnK = S(v.agn), agnItem = null;

  /* الزيارة المجدولة تدخل أجندة القسم بنفسها — موعد واحد يتبع الزيارة ويُحدَّث معها */
  if (st === 'مجدولة') {
    var where = S(v.branch) + (S(v.venue) ? ' · ' + S(v.venue) : '');
    var title = 'زيارة فنية — ' + where + (S(v.sport) ? ' · ' + S(v.sport) : '');
    var detail = (S(v.owner) ? 'القائم بها: ' + S(v.owner) : '') +
                 (S(v.coach) ? (S(v.owner) ? ' · ' : '') + 'المدرب: ' + S(v.coach) : '') +
                 (S(v.note) ? ' — ' + S(v.note) : '');
    agnK = agnK || ('AG' + at.replace(/\D/g, '') + Math.floor(Math.random() * 900 + 100));
    upsert_(ss.getSheetByName(SH_AGN), 1, agnK,
      [agnK, S(v.date), S(v.time), 'زيارة', title, detail,
       S(v.branch), 'مفتوح', user.name, at], 10);
    agnItem = { k:agnK, date:S(v.date), time:S(v.time), kind:'زيارة', title:title,
                detail:detail, branch:S(v.branch), state:'مفتوح', by:user.name, at:at };
  } else if (agnK) {
    /* نُفِّذت الزيارة أو أُلغيت — يُغلق موعدها في الأجندة */
    var rows = rows_(ss, SH_AGN, 10);
    for (var i = 0; i < rows.length; i++) {
      if (S(rows[i][0]) === agnK) {
        upsert_(ss.getSheetByName(SH_AGN), 1, agnK,
          [agnK, S(rows[i][1]), S(rows[i][2]), 'زيارة', S(rows[i][4]), S(rows[i][5]),
           S(rows[i][6]), (st === 'ملغاة' ? 'ملغى' : 'تمّ'), S(rows[i][8]), S(rows[i][9])], 10);
        break;
      }
    }
  }

  upsert_(ss.getSheetByName(SH_VIS), 1, k,
    [k, S(v.date), S(v.sport), S(v.branch), S(v.coach), S(v.plan), S(v.time),
     S(v.org), S(v.gear), S(v.note), S(v.action), st,
     user.name, at, S(v.time), S(v.venue), S(v.owner), agnK], 18);
  return json_({ ok:true, at:at, k:k, agn:agnK, agnItem:agnItem });
}

/* ============================ الكتابة ============================ */
function doPost(e) {
  /* أفعال المساعد لا تلمس الجدول وقد تستغرق ثوانيَ — تمرّ من خارج القفل
     حتى لا تحبس بقية المستخدمين */
  try {
    var pre = JSON.parse(e.postData.contents);
    if (pre.action === 'ask' || pre.action === 'airev' || pre.action === 'weekdata' ||
        pre.action === 'aiweek' || pre.action === 'aistatus') {
      var ss0 = SpreadsheetApp.getActiveSpreadsheet();
      var u0  = findUser_(ss0, S(pre.u));
      if (!u0) return json_({ ok:false, error:'bad_code' });
      if (pre.action === 'weekdata') return weekData_(ss0, u0, pre);
      if (pre.action === 'ask')      return aiAsk_(ss0, u0, pre);
      if (pre.action === 'airev')    return aiReview_(ss0, u0, pre);
      if (pre.action === 'aiweek')   return aiWeek_(ss0, u0, pre);
      return aiStatus_(ss0, u0, pre);
    }
  } catch (e0) { return json_({ ok:false, error:String(e0) }); }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(28000);
    bust_();
    var body = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var user = findUser_(ss, S(body.u));
    if (!user) return json_({ ok:false, error:'bad_code' });
    if (body.action === 'upload')     return upload_(ss, user, body);
    if (body.action === 'cancel')     return cancelDay_(ss, user, body);
    if (body.action === 'attendance') return attendance_(ss, user, body);
    if (body.action === 'reply')      return reply_(ss, user, body);
    if (body.action === 'media')      return media_(ss, user, body);
    if (body.action === 'stage')      return stage_(ss, user, body);
    if (body.action === 'segments')   return segments_(ss, user, body);
    if (body.action === 'deviations') return deviations_(ss, user, body);
    if (body.action === 'ack')        return ack_(ss, user, body);
    if (body.action === 'session')    return session_(ss, user, body);
    if (body.action === 'note')       return note_(ss, user, body);
    if (body.action === 'closeweek')  return closeWeek_(ss, user, body);
    if (body.action === 'result')     return result_(ss, user, body);
    if (body.action === 'shield')     return shield_(ss, user, body);
    if (body.action === 'targets')    return targets_(ss, user, body);
    if (body.action === 'camp')       return camp_(ss, user, body);
    if (body.action === 'natl')       return national_save_(ss, user, body);
    if (body.action === 'natlDrop')   return national_drop_(ss, user, body);
    if (body.action === 'user')       return userSave_(ss, user, body);
    if (body.action === 'userDrop')   return userDrop_(ss, user, body);
    if (body.action === 'agenda')     return agendaSave_(ss, user, body);
    if (body.action === 'visit')      return visitSave_(ss, user, body);
    if (body.action === 'cal')        return calSave_(ss, user, body);
    if (body.action === 'calDrop')    return calDrop_(ss, user, body);
    /* إجراء غير معروف = نشر قديم للسكربت. لا نبتلعه بصمت. */
    if (S(body.action)) return json_({ ok:false, error:'unknown_action',
                                       action:S(body.action), build:BUILD });
    return saveTicks_(ss, user, body);
  } catch (err) {
    return json_({ ok:false, error:String(err) });
  } finally { try { lock.releaseLock(); } catch (x) {} }
}

function saveTicks_(ss, user, body) {
  if (!user.admin) return json_({ ok:false, error:'not_admin' });
  var ch0 = (body.changes||[])[0];
  if (ch0 && weekClosed_(ss, ch0.week))
    return json_({ ok:false, error:'week_closed' });
  var sh = ss.getSheetByName(SH_TICKS), last = sh.getLastRow(), keys = {};
  if (last > 1)
    sh.getRange(2,1,last-1,1).getValues().forEach(function(r,i){ keys[S(r[0])] = i+2; });
  var stamp = stamp_(), appends = [];
  (body.changes||[]).forEach(function(c){
    var row = [c.k, c.week||'', c.planId, c.sport, c.plan, c.day, c.section, c.item,
               c.s||'', c.n||'', user.name, stamp];
    if (keys[c.k]) sh.getRange(keys[c.k],1,1,12).setValues([row]);
    else appends.push(row);
  });
  if (appends.length) sh.getRange(sh.getLastRow()+1,1,appends.length,12).setValues(appends);
  bust_(SH_TICKS);
  return json_({ ok:true, saved:(body.changes||[]).length, at:stamp });
}

/** upsert صف واحد في تبويب حسب مفتاح في عمود محدَّد */
function upsert_(sh, keyCol, key, row, width) {
  bust_(sh.getName());                     /* الصفوف تغيّرت — لا تُقرأ من الذاكرة بعدها */
  var last = sh.getLastRow(), found = 0;
  if (last > 1) {
    var ks = sh.getRange(2,keyCol,last-1,1).getValues();
    for (var i=0;i<ks.length;i++) if (S(ks[i][0]) === key) { found = i+2; break; }
  }
  if (found) sh.getRange(found,1,1,width).setValues([row]);
  else sh.getRange(sh.getLastRow()+1,1,1,width).setValues([row]);
  return found ? 'updated' : 'added';
}

/** الحضور الفعلي لحصة */
function attendance_(ss, user, body) {
  if (!user.admin) return json_({ ok:false, error:'not_admin' });
  var a = body.attend || {}, k = S(a.k);
  if (!k) return json_({ ok:false, error:'no_key' });
  var sh = ss.getSheetByName(SH_ATT);
  if (!sh) return json_({ ok:false, error:'no_sheet' });
  var at = stamp_();
  upsert_(sh, 2, k, [at, k, S(a.planId), S(a.week), S(a.dayIndex), S(a.day),
                     Number(a.planned)||0, Number(a.actual)||0, user.name], 9);
  return json_({ ok:true, at:at });
}

/** ردّ المدرب على ملاحظة الإدارة */
function reply_(ss, user, body) {
  var r = body.reply || {}, k = S(r.k);
  if (!k) return json_({ ok:false, error:'no_key' });
  var sh = ss.getSheetByName(SH_REPLY);
  if (!sh) return json_({ ok:false, error:'no_sheet' });
  var at = stamp_();
  upsert_(sh, 1, k, [k, S(r.planId), S(r.week), S(r.item), S(r.text), user.name, at], 7);
  return json_({ ok:true, at:at });
}

var STAGES = ['مسودة','مرفوعة','تحت المراجعة','تحتاج تعديل','معتمدة','جاري التنفيذ','مكتملة','مغلقة'];

/** نقل الخطة بين مراحل دورتها */
function stage_(ss, user, body) {
  var g = body.stage || {}, k = S(g.k);
  if (!k) return json_({ ok:false, error:'no_key' });
  var st = S(g.stage);
  if (STAGES.indexOf(st) < 0) return json_({ ok:false, error:'bad_stage' });
  // المدرب لا يملك إلا تحريك خطته من «تحتاج تعديل» إلى «مرفوعة»
  if (!user.admin && !(st === 'مرفوعة' || st === 'مسودة'))
    return json_({ ok:false, error:'not_admin' });
  var sh = ss.getSheetByName(SH_STAGE);
  if (!sh) return json_({ ok:false, error:'no_sheet' });
  var at = stamp_();
  upsert_(sh, 1, k, [k, S(g.planId), S(g.week), st, S(g.note), user.name, at], 7);
  return json_({ ok:true, at:at, stage:st });
}

/** الزمن الفعلي لأجزاء الحصة كما قِيس في متابعة الحصة */
function segments_(ss, user, body) {
  if (!user.admin) return json_({ ok:false, error:'not_admin' });
  var sh = ss.getSheetByName(SH_SEG);
  if (!sh) return json_({ ok:false, error:'no_sheet' });
  var at = stamp_(), list = body.segs || [];
  list.forEach(function(g){
    var k = S(g.k); if (!k) return;
    upsert_(sh, 1, k, [k, S(g.planId), S(g.week), S(g.dayIndex), S(g.day), S(g.section),
                       Number(g.planned)||0, Number(g.actual)||0, user.name, at], 10);
  });
  return json_({ ok:true, at:at, saved:list.length });
}

/** كل تعديل جرى أثناء الحصة — مادة «بصمة الانحراف» */
function deviations_(ss, user, body) {
  if (!user.admin) return json_({ ok:false, error:'not_admin' });
  var sh = ss.getSheetByName(SH_DEV);
  if (!sh) return json_({ ok:false, error:'no_sheet' });
  var at = stamp_(), list = body.devs || [];
  list.forEach(function(g){
    var k = S(g.k); if (!k) return;
    upsert_(sh, 1, k, [k, S(g.planId), S(g.week), S(g.dayIndex), S(g.section), S(g.item),
                       S(g.kind), S(g.actual), user.name, at], 10);
  });
  return json_({ ok:true, at:at, saved:list.length });
}

/** بصمة الحصة: الشدة الفعلية وتحقق الهدف وزمن الحصة — تُقاس في متابعة الحصة */
function session_(ss, user, body) {
  if (!user.admin) return json_({ ok:false, error:'not_admin' });
  var g = body.session || {}, k = S(g.k);
  if (!k) return json_({ ok:false, error:'no_key' });
  var sh = ss.getSheetByName(SH_SESS);
  if (!sh) return json_({ ok:false, error:'no_sheet' });
  var at = stamp_();
  upsert_(sh, 1, k, [k, S(g.planId), S(g.week), S(g.dayIndex), S(g.day),
                     Number(g.planned)||0, Number(g.intensity)||0, S(g.goal),
                     Number(g.exec)||0, Number(g.tPlan)||0, Number(g.tAct)||0,
                     user.name, at, S(g.goalKind)], 14);
  return json_({ ok:true, at:at });
}
/** مستهدفات القسم — رقم لكل مؤشّر، تُكتب في ورقة الإعدادات */
var TG_KEYS = ['مستهدف الالتزام بالخطة','مستهدف تنفيذ الحصص','مستهدف الشدة',
               'مستهدف الحجم','مستهدف تحقق الأهداف'];
function targets_(ss, user, body) {
  if (!user.admin) return json_({ ok:false, error:'not_admin' });
  var t = body.targets || {}, sh = ss.getSheetByName(SH_CFG);
  if (!sh) return json_({ ok:false, error:'no_sheet' });
  var map = { plan:TG_KEYS[0], exec:TG_KEYS[1], intensity:TG_KEYS[2],
              volume:TG_KEYS[3], goals:TG_KEYS[4] };
  Object.keys(map).forEach(function(k){
    if (t[k] === undefined || t[k] === null || t[k] === '') return;
    upsert_(sh, 1, map[k], [map[k], String(Number(t[k]) || 0)], 2);
  });
  return json_({ ok:true, at:stamp_() });
}

/** ملاحظة فنية على خطة أو حصة — تُعلَّم كمعالَجة عند الانتهاء منها */
function note_(ss, user, body) {
  if (!user.admin) return json_({ ok:false, error:'not_admin' });
  var g = body.note || {}, k = S(g.k);
  if (!k) return json_({ ok:false, error:'no_key' });
  var sh = ss.getSheetByName(SH_NOTE);
  if (!sh) return json_({ ok:false, error:'no_sheet' });
  var at = stamp_();
  if (!S(g.text)) {                       // نص فارغ = حذف الملاحظة
    var last = sh.getLastRow();
    if (last > 1) {
      var ks = sh.getRange(2,1,last-1,1).getValues();
      for (var i=ks.length-1;i>=0;i--) if (S(ks[i][0]) === k) sh.deleteRow(i+2);
    }
    return json_({ ok:true, at:at, deleted:true });
  }
  upsert_(sh, 1, k, [k, S(g.planId), S(g.week), S(g.dayIndex), S(g.day),
                     S(g.text), S(g.state) || 'مفتوحة', user.name, at], 9);
  return json_({ ok:true, at:at });
}

/** إغلاق أسبوع أو إعادة فتحه — الإغلاق يمنع أي رصد جديد فيه */
function closeWeek_(ss, user, body) {
  if (!user.admin) return json_({ ok:false, error:'not_admin' });
  var g = body.week || {}, w = S(g.week);
  if (!w) return json_({ ok:false, error:'no_week' });
  var sh = ss.getSheetByName(SH_WEEK);
  if (!sh) return json_({ ok:false, error:'no_sheet' });
  var st = S(g.state) === 'مفتوح' ? 'مفتوح' : 'مغلق';
  var at = stamp_();
  upsert_(sh, 1, w, [w, st, S(g.note), user.name, at], 5);
  return json_({ ok:true, at:at, state:st });
}

/** هل هذا الأسبوع مغلق؟ */
function weekClosed_(ss, w) {
  var out = false;
  rows_(ss, SH_WEEK, 5).forEach(function(r){
    if (S(r[0]) === S(w) && S(r[1]) === 'مغلق') out = true; });
  return out;
}

/** سجل التدقيق — مُجمَّع من التبويبات نفسها، فلا يتناقض معها أبداً */
/** خريطة كود الخطة ← اسم مقروء: اللعبة — الفئة */
function planLabel_(ss) {
  var m = {};
  /* الخطط التي رفعها المدربون قد لا يكون لها صف في تبويب «الخطط» —
     نأخذ اسمها من بنودها حتى لا يظهر كود خام في سجلّ الحركة */
  rows_(ss, SH_ITEMS, 17).forEach(function(r){
    var id = S(r[0]); if (!id || m[id]) return;
    var sp = S(r[2]), nm = S(r[3]), ct = S(r[4]);
    m[id] = ct ? ((sp || nm || id) + ' — ' + ct) : (nm || sp || id);
  });
  rows_(ss, SH_PLANS, 10).forEach(function(r){
    var id = S(r[0]); if (!id) return;
    var sp = S(r[1]), ct = S(r[7]), nm = S(r[2]);
    m[id] = ct ? ((sp || nm || id) + ' — ' + ct) : (nm || sp || id);
  });
  return m;
}

/** «١٢ بنداً» بصيغة عربية سليمة */
function nItem_(n) {
  if (n === 1)  return 'بنداً واحداً';
  if (n === 2)  return 'بندين';
  if (n <= 10)  return n + ' بنود';
  return n + ' بنداً';
}
function audit_(ss) {
  var out = [], PL = planLabel_(ss);
  var nm = function(id){ return PL[S(id)] || S(id); };
  rows_(ss, SH_SUBS, 11).forEach(function(r){
    if (!S(r[1])) return;
    out.push({ at:S(r[0]), by:S(r[2]), kind:'رفع',
      txt:'رفع خطة ' + S(r[3]) + (S(r[5])?' — '+S(r[5]):'') + ' · ' + S(r[6]) });
  });
  rows_(ss, SH_VER, 11).forEach(function(r){
    if (!S(r[0])) return;
    out.push({ at:S(r[4]), by:S(r[5]), kind:'نسخة', pid:S(r[1]),
      txt:'رفع النسخة ' + S(r[3]) + ' من خطة ' + nm(r[1]) + ' · ' + S(r[2]) });
  });
  rows_(ss, SH_STAGE, 7).forEach(function(r){
    if (!S(r[0])) return;
    out.push({ at:S(r[6]), by:S(r[5]), pid:S(r[1]),
      kind:(S(r[3])==='معتمدة'?'اعتماد':S(r[3])==='تحتاج تعديل'?'إرجاع':'مرحلة'),
      txt:'نقل خطة ' + nm(r[1]) + ' إلى «' + S(r[3]) + '»' + (S(r[4])?' — '+S(r[4]):'') });
  });
  rows_(ss, SH_CANC, 9).forEach(function(r){
    if (!S(r[6])) return;
    out.push({ at:S(r[8]), by:S(r[7]), kind:'إلغاء', pid:S(r[1]),
      txt:'ألغى حصة ' + S(r[2]) + ' — ' + S(r[4]) + ' · ' + S(r[6]) });
  });
  rows_(ss, SH_NOTE, 9).forEach(function(r){
    if (!S(r[5])) return;
    out.push({ at:S(r[8]), by:S(r[7]), kind:'ملاحظة', pid:S(r[1]),
      txt:'ملاحظة فنية على ' + nm(r[1]) + (S(r[4])?' · '+S(r[4]):'') + ': ' + S(r[5]) });
  });
  rows_(ss, SH_REPLY, 7).forEach(function(r){
    if (!S(r[4])) return;
    out.push({ at:S(r[6]), by:S(r[5]), kind:'ردّ', pid:S(r[1]),
      txt:'ردّ المدرب على ' + nm(r[1]) + (S(r[3])?' · '+S(r[3]):'') + ': ' + S(r[4]) });
  });
  rows_(ss, SH_WEEK, 5).forEach(function(r){
    if (!S(r[0])) return;
    out.push({ at:S(r[4]), by:S(r[3]), kind:'إغلاق',
      txt:(S(r[1])==='مغلق'?'أغلق ':'أعاد فتح ') + S(r[0]) + (S(r[2])?' — '+S(r[2]):'') });
  });
  /* الرصد أكثر ما يجري في الموقع — يُجمَّع في سطر لكل (خطة · يوم · مُقيِّم · ساعة)
     حتى لا يبتلع مئاتُ البنود بقيةَ السجل */
  var agg = {}, order = [];
  rows_(ss, SH_TICKS, 12).forEach(function(r){
    if (!S(r[0]) || !S(r[8])) return;
    var at = S(r[11]), by = S(r[10]), pid = S(r[2]), day = S(r[5]);
    var g = pid + '|' + day + '|' + by + '|' + at.slice(0, 13);
    var a = agg[g];
    if (!a) { a = agg[g] = { at:at, by:by, pid:pid, day:day, n:0 }; order.push(g); }
    a.n++;
    if (at > a.at) a.at = at;
  });
  order.forEach(function(g){
    var a = agg[g];
    out.push({ at:a.at, by:a.by, kind:'رصد', pid:a.pid,
      txt:'رصد ' + nItem_(a.n) + ' في ' + nm(a.pid) + (a.day ? ' · ' + a.day : '') });
  });
  out.sort(function(a,b){ return a.at < b.at ? 1 : a.at > b.at ? -1 : 0; });
  return out.slice(0, 400);
}

/** تعليم مهمة أو تنبيه بأنه عولج */
function ack_(ss, user, body) {
  var a = body.ack || {}, k = S(a.k);
  if (!k) return json_({ ok:false, error:'no_key' });
  var sh = ss.getSheetByName(SH_ACT);
  if (!sh) return json_({ ok:false, error:'no_sheet' });
  var at = stamp_();
  upsert_(sh, 1, k, [k, S(a.state) || 'عولج', user.name, at], 4);
  return json_({ ok:true, at:at });
}

/** شاهد الحصة — صورة أو مقطع يُحفظ في درايف */
function media_(ss, user, body) {
  var f = body.file || {}, m = body.media || {};
  if (!f.data) return json_({ ok:false, error:'no_file' });
  var it = DriveApp.getFoldersByName(MEDIA);
  var folder = it.hasNext() ? it.next() : DriveApp.createFolder(MEDIA);
  var ext = (S(f.name).match(/\.[A-Za-z0-9]+$/) || [''])[0];
  var nm  = S(m.sport) + ' — ' + S(m.day) + ' — ' + S(m.week) + ' — ' + user.name;
  var file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(f.data),
               f.type || 'application/octet-stream', nm + ext));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  var sh = ss.getSheetByName(SH_SUBS), at = stamp_();
  sh.getRange(sh.getLastRow()+1,1,1,11).setValues([[at, user.code, user.name, S(m.sport),
    S(m.branch)||user.branch, S(m.category), S(m.week), 0, file.getName(), file.getUrl(),
    'شاهد حصة — ' + S(m.day)]]);
  return json_({ ok:true, at:at, url:file.getUrl(), name:file.getName() });
}

/** تسجيل إلغاء يوم من الخطة — أو التراجع عنه لو السبب فاضي */
function cancelDay_(ss, user, body) {
  if (!user.admin) return json_({ ok:false, error:'not_admin' });
  var c = body.cancel || {};
  var k = S(c.k);
  if (!k) return json_({ ok:false, error:'no_key' });
  var sh = ss.getSheetByName(SH_CANC);
  if (!sh) return json_({ ok:false, error:'no_sheet' });
  var last = sh.getLastRow(), found = 0;
  if (last > 1) {
    var ks = sh.getRange(2,1,last-1,1).getValues();
    for (var i=0;i<ks.length;i++) if (S(ks[i][0]) === k) { found = i+2; break; }
  }
  var at = stamp_();
  var row = [k, S(c.planId), S(c.sport), S(c.plan), S(c.day), S(c.date),
             S(c.reason), user.name, at];
  if (found) sh.getRange(found,1,1,9).setValues([row]);
  else sh.getRange(sh.getLastRow()+1,1,1,9).setValues([row]);
  return json_({ ok:true, at:at });
}

function upload_(ss, user, body) {
  var f = body.file || {};
  if (!f.data) return json_({ ok:false, error:'no_file' });
  var folder = folder_();
  var week = S(body.week) || cfg_(ss).week;
  var safe = (S(body.coach)||user.name) + ' — ' + (S(body.sport)||user.sport) + ' — أسبوع ' + week;
  var ext  = (S(f.name).match(/\.[A-Za-z0-9]+$/) || [''])[0];
  var blob = Utilities.newBlob(Utilities.base64Decode(f.data),
              f.type || 'application/octet-stream', safe + ext);
  var file = folder.createFile(blob);

  var sh = ss.getSheetByName(SH_SUBS), last = sh.getLastRow(), at = stamp_();
  var row = [at, user.code, S(body.coach)||user.name, S(body.sport)||user.sport,
             S(body.branch)||user.branch, S(body.category), week, Number(body.players)||0,
             file.getName(), file.getUrl(), S(body.note)];
  var found = 0;
  if (last > 1) {
    var rs = sh.getRange(2,2,last-1,6).getValues();     // كود المدرب … الأسبوع
    for (var i=0;i<rs.length;i++)
      if (S(rs[i][0])===user.code && S(rs[i][5])===week) { found = i+2; break; }
  }
  if (found) sh.getRange(found,1,1,11).setValues([row]);
  else sh.getRange(sh.getLastRow()+1,1,1,11).setValues([row]);

  notify_(ss, row);

  var ing = { ok:false, reason:'not_template' };
  try { ing = ingestPlan_(ss, user, file.getId(), week, S(body.branch)||user.branch); }
  catch (x) { ing = { ok:false, reason:'error', error:String(x) }; }

  // نسخة جديدة في سجل النسخ + نقل الخطة إلى مرحلة «مرفوعة»
  var ver = 0;
  try {
    if (ing && ing.ok) ver = recordVersion_(ss, user, ing, file, week);
  } catch (x) {}

  return json_({ ok:true, at:at, url:file.getUrl(), ingest:ing, version:ver });
}

/* ==================== قراءة ملف الخطة آلياً ==================== */

/** ينسخ ملف الإكسل إلى جدول جوجل ليمكن قراءته — بلا خدمات متقدّمة */
function toSheet_(fileId) {
  var url = 'https://www.googleapis.com/drive/v3/files/' + fileId +
            '/copy?supportsAllDrives=true&fields=id';
  var res = UrlFetchApp.fetch(url, {
    method:'post', contentType:'application/json',
    headers:{ Authorization:'Bearer ' + ScriptApp.getOAuthToken() },
    payload: JSON.stringify({ mimeType:'application/vnd.google-apps.spreadsheet',
                              name:'__fmac_tmp_' + fileId }),
    muteHttpExceptions:true });
  if (res.getResponseCode() >= 300) return null;
  var j = JSON.parse(res.getContentText());
  return j && j.id ? j.id : null;
}

var HDR_ITEMS = ['اليوم','التاريخ','هدف اليوم','الشدة %','الحجم','القسم','زمن القسم','التمرين'];

/**
 * يقرأ ملفاً مبنيّاً على «نموذج الخطة الأسبوعية» ويكتب بنوده في تبويب «بنود الخطط».
 * أي ملف بصيغة أخرى يُترك كما هو ويُعاد not_template دون أن يفشل الرفع.
 */
function ingestPlan_(ss, user, fileId, weekFallback, branchFallback) {
  var tmpId = toSheet_(fileId);
  if (!tmpId) return { ok:false, reason:'convert_failed' };
  try {
    var src = SpreadsheetApp.openById(tmpId);
    var sh  = src.getSheetByName('الخطة') || src.getSheets()[0];
    if (!sh) return { ok:false, reason:'not_template' };
    var lastR = sh.getLastRow(), lastC = Math.max(sh.getLastColumn(), 8);
    if (lastR < 3) return { ok:false, reason:'not_template' };
    var g = sh.getRange(1,1,lastR,lastC).getDisplayValues();

    // بيانات الخطة: الوسم في العمود الأول والقيمة في الثاني
    var meta = {};
    for (var i=0;i<Math.min(g.length,20);i++) meta[S(g[i][0])] = S(g[i][1]);

    // صف العناوين
    var hr = -1;
    for (var i=0;i<Math.min(g.length,30);i++)
      if (S(g[i][0]) === 'اليوم' && S(g[i][7]) === 'التمرين') { hr = i; break; }
    if (hr < 0) return { ok:false, reason:'not_template' };

    var sport = meta['اللعبة'] || user.sport;
    var cat   = meta['الفئة'] || '';
    var branch= meta['الفرع'] || branchFallback || user.branch;
    var code  = meta['كود المدرب'] || user.code;
    var week  = meta['الأسبوع التدريبي'] || weekFallback || weekNow_(ss).label;
    var players = Number(meta['عدد اللاعبين']) || 0;
    var slot = (String(meta['توقيت الحصة']||'').match(/[123]/) || [''])[0];
    if (!sport) return { ok:false, reason:'no_sport' };

    var id = slug_(code + '_' + sport + '_' + (cat || 'عام'));
    var nm = sport + (cat ? ' — ' + cat : '');

    var day='', date='', goal='', inten='', vol='', sec='', secDur='';
    var dayIdx = 0, seenDay = {}, ord = 0, out = [];
    for (var r=hr+1;r<g.length;r++) {
      var row = g[r];
      var item = S(row[7]);
      if (!item) continue;
      if (S(row[0]).indexOf('▲') === 0) continue;
      if (S(row[0])) day = S(row[0]);
      if (S(row[1])) date = S(row[1]);
      if (S(row[2])) goal = S(row[2]);
      if (S(row[3])) inten = S(row[3]);
      if (S(row[4])) vol = S(row[4]);
      if (S(row[5])) { if (S(row[5]) !== sec) secDur = ''; sec = S(row[5]); }
      if (S(row[6])) secDur = S(row[6]);
      if (!day) continue;
      if (!seenDay[day]) { dayIdx++; seenDay[day] = dayIdx; }
      ord++;
      out.push([id, week, sport, nm, cat, branch, code, seenDay[day], day, date,
                goal, inten, vol, sec || 'التمارين', secDur, ord, item]);
    }
    if (!out.length) return { ok:false, reason:'no_items' };

    // استبدال بنود نفس الخطة لنفس الأسبوع بدل تكرارها
    var dst = ss.getSheetByName(SH_ITEMS);
    if (!dst) return { ok:false, reason:'no_sheet' };
    var dl = dst.getLastRow();
    if (dl > 1) {
      var keys = dst.getRange(2,1,dl-1,2).getValues();
      for (var i=keys.length-1;i>=0;i--)
        if (S(keys[i][0]) === id && S(keys[i][1]) === week) dst.deleteRow(i+2);
    }
    dst.getRange(dst.getLastRow()+1,1,out.length,17).setValues(out);

    // تسجيل الخطة في تبويب «الخطط» ليظهر لها الفرع والمدرب وعدد البنود
    var ps = ss.getSheetByName(SH_PLANS);
    var prev = planMap_(ss)[id] || {};
    upsert_(ps, 1, id, [id, sport, nm, week, branch, code, players, cat, out.length,
                        Number(slot) || prev.slot || ''], 10);

    return { ok:true, id:id, week:week, items:out.length, days:dayIdx, sport:sport,
             category:cat, slot:Number(slot)||0 };
  } finally {
    try { DriveApp.getFileById(tmpId).setTrashed(true); } catch (x) {}
  }
}

/** يسجّل نسخة جديدة من الخطة ببنيتها، لتُقارن لاحقاً بما قبلها */
function recordVersion_(ss, user, ing, file, week) {
  var sh = ss.getSheetByName(SH_VER);
  if (!sh) return 0;
  var id = ing.id;
  var n = 0;
  rows_(ss, SH_VER, 11).forEach(function(r){
    if (S(r[1]) === id && S(r[2]) === week) n = Math.max(n, Number(r[3]) || 0);
  });
  n = n + 1;

  // بنية الخطة: زمن كل قسم وعدد بنوده — أساس مقارنة النسخ
  var shape = {};
  rows_(ss, SH_ITEMS, 17).forEach(function(r){
    if (S(r[0]) !== id || S(r[1]) !== week) return;
    var key = S(r[7]) + '|' + (S(r[13]) || 'التمارين');
    if (!shape[key]) shape[key] = { d:Number(r[7])||0, day:S(r[8]),
                                    sec:S(r[13]) || 'التمارين', dur:S(r[14]), n:0 };
    shape[key].n++;
  });
  var arr = Object.keys(shape).map(function(k){ return shape[k]; });

  var at = stamp_();
  sh.getRange(sh.getLastRow()+1,1,1,11).setValues([[
    id + '|' + week + '|' + n, id, week, n, at, user.name,
    file.getName(), file.getUrl(), ing.days || 0, ing.items || 0,
    JSON.stringify(arr) ]]);

  var st = ss.getSheetByName(SH_STAGE);
  if (st) upsert_(st, 1, id + '|' + week,
    [id + '|' + week, id, week, 'مرفوعة', '', user.name, at], 7);
  return n;
}

/** معرّف ثابت وآمن للخطة مبنيّ على المدرب واللعبة والفئة */
function slug_(t) {
  var s = S(t).replace(/[|\\/\s]+/g,'_').replace(/[^\wأ-ي_\-]/g,'');
  var h = 0;
  for (var i=0;i<s.length;i++) { h = ((h<<5) - h + s.charCodeAt(i)) | 0; }
  return 'up_' + Math.abs(h).toString(36);
}

function folder_() {
  var it = DriveApp.getFoldersByName(FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER);
}
function notify_(ss, row) {
  try {
    var to = '';
    rows_(ss, SH_CFG, 2).forEach(function(r){ if (S(r[0])==='إيميل الإشعارات') to = S(r[1]); });
    if (!to) return;
    MailApp.sendEmail({ to:to,
      subject:'خطة جديدة مرفوعة — ' + row[2] + ' (' + row[3] + ')',
      htmlBody:'<div dir="rtl" style="font-family:Tahoma,Arial">'
        + '<h3 style="color:#d6222a;margin:0 0 8px">خطة أسبوعية جديدة</h3>'
        + '<p><b>المدرب:</b> ' + row[2] + '<br><b>اللعبة:</b> ' + row[3]
        + '<br><b>الفرع:</b> ' + row[4] + '<br><b>الفئة:</b> ' + (row[5] || '—')
        + '<br><b>الأسبوع:</b> ' + row[6] + '<br><b>عدد اللاعبين:</b> ' + row[7]
        + '<br><b>الوقت:</b> ' + row[0] + '</p>'
        + (row[10] ? '<p><b>ملاحظات:</b> ' + row[10] + '</p>' : '')
        + '<p><a href="' + row[9] + '">فتح الملف</a></p></div>' });
  } catch (x) {}
}
/* ==================== التذكير التلقائي ==================== */
/** يُنشئ المؤقّتات: تذكير الخميس 6 مساءً وملخّص السبت 8 صباحاً */
function installTriggers() {
  var keep = { remindCoaches:1, weeklyDigest:1, weekPage:1 };
  ScriptApp.getProjectTriggers().forEach(function(t){
    if (keep[t.getHandlerFunction()]) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('remindCoaches').timeBased()
    .onWeekDay(ScriptApp.WeekDay.THURSDAY).atHour(18).inTimezone(TZ).create();
  ScriptApp.newTrigger('weeklyDigest').timeBased()
    .onWeekDay(ScriptApp.WeekDay.SATURDAY).atHour(8).inTimezone(TZ).create();
  ScriptApp.newTrigger('weekPage').timeBased()
    .onWeekDay(ScriptApp.WeekDay.FRIDAY).atHour(21).inTimezone(TZ).create();
  return 'تم ضبط التذكير: الخميس 6 مساءً · صفحة الأسبوع: الجمعة 9 مساءً · الملخّص: السبت 8 صباحاً';
}
function adminEmail_(ss) {
  var to = '';
  rows_(ss, SH_CFG, 2).forEach(function(r){ if (S(r[0]) === 'إيميل الإشعارات') to = S(r[1]); });
  return to;
}
function lateCoaches_(ss, week) {
  var sent = {};
  rows_(ss, SH_SUBS, 11).forEach(function(r){
    if (S(r[6]) === week) sent[S(r[1])] = true;
  });
  return userList_(ss).filter(function(c){ return !sent[c.code]; });
}
function wrap_(title, inner) {
  return '<div dir="rtl" style="font-family:Tahoma,Arial;color:#16212a;max-width:640px">'
    + '<div style="background:#0a1317;color:#fff;padding:16px 20px;border-radius:12px 12px 0 0">'
    + '<b style="font-size:16px">' + title + '</b>'
    + '<div style="font-size:11px;opacity:.7;margin-top:3px">نادي الفجيرة للفنون القتالية — قسم الإعداد الفني</div></div>'
    + '<div style="border:1px solid #e3e8eb;border-top:0;border-radius:0 0 12px 12px;padding:18px 20px">'
    + inner + '</div></div>';
}
/** تذكير بمن لم يسلّم خطته — يصل إلى إيميل الإشعارات بروابط واتساب جاهزة */
function remindCoaches() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var to = adminEmail_(ss); if (!to) return;
  var w = weekNow_(ss), late = lateCoaches_(ss, w.label);
  if (!late.length) {
    MailApp.sendEmail({ to:to, subject:'تسليم الخطط — ' + w.label + ': اكتمل ✅',
      htmlBody: wrap_('اكتمل تسليم خطط ' + w.label,
        '<p>سلَّم جميع المدربين خططهم لهذا الأسبوع. لا حاجة إلى تذكير.</p>') });
    return;
  }
  var msg = 'السلام عليكم ورحمة الله وبركاته\n\nتذكير من قسم الإعداد الفني بنادي الفجيرة '
          + 'للفنون القتالية برفع الخطة التدريبية الأسبوعية.\n📌 ' + w.label + '\n🗓 ' + w.dates
          + '\n\nنشكر لكم التزامكم.';
  var rowsHtml = late.map(function(c){
    var wa = c.phone ? 'https://wa.me/' + String(c.phone).replace(/[^0-9]/g,'')
                     + '?text=' + encodeURIComponent(msg) : '';
    return '<tr><td style="padding:8px 10px;border-bottom:1px solid #eef1f3">' + c.name + '</td>'
      + '<td style="padding:8px 10px;border-bottom:1px solid #eef1f3;color:#6b7880">'
      + (c.sport||'—') + (c.branch ? ' · ' + c.branch : '') + '</td>'
      + '<td style="padding:8px 10px;border-bottom:1px solid #eef1f3">'
      + (wa ? '<a href="' + wa + '" style="color:#d6222a">تذكير واتساب</a>'
            : '<span style="color:#9aa6ae">لا يوجد رقم</span>') + '</td></tr>';
  }).join('');
  MailApp.sendEmail({ to:to,
    subject:'تذكير: ' + late.length + ' مدرباً لم يسلّم خطة ' + w.label,
    htmlBody: wrap_('لم تصل خطط ' + w.label,
      '<p>لم يسلّم <b>' + late.length + '</b> من أصل <b>' + userList_(ss).length
      + '</b> مدرباً خطة هذا الأسبوع حتى مساء الخميس.</p>'
      + '<table style="width:100%;border-collapse:collapse;font-size:13px">' + rowsHtml + '</table>'
      + '<p style="font-size:12px;color:#6b7880">اضغط «تذكير واتساب» بجانب الاسم لإرسال الرسالة من رقمك.</p>') });
}
/** ملخّص الأسبوع المنتهي — يصل صباح السبت */
function weeklyDigest() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var to = adminEmail_(ss); if (!to) return;
  var w = weekNow_(ss), h = history_(ss), cur = null;
  h.forEach(function(x){ if (x.week === w.label) cur = x; });
  var late = lateCoaches_(ss, w.label);
  var canc = rows_(ss, SH_CANC, 9).filter(function(r){ return S(r[6]); }).length;
  var sp = cur ? Object.keys(cur.sports).sort(function(a,b){ return cur.sports[b]-cur.sports[a]; }) : [];
  var bar = function(v){
    var c = v >= 75 ? '#22a06b' : (v >= 50 ? '#e0a800' : '#d6222a');
    return '<div style="background:#eef1f3;border-radius:8px;height:8px;width:150px;display:inline-block;'
      + 'vertical-align:middle"><div style="background:' + c + ';height:8px;border-radius:8px;width:'
      + Math.max(2,v) + '%"></div></div> <b style="color:' + c + '">' + v + '%</b>';
  };
  var rowsHtml = sp.map(function(k){
    return '<tr><td style="padding:7px 10px;border-bottom:1px solid #eef1f3">' + k + '</td>'
         + '<td style="padding:7px 10px;border-bottom:1px solid #eef1f3">' + bar(cur.sports[k]) + '</td></tr>';
  }).join('');
  MailApp.sendEmail({ to:to, subject:'ملخّص ' + w.label + ' — تنفيذ ' + (cur?cur.score:0) + '%',
    htmlBody: wrap_('ملخّص ' + w.label,
      '<p style="font-size:15px">نسبة التنفيذ الكلية: <b style="font-size:22px;color:#d6222a">'
      + (cur?cur.score:0) + '%</b> من ' + (cur?cur.items:0) + ' بنداً.</p>'
      + '<p>سلَّم <b>' + (userList_(ss).length - late.length) + '</b> من <b>' + userList_(ss).length
      + '</b> مدرباً · حصص ملغاة: <b>' + canc + '</b></p>'
      + (rowsHtml ? '<h4 style="margin:16px 0 6px">التنفيذ حسب اللعبة</h4>'
          + '<table style="width:100%;border-collapse:collapse;font-size:13px">' + rowsHtml + '</table>' : '')
      + (late.length ? '<p style="color:#d6222a"><b>لم يسلّم:</b> '
          + late.map(function(c){return c.name;}).join(' · ') + '</p>' : '')) });
}

function stamp_(){ return Utilities.formatDate(new Date(),TZ,'yyyy-MM-dd HH:mm'); }
function json_(o){
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}
