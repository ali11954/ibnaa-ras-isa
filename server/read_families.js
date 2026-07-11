const XLSX = require("xlsx");
const path = require("path");

const wbPath = path.join("C:\\Users\\Administrator\\Documents\\port", "الاسر المحتاجة.xlsx");
const wb = XLSX.readFile(wbPath);
console.log("Sheets:", wb.SheetNames);

// Read first sheet to see structure
const ws1 = wb.Sheets[wb.SheetNames[0]];
const data1 = XLSX.utils.sheet_to_json(ws1, { header: 1, defval: "" });
console.log("\n=== Sheet 1:", wb.SheetNames[0], "===");
console.log("Rows:", data1.length);
for (let i = 0; i < Math.min(5, data1.length); i++) {
  console.log("R" + i + ":", JSON.stringify(data1[i].slice(0, 12)));
}

// Read second sheet
const ws2 = wb.Sheets[wb.SheetNames[1]];
const data2 = XLSX.utils.sheet_to_json(ws2, { header: 1, defval: "" });
console.log("\n=== Sheet 2:", wb.SheetNames[1], "===");
console.log("Rows:", data2.length);
for (let i = 0; i < Math.min(5, data2.length); i++) {
  console.log("R" + i + ":", JSON.stringify(data2[i].slice(0, 12)));
}
