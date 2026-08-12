const fs = require('fs');
let code = fs.readFileSync('assets/js/api.js', 'utf8');

// Add cashflowLogs to endpoints
code = code.replace(/activityLogs: "activity-logs"/, 'activityLogs: "activity-logs",\n  cashflowLogs: "cashflow-logs"');

const newFn = `
window.fetchLaporanKeuangan = async function(startDate, endDate) {
  try {
    const res = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (localStorage.getItem('token') || '')
      },
      body: JSON.stringify({ action: 'get_laporan_keuangan', payload: { startDate, endDate } })
    });
    const result = await res.json();
    if (!result.ok) throw new Error(result.message);
    return result.data;
  } catch (err) {
    console.error("Error fetch laporan keuangan:", err);
    throw err;
  }
};
`;

if (!code.includes('window.fetchLaporanKeuangan =')) {
  code += '\n' + newFn;
  fs.writeFileSync('assets/js/api.js', code);
  console.log("Patched api.js");
} else {
  console.log("Already patched api.js");
}
