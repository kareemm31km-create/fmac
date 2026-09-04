/* خادم تطوير ساكن بلا اعتماديات — يخدم مجلد public على localhost */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('../', import.meta.url)), 'public');
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};

/* لا يُخزَّن مؤقتاً: عامل الخدمة والصفحة والبيان — حتى تظهر التعديلات فوراً */
const NO_STORE = new Set(['/sw.js', '/index.html', '/manifest.json', '/']);

function resolvePath(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath.split('?')[0]);
  } catch {
    return null;                    // ترميز معطوب في الرابط — لا يُسقِط الخادم
  }
  // إزالة الفواصل البادئة (تُكتب بلا محارف هروب تفادياً لأخطاء الاقتباس)
  let rel = normalize(decoded);
  while (rel.startsWith('/') || rel.startsWith(sep)) rel = rel.slice(1);
  const full = join(ROOT, rel);
  // منع الخروج خارج مجلد public
  if (full !== ROOT && !full.startsWith(ROOT + sep)) return null;
  return full;
}

const server = createServer(async (req, res) => {
  const urlPath = req.url || '/';
  let file = resolvePath(urlPath);

  /* مسارات نظيفة للصفحتين المستقلّتين — تطابق rewrites في vercel.json */
  const ALIAS = { '/accounts': '/_accounts.html', '/migrate': '/_migrate.html' };
  const aliased = ALIAS[urlPath.split('?')[0]];
  if (aliased) file = resolvePath(aliased);

  if (file) {
    try {
      const info = await stat(file);
      if (info.isDirectory()) file = join(file, 'index.html');
    } catch { file = null; }
  }

  // احتياطي: أي مسار غير موجود يرجع للصفحة الواحدة
  if (!file) file = join(ROOT, 'index.html');

  try {
    const body = await readFile(file);
    const ext = extname(file).toLowerCase();
    const key = urlPath.split('?')[0];
    res.writeHead(200, {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      /* خادم تطوير: لا يُخزَّن أي شيء نصّي، وإلا بقيت الوحدات القديمة
         في المتصفّح بعد التعديل. الصور وحدها تُخزَّن. */
      'Cache-Control': (ext === '.png' || ext === '.jpg' || ext === '.ico' ||
                        ext === '.woff' || ext === '.woff2')
        ? 'public, max-age=3600'
        : 'no-store',
      'Service-Worker-Allowed': '/',
    });
    res.end(body);
  } catch {
    try {
      const body = await readFile(join(ROOT, 'index.html'));
      res.writeHead(200, { 'Content-Type': TYPES['.html'], 'Cache-Control': 'no-store' });
      res.end(body);
    } catch {
      res.writeHead(404, { 'Content-Type': TYPES['.txt'] });
      res.end('404');
    }
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  المنفذ ${PORT} مشغول. جرّب:  PORT=${PORT + 1} npm run dev\n`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, HOST, () => {
  const base = `http://${HOST}:${PORT}/`;
  console.log(`\n  FMAC — خادم التطوير يعمل`);
  console.log(`  ${base}`);
  console.log(`  ${base}_selftest.html   ← فحص ذاتي للطبقة والوحدات`);
  console.log(`\n  الدخول بالبريد وكلمة المرور عبر Firebase Auth.\n`);
});
