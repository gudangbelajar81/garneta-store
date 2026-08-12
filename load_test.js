const autocannon = require('autocannon');
const http = require('http');

async function login() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ action: "login", payload: { name: "Admin Gudang", password: "123" } });
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve(json.data.token);
        } catch(e) { resolve(null); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  const token = await login();
  if (!token) {
    console.error("Gagal login, tidak bisa lanjut load test");
    return;
  }
  
  console.log("Memulai load test 50 koneksi bersamaan (10 detik)...");
  
  const instance = autocannon({
    url: 'http://localhost:3000/api',
    connections: 50,
    duration: 10,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({ action: 'sync' })
  }, (err, result) => {
    if (err) {
      console.error("Error:", err);
    } else {
      console.log("=== HASIL LOAD TEST ===");
      console.log("Total Requests:", result.requests.total);
      console.log("Rata-rata Req/Sec:", result.requests.average);
      console.log("Latency 99% (ms):", result.latency.p99);
      console.log("Errors:", result.errors);
      console.log("Timeouts:", result.timeouts);
    }
  });
  
  autocannon.track(instance, {renderProgressBar: true});
}

run();
