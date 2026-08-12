import urllib.request, json

req = urllib.request.Request(
    'https://toko.alvezadigital.com/api',
    data=json.dumps({'action': 'list', 'payload': {'collection': 'orders'}}).encode(),
    headers={'Content-Type': 'application/json'}
)
try:
    resp = urllib.request.urlopen(req)
    print("OK:", resp.read().decode()[:200])
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code, e.read().decode())
