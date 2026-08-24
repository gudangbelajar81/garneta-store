const http = require('http');
const req = http.get('http://localhost:3000/', (res) => {
  console.log('STATUS:', res.statusCode);
  let body = '';
  res.on('data', (c) => { body += c; });
  res.on('end', () => {
    console.log('BODY (first 200):', body.slice(0, 200));
    process.exit(0);
  });
});
req.on('error', (e) => {
  console.log('ERROR:', e.message);
  process.exit(1);
});
req.setTimeout(5000, () => {
  console.log('TIMEOUT: no response in 5s');
  process.exit(2);
});
