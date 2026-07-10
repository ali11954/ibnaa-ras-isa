const XLSX = require("xlsx");
const path = require("path");

const wbPath = path.join("C:\\Users\\Administrator\\Documents\\port", "كشف فرق راس عيسى.xlsx");
const wb = XLSX.readFile(wbPath);
console.log("Sheets:", wb.SheetNames);
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
console.log("Rows:", data.length);
console.log("R0:", JSON.stringify(data[0]));
console.log("R1:", JSON.stringify(data[1]));
console.log("R2:", JSON.stringify(data[2]));
console.log("R3:", JSON.stringify(data[3]));
console.log("R4:", JSON.stringify(data[4]));
