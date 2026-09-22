/* واجهة وحدة زيارات المدارس — تُحقن في #schoolsHost.
   الأصناف بسابقة sv- تفادياً لتصادم الأسماء.
   المنطق كلّه في fmac-schools.js؛ هنا العرض والتحرير فقط. */
import * as M from './fmac-schools.js';

const S = M.S;
const esc = (s) => S(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const num = (v) => (v === null || v === undefined) ? '—' : String(v);

const ST_COL = {
  'مخططة': 'var(--blue)', 'مؤكدة': 'var(--success)', 'تمت الزيارة': 'var(--turquoise)',
  'مؤجلة': 'var(--attention)', 'ملغاة': 'var(--critical)',
};
const col = (st) => ST_COL[S(st)] || 'var(--steel)';

const STYLE = `
.sv-wrap{display:flex;flex-direction:column;gap:16px}
.sv-card{background:var(--surface);border:1px solid var(--hairline);
  border-radius:var(--r-card);padding:18px}
.sv-head{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between}
.sv-t{font-size:15px;font-weight:700;margin:0}
.sv-sub{color:var(--steel);font-size:12.5px;margin:4px 0 0;line-height:1.8}
.sv-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.sv-btn{background:linear-gradient(135deg,var(--brand-dark),var(--cyan));color:#fff;border:0;
  border-radius:var(--r-control,12px);padding:10px 18px;font:700 13.5px inherit;cursor:pointer}
.sv-btn.ghost{background:var(--surface-soft);color:var(--ink);
  border:1px solid var(--hairline);font-weight:400;padding:8px 14px;font-size:12.5px}
.sv-btn:disabled{opacity:.5;cursor:default}
.sv-tabs{display:flex;gap:8px;flex-wrap:wrap}
.sv-tabs button{background:#0E1C2B;border:1px solid #23394E;color:#8296A9;
  border-radius:var(--r-full);padding:9px 16px;font:600 13px inherit;cursor:pointer}
.sv-tabs button[aria-current="true"]{background:color-mix(in srgb,var(--brand) 14%,transparent);
  border-color:var(--brand);color:#62B7FF}
.sv-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.sv-k{background:var(--surface-soft);border:1px solid var(--hairline);
  border-radius:var(--r-lg);padding:14px}
.sv-k b{display:block;font-size:26px;font-weight:800;color:var(--ink-deep);line-height:1.1;
  font-variant-numeric:tabular-nums}
.sv-k span{font-size:12px;color:var(--steel)}
.sv-k i{font-style:normal;font-size:11.5px;color:var(--stone);display:block;margin-top:3px}
.sv-tbl{width:100%;border-collapse:collapse;font-size:13px;margin-top:10px}
.sv-tbl th,.sv-tbl td{text-align:right;padding:9px 8px;border-bottom:1px solid var(--hairline-soft);
  vertical-align:top}
.sv-tbl th{color:var(--steel);font-size:11.5px;font-weight:600}
.sv-tbl td.n{text-align:center;font-variant-numeric:tabular-nums;white-space:nowrap}
.sv-tbl tr.clik{cursor:pointer}
.sv-tbl tr.clik:hover td{background:var(--surface-soft)}
.sv-tag{font-size:11px;padding:2px 10px;border-radius:99px;white-space:nowrap;
  color:var(--c);border:1px solid color-mix(in srgb,var(--c) 42%,transparent);
  background:color-mix(in srgb,var(--c) 13%,transparent)}
.sv-bar{height:6px;border-radius:99px;background:#172738;overflow:hidden;margin-top:6px}
.sv-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--brand-dark),var(--cyan))}
.sv-empty{color:var(--steel);font-size:13.5px;text-align:center;padding:26px}
.sv-cal{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;margin-top:12px}
.sv-cal .hd{font-size:11px;color:var(--stone);text-align:center;padding:4px 0}
.sv-cal .d{min-height:74px;border:1px solid var(--hairline);border-radius:10px;padding:6px;
  background:var(--surface-soft);display:flex;flex-direction:column;gap:4px}
.sv-cal .d.out{opacity:.35}
.sv-cal .d.today{border-color:var(--brand)}
.sv-cal .d > b{font-size:11.5px;color:var(--steel);font-variant-numeric:tabular-nums}
.sv-cal .ev{font-size:10.5px;line-height:1.35;padding:3px 6px;border-radius:7px;cursor:pointer;
  border-inline-start:3px solid var(--c);background:color-mix(in srgb,var(--c) 12%,transparent);
  color:var(--ink);text-align:start;border-top:0;border-inline-end:0;border-bottom:0;font-family:inherit}
.sv-dlg{position:fixed;inset:0;z-index:120;background:rgba(5,11,20,.72);
  display:flex;align-items:flex-start;justify-content:center;padding:28px 16px;overflow:auto}
.sv-box{width:min(96vw,760px);background:var(--surface);border:1px solid var(--hairline);
  border-radius:var(--r-xxl);padding:22px;box-shadow:var(--shadow-pop)}
.sv-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:0 14px}
.sv-l{display:block;font-size:12px;color:var(--charcoal);margin:12px 0 5px}
.sv-in{width:100%;background:#0A1725;color:var(--ink-deep);border:1px solid #263D53;
  border-radius:var(--r-control,12px);padding:10px 12px;font:14px inherit}
.sv-in:focus{outline:none;border-color:var(--brand);box-shadow:0 0 0 3px rgba(59,157,255,.13)}
.sv-chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:6px}
.sv-chips button{background:#0E1C2B;border:1px solid #23394E;color:#8296A9;
  border-radius:99px;padding:6px 13px;font:inherit;font-size:12px;cursor:pointer}
.sv-chips button[aria-pressed="true"],.sv-chips button[aria-current="true"]{
  background:color-mix(in srgb,var(--brand) 14%,transparent);border-color:var(--brand);color:#62B7FF}
.sv-sp{display:grid;grid-template-columns:1fr 90px 90px;gap:8px;align-items:center;
  margin-top:7px;font-size:13px}
.sv-msg{font-size:12.5px;min-height:18px;margin-top:10px}
.sv-log{display:flex;flex-direction:column;gap:6px;margin-top:6px;max-height:150px;overflow:auto;
  background:var(--surface-soft);border:1px solid var(--hairline);border-radius:var(--r-lg);
  padding:10px 12px}
.sv-log > div{display:flex;gap:9px;align-items:baseline;font-size:12.5px;color:var(--ink)}
.sv-log b{color:var(--steel);font-weight:600;flex:none;font-variant-numeric:tabular-nums}
.sv-log i{font-style:normal;color:var(--stone);font-size:11.5px;margin-inline-start:auto}
`;

/* ── الحالة الداخلية ───────────────────────────────────── */
let TAB = 'over';
let CAL = '';            /* شهر التقويم YYYY-MM */
let OPEN = null;         /* الزيارة قيد التحرير */
let SCHOOL = '';         /* ملفّ مدرسة مفتوح */

const iso = (d) => d.toISOString().slice(0, 10);
const AR_M = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو',
  'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const monLabel = (ym) => {
  const p = S(ym).split('-');
  return p.length === 2 ? (AR_M[+p[1] - 1] + ' ' + p[0]) : '—';
};
const dayLabel = (d) => {
  if (!S(d)) return 'بلا تاريخ';
  const p = d.split('-');
  return p.length === 3 ? (+p[2] + ' ' + AR_M[+p[1] - 1]) : d;
};

/* ── التبويبات ─────────────────────────────────────────── */
function overview(rows, season, sports) {
  const s = M.summary(rows, season);
  const conv = M.rate(s.students, s.picked);
  const k = (v, lab, note) => '<div class="sv-k"><b>' + esc(num(v)) + '</b>' +
    '<span>' + esc(lab) + '</span>' + (note ? '<i>' + esc(note) + '</i>' : '') + '</div>';
  const top = M.schools(rows, season).filter((x) => x.done).slice(0, 5);
  return '<div class="sv-card"><div class="sv-head"><div>' +
    '<h3 class="sv-t">نظرة عامة — موسم ' + esc(season) + '</h3>' +
    '<p class="sv-sub">الأرقام من الزيارات التي تمّت وحدها؛ ما لم يُسجَّل يظهر «—».</p>' +
    '</div></div>' +
    '<div class="sv-kpis" style="margin-top:14px">' +
    k(s.visits, 'زيارة في الموسم',
      s.visits ? (s.done + ' تمّت · ' + s.upcoming + ' قادمة · ' + s.moved + ' مؤجلة · ' +
        s.off + ' ملغاة') : 'لم تُسجَّل زيارة بعد') +
    k(s.covered, 'مدرسة تمّت تغطيتها',
      s.schools > s.covered ? (s.schools + ' في الخطة') : '') +
    k(s.students, 'طالباً شارك',
      s.done ? ('مسجَّل في ' + s.measured + ' من ' + s.done + ' زيارة') : '') +
    k(s.picked, 'طالباً اختير', '') +
    k(conv === null ? null : conv + '%', 'نسبة التحويل',
      conv === null ? 'تحتاج مشاركين ومختارين مسجَّلين' : 'من مشارك إلى مختار') +
    '</div></div>' +
    '<div class="sv-card"><h3 class="sv-t">أفضل المدارس مخرجاً</h3>' +
    (top.length
      ? '<table class="sv-tbl"><tr><th>المدرسة</th><th>المنطقة</th>' +
        '<th class="n">زيارات</th><th class="n">مشاركون</th><th class="n">مختارون</th>' +
        '<th class="n">التحويل</th></tr>' +
        top.map((x) => '<tr><td><b>' + esc(x.school) + '</b></td><td>' + esc(x.area || '—') +
          '</td><td class="n">' + x.done + '</td><td class="n">' + num(x.joined) +
          '</td><td class="n">' + num(x.picked) + '</td>' +
          '<td class="n">' + num(M.rate(x.joined, x.picked) === null ? null
            : M.rate(x.joined, x.picked) + '%') + '</td></tr>').join('') + '</table>'
      : '<div class="sv-empty">لا زيارات تمّت بعد.</div>') + '</div>';
}

function analytics(rows, season) {
  const sp = M.bySport(rows, season);
  const ar = M.byArea(rows, season);
  const maxS = Math.max(1, ...sp.map((x) => x.visits));
  const maxA = Math.max(1, ...ar.map((x) => x.visits));
  const tbl = (title, list, maxv, keyLab, keyOf) =>
    '<div class="sv-card"><h3 class="sv-t">' + esc(title) + '</h3>' +
    (list.length
      ? '<table class="sv-tbl"><tr><th>' + esc(keyLab) + '</th><th class="n">زيارات</th>' +
        '<th class="n">مشاركون</th><th class="n">مختارون</th><th class="n">التحويل</th></tr>' +
        list.map((x) => {
          const r = M.rate(x.joined, x.picked);
          return '<tr><td><b>' + esc(keyOf(x)) + '</b>' +
            '<div class="sv-bar"><i style="width:' + Math.round(x.visits / maxv * 100) +
            '%"></i></div></td>' +
            '<td class="n">' + x.visits + '</td><td class="n">' + num(x.joined) + '</td>' +
            '<td class="n">' + num(x.picked) + '</td>' +
            '<td class="n">' + (r === null ? '—' : r + '%') + '</td></tr>';
        }).join('') + '</table>'
      : '<div class="sv-empty">لا بيانات بعد.</div>') + '</div>';
  return tbl('حسب اللعبة', sp, maxS, 'اللعبة', (x) => x.sport) +
    tbl('حسب المنطقة', ar, maxA, 'المنطقة / الفرع', (x) => x.area);
}

function schoolsTab(rows, season) {
  const list = M.schools(rows, season);
  if (SCHOOL) {
    const one = list.find((x) => x.school === SCHOOL);
    const vs = rows.filter((v) => v.school === SCHOOL && (!season || v.season === season))
      .sort((a, b) => S(b.date).localeCompare(S(a.date)));
    if (one) {
      return '<div class="sv-card"><div class="sv-head"><div>' +
        '<h3 class="sv-t">' + esc(one.school) + '</h3>' +
        '<p class="sv-sub">' + esc(one.area || 'بلا منطقة') +
        ' · آخر زيارة ' + esc(one.last ? dayLabel(one.last) : '—') + '</p></div>' +
        '<button class="sv-btn ghost" data-svback="1">← كل المدارس</button></div>' +
        '<div class="sv-kpis" style="margin-top:14px">' +
        '<div class="sv-k"><b>' + one.visits + '</b><span>زيارة</span>' +
          '<i>' + one.done + ' تمّت</i></div>' +
        '<div class="sv-k"><b>' + num(one.joined) + '</b><span>مشارك</span></div>' +
        '<div class="sv-k"><b>' + num(one.picked) + '</b><span>مختار</span></div>' +
        '<div class="sv-k"><b>' + (one.sports.length || '—') + '</b><span>لعبة نُفِّذت</span>' +
          (one.sports.length ? '<i>' + esc(one.sports.join(' · ')) + '</i>' : '') + '</div>' +
        '</div>' +
        (one.notes.length
          ? '<div style="margin-top:14px"><p class="sv-sub">ملاحظات الزيارات</p>' +
            '<div class="sv-log">' + one.notes.map((n) =>
              '<div><b>' + esc(dayLabel(n.date)) + '</b>' + esc(n.text) + '</div>').join('') +
            '</div></div>'
          : '') +
        visitTable(vs) + '</div>';
    }
  }
  return '<div class="sv-card"><h3 class="sv-t">المدارس</h3>' +
    (list.length
      ? '<table class="sv-tbl"><tr><th>المدرسة</th><th>المنطقة</th><th class="n">زيارات</th>' +
        '<th class="n">آخر زيارة</th><th class="n">مشاركون</th><th class="n">مختارون</th></tr>' +
        list.map((x) => '<tr class="clik" data-svschool="' + esc(x.school) + '">' +
          '<td><b>' + esc(x.school) + '</b></td><td>' + esc(x.area || '—') + '</td>' +
          '<td class="n">' + x.visits + '</td>' +
          '<td class="n">' + esc(x.last ? dayLabel(x.last) : '—') + '</td>' +
          '<td class="n">' + num(x.joined) + '</td><td class="n">' + num(x.picked) +
          '</td></tr>').join('') + '</table>'
      : '<div class="sv-empty">لا مدارس بعد — تُضاف بإنشاء زيارة.</div>') + '</div>';
}

function visitTable(vs) {
  if (!vs.length) return '<div class="sv-empty">لا زيارات.</div>';
  return '<table class="sv-tbl"><tr><th>التاريخ</th><th>المدرسة</th><th>المنطقة</th>' +
    '<th>الألعاب</th><th>الحالة</th><th class="n">مشاركون</th><th class="n">مختارون</th></tr>' +
    vs.map((v) => '<tr class="clik" data-svopen="' + esc(v.k) + '">' +
      '<td class="n">' + esc(dayLabel(v.date)) +
        (v.date0 ? '<br><s style="color:var(--stone);font-size:11px">' +
          esc(dayLabel(v.date0)) + '</s>' : '') + '</td>' +
      '<td><b>' + esc(v.school) + '</b></td><td>' + esc(v.area || '—') + '</td>' +
      '<td>' + esc(v.sports.join(' · ') || '—') + '</td>' +
      '<td><span class="sv-tag" style="--c:' + col(v.status) + '">' + esc(v.status) + '</span>' +
        (v.status === M.OFF && v.offReason
          ? '<div class="sv-sub">' + esc(v.offReason) + '</div>' : '') + '</td>' +
      '<td class="n">' + num(M.students(v)) + '</td>' +
      '<td class="n">' + num(M.picked(v)) + '</td></tr>').join('') + '</table>';
}

function calendar(rows, season) {
  const vs = rows.filter((v) => !season || v.season === season).filter((v) => S(v.date));
  if (!CAL) {
    const now = iso(new Date()).slice(0, 7);
    const next = vs.map((v) => v.date.slice(0, 7)).sort().find((m) => m >= now);
    CAL = next || now;
  }
  const [y, m] = CAL.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const start = new Date(first.getTime() - first.getUTCDay() * 86400000);
  const today = iso(new Date());
  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const ds = iso(d);
    const evs = vs.filter((v) => v.date === ds);
    days.push('<div class="d' + (d.getUTCMonth() !== m - 1 ? ' out' : '') +
      (ds === today ? ' today' : '') + '"><b>' + d.getUTCDate() + '</b>' +
      evs.map((v) => '<button class="ev" style="--c:' + col(v.status) + '" ' +
        'data-svopen="' + esc(v.k) + '">' + esc(v.school) + '</button>').join('') + '</div>');
  }
  const names = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  return '<div class="sv-card"><div class="sv-head">' +
    '<h3 class="sv-t">' + esc(monLabel(CAL)) + '</h3>' +
    '<div class="sv-row"><button class="sv-btn ghost" data-svmv="-1">الشهر السابق</button>' +
    '<button class="sv-btn ghost" data-svmv="1">الشهر التالي</button></div></div>' +
    '<div class="sv-cal">' + names.map((n) => '<div class="hd">' + n + '</div>').join('') +
    days.join('') + '</div>' +
    '<div class="sv-row" style="margin-top:12px">' + M.STATUS.map((st) =>
      '<span class="sv-tag" style="--c:' + col(st) + '">' + esc(st) + '</span>').join('') +
    '</div></div>';
}

/* ── النافذة ───────────────────────────────────────────── */
function dialog(v, sports, areas, schoolNames) {
  const isNew = !S(v.k);
  const sel = (sp) => v.sports.indexOf(sp) >= 0;
  const b = (sp) => v.bySport[sp] || { joined: null, picked: null };
  const shown = [...new Set(v.sports.concat(Object.keys(v.bySport)))];
  return '<div class="sv-dlg" id="svDlg"><div class="sv-box">' +
    '<div class="sv-head"><h3 class="sv-t">' +
      (isNew ? 'زيارة مدرسة جديدة' : 'تعديل الزيارة') + '</h3>' +
      '<button class="sv-btn ghost" data-svclose="1">إغلاق</button></div>' +
    '<div class="sv-grid">' +
      '<span><label class="sv-l">المدرسة</label>' +
        '<input class="sv-in" id="svSchool" list="svSchools" value="' + esc(v.school) + '">' +
        '<datalist id="svSchools">' + schoolNames.map((n) =>
          '<option value="' + esc(n) + '">').join('') + '</datalist></span>' +
      '<span><label class="sv-l">المنطقة / الفرع</label>' +
        '<input class="sv-in" id="svArea" list="svAreas" value="' + esc(v.area) + '">' +
        '<datalist id="svAreas">' + areas.map((n) =>
          '<option value="' + esc(n) + '">').join('') + '</datalist></span>' +
      '<span><label class="sv-l">التاريخ</label>' +
        '<input class="sv-in" id="svDate" type="date" value="' + esc(v.date0 || v.date) + '"></span>' +
      '<span><label class="sv-l">الوقت</label>' +
        '<input class="sv-in" id="svTime" type="time" value="' + esc(v.time) + '"></span>' +
    '</div>' +
    '<label class="sv-l">الألعاب المستهدفة</label>' +
    '<div class="sv-chips" id="svSports">' + sports.map((sp) =>
      '<button type="button" data-svsp="' + esc(sp) + '" aria-pressed="' + sel(sp) + '">' +
      esc(sp) + '</button>').join('') + '</div>' +
    '<div class="sv-grid">' +
      '<span><label class="sv-l">الفريق المسؤول</label>' +
        '<input class="sv-in" id="svTeam" value="' + esc(v.team) + '"></span>' +
      '<span><label class="sv-l">الهدف من الزيارة</label>' +
        '<input class="sv-in" id="svGoal" value="' + esc(v.goal) + '"></span>' +
    '</div>' +
    '<label class="sv-l">الحالة</label>' +
    '<div class="sv-chips" id="svStatus">' + M.STATUS.map((st) =>
      '<button type="button" data-svst="' + esc(st) + '" aria-current="' +
      (v.status === st) + '">' + esc(st) + '</button>').join('') + '</div>' +
    '<div id="svMove" hidden><div class="sv-grid">' +
      '<span><label class="sv-l">التاريخ الجديد</label>' +
        '<input class="sv-in" id="svNewDate" type="date" value="' +
        (M.MOVED === v.status ? esc(v.date) : '') + '"></span>' +
      '<span><label class="sv-l">سبب التأجيل</label>' +
        '<input class="sv-in" id="svReason" value="' + esc(v.reason) + '"></span>' +
    '</div><p class="sv-sub">التاريخ الأصلي يُحفظ ولا يُستبدل.</p></div>' +
    '<div id="svOff" hidden><label class="sv-l">سبب الإلغاء</label>' +
      '<input class="sv-in" id="svOffReason" value="' + esc(v.offReason) + '">' +
      '<p class="sv-sub">الزيارة الملغاة تبقى في السجلّ للتقارير، ولا تُحذف.</p></div>' +
    '<div id="svDone" hidden>' +
      '<label class="sv-l">عدد الطلاب المشاركين (اتركه فارغاً إن لم يُحصَ)</label>' +
      '<input class="sv-in" id="svStudents" type="number" min="0" value="' +
        (v.students === null ? '' : v.students) + '">' +
      '<label class="sv-l">التوزيع حسب اللعبة — المشاركون والمختارون</label>' +
      '<div id="svBySport">' + (shown.length ? shown.map((sp) =>
        '<div class="sv-sp"><span>' + esc(sp) + '</span>' +
        '<input class="sv-in" data-svj="' + esc(sp) + '" type="number" min="0" ' +
          'placeholder="شارك" value="' + (b(sp).joined === null ? '' : b(sp).joined) + '">' +
        '<input class="sv-in" data-svp="' + esc(sp) + '" type="number" min="0" ' +
          'placeholder="اختير" value="' + (b(sp).picked === null ? '' : b(sp).picked) + '">' +
        '</div>').join('') : '<p class="sv-sub">اختر الألعاب المستهدفة أوّلاً.</p>') + '</div>' +
      '<label class="sv-l">نتيجة الزيارة</label>' +
      '<input class="sv-in" id="svOutcome" value="' + esc(v.outcome) + '">' +
      '<label class="sv-l">ملاحظة فنية</label>' +
      '<input class="sv-in" id="svTech" value="' + esc(v.techNote) + '">' +
      '<label class="sv-l">مرفقات (صور أو ملفات)</label>' +
      '<input class="sv-in" id="svFiles" type="file" multiple>' +
      (v.files.length ? '<div class="sv-row" style="margin-top:8px">' + v.files.map((f) =>
        '<a class="sv-tag" style="--c:var(--brand)" href="' + esc(f.url) +
        '" target="_blank" rel="noopener">' + esc(f.name || 'ملف') + '</a>').join('') +
        '</div>' : '') +
    '</div>' +
    '<label class="sv-l">ملاحظات</label>' +
    '<input class="sv-in" id="svNote" value="' + esc(v.note) + '">' +
    (v.log.length
      ? '<label class="sv-l">سجلّ التغييرات</label><div class="sv-log">' +
        v.log.slice().reverse().map((x) => '<div><b>' + esc(S(x.at).slice(0, 10)) + '</b>' +
          esc(x.text) + (x.by ? '<i>' + esc(x.by) + '</i>' : '') + '</div>').join('') + '</div>'
      : '') +
    '<div class="sv-msg" id="svMsg"></div>' +
    '<div class="sv-row" style="margin-top:6px">' +
      '<button class="sv-btn" id="svSave">حفظ</button>' +
      '<button class="sv-btn ghost" data-svclose="1">إلغاء</button>' +
      (isNew ? '' : '<button class="sv-btn ghost" id="svDrop" ' +
        'style="margin-inline-start:auto;color:var(--critical)">حذف الزيارة</button>') +
    '</div></div></div>';
}

/* ── الرسم ─────────────────────────────────────────────── */
export function render(host, ctx) {
  if (!host) return;
  if (!document.getElementById('svStyle')) {
    const st = document.createElement('style');
    st.id = 'svStyle';
    st.textContent = STYLE;
    document.head.appendChild(st);
  }
  const season = S(ctx.season);
  const rows = M.list(ctx.visits || []);
  const sports = (ctx.sports || []).slice();
  const inSeason = rows.filter((v) => !season || v.season === season);
  const areas = [...new Set(rows.map((v) => v.area).filter(Boolean))].sort();
  const names = [...new Set(rows.map((v) => v.school).filter(Boolean))].sort();
  const admin = !!(ctx.user && ctx.user.admin);

  const TABS = [['over', 'نظرة عامة'], ['cal', 'التقويم'], ['schools', 'المدارس'],
    ['visits', 'الزيارات'], ['stats', 'التحليلات']];

  const body =
    TAB === 'cal' ? calendar(rows, season)
      : TAB === 'schools' ? schoolsTab(rows, season)
        : TAB === 'visits' ? ('<div class="sv-card"><h3 class="sv-t">كل الزيارات</h3>' +
          visitTable(inSeason.slice().sort((a, b) => S(b.date).localeCompare(S(a.date)))) +
          '</div>')
          : TAB === 'stats' ? analytics(rows, season)
            : overview(rows, season, sports);

  host.innerHTML = '<div class="sv-wrap">' +
    '<div class="sv-card"><div class="sv-head">' +
      '<div class="sv-tabs">' + TABS.map(([k, l]) =>
        '<button data-svtab="' + k + '" aria-current="' + (TAB === k) + '">' + esc(l) +
        '</button>').join('') + '</div>' +
      '<div class="sv-row">' +
        '<button class="sv-btn ghost" id="svCsv">تصدير Excel</button>' +
        '<button class="sv-btn ghost" id="svPrint">طباعة / PDF</button>' +
        (admin ? '<button class="sv-btn" id="svAdd">+ زيارة جديدة</button>' : '') +
      '</div></div></div>' +
    body + '</div>' +
    (OPEN ? dialog(OPEN, sports, areas, names) : '');

  const $ = (id) => host.querySelector('#' + id);
  const go = () => render(host, ctx);

  host.querySelectorAll('[data-svtab]').forEach((b) => b.addEventListener('click', () => {
    TAB = b.dataset.svtab; SCHOOL = ''; go();
  }));
  host.querySelectorAll('[data-svmv]').forEach((b) => b.addEventListener('click', () => {
    const [y, m] = CAL.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + Number(b.dataset.svmv), 1));
    CAL = iso(d).slice(0, 7); go();
  }));
  host.querySelectorAll('[data-svschool]').forEach((b) => b.addEventListener('click', () => {
    SCHOOL = b.dataset.svschool; go();
  }));
  const back = host.querySelector('[data-svback]');
  if (back) back.addEventListener('click', () => { SCHOOL = ''; go(); });

  host.querySelectorAll('[data-svopen]').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!admin) return;
    OPEN = rows.find((v) => v.k === b.dataset.svopen) || null;
    go();
  }));
  if ($('svAdd')) $('svAdd').addEventListener('click', () => {
    OPEN = M.visit({ season, status: 'مخططة' }); go();
  });
  if ($('svCsv')) $('svCsv').addEventListener('click', () => {
    const blob = new Blob([M.csv(inSeason)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'زيارات-المدارس-' + (season || 'الكل') + '.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  });
  if ($('svPrint')) $('svPrint').addEventListener('click', () => window.print());

  if (!OPEN) return;
  wireDialog(host, ctx, go);
}

function wireDialog(host, ctx, go) {
  const $ = (id) => host.querySelector('#' + id);
  const v = OPEN;
  const close = () => { OPEN = null; go(); };
  host.querySelectorAll('[data-svclose]').forEach((b) => b.addEventListener('click', close));

  const paint = () => {
    $('svMove').hidden = v.status !== M.MOVED;
    $('svOff').hidden = v.status !== M.OFF;
    $('svDone').hidden = v.status !== M.DONE;
  };
  paint();

  host.querySelectorAll('[data-svsp]').forEach((b) => b.addEventListener('click', () => {
    const sp = b.dataset.svsp;
    const i = v.sports.indexOf(sp);
    if (i >= 0) v.sports.splice(i, 1); else v.sports.push(sp);
    collect(host, v);
    go();
  }));
  host.querySelectorAll('[data-svst]').forEach((b) => b.addEventListener('click', () => {
    collect(host, v);
    v.status = b.dataset.svst;
    go();
  }));

  $('svSave').addEventListener('click', async () => {
    const msg = $('svMsg');
    collect(host, v);
    if (!S(v.school)) { msg.style.color = 'var(--critical)';
      msg.textContent = 'اكتب اسم المدرسة.'; return; }
    const btn = $('svSave');
    btn.disabled = true;
    msg.style.color = 'var(--steel)';
    msg.textContent = 'جارٍ الحفظ…';
    try {
      const files = await readFiles($('svFiles'));
      await ctx.save(buildPayload(v, ctx, files));
      msg.style.color = 'var(--success)';
      msg.textContent = 'حُفظت.';
      if (ctx.onSaved) ctx.onSaved();
    } catch (e) {
      btn.disabled = false;
      msg.style.color = 'var(--critical)';
      msg.textContent = 'تعذّر الحفظ: ' + S(e && e.message);
    }
  });

  const drop = $('svDrop');
  if (drop) drop.addEventListener('click', async () => {
    if (!window.confirm('حذف الزيارة نهائياً؟ الأفضل تعليمها «ملغاة» ليبقى سجلّها.')) return;
    drop.disabled = true;
    try { await ctx.drop(v.k); if (ctx.onSaved) ctx.onSaved(); }
    catch (e) { drop.disabled = false; }
  });
}

/* يقرأ ما في الحقول إلى الكائن قبل أيّ إعادة رسم، فلا يضيع ما كُتب */
function collect(host, v) {
  const g = (id) => { const e = host.querySelector('#' + id); return e ? e.value : undefined; };
  const set = (k, val) => { if (val !== undefined) v[k] = S(val); };
  set('school', g('svSchool')); set('area', g('svArea'));
  set('time', g('svTime')); set('team', g('svTeam')); set('goal', g('svGoal'));
  set('note', g('svNote')); set('outcome', g('svOutcome')); set('techNote', g('svTech'));
  set('reason', g('svReason')); set('offReason', g('svOffReason'));
  const d = g('svDate'); if (d !== undefined) v._base = S(d);
  const nd = g('svNewDate'); if (nd !== undefined) v._new = S(nd);
  const st = g('svStudents');
  if (st !== undefined) v.students = S(st) === '' ? null : Math.max(0, Number(st) || 0);
  host.querySelectorAll('[data-svj]').forEach((e) => {
    const sp = e.dataset.svj;
    v.bySport[sp] = v.bySport[sp] || { joined: null, picked: null };
    v.bySport[sp].joined = S(e.value) === '' ? null : Math.max(0, Number(e.value) || 0);
  });
  host.querySelectorAll('[data-svp]').forEach((e) => {
    const sp = e.dataset.svp;
    v.bySport[sp] = v.bySport[sp] || { joined: null, picked: null };
    v.bySport[sp].picked = S(e.value) === '' ? null : Math.max(0, Number(e.value) || 0);
  });
  for (const sp of Object.keys(v.bySport)) {
    const b = v.bySport[sp];
    if (b.joined === null && b.picked === null) delete v.bySport[sp];
  }
}

async function readFiles(input) {
  if (!input || !input.files || !input.files.length) return [];
  const out = [];
  for (const f of input.files) {
    const buf = await f.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = '';
    const CH = 0x8000;
    for (let i = 0; i < bytes.length; i += CH) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    }
    out.push({ name: f.name, data: btoa(bin) });
  }
  return out;
}

/* يبني ما يُحفظ: التاريخ الأصلي لا يُستبدل، والسجلّ يُكتب من الفروق */
function buildPayload(v, ctx, files) {
  const old = (ctx.visits || []).find((x) => S(x.k) === S(v.k));
  const prev = old ? M.visit(old) : null;
  const now = new Date().toISOString();
  const who = S(ctx.user && ctx.user.name);
  const moved = v.status === M.MOVED;
  const base = S(v._base);
  const dateNow = moved ? S(v._new) : base;
  const date0 = (prev && prev.date0) || (moved ? base : '');
  const prevDate = prev ? prev.date : '';
  const log = prev ? prev.log.slice() : [];
  const push = (t) => { if (t) log.push({ at: now, by: who, text: t }); };
  if (!prev) push('أُنشئت الزيارة' + (base ? ' بتاريخ ' + base : ''));
  if (prev && prev.status !== v.status) push('الحالة: ' + prev.status + ' ← ' + v.status);
  if (prev && prevDate !== dateNow) {
    push('الموعد: ' + (prevDate || 'بلا تاريخ') + ' ← ' + (dateNow || 'لم يحدد بعد'));
  }
  if (moved && v.reason && (!prev || prev.reason !== v.reason)) push('السبب: ' + v.reason);
  if (v.status === M.OFF && (!prev || prev.status !== M.OFF)) {
    push('أُلغيت' + (v.offReason ? ' — ' + v.offReason : ''));
  }
  if (v.status === M.DONE && (!prev || prev.status !== M.DONE)) push('تمّت الزيارة');

  return {
    k: v.k, season: v.season, school: v.school, area: v.area,
    date: dateNow, time: v.time, sports: v.sports.slice(),
    team: v.team, goal: v.goal, note: v.note, status: v.status,
    date0, datePrev: (prev && prevDate !== dateNow) ? prevDate : (prev ? prev.datePrev : ''),
    movedAt: (prev && prevDate !== dateNow) ? now : (prev ? prev.movedAt : ''),
    reason: moved ? v.reason : (prev ? prev.reason : ''),
    offAt: v.status === M.OFF ? ((prev && prev.offAt) || now) : '',
    offReason: v.status === M.OFF ? v.offReason : '',
    offBy: v.status === M.OFF ? ((prev && prev.offBy) || who) : '',
    students: v.students, bySport: v.bySport,
    outcome: v.outcome, techNote: v.techNote,
    keepFiles: prev ? prev.files : [], newFiles: files,
    log: log.slice(-60),
  };
}

window.__fmacSchoolsUI = { render };
window.__fmacSchoolsMod = M;
export default { render };
