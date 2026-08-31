import os

with open('assets/js/main.js', 'r', encoding='utf-8') as f:
    code = f.read()

old_func = """    function isExcludedNgitungCategory(p) {
      if (!p || !p.category) return false;
      const cat = String(p.category).toLowerCase();
      return cat.includes("buah") || cat.includes("sayur") || cat.includes("bumbu");
    }"""

new_func = """    function isExcludedNgitungCategory(p) {
      if (!p) return false;
      const cat = String(p.category || "").toLowerCase();
      const name = String(p.name || "").toLowerCase();
      
      const isExcludedCategory = cat.includes("buah") || cat.includes("sayur") || cat.includes("bumbu");
      const isTelur = name.includes("telur");
      
      return isExcludedCategory || isTelur;
    }"""

if old_func in code:
    code = code.replace(old_func, new_func)
    with open('assets/js/main.js', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Function replaced successfully!")
else:
    print("Could not find the function to replace!")
