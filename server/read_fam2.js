const XLSX = require("xlsx");
const path = require("path");

const wbPath = path.join("C:\\Users\\Administrator\\Documents\\port", "الاسر المحتاجة.xlsx");
const wb = XLSX.readFile(wbPath);

const ws = wb.Sheets["الكشف الحديث"];
const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

for (let i = 1; i < data.length; i++) {
  const r = data[i];
  if (!r[1] || typeof r[1] !== "string") continue;
  console.log(r[0], "|", r[1], "|", r[2], "|", r[3], "|", r[5], "|", r[8]);
}
