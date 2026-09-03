with open('assets/js/main.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'Jual Expres' in line and '<h3 style=\"margin:0 0 8px 0; font-size:1rem;\">' in line:
        # We find the part that needs replacement without breaking the emoji
        lines[i] = line.replace('<h3 style=\"margin:0 0 8px 0; font-size:1rem;\">', '<h3 style=\"margin:0 0 8px 0; font-size:1rem; display:flex; justify-content:space-between; align-items:center;\"><span>').replace('</h3>', '</span><input type=\"date\" id=\"expres-date\" value=\"\" style=\"background: rgba(0,0,0,0.3); color: #fff; border: 1px solid rgba(255,255,255,0.2); padding: 4px; border-radius: 4px; font-size: 0.85rem;\" /></h3>')

with open('assets/js/main.js', 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("Done")
