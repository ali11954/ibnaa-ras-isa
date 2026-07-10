const XLSX = require("xlsx");
const path = require("path");

const wbPath = path.join("C:\\Users\\Administrator\\Documents\\port", "كشف فرق عمال راس عيسى في ميناء راس عيسى1.xlsx");
const wb = XLSX.readFile(wbPath);
const ws = wb.Sheets["الكشف الكلي"];
const raw = XLSX.utils.sheet_to_json(ws);

let valid = 0, skipped = 0;
for (const row of raw) {
  const name = row["__EMPTY_2"];
  const age = parseInt(row["__EMPTY_4"]);
  if (!name || typeof name !== "string" || name.length < 3) { skipped++; continue; }
  if (isNaN(age) || age < 10 || age > 100) { skipped++; continue; }
  valid++;
}
console.log("Total rows:", raw.length);
console.log("Valid:", valid);
console.log("Skipped:", skipped);
