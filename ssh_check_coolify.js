const { Client } = require('ssh2');
const conn = new Client();

conn.on('ready', () => {
  console.log('SSH connection ready. Executing command...');
  const cmd = `docker ps | grep -i 'mysql\\|mariadb'`;
  
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      conn.end();
    }).on('data', (data) => {
      process.stdout.write('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      process.stderr.write('STDERR: ' + data);
    });
  });
}).connect({
  host: '77.42.77.29',
  port: 22,
  username: 'root',
  password: 'AlvezaDigital2026!'
});
