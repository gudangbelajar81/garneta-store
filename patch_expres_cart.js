const fs = require('fs');
const file = 'assets/js/main.js';
let content = fs.readFileSync(file, 'utf8');

const targetArray = "Array.from({length: 20}, () => ({name: '', qty: '', isi: 1, cuanEcer: 0, profit: 0}))";
content = content.replaceAll(targetArray, "window.getInitialExpresCart()");

const insertPoint = 'window.eksekusiCuan = async function() {';
const functionCode = 
    window.getInitialExpresCart = function() {
        const defaultExpresItems = [
            "Beras A", "Beras B", "Beras C", "Cakra", "Gula Pasir", "Gunung Agung", 
            "Kacang A", "Kacang B", "Kacang C", "Kentang Besar", "Kentang Pl", "Kentang Siomay",
            "Maizena", "Minyak Sawit", "Payung", "Segitiga", "Sphp", "Telur"
        ];
        const products = (window.state && window.state.data && window.state.data.products) ? window.state.data.products : [];
        
        return Array.from({length: 20}, (_, i) => {
            let name = defaultExpresItems[i] || '';
            let isi = 1;
            let cuanEcer = 0;
            
            if (name && products.length > 0) {
                const prod = products.find(p => (p.name || "").trim().toLowerCase() === name.toLowerCase());
                if (prod) {
                    isi = prod.unitContent || 1;
                    const saleEcer = Number(String(prod.salePriceEcer || '0').replace(/[^0-9]/g, '')) || 0;
                    const baseEcer = Number(String(prod.basePriceEcer || '0').replace(/[^0-9]/g, '')) || 0;
                    cuanEcer = saleEcer - baseEcer;
                }
            }
            
            return { name: name, qty: '', isi: isi, cuanEcer: cuanEcer, profit: 0 };
        });
    };

    ;

content = content.replace(insertPoint, functionCode + insertPoint);

fs.writeFileSync(file, content);
console.log('PATCH EXPRESS CART DONE');