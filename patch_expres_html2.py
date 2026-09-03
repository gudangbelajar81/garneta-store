with open('assets/js/main.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'id=\"expres-date\"' in line and 'value=\"\"' in line:
        lines[i] = line.replace('value=\"\"', 'value=\"\"')

with open('assets/js/main.js', 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("Done")
