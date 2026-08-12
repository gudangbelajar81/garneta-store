const crypto = require('crypto');
const axios = require('axios');
const username = 'rixuvognNEpg';
const key = 'dev-69c02a50-9224-11f1-a6e2-9708e3f1407b';

async function testSign(signStr) {
  const sign = crypto.createHash('md5').update(username + key + signStr).digest('hex');
  try {
    const res = await axios.post('https://api.digiflazz.com/v1/price-list', {
      cmd: 'prepaid',
      username,
      sign
    });
    console.log(signStr, 'SUCCESS', Array.isArray(res.data.data) ? res.data.data.length : 'not array');
  } catch (err) {
    console.log(signStr, 'FAILED', err.response?.data || err.message);
  }
}
testSign('depo');