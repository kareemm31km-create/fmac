/* شاشةُ الدخول — React + Framer Motion.

   تُحمَّل الحزمُ من الشبكة. وشاشةُ الدخول هي البابُ إلى كلّ شيء،
   فإن تعذّر التحميلُ ردَّ fmac-login-ui.js إلى نموذجٍ بسيطٍ يفتح
   الباب على كلّ حال — لا يسقط الدخولُ لأنّ CDN تأخّر.

   العقدُ مع fmac-auth.js قيميٌّ لا أمريّ: المصادقةُ تستقبل قيماً
   وتُرجع {ok} أو {ok:false,msg}، وReact يملك حالةَ الواجهة. وكان
   العقدُ قبلَها يُعدّل العُقَد مباشرةً (go.disabled, textContent)
   وذلك يصطدم بإعادة الرسم. */

/* ?deps يُثبّت الاعتماديّة في الرابط نفسِه، فتستورد framer-motion
   عنوانَ React عينَه الذي نستورده — نسخةٌ واحدةٌ لا نسختان، ولولاه
   سقطت الخطّافات. وبه نستغني عن خريطة استيرادٍ في ثماني صفحات. */
import React, { useState, useRef, useEffect, useCallback } from 'https://esm.sh/react@18.3.1';
import { createRoot } from 'https://esm.sh/react-dom@18.3.1/client?deps=react@18.3.1';
import { motion, AnimatePresence, useReducedMotion, LayoutGroup }
  from 'https://esm.sh/framer-motion@11.11.17?deps=react@18.3.1,react-dom@18.3.1';
import htm from 'https://esm.sh/htm@3.1.1';

const html = htm.bind(React.createElement);

/* ───────── أيقونات ───────── */
const Svg = (p) => React.createElement('svg', Object.assign(
  { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7 }, p));

const IcMail = () => html`<${Svg} className="ic"><rect x="2.5" y="4.5" width="19" height="15" rx="3"/><path d="m3.5 7 7.4 5.3a2 2 0 0 0 2.2 0L20.5 7"/></${Svg}>`;
const IcLock = () => html`<${Svg} className="ic"><rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></${Svg}>`;
const IcUser = () => html`<${Svg} className="ic"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c1.2-3.6 4-5.4 7.5-5.4S18.3 16.4 19.5 20"/></${Svg}>`;
const IcPhone = () => html`<${Svg} className="ic"><rect x="6.5" y="2.5" width="11" height="19" rx="3"/><path d="M10.5 18.5h3"/></${Svg}>`;
const IcGlobe = () => html`<${Svg} width="17" height="17" strokeWidth="1.6"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 2.6 15.4 0 18M12 3c-2.6 2.6-2.6 15.4 0 18"/></${Svg}>`;
const IcArrow = () => html`<${Svg} className="arw" width="18" height="18" strokeWidth="2"><path d="M14 6l6 6-6 6M20 12H4"/></${Svg}>`;
const IcEye = (p) => p.off
  ? html`<${Svg} width="19" height="19"><path d="M2.5 12S6 5.5 12 5.5c1.6 0 3 .4 4.2 1"/><path d="M20 8.6c1 1.2 1.5 2.2 1.5 2.2S18 18.5 12 18.5c-1.9 0-3.5-.6-4.8-1.4"/><path d="M3 3l18 18"/></${Svg}>`
  : html`<${Svg} width="19" height="19"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></${Svg}>`;

/* ───────── حركات ───────── */
const SPRING = { type: 'spring', stiffness: 260, damping: 26 };
const EASE = [0.22, 1, 0.36, 1];

/* ───────── الحقل: تسميةٌ تطفو ───────── */
function Field({ id, type, label, icon, dir, autoComplete, inputMode,
                 value, onChange, onKeyDown, children, textarea, options, reduce }) {
  const [focus, setFocus] = useState(false);
  const up = focus || String(value || '').length > 0;
  const Tag = textarea ? 'textarea' : (options ? 'select' : 'input');
  const common = {
    id, value: value || '',
    onChange: (e) => onChange(e.target.value),
    onKeyDown,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    'aria-label': label,
    autoComplete, inputMode,
    dir: dir || undefined,
    placeholder: ' ',
  };
  if (!textarea && !options) common.type = type || 'text';
  if (textarea) common.maxLength = 400;

  return html`
    <div className=${'fld' + (icon ? '' : ' noic') + (focus ? ' on' : '')}>
      ${icon}
      ${options
        ? html`<select ...${common}>${options.map((o, i) =>
            html`<option key=${i} value=${i ? o : ''}>${o}</option>`)}</select>`
        : React.createElement(Tag, common)}
      <${motion.label}
        className="flbl"
        initial=${false}
        animate=${up ? 'up' : 'rest'}
        variants=${{
          rest: { y: 0, scale: 1, opacity: 0.85 },
          up: { y: -13, scale: 0.78, opacity: 1 },
        }}
        transition=${reduce ? { duration: 0 } : { duration: 0.18, ease: EASE }}
      >${label}<//>
      ${children}
    </div>`;
}

/* ───────── الزرّ ───────── */
function Go({ busy, label, busyLabel, onClick, reduce }) {
  return html`
    <${motion.button}
      type="button"
      className="go"
      disabled=${busy}
      onClick=${onClick}
      whileHover=${busy || reduce ? {} : { y: -2 }}
      whileTap=${busy || reduce ? {} : { scale: 0.985 }}
      transition=${SPRING}
    >
      <span className="golbl">${busy ? busyLabel : label}</span>
      ${busy ? html`<span className="spin" aria-hidden="true"></span>` : html`<${IcArrow}/>`}
    <//>`;
}

/* ───────── رسالة ───────── */
function Msg({ id, node, ok, reduce }) {
  return html`
    <${AnimatePresence} initial=${false}>
      ${node ? html`
        <${motion.div}
          key="m"
          id=${id}
          className=${'msg' + (ok ? ' ok' : '')}
          initial=${reduce ? { opacity: 0 } : { opacity: 0, height: 0, y: -4 }}
          animate=${reduce ? { opacity: 1 } : { opacity: 1, height: 'auto', y: 0 }}
          exit=${reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
          transition=${{ duration: reduce ? 0 : 0.26, ease: EASE }}
        >${typeof node === 'string'
            ? node
            : html`<span dangerouslySetInnerHTML=${{ __html: node.html }}/>`}<//>`
        : null}
    </${AnimatePresence}>`;
}

/* ───────── نموذج الدخول ───────── */
function SignIn({ t, on, reduce, extErr }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [rem, setRem] = useState(true);
  const [see, setSee] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(false);
  const [caps, setCaps] = useState(false);
  const passRef = useRef(null);

  const shown = extErr || err;

  const submit = useCallback(async () => {
    if (busy) return;
    setErr(null); setOk(false); setBusy(true);
    const r = await on.signIn({ email: email.trim(), password: pass, remember: rem });
    if (r && r.ok) return;            /* الشاشةُ تُزال من الخارج */
    setBusy(false);
    setErr((r && r.msg) || t.failed);
  }, [busy, email, pass, rem, on, t]);

  const reset = useCallback(async () => {
    if (!email.trim()) { setOk(false); setErr(t.needEmail); return; }
    const r = await on.reset(email.trim());
    setOk(!!(r && r.ok)); setErr((r && r.msg) || t.resetSent);
  }, [email, on, t]);

  const caret = (e) => {
    if (e.getModifierState) setCaps(e.getModifierState('CapsLock'));
  };

  return html`
    <div className="form">
      <h1>${t.hi}</h1>
      <p className="lead">${t.hiSub}</p>

      <${Field} id="fmEmail" type="email" label=${t.email} dir="ltr"
        autoComplete="username" inputMode="email" reduce=${reduce}
        icon=${html`<${IcMail}/>`} value=${email} onChange=${setEmail}
        onKeyDown=${(e) => { if (e.key === 'Enter' && passRef.current) passRef.current.focus(); }}/>

      <${Field} id="fmPass" type=${see ? 'text' : 'password'} label=${t.pass} dir="ltr"
        autoComplete="current-password" reduce=${reduce}
        icon=${html`<${IcLock}/>`} value=${pass} onChange=${setPass}
        onKeyDown=${(e) => { caret(e); if (e.key === 'Enter') submit(); }}>
        <button className="eye" type="button" aria-label=${t.pass}
          onClick=${() => { setSee((v) => !v); if (passRef.current) passRef.current.focus(); }}>
          <${IcEye} off=${see}/>
        </button>
      </${Field}>

      <${AnimatePresence}>
        ${caps ? html`<${motion.div} key="c" className="caps"
          initial=${{ opacity: 0, y: -4 }} animate=${{ opacity: 1, y: 0 }}
          exit=${{ opacity: 0 }} transition=${{ duration: reduce ? 0 : 0.2 }}>
          ${t.caps}<//>` : null}
      </${AnimatePresence}>

      <div className="row">
        <label><input id="fmRem" type="checkbox" checked=${rem}
          onChange=${(e) => setRem(e.target.checked)}/>${t.remember}</label>
        <a role="button" tabIndex=${0} onClick=${reset}
           onKeyDown=${(e) => { if (e.key === 'Enter') reset(); }}>${t.forgot}</a>
      </div>

      <${Go} busy=${busy} label=${t.go} busyLabel=${t.going} onClick=${submit} reduce=${reduce}/>
      <${Msg} id="fmErr" node=${shown} ok=${ok} reduce=${reduce}/>
      <div className="alt">${t.noAcc}<a role="button" tabIndex=${0}
        onClick=${() => on.tab('up')}>${t.ask}</a></div>
    </div>`;
}

/* ───────── نموذج طلب الحساب ───────── */
function Request({ t, on, reduce, sports }) {
  const [v, setV] = useState({ name: '', email: '', sport: '', phone: '', note: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [done, setDone] = useState(false);
  const set = (k) => (x) => setV((o) => Object.assign({}, o, { [k]: x }));

  const submit = async () => {
    if (busy) return;
    if (!v.name.trim() || !v.email.trim()) { setErr(t.needName); return; }
    setErr(null); setBusy(true);
    const r = await on.request(v);
    setBusy(false);
    if (r && r.ok) { setDone(true); return; }
    setErr((r && r.msg) || t.failed);
  };

  if (done) {
    return html`
      <${motion.div} className="form" initial=${{ opacity: 0, y: 8 }} animate=${{ opacity: 1, y: 0 }}
        transition=${{ duration: reduce ? 0 : 0.35, ease: EASE }}>
        <h1>${t.reqTitle}</h1>
        <p className="lead">${t.sent}</p>
        <${Go} busy=${false} label=${t.backIn} onClick=${() => on.tab('in')} reduce=${reduce}/>
      <//>`;
  }

  return html`
    <div className="form">
      <h1>${t.reqTitle}</h1>
      <p className="lead">${t.reqSub}</p>
      <${Field} id="rqName" label=${t.name} icon=${html`<${IcUser}/>`} reduce=${reduce}
        value=${v.name} onChange=${set('name')}/>
      <${Field} id="rqEmail" type="email" label=${t.email} dir="ltr" inputMode="email"
        icon=${html`<${IcMail}/>`} reduce=${reduce} value=${v.email} onChange=${set('email')}/>
      <${Field} id="rqSport" label=${t.sport} reduce=${reduce}
        options=${[t.sport].concat(sports)} value=${v.sport} onChange=${set('sport')}/>
      <${Field} id="rqPhone" label=${t.phone} dir="ltr" inputMode="tel"
        icon=${html`<${IcPhone}/>`} reduce=${reduce} value=${v.phone} onChange=${set('phone')}/>
      <${Field} id="rqNote" label=${t.note} textarea reduce=${reduce}
        value=${v.note} onChange=${set('note')}/>
      <${Go} busy=${busy} label=${t.send} busyLabel=${t.sending} onClick=${submit} reduce=${reduce}/>
      <${Msg} id="rqMsg" node=${err} reduce=${reduce}/>
      <div className="alt">${t.haveAcc}<a role="button" tabIndex=${0}
        onClick=${() => on.tab('in')}>${t.backIn}</a></div>
    </div>`;
}

/* ───────── إلزام تغيير كلمة المرور ───────── */
function Change({ t, on, reduce }) {
  const [a, setA] = useState(''); const [b, setB] = useState('');
  const [see, setSee] = useState(false);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(null);
  const submit = async () => {
    if (busy) return;
    setErr(null); setBusy(true);
    const r = await on.change({ a, b });
    if (r && r.ok) return;
    setBusy(false); setErr((r && r.msg) || t.failed);
  };
  return html`
    <div className="form">
      <h1>${t.chTitle}</h1>
      <p className="lead">${t.chSub}</p>
      <${Field} id="chA" type=${see ? 'text' : 'password'} label=${t.chNew} dir="ltr"
        autoComplete="new-password" icon=${html`<${IcLock}/>`} reduce=${reduce}
        value=${a} onChange=${setA}>
        <button className="eye" type="button" onClick=${() => setSee((x) => !x)}>
          <${IcEye} off=${see}/></button>
      </${Field}>
      <${Field} id="chB" type=${see ? 'text' : 'password'} label=${t.chAgain} dir="ltr"
        autoComplete="new-password" icon=${html`<${IcLock}/>`} reduce=${reduce}
        value=${b} onChange=${setB}
        onKeyDown=${(e) => { if (e.key === 'Enter') submit(); }}/>
      <${Go} busy=${busy} label=${t.chGo} busyLabel=${t.chSaving} onClick=${submit} reduce=${reduce}/>
      <${Msg} id="chMsg" node=${err} reduce=${reduce}/>
    </div>`;
}

/* ───────── خلفيّةُ المشهد ─────────
   كانت الصورةُ محبوسةً في نصفٍ والنموذجُ في النصف الآخر: لوحتان
   متجاورتان لا مشهدٌ واحد. الصورةُ تملأ السطحَ كلَّه، والمحتوى
   يجلس فوقها في محورٍ واحد. */
function Scene({ reduce }) {
  const [hero, setHero] = useState(false);
  useEffect(() => {
    const im = new Image();
    im.onload = () => setHero(true);
    im.src = './img/hero.jpg';
    return () => { im.onload = null; };
  }, []);
  return html`
    <${React.Fragment}>
      <div className=${'shot' + (hero ? ' on' : '')} aria-hidden="true">
        <${motion.div} className="shotimg"
          initial=${{ scale: 1 }}
          animate=${reduce ? { scale: 1 } : { scale: [1, 1.07, 1] }}
          transition=${reduce ? {} : { duration: 42, repeat: Infinity, ease: 'easeInOut' }}/>
      </div>
      <div className="scrim" aria-hidden="true"/>
    </${React.Fragment}>`;
}

/* ───────── قاعدةُ المشهد: الشعارُ والألعابُ والتذييل ───────── */
function Base({ t, sports, reduce, rise }) {
  /* الشريطُ يسير: عشرُ ألعابٍ في صفٍّ ثابتٍ تتزاحم حتّى لا تُقرأ */
  const row = sports.concat(sports);
  return html`
    <footer className="base">
      <${motion.p} className="creed" ...${rise(5)}>
        ${t.creed.map((c, i) => html`<${React.Fragment} key=${c}>
          ${i ? html`<i/>` : null}<b>${c}</b></${React.Fragment}>`)}
      <//>
      <${motion.div} className="marq" ...${rise(6)}>
        <${motion.div} className="marqrow"
          animate=${reduce ? {} : { x: ['0%', '-50%'] }}
          transition=${reduce ? {} : { duration: 46, repeat: Infinity, ease: 'linear' }}>
          ${row.map(([ar, slug], i) => html`
            <span className="sp" key=${i} title=${ar}>
              <img src=${'./img/sports/' + slug + '.png'} alt="" aria-hidden="true"/>
              <b>${ar}</b>
            </span>`)}
        <//>
      <//>
      <${motion.div} className="foot" ...${rise(7)}>
        <div className="f1">${t.foot}</div>
        <div className="est"><b>FMAC</b><i>EST. 2017</i></div>
      <//>
    </footer>`;
}

/* ───────── الجذر ───────── */
function App({ mode, t, on, sports, extErr }) {
  const reduce = useReducedMotion();
  const [tab, setTab] = useState('in');
  const paneRef = useRef(null);

  /* الوهجُ يتبع المؤشّر — عمقٌ يستجيب، لا زينةٌ ساكنة */
  useEffect(() => {
    if (reduce) return;
    const el = paneRef.current; if (!el) return;
    let raf = 0;
    const move = (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
        el.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
      });
    };
    el.addEventListener('pointermove', move);
    return () => { el.removeEventListener('pointermove', move); cancelAnimationFrame(raf); };
  }, [reduce]);

  const handlers = Object.assign({}, on, { tab: setTab });

  const rise = (i) => ({
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduce ? 0.2 : 0.7, delay: reduce ? 0 : 0.08 + i * 0.08, ease: EASE },
  });

  return html`
    <div className="stage" ref=${paneRef}>
      <${Scene} reduce=${reduce}/>

      <header className="top">
        <${motion.button} className="langbtn" onClick=${on.relang}
          initial=${{ opacity: 0 }} animate=${{ opacity: 1 }}
          transition=${{ delay: reduce ? 0 : 0.5, duration: 0.5 }}
          whileHover=${reduce ? {} : { y: -1 }}>
          <${IcGlobe}/><span>${t.lang}</span>
        <//>
        <${motion.img} className="logo" src="./img/fmac-logo.png"
          alt="نادي الفجيرة للفنون القتالية — قسم الإعداد الفني" ...${rise(0)}/>
      </header>

      <main className="core">
      <${motion.span} className="kick" ...${rise(1)}>
        <${motion.i} initial=${{ scaleX: 0 }} animate=${{ scaleX: 1 }}
          transition=${{ duration: reduce ? 0 : 0.7, delay: reduce ? 0 : 0.3, ease: EASE }}/>
        ${t.kicker}
      <//>
      <${motion.h2} ...${rise(2)}>${t.slogan1}<br/><em>${t.slogan2}</em><//>

      <${motion.div} className="box"
        initial=${reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.985 }}
        animate=${{ opacity: 1, y: 0, scale: 1 }}
        transition=${reduce ? { duration: 0.2 } : Object.assign({ delay: 0.12 }, SPRING)}>
        <span className="boxtop" aria-hidden="true"/>

        ${mode === 'change' ? null : html`
          <${LayoutGroup}>
            <div className="tabs" role="tablist">
              ${[['in', t.tabIn], ['up', t.tabUp]].map(([k, lbl]) => html`
                <button key=${k} role="tab" aria-selected=${tab === k}
                  onClick=${() => setTab(k)}>
                  ${lbl}
                  ${tab === k ? html`<${motion.span} className="tbar" layoutId="tbar"
                    transition=${reduce ? { duration: 0 } : SPRING}/>` : null}
                </button>`)}
            </div>
          </${LayoutGroup}>`}

        <${AnimatePresence} mode="wait" initial=${false}>
          <${motion.div} key=${mode === 'change' ? 'ch' : tab}
            initial=${reduce ? { opacity: 0 } : { opacity: 0, x: 18 }}
            animate=${{ opacity: 1, x: 0 }}
            exit=${reduce ? { opacity: 0 } : { opacity: 0, x: -18 }}
            transition=${{ duration: reduce ? 0.15 : 0.28, ease: EASE }}>
            ${mode === 'change'
              ? html`<${Change} t=${t} on=${handlers} reduce=${reduce}/>`
              : (tab === 'up'
                ? html`<${Request} t=${t} on=${handlers} reduce=${reduce} sports=${sports.map((s) => s[0])}/>`
                : html`<${SignIn} t=${t} on=${handlers} reduce=${reduce} extErr=${extErr}/>`)}
          <//>
        </${AnimatePresence}>
      <//>
      </main>

      <${Base} t=${t} sports=${sports} reduce=${reduce} rise=${rise}/>
    </div>`;
}

/* ───────── التركيب ───────── */
export function mount(host, { mode, t, on, sports }) {
  const root = createRoot(host);
  let setExt = null;
  function Bridge() {
    const [e, set] = useState(null);
    setExt = set;
    return html`<${App} mode=${mode} t=${t} on=${on} sports=${sports} extErr=${e}/>`;
  }
  root.render(html`<${Bridge}/>`);
  return {
    /* منفذٌ أمريٌّ للمصادقة: تكتب رسالةً دون أن تلمس الشجرة */
    error(x) { if (setExt) setExt(x); },
    destroy() { try { root.unmount(); } catch (e) { /* لا شيء */ } },
  };
}

export default { mount };
