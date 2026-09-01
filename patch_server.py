import re

with open('server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add saveExpresCart route
router_old = r"clearAuditLogs: \(\) => clearAuditLogs\(\),"
router_new = r"clearAuditLogs: () => clearAuditLogs(),\n      saveExpresCart: () => saveExpresCart(payload),"
content = re.sub(router_old, router_new, content)

# 2. Add saveExpresCart function
func = """async function saveExpresCart(cart) {
  try {
    await setSetting('EXPRES_CART', JSON.stringify(cart));
    return { ok: true };
  } catch(e) {
    return { ok: false, message: e.message };
  }
}
"""
content = content + "\n" + func

# 3. Add expresCart to bootstrap
bootstrap_old = r"""  const \[products, suppliers, purchases, sales, users, priceHistory, auditLogs, stats, employees, cashAdvances, payrolls, ngitungSales, orders, cuanReports\] = await Promise\.all\(\[
    listRows\("products"\), listRows\("suppliers"\), listRows\("purchases"\), listRows\("sales"\),
    listRows\("users"\), listRows\("priceHistory"\), listRows\("auditLogs"\), dashboard\(\),
    listRows\("employees"\), listRows\("cashAdvances"\), listRows\("payrolls"\), listRows\("ngitungSales"\),
    listRows\("orders"\)\.catch\(\(\)=>\[\]\), listRows\("cuan_reports"\)\.catch\(\(\)=>\[\]\)
  \]\);

  return \{ products, suppliers, purchases, sales, users, priceHistory, auditLogs, employees, cashAdvances, payrolls, ngitungSales, orders, cuan_reports: cuanReports, dashboard: stats \};"""

bootstrap_new = """  const [products, suppliers, purchases, sales, users, priceHistory, auditLogs, stats, employees, cashAdvances, payrolls, ngitungSales, orders, cuanReports, expresCartStr] = await Promise.all([
    listRows("products"), listRows("suppliers"), listRows("purchases"), listRows("sales"),
    listRows("users"), listRows("priceHistory"), listRows("auditLogs"), dashboard(),
    listRows("employees"), listRows("cashAdvances"), listRows("payrolls"), listRows("ngitungSales"),
    listRows("orders").catch(()=>[]), listRows("cuan_reports").catch(()=>[]), getSetting('EXPRES_CART', null)
  ]);
  
  let expresCart = null;
  if (expresCartStr) {
      try { expresCart = JSON.parse(expresCartStr); } catch(e) {}
  }

  return { products, suppliers, purchases, sales, users, priceHistory, auditLogs, employees, cashAdvances, payrolls, ngitungSales, orders, cuan_reports: cuanReports, dashboard: stats, expresCart };"""

content = re.sub(bootstrap_old, bootstrap_new, content)

with open('server.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("server.js patched")
