/* خرائط أعمدة جدول جوجل ← وثائق Firestore.
   الفهارس مأخوذة من قراءات rows_() في السكربت القديم. */
import { COL } from './fmac-config.js';

const S = (v) => (v === null || v === undefined) ? '' : String(v).trim();
const N = (v) => Number(v) || 0;
const isAdminRole = (role) => {
  const r = S(role);
  return r.indexOf('إدارة') === 0 || r.toLowerCase() === 'admin';
};

/* رابط صورة درايف ← صورة مصغّرة — مقابل photoUrl_ */
function photoUrl(v) {
  const u = S(v);
  if (!u) return '';
  const m = u.match(/\/file\/d\/([A-Za-z0-9_-]{10,})/)
         || u.match(/[?&]id=([A-Za-z0-9_-]{10,})/)
         || u.match(/^([A-Za-z0-9_-]{25,})$/);
  if (m) return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w240';
  return /^https?:\/\//.test(u) ? u : '';
}

/* كل تعريف: التبويب ← { col, id(row), doc(row) }
   id يرجع معرّف الوثيقة؛ لو رجع '' تُستعمل هوية تلقائية. */
export const PLAN = [
  { tab: 'المستخدمين', col: COL.users,
    id: (r) => S(r[0]),
    doc: (r) => ({ name: S(r[1]), role: S(r[2]) || 'مدرب', admin: isAdminRole(r[2]),
      sport: S(r[3]), branch: S(r[4]), phone: S(r[5]), note: S(r[6]),
      photo: photoUrl(r[7]), code: S(r[0]), active: true, email: '' }) },

  { tab: 'الخطط', col: COL.plans,
    id: (r) => S(r[0]),
    doc: (r) => ({ sport: S(r[1]), name: S(r[2]), branch: S(r[4]), coach: S(r[5]),
      players: N(r[6]), category: S(r[7]), items: N(r[8]), slot: N(r[9]) }) },

  { tab: 'بنود الخطط', col: COL.items,
    auto: true,
    doc: (r) => ({ planId: S(r[0]), week: S(r[1]), sport: S(r[2]), name: S(r[3]),
      category: S(r[4]), branch: S(r[5]), coach: S(r[6]), dayNo: N(r[7]) || 1,
      day: S(r[8]), date: S(r[9]), goal: S(r[10]), intensity: S(r[11]),
      volume: S(r[12]), section: S(r[13]), dur: S(r[14]), item: S(r[16]) }),
    skip: (r) => !S(r[0]) || !S(r[16]) },

  /* الحالة والملاحظة يُحدَّد موضعهما من العناوين — تخطيط الجدول تغيّر بين الإصدارات */
  { tab: 'سجل التقييم', col: COL.ticks,
    id: (r) => S(r[0]),
    doc: (r, H) => {
      let iS = H.indexOf('الحالة'), iN = H.indexOf('ملاحظة');
      if (iS < 0) { iS = 8; iN = 9; }
      return { week: S(r[1]), planId: S(r[2]), sport: S(r[3]), day: S(r[5]),
        s: S(r[iS]), n: iN >= 0 ? S(r[iN]) : '', by: S(r[10]), at: S(r[11]) };
    } },

  { tab: 'سجل التسليم', col: COL.subs,
    auto: true,
    doc: (r) => ({ at: S(r[0]), code: S(r[1]), name: S(r[2]), sport: S(r[3]),
      branch: S(r[4]), category: S(r[5]), week: S(r[6]), players: N(r[7]),
      file: S(r[8]), url: S(r[9]), note: S(r[10]) }),
    skip: (r) => !S(r[1]) },

  { tab: 'سجل الإلغاء', col: COL.cancels,
    id: (r) => S(r[0]),
    doc: (r) => ({ planId: S(r[1]), sport: S(r[2]), dayName: S(r[4]),
      reason: S(r[6]), by: S(r[7]), at: S(r[8]) }) },

  { tab: 'سجل الحضور', col: COL.attend,
    id: (r) => S(r[1]),
    doc: (r) => ({ planned: N(r[6]), actual: N(r[7]), by: S(r[8]), at: S(r[0]) }) },

  { tab: 'ردود المدربين', col: COL.replies,
    id: (r) => S(r[0]),
    doc: (r) => ({ planId: S(r[1]), day: S(r[3]), text: S(r[4]),
      by: S(r[5]), at: S(r[6]) }) },

  { tab: 'دورة الخطة', col: COL.stages,
    id: (r) => S(r[0]),
    doc: (r) => ({ planId: S(r[1]), week: S(r[2]), stage: S(r[3]), note: S(r[4]),
      by: S(r[5]), at: S(r[6]) }) },

  { tab: 'نسخ الخطط', col: COL.versions,
    id: (r) => S(r[0]),
    doc: (r) => ({ planId: S(r[1]), week: S(r[2]), n: N(r[3]) || 1, at: S(r[4]),
      by: S(r[5]), file: S(r[6]), url: S(r[7]), days: N(r[8]),
      items: N(r[9]), shape: S(r[10]) }) },

  { tab: 'زمن الأجزاء', col: COL.segs,
    id: (r) => S(r[0]),
    doc: (r) => ({ planned: N(r[6]), actual: N(r[7]), by: S(r[8]), at: S(r[9]) }) },

  { tab: 'سجل الانحراف', col: COL.devs,
    id: (r) => S(r[0]),
    doc: (r) => ({ planId: S(r[1]), week: S(r[2]), day: N(r[3]), section: S(r[4]),
      item: S(r[5]), kind: S(r[6]), actual: S(r[7]), by: S(r[8]), at: S(r[9]) }) },

  { tab: 'حالة المهام', col: COL.acts,
    id: (r) => S(r[0]),
    doc: (r) => ({ state: S(r[1]), by: S(r[2]), at: S(r[3]) }) },

  { tab: 'بصمة الحصص', col: COL.sess,
    id: (r) => S(r[0]),
    doc: (r) => ({ planned: N(r[5]), intensity: N(r[6]), goal: S(r[7]),
      exec: N(r[8]), tPlan: N(r[9]), tAct: N(r[10]), by: S(r[11]),
      at: S(r[12]), goalKind: S(r[13]) }) },

  { tab: 'الملاحظات الفنية', col: COL.notes,
    id: (r) => S(r[0]),
    doc: (r) => ({ planId: S(r[1]), week: S(r[2]), day: S(r[3]), dayName: S(r[4]),
      text: S(r[5]), state: S(r[6]), by: S(r[7]), at: S(r[8]) }) },

  { tab: 'إغلاق الأسابيع', col: COL.weeks,
    id: (r) => S(r[0]),
    doc: (r) => ({ state: S(r[1]), note: S(r[2]), by: S(r[3]), at: S(r[4]) }) },

  { tab: 'نتائج البطولات', col: COL.results,
    id: (r) => S(r[0]),
    doc: (r) => ({ sport: S(r[1]), season: S(r[2]), name: S(r[3]), gold: N(r[4]),
      silver: N(r[5]), bronze: N(r[6]), scope: S(r[9]) || 'محلي',
      date: S(r[10]), place: S(r[11]) }) },

  { tab: 'دروع المواسم', col: COL.shields,
    id: (r) => S(r[0]),
    doc: (r) => ({ sport: S(r[1]), season: S(r[2]), kind: S(r[3]), rank: N(r[4]) || 1,
      points: N(r[5]), rival: S(r[6]), rivalPoints: N(r[7]) }) },

  { tab: 'معسكرات المواسم', col: COL.camps,
    id: (r) => S(r[0]),
    doc: (r) => ({ sport: S(r[1]), season: S(r[2]), name: S(r[3]), date: S(r[4]),
      place: S(r[5]), kind: S(r[6]) || 'داخلي', scope: S(r[7]) || 'نادي',
      players: N(r[8]), by: S(r[9]), at: S(r[10]) }) },

  { tab: 'لاعبو المنتخب', col: COL.national,
    id: (r) => S(r[0]),
    doc: (r) => ({ sport: S(r[1]), season: S(r[2]), name: S(r[3]), cat: S(r[4]),
      note: S(r[5]), by: S(r[6]), at: S(r[7]) }) },

  { tab: 'أجندة القسم', col: COL.agenda,
    id: (r) => S(r[0]),
    doc: (r) => ({ date: S(r[1]), time: S(r[2]), kind: S(r[3]), title: S(r[4]),
      detail: S(r[5]), branch: S(r[6]), state: S(r[7]) || 'مفتوح',
      by: S(r[8]), at: S(r[9]) }) },

  { tab: 'الزيارات الفنية', col: COL.visits,
    id: (r) => S(r[0]),
    doc: (r) => ({ date: S(r[1]), sport: S(r[2]), branch: S(r[3]), coach: S(r[4]),
      plan: S(r[5]), org: S(r[7]), gear: S(r[8]), note: S(r[9]), action: S(r[10]),
      state: S(r[11]) || 'مفتوحة', by: S(r[12]), at: S(r[13]), time: S(r[14]),
      venue: S(r[15]), owner: S(r[16]), agn: S(r[17]) }) },

  { tab: 'كالندر الموسم', col: COL.calendar,
    id: (r) => S(r[0]),
    doc: (r) => ({ season: S(r[1]), date: S(r[2]), name: S(r[3]), sport: S(r[4]),
      scope: S(r[5]) || 'محلي', fed: S(r[6]), place: S(r[7]),
      status: S(r[8]) || 'قادمة', date0: S(r[9]), reason: S(r[10]),
      note: S(r[11]), by: S(r[12]), at: S(r[13]) }) },
];

/* الإعدادات صفوف مفتاح/قيمة ← وثيقة واحدة settings/config */
export function buildConfig(tab) {
  if (!tab || !tab.rows) return null;
  const o = {};
  for (const r of tab.rows) { if (S(r[0])) o[S(r[0])] = S(r[1]); }
  const n = (key) => { const v = Number(o[key]); return v > 0 ? v : null; };
  return {
    week: o['الأسبوع التدريبي'] || '',
    dates: o['تاريخ الأسبوع'] || '',
    club: o['اسم النادي'] || 'نادي الفجيرة للفنون القتالية',
    targets: {
      plan: n('مستهدف الالتزام بالخطة'), exec: n('مستهدف تنفيذ الحصص'),
      intensity: n('مستهدف الشدة'), volume: n('مستهدف الحجم'),
      goals: n('مستهدف تحقق الأهداف'),
    },
  };
}

/* يحوّل ملف التصدير إلى قائمة كتابات — بلا أي اتصال بالشبكة، فيمكن فحصه */
export function planWrites(exported) {
  const tabs = (exported && exported.tabs) || {};
  const jobs = [];
  for (const def of PLAN) {
    const t = tabs[def.tab];
    if (!t || !t.rows || !t.rows.length) { jobs.push({ ...def, docs: [], missing: !t }); continue; }
    const H = t.headers || [];
    const docs = [];
    const seen = {};
    let skipped = 0, dupes = 0;
    for (const r of t.rows) {
      if (def.skip && def.skip(r)) { skipped++; continue; }
      const id = def.auto ? '' : def.id(r);
      if (!def.auto && !id) { skipped++; continue; }   // صفّ بلا مفتاح
      if (!def.auto) {
        if (seen[id]) { dupes++; continue; }           // مفتاح مكرّر: الأول يفوز
        seen[id] = 1;
      }
      docs.push({ id, data: def.doc(r, H) });
    }
    jobs.push({ ...def, docs, skipped, dupes });
  }
  const cfg = buildConfig(tabs['الإعدادات']);
  if (cfg) {
    jobs.push({ tab: 'الإعدادات', col: 'settings', docs: [{ id: 'config', data: cfg }] });
  }
  return jobs;
}
