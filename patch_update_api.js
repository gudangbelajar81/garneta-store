const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

let updateApi = `\n
// === AUTO-UPDATE NOTIFIER ===
// Simpan timestamp kapan server terakhir jalan (indikator build/deploy baru dari Coolify)
const SERVER_START_TIME = Date.now().toString();

app.get('/api/system/version', (req, res) => {
  res.json({ version: SERVER_START_TIME });
});
`;

// Insert right before app.listen
serverJs = serverJs.replace(/app\.listen\(/, updateApi + '\n$&');
fs.writeFileSync('server.js', serverJs);
console.log('Update API injected in server.js');
