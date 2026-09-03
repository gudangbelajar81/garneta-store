function formatKategori(text) {
    if (!text) return "";
    return [...new Set(text.split('\n')
       .map(c => c.trim().split(/\s+/).map(w => w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : '').join(' '))
       .filter(Boolean))].sort().join('\n');
}

console.log(formatKategori('KRUPUK\nSAYURAN\nMINUMAN\nMINUMAN SASET\nberas '));
