/* مساعدُ القسم — الطرفُ الخادميّ.
 *
 * المفتاحُ لا ينزل إلى المتصفّح أبداً: الواجهةُ تنادي /api/ai،
 * وهذه الدالّةُ وحدها تقرأ ANTHROPIC_API_KEY من بيئة التشغيل
 * وتنادي Anthropic. فإن سُرِّبت الصفحةُ كلُّها لم يُسرَّب المفتاح.
 *
 * تعمل على Vercel كدالّةٍ بلا خادم، وعلى خادم التطوير عبر نفس
 * المعالِج — فما يُختبر محلّيّاً هو ما يعمل منشوراً.
 */

const API = 'https://api.anthropic.com/v1/messages';
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
const VERSION = '2023-06-01';

const S = (v) => (v === null || v === undefined) ? '' : String(v);

/* نداءٌ واحدٌ إلى Anthropic — ويُعاد نصُّ الردّ فقط */
/* بلا temperature: النماذج الحديثة أوقفتها، وإرسالها يُرَدّ بـ400. */
async function ask(key, { system, user, maxTokens = 1200 }) {
  const r = await fetch(API, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': VERSION,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    /* لا يُعاد نصُّ الخطأ كما هو: قد يحمل جزءاً من المفتاح أو من
       ترويسات المزوّد. يُعاد رمزٌ تعرفه الواجهة. */
    const code = r.status === 401 || r.status === 403 ? 'ai_key'
      : r.status === 429 ? 'ai_rate'
        : r.status >= 500 ? 'ai_up' : 'ai_bad';
    const err = new Error(code);
    err.code = code;
    err.status = r.status;
    err.hint = body.slice(0, 200);
    throw err;
  }
  const j = await r.json();
  return (j.content || []).filter((c) => c.type === 'text')
    .map((c) => c.text).join('\n').trim();
}

const SYSTEM_BASE =
  'أنت المساعد الفنّي لقسم الإعداد الفني في نادي الفجيرة للفنون القتالية. '
  + 'تكتب بالعربية الفصحى، موجزاً ومباشراً، بلا مقدّمات ولا مجاملات. '
  + 'تستند إلى الأرقام المعطاة وحدها، ولا تخترع رقماً لم يُعطَ لك. '
  + 'إن كان الرقم غير مقيس فقل ذلك صراحةً ولا تضع صفراً مكانه.';

/* يُستخرج أوّلُ كائن JSON من ردٍّ قد يحيط به شرح */
function firstJson(text) {
  const a = text.indexOf('{');
  const b = text.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(text.slice(a, b + 1)); } catch { return null; }
}

export async function handle(body) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { ok: false, on: false, error: 'ai_off', reason: 'no_key' };

  const action = S(body.action);

  try {
    if (action === 'aistatus') {
      const t = await ask(key, {
        system: 'أجب بكلمة واحدة فقط: جاهز',
        user: 'اختبار اتصال',
        maxTokens: 16,
      });
      return { ok: true, on: true, model: MODEL, detail: t || 'جاهز' };
    }

    if (action === 'ask') {
      const q = S(body.q).slice(0, 2000);
      if (!q) return { ok: false, error: 'ai_bad' };
      const text = await ask(key, {
        system: SYSTEM_BASE,
        user: 'أرقام الأسبوع:\n' + S(body.ctx).slice(0, 12000)
          + '\n\nالسؤال: ' + q,
        maxTokens: 900,
      });
      return { ok: true, text };
    }

    if (action === 'aiweek') {
      const text = await ask(key, {
        system: SYSTEM_BASE + ' اكتب خلاصةً أسبوعيّةً في ثلاث فقرات قصيرة: '
          + 'ما تمّ، وما تأخّر، وما يجب فعله هذا الأسبوع. '
          + 'لا عناوين ولا تعداد نقطيّ.',
        user: 'الأسبوع: ' + S(body.week) + '\n\n' + S(body.ctx).slice(0, 12000),
        maxTokens: 900,
      });
      return { ok: true, text };
    }

    if (action === 'airev') {
      const out = await ask(key, {
        system: SYSTEM_BASE + ' تراجع خطّةً تدريبيّةً أسبوعيّة. '
          + 'أعِد JSON وحده بلا أيّ نصٍّ حوله، بهذا الشكل: '
          + '{"verdict":"معتمدة|تحتاج تعديل","summary":"سطر واحد",'
          + '"notes":["ملاحظة","ملاحظة"]} '
          + 'والملاحظاتُ ثلاثٌ على الأكثر، كلٌّ منها قابلةٌ للتنفيذ.',
        user: 'الخطة:\n' + S(body.plan).slice(0, 20000),
        maxTokens: 700,
      });
      const j = firstJson(out);
      if (!j) {
        console.error('[ai] airev لم يردّ JSON :: ' + out.slice(0, 300));
        return { ok: false, error: 'ai_bad' };
      }
      return {
        ok: true,
        verdict: S(j.verdict) || 'تحتاج تعديل',
        summary: S(j.summary),
        notes: Array.isArray(j.notes) ? j.notes.map(S).filter(Boolean).slice(0, 3) : [],
        model: MODEL,
      };
    }

    return { ok: false, error: 'ai_bad' };
  } catch (e) {
    /* السببُ يُطبع في سجلّ الخادم لا يُعاد إلى المتصفّح: رسالةُ
       المزوّد قد تحمل ترويساتٍ لا تخصّ المستخدم. */
    if (e.status) console.error('[ai] ' + e.status + ' ' + (e.hint || ''));
    return { ok: false, error: e.code || 'ai_net' };
  }
}

/* ── مدخل Vercel ── */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: 'ai_bad' }));
    return;
  }
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  if (!body || typeof body !== 'object') body = {};
  const out = await handle(body);
  res.statusCode = 200;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(out));
}
