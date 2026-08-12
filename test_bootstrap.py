import urllib.request, json

req = urllib.request.Request(
    'https://toko.alvezadigital.com/api',
    data=json.dumps({'action': 'bootstrap'}).encode(),
    headers={'Content-Type': 'application/json'}
)
try:
    resp = urllib.request.urlopen(req)
    data = json.loads(resp.read().decode())
    if 'data' in data:
        keys = list(data['data'].keys())
        print("Keys in data:", keys)
        if 'orders' in data['data']:
            print("Orders count:", len(data['data']['orders']))
            print("First order:", data['data']['orders'][0] if len(data['data']['orders']) > 0 else "None")
    else:
        print("No data in response")
except Exception as e:
    print("Error:", e)
