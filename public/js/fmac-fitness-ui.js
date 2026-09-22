/* واجهة قسم الإعداد البدني — تُحقن في #fitnessHost داخل index.html.
   الأصناف بسابقة fb- تفادياً لتصادم الأسماء (الخطأ رقم 3 في وثيقة المشروع).

   من يكتب: مدرب اللياقة والإدارة. من يقرأ: الجميع.
   مدرب اللعبة يرى خطّتها البدنية للمتابعة ولا يملك أي زرّ تعديل —
   والمنع الحقيقي في قواعد Firestore لا في إخفاء الأزرار. */
import { readXlsx } from './fmac-xlsx.js';
import { parseFitnessPlan, summarise, planKey } from './fmac-fitness.js';
import { weekAuto, AR_MONTHS } from './fmac-payload.js';

const S = (v) => (v === null || v === undefined) ? '' : String(v).trim();
const esc = (s) => S(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const STYLE = `
.fb-wrap{display:flex;flex-direction:column;gap:16px}
.fb-card{background:var(--surface,#0D1A29);border:1px solid var(--hairline,#20364C);
  border-radius:18px;padding:18px}
.fb-head{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between}
.fb-title{font-size:16px;font-weight:700;margin:0}
.fb-sub{color:var(--steel,#93A7BA);font-size:12.5px;margin:4px 0 0;line-height:1.7}
.fb-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.fb-btn{background:var(--brand,#3B9DFF);color:#fff;border:0;border-radius:12px;
  padding:10px 18px;font:700 13.5px inherit;cursor:pointer}
.fb-btn.ghost{background:var(--surface-soft,#112235);color:var(--ink,#F4F8FC);
  border:1px solid var(--hairline,#20364C);font-weight:400}
.fb-btn:disabled{opacity:.5;cursor:default}
.fb-pill{font-size:11.5px;padding:3px 10px;border-radius:99px;
  background:var(--surface-soft,#112235);border:1px solid var(--hairline,#20364C);
  white-space:nowrap}
.fb-pill.ok{color:#21C77A;border-color:#21C77A55;background:#21C77A18}
.fb-pill.warn{color:#F2A93B;border-color:#F2A93B55;background:#F2A93B18}
.fb-pill.bad{color:#EF4D5A;border-color:#EF4D5A55;background:#EF4D5A18}
.fb-pill.read{color:#3B9DFF;border-color:#3B9DFF55;background:#3B9DFF14}
button.fb-pill{cursor:pointer;font:inherit;font-size:11.5px}
.fb-pill.on{color:#62B7FF;border-color:#3B9DFF;background:rgba(59,157,255,.14)}
.fb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:12px}
.fb-item{background:var(--surface-soft,#112235);border:1px solid var(--hairline,#20364C);
  border-radius:14px;padding:14px;cursor:pointer;transition:border-color .15s}
.fb-item:hover{border-color:var(--brand,#3B9DFF)}
.fb-item b{font-size:14.5px}
.fb-sess{border:1px solid var(--hairline,#20364C);border-radius:14px;padding:14px;
  margin-top:12px;background:var(--surface-soft,#0F1E2E)}
.fb-sess h4{margin:0 0 2px;font-size:14.5px}
.fb-tbl{width:100%;border-collapse:collapse;font-size:13px;margin-top:10px}
.fb-tbl th,.fb-tbl td{text-align:right;padding:8px;border-bottom:1px solid #17283A;
  vertical-align:top}
.fb-tbl th{color:var(--steel,#93A7BA);font-size:11.5px;font-weight:600}
/* لا direction:ltr — التكرارات والراحة نصّ عربي مختلط، وقلبها يعكس ترتيبه */
.fb-tbl td.n{text-align:center;font-variant-numeric:tabular-nums;white-space:nowrap}
.fb-drop{border:1.5px dashed var(--hairline,#20364C);border-radius:14px;padding:22px;
  text-align:center;color:var(--steel,#93A7BA);font-size:13px}
.fb-drop.on{border-color:var(--brand,#3B9DFF);color:var(--ink,#F4F8FC)}
.fb-msg{font-size:13px;min-height:20px;margin-top:10px;line-height:1.7}
.fb-empty{color:var(--steel,#93A7BA);font-size:13.5px;text-align:center;padding:24px}
.fb-note{background:var(--surface-soft,#112235);border:1px solid var(--hairline,#20364C);
  border-radius:12px;padding:12px;font-size:13px;line-height:1.8;white-space:pre-wrap}
.fb-ta{width:100%;min-height:90px;background:var(--surface-soft,#112235);
  color:var(--ink,#F4F8FC);border:1px solid var(--hairline,#20364C);border-radius:12px;
  padding:10px 12px;font:13.5px/1.7 inherit;resize:vertical}
.fb-sel{background:var(--surface-soft,#112235);color:var(--ink,#F4F8FC);
  border:1px solid var(--hairline,#20364C);border-radius:10px;padding:9px 12px;
  font:13.5px inherit}
`;

/* أسابيع للاختيار: الأسبوع الحالي وثلاثة قادمة — الخطة البدنية تُكتب مقدَّماً */
function weekOptions() {
  const out = [];
  const now = new Date();
  for (let i = 0; i < 4; i++) {
    const w = weekAuto(new Date(now.getTime() + i * 7 * 86400000));
    if (!out.some((o) => o.label === w.label)) out.push({ label: w.label, dates: w.dates });
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

const isXlsx = (name) => /\.xlsx$/i.test(S(name));

/* الألعاب التي لها خطط فعلاً — لا نعرض شريحة لِما لا شيء تحته */
const sportsWith = (rows) => [...new Set(rows.map((r) => S(r.sport)).filter(Boolean))].sort();

/* تمييز العدد في العربية — «حصّتان» لا «2 حصص» */
const arCount = (n, one, two, few, many) =>
  n === 1 ? one : n === 2 ? two : (n >= 3 && n <= 10) ? (n + ' ' + few) : (n + ' ' + many);
const arSess = (n) => arCount(n, 'حصة واحدة', 'حصّتان', 'حصص', 'حصة');
const arEx = (n) => arCount(n, 'تمرين واحد', 'تمرينان', 'تمارين', 'تمريناً');

/* جدول حصّة — للقراءة وحدها في كل الحالات */
function sessionBlock(s) {
  return '<div class="fb-sess"><h4>' + esc(s.title || ('الحصة ' + s.n)) +
    (s.day ? ' · ' + esc(s.day) : '') + '</h4>' +
    (s.objective ? '<p class="fb-sub">' + esc(s.objective) + '</p>' : '') +
    '<table class="fb-tbl"><tr><th style="width:36px">م</th><th>التمرين</th>' +
    '<th class="n" style="width:70px">المجموعات</th>' +
    '<th class="n" style="width:130px">التكرارات / الزمن</th>' +
    '<th class="n" style="width:80px">الراحة</th>' +
    '<th style="width:32%">الهدف الخاص باللعبة</th></tr>' +
    s.rows.map((r, i) => '<tr><td class="n">' + esc(r.no || (i + 1)) + '</td>' +
      '<td>' + esc(r.name) + '</td>' +
      '<td class="n">' + (S(r.sets) ? esc(r.sets) : '—') + '</td>' +
      '<td class="n">' + (S(r.reps) ? esc(r.reps) : '—') + '</td>' +
      '<td class="n">' + (S(r.rest) ? esc(r.rest) : '—') + '</td>' +
      '<td>' + (S(r.goal) ? esc(r.goal) : '<span style="opacity:.5">—</span>') +
      '</td></tr>').join('') +
    '</table></div>';
}

/* بطاقة الخطة كاملة — نفسها للمدرب وللإدارة، والفرق في خانة الملاحظة وحدها */
function planCard(p, note, opts) {
  const o = opts || {};
  const sum = summarise(p);
  const head = '<div class="fb-head"><div>' +
    '<h3 class="fb-title">الخطة البدنية — ' + esc(p.sport) + '</h3>' +
    '<p class="fb-sub">' + esc(p.week || '—') +
    (p.focus ? ' · ' + esc(p.focus) : '') +
    (p.byName ? ' · أعدّها ' + esc(p.byName) : '') + '</p></div>' +
    '<div class="fb-row">' +
    (o.canEdit ? '' : '<span class="fb-pill read">للاطّلاع فقط</span>') +
    (p.url ? '<a class="fb-pill" href="' + esc(p.url) +
      '" target="_blank" rel="noopener">الملف الأصلي</a>' : '') +
    '</div></div>';

  const facts = '<div class="fb-row" style="margin-top:12px">' +
    '<span class="fb-pill">' + arSess(sum.sessions) + '</span>' +
    '<span class="fb-pill">' + arEx(sum.exercises) + '</span>' +
    '<span class="fb-pill">مجموعات: ' + (sum.sets === null ? '—' : sum.sets) + '</span>' +
    '<span class="fb-pill">بأهداف خاصة: ' + sum.withGoal + ' من ' + sum.exercises +
    '</span></div>';

  const body = (p.sessions || []).length
    ? (p.sessions || []).map(sessionBlock).join('')
    : '<div class="fb-empty">لم يُقرأ جدول تمارين من هذا الملف — ' +
      'افتح الملف الأصلي أعلاه.</div>';

  const noteBox = note && S(note.text)
    ? '<div style="margin-top:14px"><p class="fb-sub">ملاحظة الإدارة' +
      (note.by ? ' — ' + esc(note.by) : '') + '</p>' +
      '<div class="fb-note">' + esc(note.text) + '</div></div>'
    : (o.canNote ? '' : '');

  const noteEdit = o.canNote
    ? '<div style="margin-top:14px"><p class="fb-sub">ملاحظة الإدارة ' +
      '(يقرؤها المدرب، ولا تُحتسب درجةً)</p>' +
      '<textarea class="fb-ta" id="fbNote">' + esc((note && note.text) || '') + '</textarea>' +
      '<div class="fb-row" style="margin-top:8px">' +
      '<button class="fb-btn" id="fbNoteSave">حفظ الملاحظة</button>' +
      '<span class="fb-sub" id="fbNoteMsg"></span></div></div>'
    : '';

  return '<div class="fb-card">' + head + facts + body +
    (o.canNote ? noteEdit : noteBox) + '</div>';
}

export function render(host, ctx) {
  if (!host) return;
  if (!document.getElementById('fbStyle')) {
    const st = document.createElement('style');
    st.id = 'fbStyle';
    st.textContent = STYLE;
    document.head.appendChild(st);
  }

  const user = ctx.user || {};
  const sports = (ctx.sports || []).slice();
  const all = (ctx.fitness || []).slice();
  const notes = ctx.fitnessNotes || {};
  const canEdit = !!(user.admin || user.fitness);

  /* المدرب لا يرى إلا خطط لعبته — والإدارة ومدرب اللياقة يريان الجميع */
  const list = canEdit ? all
    : all.filter((p) => !S(user.sport) || S(p.sport) === S(user.sport));

  /* اللعبة المفتوحة في صفحة الخطط تُقدَّم هنا — لا يبحث المستخدم عنها ثانيةً */
  const openSport = S(ctx.sport);
  const picked = host.dataset.fbSport;   /* '' اختيار صريح لكلّ الألعاب، وundefined لم يُختَر */
  const filter = (picked !== undefined) ? S(picked)
    : (openSport && list.some((x) => S(x.sport) === openSport) ? openSport : '');
  const shown = filter ? list.filter((x) => S(x.sport) === filter) : list;

  const weeks = weekOptions();

  const cards = shown.slice().sort((a, b) =>
    (S(b.week) + S(b.sport)).localeCompare(S(a.week) + S(a.sport))
  ).map((p) => {
    const nt = notes[p.k];
    return '<div class="fb-item" data-open="' + esc(p.k) + '">' +
      '<b>' + esc(p.sport) + '</b>' +
      '<p class="fb-sub">' + esc(p.week || '—') +
      (p.focus ? '<br>' + esc(p.focus) : '') + '</p>' +
      '<div class="fb-row" style="margin-top:10px">' +
      '<span class="fb-pill">' + arSess((p.sessions || []).length) + '</span>' +
      '<span class="fb-pill">' +
      arEx((p.sessions || []).reduce((a, s) => a + (s.rows || []).length, 0)) +
      '</span>' +
      (nt && S(nt.text) ? '<span class="fb-pill warn">ملاحظة إدارة</span>' : '') +
      '</div></div>';
  }).join('');

  const upload = canEdit ? (
    '<div class="fb-card"><div class="fb-head"><div>' +
    '<h3 class="fb-title">رفع خطة بدنية</h3>' +
    '<p class="fb-sub">اختر اللعبة والأسبوع ثم ارفع الملف. ' +
    'تُقرأ الحصص والتمارين وتُعرض داخل الموقع، ويبقى الملف الأصلي للتنزيل.</p></div>' +
    '<a class="fb-btn ghost" href="./templates/FMAC-نموذج-الخطة-البدنية-الأسبوعية.xlsx" ' +
    'download>تنزيل القالب</a></div>' +
    '<div class="fb-row" style="margin-top:14px">' +
    '<label class="fb-sub" for="fbSport">اللعبة</label>' +
    '<select id="fbSport" class="fb-sel">' +
    sports.map((s) => '<option value="' + esc(s) + '"' +
      (s === (filter || openSport) ? ' selected' : '') + '>' + esc(s) + '</option>').join('') +
    '</select>' +
    '<label class="fb-sub" for="fbWeek">الأسبوع</label>' +
    '<select id="fbWeek" class="fb-sel">' +
    weeks.map((w) => '<option value="' + esc(w.label) + '">' + esc(w.label) +
      '</option>').join('') +
    '</select></div>' +
    '<div class="fb-drop" id="fbDrop" style="margin-top:14px">' +
    'اسحب ملف الخطة هنا أو <b style="color:var(--brand,#3B9DFF);cursor:pointer" ' +
    'id="fbPick">اختر ملفاً</b>' +
    '<input type="file" id="fbFile" accept=".xlsx,.pdf,.docx" hidden></div>' +
    '<div class="fb-msg" id="fbMsg"></div></div>'
  ) : (
    '<div class="fb-card"><h3 class="fb-title">الخطة البدنية</h3>' +
    '<p class="fb-sub">يُعدّها مدرب اللياقة البدنية لكل لعبة. ' +
    'تظهر لك للاطّلاع والمتابعة، ولا تُعدَّل من هنا.</p></div>'
  );

  host.innerHTML = '<div class="fb-wrap">' + upload +
    '<div id="fbPreview"></div>' +
    '<div class="fb-card"><h3 class="fb-title">الخطط البدنية المرفوعة</h3>' +
    (sportsWith(list).length > 1
      ? '<div class="fb-row" style="margin-top:10px">' +
        '<button class="fb-pill' + (filter ? '' : ' on') + '" data-fbsp="">كل الألعاب</button>' +
        sportsWith(list).map((sp) => '<button class="fb-pill' +
          (filter === sp ? ' on' : '') + '" data-fbsp="' + esc(sp) + '">' + esc(sp) +
          '</button>').join('') + '</div>'
      : '') +
    (cards ? '<div class="fb-grid" style="margin-top:12px">' + cards + '</div>'
           : '<div class="fb-empty">لا خطط بدنية بعد.</div>') + '</div>' +
    '<div id="fbDetail"></div></div>';

  const $ = (id) => host.querySelector('#' + id);

  host.querySelectorAll('[data-fbsp]').forEach((b) => {
    b.addEventListener('click', () => {
      host.dataset.fbSport = b.getAttribute('data-fbsp');
      render(host, ctx);
    });
  });

  /* ── فتح خطة ── */
  host.querySelectorAll('[data-open]').forEach((el) => {
    el.addEventListener('click', () => {
      const k = el.getAttribute('data-open');
      const p = list.find((x) => x.k === k);
      if (!p) return;
      const box = $('fbDetail');
      box.innerHTML = planCard(p, notes[k], { canEdit, canNote: !!user.admin });
      if (user.admin) wireNote(box, k);
      box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  function wireNote(box, k) {
    const btn = box.querySelector('#fbNoteSave');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      const ta = box.querySelector('#fbNote');
      const msg = box.querySelector('#fbNoteMsg');
      btn.disabled = true;
      msg.style.color = 'var(--steel,#93A7BA)';
      msg.textContent = 'جارٍ الحفظ…';
      try {
        await post(ctx, { action: 'fitnote', fitnote: { k, text: S(ta.value) } });
        msg.style.color = '#21C77A';
        msg.textContent = 'حُفظت.';
        if (ctx.onSaved) ctx.onSaved();
      } catch (e) {
        msg.style.color = '#EF4D5A';
        msg.textContent = explain(e);
      }
      btn.disabled = false;
    });
  }

  if (!canEdit) return;

  /* ── الرفع ── */
  const msg = $('fbMsg');
  const fileInput = $('fbFile');
  $('fbPick').addEventListener('click', () => fileInput.click());
  const drop = $('fbDrop');
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
    msg.style.color = 'var(--steel,#93A7BA)';
    msg.textContent = 'جارٍ قراءة الملف…';
    $('fbPreview').innerHTML = '';

    let buf;
    try { buf = await file.arrayBuffer(); }
    catch (e) { msg.style.color = '#EF4D5A'; msg.textContent = 'تعذّرت قراءة الملف.'; return; }

    let parsed = { ok: false, error: '' };
    if (isXlsx(file.name)) {
      try {
        parsed = parseFitnessPlan(await readXlsx(buf));
      } catch (e) { parsed = { ok: false, error: S(e && e.message) || 'تعذّرت قراءة الإكسل.' }; }
    }

    /* الملفّ غير الإكسل يُحفظ للتنزيل، ونقول صراحةً أنّ محتواه لا يُقرأ هنا */
    if (!parsed.ok) {
      msg.style.color = isXlsx(file.name) ? '#EF4D5A' : '#F2A93B';
      msg.textContent = isXlsx(file.name)
        ? parsed.error
        : 'هذا ليس ملف إكسل، فلن تظهر جداول التمارين داخل الموقع — ' +
          'يُحفظ الملف للتنزيل وحده. للعرض الكامل استعمل القالب.';
      if (isXlsx(file.name)) return;
    }

    const sport = $('fbSport').value;
    const week = $('fbWeek').value;
    const sessions = parsed.ok ? parsed.sessions : [];
    const hdr = parsed.ok ? (parsed.header || {}) : {};

    /* اللعبة والأسبوع في الملف يسبقان المختار — الملف هو المصدر */
    const sportFinal = matchSport(hdr.sport, sports) || sport;
    const weekFinal = looksLikeWeek(hdr.week) ? S(hdr.week) : week;
    if (parsed.ok && sportFinal !== sport) {
      msg.style.color = '#F2A93B';
      msg.textContent = 'اللعبة في الملف «' + sportFinal + '» وتختلف عن المختارة — ' +
        'ستُحفظ بلعبة الملف.';
    }

    const preview = {
      k: planKey(sportFinal, weekFinal), sport: sportFinal, week: weekFinal,
      focus: S(hdr.focus), block: S(hdr.block), byName: S(hdr.coach) || S(user.name),
      sessions, url: '',
    };

    $('fbPreview').innerHTML = planCard(preview, null, { canEdit: true, canNote: false }) +
      '<div class="fb-card"><div class="fb-row">' +
      '<button class="fb-btn" id="fbSave">حفظ الخطة</button>' +
      '<button class="fb-btn ghost" id="fbCancel">إلغاء</button>' +
      '<span class="fb-sub" id="fbSaveMsg"></span></div></div>';

    host.querySelector('#fbCancel').addEventListener('click', () => {
      $('fbPreview').innerHTML = ''; msg.textContent = '';
    });

    host.querySelector('#fbSave').addEventListener('click', async () => {
      const btn = host.querySelector('#fbSave');
      const sm = host.querySelector('#fbSaveMsg');
      btn.disabled = true;
      sm.style.color = 'var(--steel,#93A7BA)';
      sm.textContent = 'جارٍ الحفظ…';
      try {
        await post(ctx, {
          action: 'fitness',
          name: file.name,
          file: toB64(buf),
          fitness: {
            k: preview.k, sport: sportFinal, week: weekFinal,
            focus: preview.focus, block: preview.block,
            freq: S(hdr.freq), byName: preview.byName,
            sessions, readable: parsed.ok,
          },
        });
        sm.style.color = '#21C77A';
        sm.textContent = 'حُفظت.';
        if (ctx.onSaved) ctx.onSaved();
      } catch (e) {
        btn.disabled = false;
        sm.style.color = '#EF4D5A';
        sm.textContent = explain(e);
      }
    });
  }
}

const looksLikeWeek = (v) => /\d/.test(S(v)) &&
  AR_MONTHS.some((m) => S(v).indexOf(m) >= 0);

/* اسم اللعبة في الملف قد يأتي بلا «ال» أو بمسافات زائدة */
function matchSport(raw, sports) {
  const v = S(raw).replace(/^\(|\)$/g, '').trim();
  if (!v) return '';
  const hit = sports.find((s) => s === v) ||
    sports.find((s) => s.replace(/^ال/, '') === v.replace(/^ال/, ''));
  return hit || '';
}

async function post(ctx, payload) {
  const res = await ctx.api('firebase', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
  const j = await res.json();
  if (!j || !j.ok) throw new Error((j && j.error) || 'فشل الحفظ');
  return j;
}

/* أشهر سببين للفشل قواعد لم تُنشر — نقولهما بدل نصّ Firebase الخام */
function explain(e) {
  const t = S(e && e.message);
  if (t.indexOf('storage/unauthorized') >= 0 || t.indexOf('permission to access') >= 0) {
    return 'قواعد التخزين ترفض الرفع. انشر storage.rules من لوحة Firebase ' +
      '(Storage ← Rules) ثم أعد المحاولة.';
  }
  if (t.indexOf('permission-denied') >= 0 || t.indexOf('insufficient') >= 0) {
    return 'قواعد Firestore ترفض الحفظ. انشر firestore.rules من لوحة Firebase ' +
      '(Firestore ← Rules) ثم تأكّد أنّ حسابك مُعلَّم مدرّب لياقة أو إدارة.';
  }
  return 'تعذّر الحفظ: ' + t;
}

window.__fmacFitnessUI = { render };
export default { render };
