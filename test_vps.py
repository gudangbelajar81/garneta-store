import urllib.request, json

data = json.dumps({
    'action': 'add',
    'payload': {
        'collection': 'orders',
        'item': {
            'id': 'TEST-VPS-002',
            'customer': 'TestVPS',
            'dueDate': '2026-08-10',
            'items': [{'name': 'Beras', 'qty': 1, 'price': 5000}],
            'status': 'pending'
        }
    }
}).encode()

req = urllib.request.Request(
    'https://toko.alvezadigital.com/api',
    data=data,
    headers={'Content-Type': 'application/json'}
)
try:
    resp = urllib.request.urlopen(req)
    print("OK:", resp.read().decode())
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code, e.read().decode())
