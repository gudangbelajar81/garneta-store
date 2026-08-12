import urllib.request
import json
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

req = urllib.request.Request(
    'https://toko.alvezadigital.com/api',
    data=json.dumps({'action': 'bootstrap', 'payload': {}}).encode(),
    headers={'Content-Type': 'application/json'}
)
try:
    resp = urllib.request.urlopen(req)
    data = json.loads(resp.read().decode())
    print("Bootstrap success. Keys:", data.get('data', {}).keys())
except urllib.error.HTTPError as e:
    print(f"Failed: {e.code} - {e.read().decode()}")
except Exception as e:
    print(f"Error: {e}")
