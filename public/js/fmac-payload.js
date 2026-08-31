/* بناء حمولة init — منقولة سطراً بسطر عن دوال Apps Script المشتقّة،
   حتى تقرأ الواجهة نفس الأشكال بالضبط (خرائط لا قوائم، وتعشيش لعبة/موسم). */

export const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

export const S = (v) => (v === null || v === undefined) ? '' : String(v);
const NUM = (v) => Number(v) || 0;

/* ── الأسابيع ──────────────────────────────────────────────── */
export function weekNo(w) {
  const t = String(w || '');
  const m = t.match(/\d+/);
  const y = t.match(/(20\d\d)/);
  let mo = 0;
  for (let i = 0; i < AR_MONTHS.length; i++) if (t.indexOf(AR_MONTHS[i]) >= 0) mo = i + 1;
  return (y ? Number(y[1]) : 0) * 10000 + mo * 100 + (m ? Number(m[0]) : 0);
}
const wkNum = (w) => {
  const m = String(w || '').match(/\d+/);
  return m ? Number(m[0]) : 0;
};
const sameWk = (a, b, bNum) => {
  if (S(a) === S(b)) return true;
  const an = wkNum(a);
  return an && bNum && an === bNum;
};

export function weekAuto(d) {
  const t = d ? new Date(d) : new Date();
  const day = t.getDay();                       // 0 = الأحد
  const start = new Date(t.getTime() - day * 86400000);
  const end = new Date(start.getTime() + 5 * 86400000);
  const sD = start.getDate(), eD = end.getDate();
  const sM = start.getMonth(), eM = end.getMonth();
  const sY = start.getFullYear(), eY = end.getFullYear();
  const no = Math.floor((sD - 1) / 7) + 1;
  const dates = (sM === eM)
    ? (sD + ' – ' + eD + ' ' + AR_MONTHS[sM] + ' ' + sY)
    : (sD + ' ' + AR_MONTHS[sM] + ' – ' + eD + ' ' + AR_MONTHS[eM] + ' ' + eY);
  return { no, label: 'الأسبوع ' + no + ' — ' + AR_MONTHS[sM] + ' ' + sY, dates };
}

/* ── الإعدادات — مقابل cfg_ (المستهدفات متداخلة، لا مسطّحة) ── */
export function buildSettings(cfgDoc) {
  const o = cfgDoc || {};
  const n = (v) => { const x = Number(v); return x > 0 ? x : null; };
  const t = o.targets || {};
  return {
    week: S(o.week),
    dates: S(o.dates),
    club: S(o.club) || 'نادي الفجيرة للفنون القتالية',
    targets: {
      plan: n(t.plan), exec: n(t.exec), intensity: n(t.intensity),
      volume: n(t.volume), goals: n(t.goals),
    },
  };
}
export const weekNow = (settings) =>
  settings && settings.week ? { label: settings.week, dates: settings.dates } : weekAuto();

/* ── خرائط بسيطة ──────────────────────────────────────────── */
export function planMap(plans) {
  const out = {};
  for (const p of plans) {
    if (!p.k) continue;
    out[p.k] = {
      branch: S(p.branch), coach: S(p.coach), players: NUM(p.players),
      category: S(p.category), items: NUM(p.items), slot: NUM(p.slot),
    };
  }
  return out;
}

export function attendList(rows) {
  const out = {};
  for (const r of rows) {
    const k = S(r.k); if (!k) continue;
    out[k] = { planned: NUM(r.planned), actual: NUM(r.actual), by: S(r.by), at: S(r.at) };
  }
  return out;
}
export function replyList(rows) {
  const out = {};
  for (const r of rows) {
    const k = S(r.k), t = S(r.text);
    if (!k || !t) continue;
    out[k] = { text: t, by: S(r.by), at: S(r.at) };
  }
  return out;
}
export function cancelList(rows) {
  const out = {};
  for (const r of rows) {
    const k = S(r.k); if (!k) continue;
    const reason = S(r.reason);
    if (reason) out[k] = { reason, by: S(r.by), at: S(r.at) };
  }
  return out;
}
export function readTicks(rows, week) {
  const out = {};
  const only = S(week), onlyN = wkNum(only);
  for (const r of rows) {
    const k = S(r.k); if (!k) continue;
    if (only && S(r.week) && !sameWk(S(r.week), only, onlyN)) continue;
    const st = S(r.s), n = S(r.n);
    if (st || n) out[k] = { s: st, n };
  }
  return out;
}

/* ── بنود الخطط — إعادة تركيب الأيام والأقسام ─────────────── */
export function planItems(rows, week) {
  const byPlan = {}, order = [];
  for (const r of rows) {
    const id = S(r.planId), w = S(r.week), item = S(r.item);
    if (!id || !item || w !== week) continue;
    let p = byPlan[id];
    if (!p) {
      p = byPlan[id] = {
        id, sport: S(r.sport), name: S(r.name), week: w, category: S(r.category),
        branch: S(r.branch), coach: S(r.coach), source: 'رفع المدرب',
        objectives: [], days: [],
      };
      order.push(id);
    }
    const di = Math.max(1, NUM(r.dayNo) || 1);
    while (p.days.length < di) {
      p.days.push({ day: '', date: '', goal: '', intensity: '', volume: '',
        duration: '', notes: '', sections: [] });
    }
    const d = p.days[di - 1];
    if (S(r.day)) d.day = S(r.day);
    if (S(r.date)) d.date = S(r.date);
    if (S(r.goal)) d.goal = S(r.goal);
    if (S(r.intensity)) d.intensity = S(r.intensity);
    if (S(r.volume)) d.volume = S(r.volume);
    const sn = S(r.section) || 'التمارين';
    let sec = null;
    for (const x of d.sections) if (x.name === sn) sec = x;
    if (!sec) { sec = { name: sn, dur: S(r.dur), items: [] }; d.sections.push(sec); }
    if (!sec.dur && S(r.dur)) sec.dur = S(r.dur);
    sec.items.push(item);
  }
  return order.map((k) => byPlan[k]);
}

/* ── المرحلة التلقائية — مقابل autoStage_ ─────────────────── */
export function autoStage(raw, week, id, days, cancDay, ratedDay, weekClosed, ratedN, dayItems) {
  const AUTO = { 'معتمدة': 1, 'جاري التنفيذ': 1, 'مكتملة': 1, 'مغلقة': 1 };
  if (!AUTO[raw]) return raw;
  if (weekClosed) return 'مغلقة';
  let due = 0, touched = 0, full = 0;
  for (const d in days) {
    const k = week + '|' + id + '|' + d;
    if (cancDay[k]) continue;
    due++;
    if (ratedDay[k]) touched++;
    const n = dayItems ? dayItems[k] : 0;
    if (n && ratedN && (ratedN[k] || 0) >= n) full++;
  }
  if (due && full >= due) return 'مكتملة';
  if (touched) return 'جاري التنفيذ';
  return 'معتمدة';
}

/* ── الأرشيف — فهرس أسبوعي، أثقل دالة في السكربت ──────────── */
export function archive(R, user, nowLabel) {
  const only = (user && !user.admin) ? S(user.code) : '';
  const closed = {}, byWeek = {};
  for (const r of R.weeks) {
    if (S(r.k)) closed[S(r.k)] = { state: S(r.state), by: S(r.by), at: S(r.at) };
  }

  const sportOf = {}, catOf = {}, coachOf = {}, itemsOf = {};
  for (const r of R.plans) {
    const id = S(r.k); if (!id) continue;
    sportOf[id] = S(r.sport); coachOf[id] = S(r.coach);
    catOf[id] = S(r.category); itemsOf[id] = NUM(r.items);
  }

  const cancDay = {}, canc = {};
  for (const r of R.cancels) {
    const a = S(r.k).split('|');
    if (a.length < 3) continue;
    cancDay[a[0] + '|' + a[1] + '|' + a[2]] = 1;
    canc[a[0] + '|' + a[1]] = (canc[a[0] + '|' + a[1]] || 0) + 1;
  }

  const cnt = {};
  for (const r of R.items) {
    const id = S(r.planId), w = S(r.week);
    if (!id || !w || !S(r.item)) continue;
    const di = Math.max(1, NUM(r.dayNo) || 1) - 1;
    const k = w + '|' + id;
    if (!cnt[k]) {
      cnt[k] = { n: 0, days: {}, sport: S(r.sport), name: S(r.name),
        cat: S(r.category), branch: S(r.branch), coach: S(r.coach) };
    }
    cnt[k].days[di] = 1;
    if (cancDay[w + '|' + id + '|' + di]) continue;
    cnt[k].n++;
  }

  const done = {};
  for (const r of R.ticks) {
    const key = S(r.k), w = S(r.week), id = S(r.planId), st = S(r.s);
    if (!w || !id || !st) continue;
    const a = key.split('|');
    if (a.length >= 3 && cancDay[w + '|' + id + '|' + a[2]]) continue;
    const k = w + '|' + id;
    done[k] = (done[k] || 0) +
      (st.indexOf('جزئ') >= 0 ? 0.5 : (st.indexOf('لم') >= 0 ? 0 : 1));
  }

  const stage = {};
  for (const r of R.stages) {
    if (S(r.planId) && S(r.week)) stage[S(r.week) + '|' + S(r.planId)] = S(r.stage);
  }

  const ratedDay = {}, ratedN = {};
  for (const r of R.ticks) {
    const a = S(r.k).split('|');
    if (a.length < 5 || !S(r.s)) continue;
    const k = a[0] + '|' + a[1] + '|' + a[2];
    ratedDay[k] = 1;
    ratedN[k] = (ratedN[k] || 0) + 1;
  }
  const dayItems = {};
  for (const r of R.items) {
    const id = S(r.planId), w = S(r.week);
    if (!id || !w || !S(r.item)) continue;
    const k = w + '|' + id + '|' + (Math.max(1, NUM(r.dayNo) || 1) - 1);
    dayItems[k] = (dayItems[k] || 0) + 1;
  }

  const files = {};
  for (const r of R.versions) {
    if (S(r.planId) && S(r.week)) {
      files[S(r.week) + '|' + S(r.planId)] = { url: S(r.url), file: S(r.file) };
    }
  }

  const users = {};
  for (const u of R.users) if (!u.admin) users[S(u.k)] = S(u.name);

  for (const k of Object.keys(cnt)) {
    const a = k.split('|'), w = a[0], id = a[1], c = cnt[k];
    if (w === nowLabel) continue;
    if (only && S(c.coach || coachOf[id]) !== only) continue;
    if (!byWeek[w]) {
      byWeek[w] = { week: w, plans: [], total: 0, done: 0, days: 0, cancelled: 0,
        state: (closed[w] && closed[w].state) || 'مفتوح',
        by: (closed[w] && closed[w].by) || '',
        at: (closed[w] && closed[w].at) || '' };
    }
    let nd = 0; for (const x in c.days) nd++;
    const dn = done[k] || 0, cc = canc[k] || 0;
    const f = files[k] || {};
    byWeek[w].plans.push({
      id, sport: c.sport || sportOf[id] || '—', name: c.name,
      cat: c.cat || catOf[id] || '', branch: c.branch || '',
      coach: users[c.coach || coachOf[id]] || '—',
      coachCode: c.coach || coachOf[id] || '',
      items: c.n, days: nd, done: Math.round(dn * 10) / 10, cancelled: cc,
      pct: c.n ? Math.round(dn / c.n * 100) : 0,
      stage: autoStage(stage[k] || 'مرفوعة', w, id, c.days, cancDay, ratedDay,
        (closed[w] && closed[w].state) === 'مغلق', ratedN, dayItems),
      url: f.url || '', file: f.file || '',
    });
    byWeek[w].total += c.n;
    byWeek[w].done += dn;
    byWeek[w].days += nd;
    byWeek[w].cancelled += cc;
  }

  const out = Object.keys(byWeek).map((w) => {
    const x = byWeek[w];
    x.pct = x.total ? Math.round(x.done / x.total * 100) : 0;
    x.done = Math.round(x.done * 10) / 10;
    x.plans.sort((a, b) => a.sport < b.sport ? -1 : a.sport > b.sport ? 1 : 0);
    return x;
  });
  out.sort((a, b) => weekNo(b.week) - weekNo(a.week) || (a.week < b.week ? 1 : -1));
  return out.slice(0, 12);
}

/* ── التاريخ الأسبوعي — منحنى التطوّر ─────────────────────── */
export function history(R) {
  const sportOf = {}, coachOf = {}, itemsOf = {};
  for (const r of R.plans) {
    const id = S(r.k); if (!id) continue;
    sportOf[id] = S(r.sport); coachOf[id] = S(r.coach); itemsOf[id] = NUM(r.items);
  }
  for (const r of R.items) {
    const id = S(r.planId); if (!id) continue;
    if (!sportOf[id]) sportOf[id] = S(r.sport);
    if (!coachOf[id]) coachOf[id] = S(r.coach);
  }
  const W = {};
  function slot(wk, kind, name) {
    if (!W[wk]) W[wk] = { week: wk, done: 0, total: 0, sports: {}, coaches: {}, plans: {} };
    if (!kind) return W[wk];
    const g = W[wk][kind];
    if (!g[name]) g[name] = { done: 0, total: 0 };
    return g[name];
  }
  for (const r of R.ticks) {
    const wk = S(r.week), id = S(r.planId), st = S(r.s);
    if (!wk || !st) continue;
    const v = st.indexOf('جزئ') >= 0 ? 0.5 : (st.indexOf('لم') >= 0 ? 0 : 1);
    slot(wk).done += v;
    slot(wk, 'sports', sportOf[id] || S(r.sport) || '—').done += v;
    slot(wk, 'coaches', coachOf[id] || '—').done += v;
    slot(wk, 'plans', id).done += v;
  }
  const seenWk = {};
  for (const r of R.ticks) {
    const wk = S(r.week), id = S(r.planId);
    if (!wk || !id || !W[wk]) continue;
    const k = wk + '|' + id;
    if (seenWk[k]) continue;
    seenWk[k] = true;
    const n = itemsOf[id] || 0;
    if (!n) continue;
    W[wk].total += n;
    slot(wk, 'sports', sportOf[id] || '—').total += n;
    slot(wk, 'coaches', coachOf[id] || '—').total += n;
    slot(wk, 'plans', id).total += n;
  }
  const pct = (o) => o.total ? Math.round(o.done / o.total * 100) : 0;
  let keys = Object.keys(W).sort((a, b) => weekNo(a) - weekNo(b));
  if (keys.length > 16) keys = keys.slice(keys.length - 16);
  return keys.map((wk) => {
    const w = W[wk], sp = {}, co = {};
    for (const k of Object.keys(w.sports)) sp[k] = pct(w.sports[k]);
    for (const k of Object.keys(w.coaches)) co[k] = pct(w.coaches[k]);
    return { week: wk, score: pct(w), items: w.total, sports: sp, coaches: co };
  });
}

/* ── تعشيش لعبة ← موسم ────────────────────────────────────── */
export function results(rows) {
  const out = {};
  for (const r of rows) {
    const sp = S(r.sport), y = S(r.season), nm = S(r.name);
    if (!sp || !y || !nm) continue;
    if (!out[sp]) out[sp] = {};
    if (!out[sp][y]) out[sp][y] = { championships: [] };
    out[sp][y].championships.push({
      name: nm, gold: NUM(r.gold), silver: NUM(r.silver), bronze: NUM(r.bronze),
      scope: S(r.scope) || 'محلي', date: S(r.date), place: S(r.place), added: true,
    });
  }
  return out;
}
export function national(rows) {
  const out = {};
  for (const r of rows) {
    const sp = S(r.sport), y = S(r.season), nm = S(r.name);
    if (!sp || !y || !nm) continue;
    if (!out[sp]) out[sp] = {};
    if (!out[sp][y]) out[sp][y] = { players: [] };
    out[sp][y].players.push({ k: S(r.k), name: nm, cat: S(r.cat),
      note: S(r.note), by: S(r.by), at: S(r.at) });
  }
  return out;
}
export function camps(rows) {
  const out = {};
  for (const r of rows) {
    const sp = S(r.sport), y = S(r.season), nm = S(r.name);
    if (!sp || !y || !nm) continue;
    if (!out[sp]) out[sp] = {};
    if (!out[sp][y]) out[sp][y] = { camps: [] };
    out[sp][y].camps.push({ name: nm, date: S(r.date), place: S(r.place),
      kind: S(r.kind) || 'داخلي', scope: S(r.scope) || 'نادي',
      players: NUM(r.players), added: true });
  }
  return out;
}
export function shields(rows) {
  const out = {};
  for (const r of rows) {
    const sp = S(r.sport), y = S(r.season), kind = S(r.kind);
    if (!sp || !y || !kind) continue;
    const rank = NUM(r.rank) || 1, pts = NUM(r.points);
    const table = [{ rank, club: 'نادي الفجيرة للفنون القتالية', points: pts }];
    if (S(r.rival)) {
      table.push({ rank: rank === 1 ? 2 : 1, club: S(r.rival), points: NUM(r.rivalPoints) });
    }
    table.sort((a, b) => a.rank - b.rank);
    if (!out[sp]) out[sp] = {};
    if (!out[sp][y]) out[sp][y] = { shields: [] };
    out[sp][y].shields.push({ kind, table, added: true });
  }
  return out;
}

/* ── قوائم بسيطة ──────────────────────────────────────────── */
export const calendarList = (rows) => rows.filter((r) => S(r.k)).map((r) => ({
  k: S(r.k), season: S(r.season), date: S(r.date), name: S(r.name), sport: S(r.sport),
  scope: S(r.scope) || 'محلي', fed: S(r.fed), place: S(r.place),
  status: S(r.status) || 'قادمة', date0: S(r.date0), reason: S(r.reason),
  note: S(r.note), by: S(r.by), at: S(r.at),
}));

export const agendaList = (rows) => rows.filter((r) => S(r.k)).map((r) => ({
  k: S(r.k), date: S(r.date), time: S(r.time), kind: S(r.kind), title: S(r.title),
  detail: S(r.detail), branch: S(r.branch), state: S(r.state) || 'مفتوح',
  by: S(r.by), at: S(r.at),
}));

export const visitsList = (rows) => rows.filter((r) => S(r.k))
  .map((r) => {
    const st = S(r.state) || 'مفتوحة';
    if (st === 'ملغاة') return null;
    return { k: S(r.k), date: S(r.date), sport: S(r.sport), branch: S(r.branch),
      coach: S(r.coach), plan: S(r.plan), time: S(r.time), org: S(r.org),
      gear: S(r.gear), note: S(r.note), action: S(r.action), state: st,
      by: S(r.by), at: S(r.at), venue: S(r.venue), owner: S(r.owner), agn: S(r.agn) };
  }).filter((x) => x);

export const subsList = (rows) => rows.filter((r) => S(r.code)).map((r) => ({
  at: S(r.at), code: S(r.code), name: S(r.name), sport: S(r.sport),
  branch: S(r.branch), category: S(r.category), week: S(r.week),
  players: NUM(r.players), file: S(r.file), url: S(r.url), note: S(r.note),
}));

export const userList = (rows) => rows.filter((r) => S(r.k) && !r.admin).map((r) => ({
  code: S(r.k), name: S(r.name), sport: S(r.sport), branch: S(r.branch),
  phone: S(r.phone), photo: S(r.photo),
}));

export const allUsers = (rows) => rows.filter((r) => S(r.k)).map((r) => ({
  code: S(r.k), name: S(r.name), role: S(r.role) || 'مدرب', admin: !!r.admin,
  sport: S(r.sport), branch: S(r.branch), phone: S(r.phone), note: S(r.note),
  photo: S(r.photo), email: S(r.email),
}));

/* ── سجل التدقيق ──────────────────────────────────────────── */
const nItem = (n) => n === 1 ? 'بنداً واحداً' : n === 2 ? 'بندين'
  : n <= 10 ? n + ' بنود' : n + ' بنداً';

function planLabel(R) {
  const m = {};
  for (const r of R.items) {
    const id = S(r.planId); if (!id || m[id]) continue;
    const sp = S(r.sport), nm = S(r.name), ct = S(r.category);
    m[id] = ct ? ((sp || nm || id) + ' — ' + ct) : (nm || sp || id);
  }
  for (const r of R.plans) {
    const id = S(r.k); if (!id) continue;
    const sp = S(r.sport), ct = S(r.category), nm = S(r.name);
    m[id] = ct ? ((sp || nm || id) + ' — ' + ct) : (nm || sp || id);
  }
  return m;
}

export function audit(R) {
  const out = [], PL = planLabel(R);
  const nm = (id) => PL[S(id)] || S(id);

  for (const r of R.subs) {
    if (!S(r.code)) continue;
    out.push({ at: S(r.at), by: S(r.name), kind: 'رفع',
      txt: 'رفع خطة ' + S(r.sport) + (S(r.category) ? ' — ' + S(r.category) : '') +
           ' · ' + S(r.week) });
  }
  for (const r of R.versions) {
    if (!S(r.k)) continue;
    out.push({ at: S(r.at), by: S(r.by), kind: 'نسخة', pid: S(r.planId),
      txt: 'رفع النسخة ' + S(r.n) + ' من خطة ' + nm(r.planId) + ' · ' + S(r.week) });
  }
  for (const r of R.stages) {
    if (!S(r.k)) continue;
    const st = S(r.stage);
    out.push({ at: S(r.at), by: S(r.by), pid: S(r.planId),
      kind: st === 'معتمدة' ? 'اعتماد' : st === 'تحتاج تعديل' ? 'إرجاع' : 'مرحلة',
      txt: 'نقل خطة ' + nm(r.planId) + ' إلى «' + st + '»' +
           (S(r.note) ? ' — ' + S(r.note) : '') });
  }
  for (const r of R.cancels) {
    if (!S(r.reason)) continue;
    out.push({ at: S(r.at), by: S(r.by), kind: 'إلغاء', pid: S(r.planId),
      txt: 'ألغى حصة ' + S(r.sport) + ' — ' + S(r.dayName) + ' · ' + S(r.reason) });
  }
  for (const r of R.notes) {
    if (!S(r.text)) continue;
    out.push({ at: S(r.at), by: S(r.by), kind: 'ملاحظة', pid: S(r.planId),
      txt: 'ملاحظة فنية على ' + nm(r.planId) +
           (S(r.dayName) ? ' · ' + S(r.dayName) : '') + ': ' + S(r.text) });
  }
  for (const r of R.replies) {
    if (!S(r.text)) continue;
    out.push({ at: S(r.at), by: S(r.by), kind: 'ردّ', pid: S(r.planId),
      txt: 'ردّ المدرب على ' + nm(r.planId) +
           (S(r.day) ? ' · ' + S(r.day) : '') + ': ' + S(r.text) });
  }
  for (const r of R.weeks) {
    if (!S(r.k)) continue;
    out.push({ at: S(r.at), by: S(r.by), kind: 'إغلاق',
      txt: (S(r.state) === 'مغلق' ? 'أغلق ' : 'أعاد فتح ') + S(r.k) +
           (S(r.note) ? ' — ' + S(r.note) : '') });
  }

  /* الرصد يُجمَّع في سطر لكل (خطة · يوم · مستخدم · ساعة) */
  const agg = {}, order = [];
  for (const r of R.ticks) {
    if (!S(r.k) || !S(r.s)) continue;
    const at = S(r.at), by = S(r.by), pid = S(r.planId), day = S(r.day);
    const g = pid + '|' + day + '|' + by + '|' + at.slice(0, 13);
    let a = agg[g];
    if (!a) { a = agg[g] = { at, by, pid, day, n: 0 }; order.push(g); }
    a.n++;
    if (at > a.at) a.at = at;
  }
  for (const g of order) {
    const a = agg[g];
    out.push({ at: a.at, by: a.by, kind: 'رصد', pid: a.pid,
      txt: 'رصد ' + nItem(a.n) + ' في ' + nm(a.pid) + (a.day ? ' · ' + a.day : '') });
  }

  out.sort((a, b) => a.at < b.at ? 1 : a.at > b.at ? -1 : 0);
  return out.slice(0, 400);
}
