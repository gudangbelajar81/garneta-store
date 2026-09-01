import re

with open('assets/js/main.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update saveExpresCart to also call server
save_old = r"""      window\.saveExpresCart = function\(\) \{
          if \(window\.expresCart\) \{
              localStorage\.setItem\('expresCart', JSON\.stringify\(window\.expresCart\)\);
          \}
      \};"""

save_new = """      window.saveExpresCart = function() {
          if (window.expresCart) {
              localStorage.setItem('expresCart', JSON.stringify(window.expresCart));
              if (window.state && window.state.data) window.state.data.expresCart = window.expresCart;
              // Sync ke server secara background tanpa memblokir
              gas("saveExpresCart", window.expresCart).catch(e => console.error(e));
          }
      };"""

content = re.sub(save_old, save_new, content)

# 2. Update getInitialExpresCart to check state.data.expresCart first
init_old = r"""      window\.getInitialExpresCart = function\(forceReset = false\) \{
          if \(\!forceReset\) \{
              try \{
                  let saved = localStorage\.getItem\('expresCart'\);"""

init_new = """      window.getInitialExpresCart = function(forceReset = false) {
          if (!forceReset) {
              if (window.state && window.state.data && Array.isArray(window.state.data.expresCart) && window.state.data.expresCart.length > 0) {
                  let parsed = JSON.parse(JSON.stringify(window.state.data.expresCart));
                  while (parsed.length < 20) {
                      parsed.push({ name: '', qty: '', isi: 1, cuanEcer: 0, profit: 0 });
                  }
                  return parsed;
              }
              try {
                  let saved = localStorage.getItem('expresCart');"""

content = re.sub(init_old, init_new, content)

# One edge case: When the client initially loads, `window.expresCart` is undefined, and state is fetched.
# If they go to expres, it calls `window.getInitialExpresCart()`, which pulls from state.data.expresCart.
# So it's perfect.

with open('assets/js/main.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("main.js patched")
