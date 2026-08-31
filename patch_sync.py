import re

with open('assets/js/main.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_block = """        if (window.dataVersion !== syncData.dataVersion) {
           window.dataVersion = syncData.dataVersion;
           showToast("🔄 Sinkronisasi: Ada aktivitas data baru.", "info");
           state.data = await gas("bootstrap", {}, true);
           render();
        }"""

new_block = """        if (window.dataVersion !== syncData.dataVersion) {
           window.dataVersion = syncData.dataVersion;
           // Silently update state.data without toast and without forcing render
           // to prevent disrupting the user while typing in forms
           state.data = await gas("bootstrap", {}, true);
           // Only re-render if on dashboard to avoid interrupting data entry
           if (state.route === 'dashboard') {
             render();
           }
        }"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open('assets/js/main.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Success: Replacement made.")
else:
    print("Error: Could not find block to replace.")
