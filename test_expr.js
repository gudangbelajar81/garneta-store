let window = {};
window.getInitialExpresCart = function(forceReset = false) {
    return [{name: 'Beras'}];
};
let row = {name: 'Beras'};

const isChecked = (window.expresCart = window.expresCart || window.getInitialExpresCart(false))?.some(r => (r.name || "").trim().toLowerCase() === (row.name || "").trim().toLowerCase()) ? "checked" : "";

console.log("isChecked:", isChecked);
console.log("window.expresCart:", window.expresCart);
