import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()
with open('sw.js', 'r', encoding='utf-8') as f:
    sw = f.read()

# Update version in index.html (e.g. ?v=X.X.X)
def increment_version(match):
    prefix = match.group(1)
    parts = match.group(2).split('.')
    parts[-1] = str(int(parts[-1]) + 1)
    new_version = '.'.join(parts)
    return prefix + new_version

html = re.sub(r'(\?v=)(\d+\.\d+\.\d+)', increment_version, html)
sw = re.sub(r'(CACHE_NAME\s*=\s*["\']garneta-cache-v)(\d+)', lambda m: m.group(1) + str(int(m.group(2)) + 1), sw)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
with open('sw.js', 'w', encoding='utf-8') as f:
    f.write(sw)
print("Cache versions bumped.")
