# خادم تطوير بلا اعتماديات — بديل Node حين لا يكون مثبَّتاً.
# التشغيل:  powershell -ExecutionPolicy Bypass -File scripts\dev-server.ps1
param(
  [int]$Port = 3000
)

$ErrorActionPreference = 'Stop'
$root = Join-Path (Split-Path -Parent $PSScriptRoot) 'public'
if (-not (Test-Path $root)) { throw "public folder not found at $root" }

$types = @{
  '.html' = 'text/html; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8'
  '.mjs'  = 'text/javascript; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.svg'  = 'image/svg+xml'
  '.ico'  = 'image/x-icon'
  '.txt'  = 'text/plain; charset=utf-8'
  '.webmanifest' = 'application/manifest+json; charset=utf-8'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
try {
  $listener.Start()
} catch {
  Write-Host "FAILED to bind port $Port : $($_.Exception.Message)"
  exit 1
}

Write-Host ""
Write-Host "  FMAC - PowerShell dev server"
Write-Host "  http://127.0.0.1:$Port/"
Write-Host "  http://127.0.0.1:$Port/_selftest.html"
Write-Host "  (Ctrl+C to stop)"
Write-Host ""

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
  } catch {
    break
  }
  $req = $ctx.Request
  $res = $ctx.Response
  $status = 200

  # مسار آمن داخل public فقط
  $rel = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath)
  $rel = $rel.TrimStart('/')
  if ($rel -eq '') { $rel = 'index.html' }
  $full = Join-Path $root $rel

  try { $resolved = [System.IO.Path]::GetFullPath($full) } catch { $resolved = $root }
  $rootFull = [System.IO.Path]::GetFullPath($root)
  if (-not $resolved.StartsWith($rootFull)) { $resolved = Join-Path $rootFull 'index.html' }

  if ((Test-Path $resolved) -and (Get-Item $resolved).PSIsContainer) {
    $resolved = Join-Path $resolved 'index.html'
  }
  if (-not (Test-Path $resolved)) {
    $resolved = Join-Path $rootFull 'index.html'   # احتياطي الصفحة الواحدة
  }

  try {
    $bytes = [System.IO.File]::ReadAllBytes($resolved)
    $ext = [System.IO.Path]::GetExtension($resolved).ToLower()
    $ct = $types[$ext]
    if (-not $ct) { $ct = 'application/octet-stream' }
    $res.StatusCode = $status
    $res.ContentType = $ct
    if ($ext -eq '.html' -or $rel -eq 'sw.js' -or $rel -eq 'manifest.json') {
      $res.Headers.Add('Cache-Control', 'no-store')
    } else {
      $res.Headers.Add('Cache-Control', 'public, max-age=3600')
    }
    $res.Headers.Add('Service-Worker-Allowed', '/')
    $res.ContentLength64 = $bytes.Length
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
    Write-Host ("{0}  {1}  ({2} bytes)" -f $res.StatusCode, $rel, $bytes.Length)
  } catch {
    $res.StatusCode = 500
    $msg = [System.Text.Encoding]::UTF8.GetBytes("500 " + $_.Exception.Message)
    $res.OutputStream.Write($msg, 0, $msg.Length)
    Write-Host ("500  {0}  {1}" -f $rel, $_.Exception.Message)
  } finally {
    $res.OutputStream.Close()
  }
}
$listener.Stop()
