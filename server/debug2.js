const XLSX = require("xlsx");
const path = require("path");

const wbPath = path.join("C:\\Users\\Administrator\\Documents\\port", "كشف فرق راس عيسى.xlsx");
const wb = XLSX.readFile(wbPath);
const ws = wb.Sheets["الكشف الكلي"];
const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

// Check rows with age > 100
for (let i = 2; i < raw.length; i++) {
  const r = raw[i];
  const age = parseInt(r[4]);
  if (age > 100) {
    console.log("Row", i, "- cols 0-12:", JSON.stringify(r.slice(0,13)));
  }
}
