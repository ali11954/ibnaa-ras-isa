const XLSX = require("xlsx");
const path = require("path");

const wbPath = path.join("C:\\Users\\Administrator\\Documents\\port", "كشف فرق راس عيسى.xlsx");
const wb = XLSX.readFile(wbPath);
const ws = wb.Sheets["الكشف الكلي"];
const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

let skipped = 0;
for (let i = 2; i < raw.length; i++) {
  const r = raw[i];
  const name = r[2];
  const age = parseInt(r[4]);
  if (!name || typeof name !== "string" || name.length < 3) { skipped++; console.log("Skip name:", i, JSON.stringify(r[2])); continue; }
  if (isNaN(age) || age < 10 || age > 100) { skipped++; console.log("Skip age:", i, name, "age:", r[4]); continue; }
}
console.log("Total rows:", raw.length - 2);
console.log("Skipped:", skipped);
