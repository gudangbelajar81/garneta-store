const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

// Add garbage collection interval at the end of the file, right before app.listen or similar
// Let's just append it after the last function
let gcScript = `\n
// === GARBAGE COLLECTION / ANTI-BLOAT ===
// Menghapus log aktivitas yang umurnya lebih dari 30 hari agar database tidak bengkak
setInterval(async () => {
  try {
    const [result] = await db.query("DELETE FROM activity_logs WHERE created_at < NOW() - INTERVAL 30 DAY");
    if (result.affectedRows > 0) {
      console.log(\`[Garbage Collection] Menghapus \${result.affectedRows} log aktivitas lama (>30 hari)\`);
    }
  } catch (err) {
    console.error('[Garbage Collection Error]', err.message);
  }
}, 12 * 60 * 60 * 1000); // Jalan setiap 12 jam

// Run once on startup
setTimeout(async () => {
  try {
    const [result] = await db.query("DELETE FROM activity_logs WHERE created_at < NOW() - INTERVAL 30 DAY");
    if (result.affectedRows > 0) {
      console.log(\`[Startup GC] Menghapus \${result.affectedRows} log aktivitas lama (>30 hari)\`);
    }
  } catch(e) {}
}, 5000);
`;

serverJs += gcScript;
fs.writeFileSync('server.js', serverJs);
console.log('Garbage collection injected in server.js');
