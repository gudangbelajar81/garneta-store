const fs = require('fs');

const mainLines = fs.readFileSync('assets/js/main.js', 'utf8').split('\n');
const serverLines = fs.readFileSync('server.js', 'utf8').split('\n');

function scanFile(filename, lines) {
  console.log(`\n=== SCANNING ${filename} ===\n`);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const n = i + 1;
    
    // 1. Math logic without parsing or rounding (potential JS float issue)
    if (line.match(/\.price\s*\*\s*\w+/) || line.match(/=\s*\w+\s*\*\s*\w+\.price/)) {
        if (!line.includes('Math.round') && !line.includes('Number(')) {
            //console.log(`[MATH] Line ${n}: Potential float issue - ${line.trim()}`);
        }
    }
    
    // 2. innerHTML without sanitization
    if (line.match(/\.innerHTML\s*=\s*[^`"']*\$\{/)) {
        if (!line.includes('escape') && !line.includes('sanitize') && !line.includes('rupiah') && !line.includes('Date')) {
            console.log(`[XSS] Line ${n}: Unsanitized innerHTML - ${line.trim()}`);
        }
    }
    
    // 3. Subtracting stock without checking if < 0
    if (line.match(/stock\s*-=\s*/) || line.match(/stock\s*=\s*stock\s*-/)) {
        // We just print it to review manually if there's a check nearby
        console.log(`[STOCK] Line ${n}: Stock reduction - ${line.trim()}`);
        // Let's print context
        // console.log(`   Context: ${lines[i-1]?.trim()}`);
    }
    
    // 4. Kasbon logic
    if (line.toLowerCase().includes('kasbon') || line.toLowerCase().includes('hutang')) {
        if (line.match(/amount|nominal|total/)) {
             // console.log(`[KASBON] Line ${n}: ${line.trim()}`);
        }
    }
    
    // 5. PPOB Race condition (button without disabling)
    if (line.match(/onclick=.*beliPPOB|onclick=.*bayar/i)) {
       if (!line.includes('disabled')) {
           console.log(`[RACE_CONDITION] Line ${n}: Button missing disabled state - ${line.trim()}`);
       }
    }
    
    // 6. DB Queries missing Try Catch or Await
    if (line.match(/db\.query/)) {
       if (!line.includes('await') && !line.includes('.catch')) {
           console.log(`[DB] Line ${n}: db.query without await or catch - ${line.trim()}`);
       }
    }
  }
}

scanFile('server.js', serverLines);
scanFile('main.js', mainLines);
