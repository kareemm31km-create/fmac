/* عامل الخدمة — يبقي الموقع عاملاً داخل الصالة بلا شبكة */
const CACHE = 'fmac-v2';
const CORE  = ['./', './index.html', './manifest.json'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE).catch(()=>{})));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks =>
    Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // الحفظ يمرّ للشبكة دائماً
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;             // سجل النادي والخطوط لا يُخزَّنان

  e.respondWith(
    fetch(req).then(res => {
      /* لا يُخزَّن إلا ردٌّ سليم — وإلّا حُفظت صفحةُ خطأٍ مكان ملفّ */
      if (res && res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(()=>{});
      }
      return res;
    }).catch(() =>
      caches.match(req).then(hit => {
        if (hit) return hit;
        /* الارتداد إلى index.html للتنقّل وحده. كان لكلّ طلب، فإذا
           انقطعت الشبكة لحظةً عادت وحدةُ JavaScript صفحةَ HTML —
           فتفشل على نوع المحتوى، ويبدو العطب غامضاً بلا سبب ظاهر.
           الآن يفشل الطلب صراحةً، والخطأ يُقرأ في سجلّ المتصفّح. */
        if (req.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      })
    )
  );
});
