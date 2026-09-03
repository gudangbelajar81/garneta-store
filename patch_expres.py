with open('assets/js/main.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_html = '<h3 style=\"margin:0 0 8px 0; font-size:1rem;\">?? Jual Expres</h3>'
new_html = '<h3 style=\"margin:0 0 8px 0; font-size:1rem; display:flex; justify-content:space-between; align-items:center;\"><span>?? Jual Expres</span><input type=\"date\" id=\"expres-date\" value=\"\" style=\"background: rgba(0,0,0,0.3); color: #fff; border: 1px solid rgba(255,255,255,0.2); padding: 4px; border-radius: 4px; font-size: 0.85rem;\" /></h3>'

content = content.replace(old_html, new_html)

old_eksekusi = 'const payload = { amount: total, executionDate: today() };'
new_eksekusi = 'const executionDate = document.getElementById(\"expres-date\") ? document.getElementById(\"expres-date\").value : today();\n            const payload = { amount: total, executionDate: executionDate };'

content = content.replace(old_eksekusi, new_eksekusi)

with open('assets/js/main.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done")
