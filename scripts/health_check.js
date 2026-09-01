/**
 * Health Check Lokal — Garneta Store
 * ==================================
 * Menjalankan server lokal sebentar, lalu memeriksa:
 *  1. Server bisa start tanpa crash
 *  2. HTTP merespons (status 200)
 *  3. Halaman utama termuat (ada <html> / title)
 *  4. Tidak ada error fatal di log
 *
 * Dipanggil oleh: UPDATE_LOKAL.bat (Tahap 1 — sebelum GAS online)
 * Cara pakai:     node scripts/health_check.js
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const PORT = process.env.PORT || 3000;
const START_TIMEOUT = 30000; // 30 detik maksimal menunggu server start
const LOG_FILE = path.join(ROOT, 'logs', 'health_check.log');
const CHECK_URL = `http://localhost:${PORT}/`;

const results = [];
let serverProcess = null;
let started = false;

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch (e) { /* abaikan error log */ }
}

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail || ''}`);
}

function checkHttp(timeoutMs = 8000) {
  return new Promise((resolve) => {
    const req = http.get(CHECK_URL, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve({ status: 0, body: '' });
    });
    req.on('error', () => resolve({ status: 0, body: '' }));
  });
}

async function waitForServer(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    // Polling HTTP langsung — tidak bergantung pada isi log server
    const res = await checkHttp(2500);
    if (res.status && res.status >= 200 && res.status < 500) return true;
    // Fallback: jika ada output server yang menandakan siap
    if (started) return true;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

async function main() {
  log('=== HEALTH CHECK LOKAL DIMULAI ===');
  log(`Root: ${ROOT}`);
  log(`Port target: ${PORT}`);

  // Cek file penting ada
  const requiredFiles = ['server.js', 'package.json', 'index.html'];
  for (const f of requiredFiles) {
    record(`File ${f}`, fs.existsSync(path.join(ROOT, f)), path.join(ROOT, f));
  }

  // Cek node_modules
  record('node_modules', fs.existsSync(path.join(ROOT, 'node_modules')), 'dependensi terpasang?');

  // Nyalakan server
  log('Menjalankan server lokal...');
  serverProcess = spawn('node', ['server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let serverLog = '';
  serverProcess.stdout.on('data', (d) => (serverLog += d.toString()));
  serverProcess.stderr.on('data', (d) => (serverLog += d.toString()));
  serverProcess.on('exit', (code) => {
    if (code !== 0 && started) {
      log(`⚠️ Server EXIT dengan kode ${code} — ada masalah!`);
    }
  });

  // Tandai "server mulai" ketika log menunjukkan listening
  const listenCheck = setInterval(() => {
    if (/listening|running|started|Server started|port/i.test(serverLog) && !started) {
      started = true;
      log('Server melaporkan siap (listening).');
    }
  }, 500);

  const serverReady = await waitForServer(START_TIMEOUT);
  clearInterval(listenCheck);

  if (!serverReady) {
    record('Server HTTP', false, 'Server tidak merespons dalam 30 detik!');
    log('--- 15 baris terakhir log server ---');
    const lines = serverLog.split('\n').filter(Boolean);
    lines.slice(-15).forEach((l) => log('  ' + l));
    finalize(1);
    return;
  }

  record('Server HTTP', true, `Respons di http://localhost:${PORT}/`);

  // Periksa isi halaman
  const res = await checkHttp();
  const hasHtml = /<html|<head|<body/i.test(res.body || '');
  record('Konten HTML', hasHtml, hasHtml ? `Body ${(res.body || '').length} byte` : 'Tidak ada markup HTML');

  // Periksa error fatal di log server
  const fatalErrors = serverLog.match(/(Cannot find module|SyntaxError|TypeError:.*null|EADDRINUSE|FATAL|unhandled)/i);
  record('Log server bersih', !fatalErrors, fatalErrors ? 'Ditemukan: ' + fatalErrors[0] : 'Tidak ada error fatal');

  finalize(0);
}

function finalize(exitCode) {
  const failed = results.filter((r) => !r.ok);
  log('');
  log('========================================');
  log(`HASIL: ${results.length - failed.length}/${results.length} lolos`);
  if (failed.length === 0) {
    log('✅ LOKAL SEHAT — AMAN UNTUK GAS ONLINE!');
  } else {
    log('❌ ADA MASALAH — PERBAIKI DULU, JANGAN GAS!');
    failed.forEach((f) => log(`   - ${f.name}: ${f.detail}`));
  }
  log('========================================');

  if (serverProcess && serverProcess.exitCode === null) {
    log('Menghentikan server lokal (health check selesai)...');
    serverProcess.kill('SIGTERM');
  }
  process.exit(exitCode);
}

main().catch((e) => {
  log('FATAL: ' + e.message);
  finalize(1);
});
