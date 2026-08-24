const fs = require('fs');
let code = fs.readFileSync('assets/js/main.js', 'utf8');

// 1. Add payDate to window.editEmployee
code = code.replace(
    'item: { name: name, phone: "", joinDate: today(), salaryType: "Harian", baseSalary: 0, status: "Aktif" }',
    'item: { name: name, phone: "", joinDate: today(), salaryType: "Harian", baseSalary: 0, status: "Aktif", payDate: "" }'
);

// 2. Add payDate input to employee form
const formHtml = '${input("joinDate", "Tgl Masuk", true, "date", emp.joinDate ? emp.joinDate.slice(0,10) : "")}';
const newFormHtml = formHtml + '\n                  ${input("payDate", "Tgl Gajian (1-31)", false, "number", emp.payDate || "")}';
code = code.replace(formHtml, newFormHtml);

fs.writeFileSync('assets/js/main.js', code);
console.log("Success: Modified employee schema");
