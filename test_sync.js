const { syncProducts } = require('./ppob');
(async () => {
  try {
    const res = await syncProducts('prepaid');
    console.log(res);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
})();