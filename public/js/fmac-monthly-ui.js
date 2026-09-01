/* واجهة قسم الخطط الشهرية — تُحقن في #monthlyView داخل index.html.
   الأصناف بسابقة mo- تفادياً لتصادم الأسماء (الخطأ رقم 3 في وثيقة المشروع). */
import { readXlsx } from './fmac-xlsx.js';
import * as M from './fmac-monthly.js';
import { evaluateCoachFile } from './fmac-coachplan.js';

const S = (v) => (v === null || v === undefined) ? '' : String(v);
const esc = (s) => S(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const STYLE = `
.mo-wrap{display:flex;flex-direction:column;gap:16px}
.mo-card{background:var(--surface,#0f1115);border:1px solid var(--line,#23272f);
  border-radius:18px;padding:18px}
.mo-head{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between}
.mo-title{font-size:16px;font-weight:700;margin:0}
.mo-sub{color:var(--steel,#9aa3b0);font-size:12.5px;margin:4px 0 0}
.mo-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.mo-btn{background:var(--brand,#e8555c);color:#fff;border:0;border-radius:12px;
  padding:10px 18px;font:700 13.5px inherit;cursor:pointer}
.mo-btn.ghost{background:var(--surface-soft,#191d24);color:#e9ecf1;
  border:1px solid #2a2f38;font-weight:400}
.mo-btn:disabled{opacity:.5;cursor:default}
.mo-pill{font-size:11.5px;padding:3px 10px;border-radius:99px;
  background:var(--surface-soft,#191d24);border:1px solid #2a2f38;white-space:nowrap}
.mo-pill.ok{color:#22c07f;border-color:#22c07f55;background:#22c07f18}
.mo-pill.late{color:#ffc233;border-color:#ffc23355;background:#ffc23318}
.mo-pill.bad{color:#ff4d59;border-color:#ff4d5955;background:#ff4d5918}
.mo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
.mo-item{background:var(--surface-soft,#191d24);border:1px solid #23272f;
  border-radius:14px;padding:14px;cursor:pointer;transition:border-color .15s}
.mo-item:hover{border-color:var(--brand,#e8555c)}
.mo-score{font-size:30px;font-weight:800;line-height:1;direction:ltr;
  font-variant-numeric:tabular-nums}
.mo-tbl{width:100%;border-collapse:collapse;font-size:13px;margin-top:10px}
.mo-tbl th,.mo-tbl td{text-align:right;padding:9px 8px;border-bottom:1px solid #1c2028;
  vertical-align:top}
.mo-tbl th{color:var(--steel,#9aa3b0);font-size:11.5px;font-weight:600}
.mo-tbl td.n{direction:ltr;text-align:left;font-variant-numeric:tabular-nums;white-space:nowrap}
.mo-bar{height:5px;border-radius:99px;background:#23272f;overflow:hidden;margin-top:6px}
.mo-bar i{display:block;height:100%}
.mo-ev{color:var(--steel,#9aa3b0);font-size:12px;margin-top:3px;line-height:1.6}
.mo-req{color:#c7cdd6;font-size:12px;margin-top:3px}
.mo-drop{border:1.5px dashed #2a2f38;border-radius:14px;padding:22px;text-align:center;
  color:var(--steel,#9aa3b0);font-size:13px}
.mo-drop.on{border-color:var(--brand,#e8555c);color:#e9ecf1}
.mo-msg{font-size:13px;min-height:20px;margin-top:10px}
.mo-empty{color:var(--steel,#9aa3b0);font-size:13.5px;text-align:center;padding:24px}
`;

const COLOR = (s) => s === null ? '#9aa3b0'
  : s >= 90 ? '#22c07f' : s >= 80 ? '#5bd6a0' : s >= 70 ? '#ffc233'
    : s >= 60 ? '#ff9f43' : '#ff4d59';

const PRIO_CLS = { 'عالية': 'bad', 'متوسطة': 'late', 'منخفضة': 'ok' };

/* «يومين» لا «2 يوماً» — تمييز العدد في العربية */
const arDays = (n) => n === 1 ? 'يوماً واحداً' : n === 2 ? 'يومين'
  : n <= 10 ? (n + ' أيام') : (n + ' يوماً');

/* الشهور المتاحة للرفع: الحالي والتالي */
function monthOptions() {
  const now = new Date();
  const out = [];
  for (let i = 0; i <= 2; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
    const key = d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0');
    out.push({ key, label: M.monthLabel(key) });
  }
  return out;
}

const toB64 = (buf) => {
  const bytes = new Uint8Array(buf);
  let bin = '';
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
  }
  return btoa(bin);
};

function axesTable(axes) {
  return '<table class="mo-tbl"><tr>' +
    '<th style="width:22%">المحور</th><th class="n" style="width:9%">الوزن</th>' +
    '<th class="n" style="width:9%">الدرجة</th><th class="n" style="width:11%">الموزونة</th>' +
    '<th>ما وجدناه · ماذا تعني · ما المطلوب</th><th style="width:9%">الأولوية</th></tr>' +
    axes.map((a) => {
      const s = a.score;
      const shown = s === null ? '—' : s;
      return '<tr><td><b>' + a.n + '. ' + esc(a.name) + '</b>' +
        '<div class="mo-bar"><i style="width:' + (s === null ? 0 : s) + '%;' +
        'background:' + COLOR(s) + '"></i></div></td>' +
        '<td class="n">' + Math.round(a.weight * 100) + '%</td>' +
        '<td class="n" style="color:' + COLOR(s) + ';font-weight:700">' + shown + '</td>' +
        '<td class="n">' + (a.weighted === null ? '—' : a.weighted) + '</td>' +
        '<td><div class="mo-ev">' + esc(a.evidence) + '</div>' +
        '<div class="mo-ev">' + esc(a.meaning) + '</div>' +
        '<div class="mo-req">← ' + esc(a.required) + '</div></td>' +
        '<td><span class="mo-pill ' + (PRIO_CLS[a.priority] || '') + '">' +
        esc(a.priority) + '</span></td></tr>';
    }).join('') + '</table>';
}

function resultCard(res, title) {
  const c = COLOR(res.total);
  return '<div class="mo-card"><div class="mo-head"><div>' +
    '<h3 class="mo-title">' + esc(title) + '</h3>' +
    '<p class="mo-sub">' + esc(res.decision) + ' · ' + esc(res.action) +
    ' · التغطية ' + res.coverage + '%</p></div>' +
    '<div style="text-align:center"><div class="mo-score" style="color:' + c + '">' +
    (res.total === null ? '—' : res.total) + '</div>' +
    '<div class="mo-pill" style="margin-top:6px;color:' + c + '">' +
    esc(res.grade) + '</div></div></div>' +
    axesTable(res.axes) + '</div>';
}

export function render(host, ctx) {
  if (!host) return;
  if (!document.getElementById('moStyle')) {
    const st = document.createElement('style');
    st.id = 'moStyle';
    st.textContent = STYLE;
    document.head.appendChild(st);
  }
  const user = ctx.user || {};
  const list = (ctx.monthly || []).slice();
  const reviews = ctx.reviews || {};
  const opts = monthOptions();

  const rows = list.map((m) => {
    const rv = reviews[m.k] || {};
    const late = M.lateness(m.month, m.uploadedAt);
    const c = COLOR(rv.total === undefined ? null : rv.total);
    return '<div class="mo-item" data-open="' + esc(m.k) + '">' +
      '<div class="mo-head"><div><b>' + esc(M.monthLabel(m.month)) + '</b>' +
      '<p class="mo-sub">' + esc(m.sport || '—') + ' · ' + esc(m.coachName || m.coach || '—') +
      '</p></div><div class="mo-score" style="color:' + c + '">' +
      (rv.total === undefined || rv.total === null ? '—' : rv.total) + '</div></div>' +
      '<div class="mo-row" style="margin-top:10px">' +
      '<span class="mo-pill ' + (late.state === 'متأخرة' ? 'late' : 'ok') + '">' +
      esc(late.state) + (late.days ? ' · ' + arDays(late.days) : '') + '</span>' +
      (rv.grade ? '<span class="mo-pill" style="color:' + c + '">' + esc(rv.grade) + '</span>' : '') +
      (m.url ? '<a class="mo-pill" href="' + esc(m.url) + '" target="_blank" rel="noopener">الملف</a>' : '') +
      '</div></div>';
  }).join('');

  host.innerHTML = '<div class="mo-wrap">' +
    '<div class="mo-card"><div class="mo-head"><div>' +
    '<h3 class="mo-title">الخطط الشهرية</h3>' +
    '<p class="mo-sub">تُرفع قبل بداية الشهر — الموعد النهائي آخر يوم في الشهر السابق ناقص يوم. ' +
    'التقييم يظهر فور الرفع.</p></div>' +
    '<a class="mo-btn ghost" href="./templates/FMAC-نموذج-الخطة-الشهرية.xlsx" download>تنزيل القالب</a>' +
    '</div>' +
    '<div class="mo-row" style="margin-top:14px">' +
    '<label class="mo-sub" for="moMonth">الشهر</label>' +
    '<select id="moMonth" class="mo-btn ghost" style="padding:9px 12px">' +
    opts.map((o) => '<option value="' + o.key + '">' + esc(o.label) + '</option>').join('') +
    '</select><span class="mo-pill" id="moDue"></span></div>' +
    '<div class="mo-drop" id="moDrop" style="margin-top:14px">' +
    'اسحب ملف الخطة هنا أو <b style="color:var(--brand,#e8555c);cursor:pointer" id="moPick">اختر ملفاً</b>' +
    '<input type="file" id="moFile" accept=".xlsx" hidden></div>' +
    '<div class="mo-msg" id="moMsg"></div></div>' +
    '<div id="moPreview"></div>' +
    '<div class="mo-card"><h3 class="mo-title">الخطط المرفوعة</h3>' +
    (rows ? '<div class="mo-grid" style="margin-top:12px">' + rows + '</div>'
          : '<div class="mo-empty">لا خطط شهرية بعد.</div>') + '</div>' +
    '<div id="moDetail"></div></div>';

  const $ = (id) => host.querySelector('#' + id);
  const msg = $('moMsg');
  const sel = $('moMonth');

  const showDue = () => {
    const k = sel.value;
    const d = M.dueLabel(k);
    const l = M.lateness(k, new Date().toISOString());
    $('moDue').textContent = 'الموعد النهائي: ' + d +
      (l.state === 'متأخرة' ? ' — انقضى منذ ' + arDays(l.days) : '');
    $('moDue').className = 'mo-pill ' + (l.state === 'متأخرة' ? 'late' : 'ok');
  };
  sel.addEventListener('change', showDue);
  showDue();

  /* ── الرفع ── */
  const fileInput = $('moFile');
  $('moPick').addEventListener('click', () => fileInput.click());
  const drop = $('moDrop');
  ['dragenter', 'dragover'].forEach((e) => drop.addEventListener(e, (ev) => {
    ev.preventDefault(); drop.classList.add('on');
  }));
  ['dragleave', 'drop'].forEach((e) => drop.addEventListener(e, (ev) => {
    ev.preventDefault(); drop.classList.remove('on');
  }));
  drop.addEventListener('drop', (ev) => {
    const f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
    if (f) handle(f);
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) handle(fileInput.files[0]);
  });

  async function handle(file) {
    msg.className = 'mo-msg';
    msg.textContent = 'جارٍ قراءة الملف وتقييمه…';
    $('moPreview').innerHTML = '';
    let buf;
    try { buf = await file.arrayBuffer(); }
    catch (e) { msg.className = 'mo-msg'; msg.style.color = '#ff4d59';
      msg.textContent = 'تعذّرت قراءة الملف.'; return; }

    const r = await evaluateCoachFile(buf, readXlsx);
    if (!r.ok) {
      msg.style.color = '#ff4d59';
      msg.textContent = r.error;
      return;
    }
    const monthFromFile = M.monthKey((r.plan.header || {})['الشهر']);
    if (monthFromFile && monthFromFile !== sel.value) {
      msg.style.color = '#ffc233';
      msg.textContent = 'تنبيه: الشهر في الملف «' + M.monthLabel(monthFromFile) +
        '» ويختلف عن المختار. سيُحفظ بشهر الملف.';
      sel.value = monthFromFile;
      showDue();
    } else {
      msg.style.color = '#9aa3b0';
      msg.textContent = 'تمّ التقييم — راجع النتيجة ثم احفظ.';
    }

    const month = monthFromFile || sel.value;
    $('moPreview').innerHTML = resultCard(r.result, 'تقييم ' + M.monthLabel(month)) +
      '<div class="mo-card"><div class="mo-row">' +
      '<button class="mo-btn" id="moSave">حفظ الخطة والتقييم</button>' +
      '<button class="mo-btn ghost" id="moCancel">إلغاء</button>' +
      '<span class="mo-sub" id="moSaveMsg"></span></div></div>';

    host.querySelector('#moCancel').addEventListener('click', () => {
      $('moPreview').innerHTML = ''; msg.textContent = '';
    });
    host.querySelector('#moSave').addEventListener('click', async () => {
      const btn = host.querySelector('#moSave');
      const sm = host.querySelector('#moSaveMsg');
      btn.disabled = true;
      sm.textContent = 'جارٍ الحفظ…';
      const late = M.lateness(month, new Date().toISOString());
      const payload = {
        action: 'monthly',
        name: file.name,
        file: toB64(buf),
        monthly: {
          month,
          sport: S((r.plan.header||{})['اللعبة']) || S(user.sport),
          branch: S((r.plan.header||{})['الفرع']) || S(user.branch),
          category: S((r.plan.header||{})['الفئة']),
          weeks: r.result.weeks, activeDays: r.result.activeDays,
          players: S((r.plan.header||{})['عدد اللاعبين']),
          coachName: S(user.name),
          total: r.result.total, grade: r.result.grade,
          decision: r.result.decision, coverage: r.result.coverage,
          late: late.state === 'متأخرة', lateDays: late.days,
          uploadedAt: new Date().toISOString(),
        },
        review: r.result,
      };
      try {
        const res = await ctx.api('firebase', {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
        });
        const j = await res.json();
        if (!j || !j.ok) throw new Error((j && j.error) || 'فشل الحفظ');
        sm.style.color = '#22c07f';
        sm.textContent = 'حُفظت.';
        if (ctx.onSaved) ctx.onSaved();
      } catch (e) {
        btn.disabled = false;
        sm.style.color = '#ff4d59';
        const t = S(e && e.message);
        /* أشهر سببين: قواعد لم تُنشر بعد — نقولها صراحةً بدل نصّ Firebase الخام */
        if (t.indexOf('storage/unauthorized') >= 0 || t.indexOf('permission to access') >= 0) {
          sm.textContent = 'قواعد التخزين ترفض الرفع. انشر storage.rules من لوحة Firebase ' +
            '(Storage ← Rules) ثم أعد المحاولة.';
        } else if (t.indexOf('permission-denied') >= 0 || t.indexOf('insufficient') >= 0) {
          sm.textContent = 'قواعد Firestore ترفض الحفظ. انشر firestore.rules من لوحة Firebase ' +
            '(Firestore ← Rules) ثم أعد المحاولة.';
        } else {
          sm.textContent = 'تعذّر الحفظ: ' + t;
        }
      }
    });
  }

  /* ── فتح التفاصيل ── */
  host.querySelectorAll('[data-open]').forEach((el) => {
    el.addEventListener('click', () => {
      const k = el.getAttribute('data-open');
      const m = list.find((x) => x.k === k);
      const rv = reviews[k];
      const box = $('moDetail');
      if (!m) return;
      if (!rv || !rv.axes || !rv.axes.length) {
        box.innerHTML = '<div class="mo-card"><div class="mo-empty">' +
          'لا تقييم محفوظ لهذه الخطة.</div></div>';
      } else {
        box.innerHTML = resultCard(rv, 'تقييم ' + M.monthLabel(m.month) +
          ' — ' + (m.coachName || m.coach || ''));
      }
      box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

window.__fmacMonthlyUI = { render };
export default { render };
