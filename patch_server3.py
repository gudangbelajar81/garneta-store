import re

with open('server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the newline issue
content = content.replace("getSetting('MASTER_KATEGORI', 'Umum\nSembako\nRokok\nMinuman\nSnack\nBumbu Dapur\nAlat Mandi')", "getSetting('MASTER_KATEGORI', 'Umum\\nSembako\\nRokok\\nMinuman\\nSnack\\nBumbu Dapur\\nAlat Mandi')")

with open('server.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed newline")
