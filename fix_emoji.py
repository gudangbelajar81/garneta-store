with open('assets/js/main.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(">dY\"' Simpan Kategori</button>", ">💾 Simpan Kategori</button>")

with open('assets/js/main.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Emoji fixed")
