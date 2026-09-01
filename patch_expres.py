import re

with open('assets/js/main.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update getInitialExpresCart
initial_old = r"""      window\.getInitialExpresCart = function\(\) \{\n          return Array\.from\(\{length: 20\}, \(\) => \(\{ name: '', qty: '', isi: 1, cuanEcer: 0, profit: 0 \}\)\);\n      \};"""
initial_new = """      window.saveExpresCart = function() {
          if (window.expresCart) {
              localStorage.setItem('expresCart', JSON.stringify(window.expresCart));
          }
      };

      window.getInitialExpresCart = function(forceReset = false) {
          if (!forceReset) {
              try {
                  let saved = localStorage.getItem('expresCart');
                  if (saved) {
                      let parsed = JSON.parse(saved);
                      if (Array.isArray(parsed) && parsed.length > 0) {
                          while (parsed.length < 20) {
                              parsed.push({ name: '', qty: '', isi: 1, cuanEcer: 0, profit: 0 });
                          }
                          return parsed;
                      }
                  }
              } catch(e) {}
          }
          return Array.from({length: 20}, () => ({ name: '', qty: '', isi: 1, cuanEcer: 0, profit: 0 }));
      };"""
content = re.sub(initial_old, initial_new, content)

# 2. Add save to eksekusiCuan
eksekusi_old = r"window\.expresCart = window\.getInitialExpresCart\(\);"
eksekusi_new = r"window.expresCart = window.getInitialExpresCart(true);\n              window.saveExpresCart();"
content = re.sub(eksekusi_old, eksekusi_new, content)

# 3. Add save to updateExpresRow
update_old = r"btnEksekusi\.style\.display = totalCuan > 0 \? 'block' : 'none';\n         \}"
update_new = r"btnEksekusi.style.display = totalCuan > 0 ? 'block' : 'none';\n         }\n         window.saveExpresCart();"
content = re.sub(update_old, update_new, content)

# 4. Add save to removeExpres
remove_old = r"window\.expresCart\[index\] = \{name: '', qty: '', isi: 1, cuanEcer: 0, profit: 0\};\n           render\(\);"
remove_new = r"window.expresCart[index] = {name: '', qty: '', isi: 1, cuanEcer: 0, profit: 0};\n           window.saveExpresCart();\n           render();"
content = re.sub(remove_old, remove_new, content)

# 5. Add save to toggleExpresItem
# It ends with:
#               }
#           }
#       };
# We can find this by looking for the last line of toggleExpresItem.
# Since it's tricky, let's just insert it at the very start of the `toggleExpresItem`'s return or just after the if/else.
toggle_old = r"""                  if \(window\.expresCart\.length < 20\) \{\n                      window\.expresCart\.push\(\{name: '', qty: '', isi: 1, cuanEcer: 0, profit: 0\}\);\n                  \}\n              \}\n          \}"""
toggle_new = """                  if (window.expresCart.length < 20) {
                      window.expresCart.push({name: '', qty: '', isi: 1, cuanEcer: 0, profit: 0});
                  }
              }
          }
          window.saveExpresCart();"""
content = re.sub(toggle_old, toggle_new, content)

with open('assets/js/main.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("done")
