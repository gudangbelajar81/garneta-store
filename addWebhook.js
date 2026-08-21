const fs = require('fs');
let txt = fs.readFileSync('server.js', 'utf8');

const webhookLogic = `
// [WEBHOOK] Digiflazz Webhook
app.post("/api/webhook/digiflazz", async (req, res) => {
  try {
    const ppob = require('./ppob');
    if (typeof ppob.handleWebhook === 'function') {
      const ok = await ppob.handleWebhook(req.body);
      if (ok) {
        return res.json({ status: true, message: "Webhook processed" });
      }
    }
    res.json({ status: false, message: "Ignored or not found" });
  } catch (error) {
    console.error("Digiflazz Webhook Error:", error);
    res.status(500).json({ status: false, error: error.message });
  }
});
`;

if (!txt.includes('/api/webhook/digiflazz')) {
  // Find where fonnte webhook is defined
  const fonnteIndex = txt.indexOf('app.post("/api/webhook/fonnte"');
  if (fonnteIndex !== -1) {
    // Insert right before Fonnte webhook
    txt = txt.substring(0, fonnteIndex) + webhookLogic + "\\n" + txt.substring(fonnteIndex);
    fs.writeFileSync('server.js', txt);
    console.log('Digiflazz webhook inserted!');
  } else {
    // Just append to the end before the start command
    console.log('Fonnte not found, this is unexpected.');
  }
} else {
  console.log('Digiflazz webhook already exists.');
}
