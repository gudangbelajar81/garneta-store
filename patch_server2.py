import re

with open('server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add saveAppSetting to router
router_old = r"saveExpresCart: \(\) => saveExpresCart\(payload\),"
router_new = r"saveExpresCart: () => saveExpresCart(payload),\n      saveAppSetting: () => saveAppSetting(payload.key, payload.value),"
content = re.sub(router_old, router_new, content)

# 2. Add saveAppSetting function
func = """async function saveAppSetting(key, value) {
  try {
    await setSetting(key, value);
    return { ok: true };
  } catch(e) {
    return { ok: false, message: e.message };
  }
}
"""
content = content + "\n" + func

# 3. Add masterKategori to bootstrap
bootstrap_old = r"""  const \[products, suppliers, purchases, sales, users, priceHistory, auditLogs, stats, employees, cashAdvances, payrolls, ngitungSales, orders, cuanReports, expresCartStr\] = await Promise\.all\(\[
    listRows\("products"\), listRows\("suppliers"\), listRows\("purchases"\), listRows\("sales"\),
    listRows\("users"\), listRows\("priceHistory"\), listRows\("auditLogs"\), dashboard\(\),
    listRows\("employees"\), listRows\("cashAdvances"\), listRows\("payrolls"\), listRows\("ngitungSales"\),
    listRows\("orders"\)\.catch\(\(\)=>\[\]\), listRows\("cuan_reports"\)\.catch\(\(\)=>\[\]\), getSetting\('EXPRES_CART', null\)
  \]\);"""

bootstrap_new = """  const [products, suppliers, purchases, sales, users, priceHistory, auditLogs, stats, employees, cashAdvances, payrolls, ngitungSales, orders, cuanReports, expresCartStr, masterKategori] = await Promise.all([
    listRows("products"), listRows("suppliers"), listRows("purchases"), listRows("sales"),
    listRows("users"), listRows("priceHistory"), listRows("auditLogs"), dashboard(),
    listRows("employees"), listRows("cashAdvances"), listRows("payrolls"), listRows("ngitungSales"),
    listRows("orders").catch(()=>[]), listRows("cuan_reports").catch(()=>[]), getSetting('EXPRES_CART', null),
    getSetting('MASTER_KATEGORI', 'Umum\\nSembako\\nRokok\\nMinuman\\nSnack\\nBumbu Dapur\\nAlat Mandi')
  ]);"""
content = re.sub(bootstrap_old, bootstrap_new, content)

# Return it in bootstrap
return_old = r"""  return \{ products, suppliers, purchases, sales, users, priceHistory, auditLogs, employees, cashAdvances, payrolls, ngitungSales, orders, cuan_reports: cuanReports, dashboard: stats, expresCart \};"""
return_new = """  return { products, suppliers, purchases, sales, users, priceHistory, auditLogs, employees, cashAdvances, payrolls, ngitungSales, orders, cuan_reports: cuanReports, dashboard: stats, expresCart, masterKategori };"""
content = re.sub(return_old, return_new, content)

with open('server.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("server.js patched")
