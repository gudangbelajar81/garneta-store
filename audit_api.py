import urllib.request
import json
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

collections = ["products", "suppliers", "purchases", "sales", "users", "priceHistory", "auditLogs", "employees", "cashAdvances", "payrolls", "ngitungSales", "orders", "cuan_reports"]

success = []
failed = []

for c in collections:
    req = urllib.request.Request(
        'https://toko.alvezadigital.com/api',
        data=json.dumps({'action': 'list', 'payload': {'collection': c}}).encode(),
        headers={'Content-Type': 'application/json'}
    )
    try:
        resp = urllib.request.urlopen(req)
        data = json.loads(resp.read().decode())
        success.append(c)
    except urllib.error.HTTPError as e:
        failed.append(f"{c}: {e.code} - {e.read().decode()}")
    except Exception as e:
        failed.append(f"{c}: {e}")

print("Success lists:", success)
if failed:
    print("Failed lists:")
    for f in failed:
        print(" -", f)
