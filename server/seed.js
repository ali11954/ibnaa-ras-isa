require("dotenv").config();
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const mongoose = require("mongoose");
const XLSX = require("xlsx");
const path = require("path");

const MONGO_URI = process.env.MONGO_URI;
const EXCEL_DIR = process.env.EXCEL_DIR || "C:\\Users\\Administrator\\Documents\\port";

const workerSchema = new mongoose.Schema({
  nationalId: String,
  name: String,
  birthYear: Number,
  age: Number,
  ageGroup: String,
  region: String,
  birthPlace: String,
  currentPlace: String,
  profession: String,
  teamNumber: Number,
  note: String,
}, { timestamps: true });

const familySchema = new mongoose.Schema({
  teamNumber: Number,
  teamName: String,
  memberCount: Number,
  leader: String,
  status: String,
  village: String,
  individualAmount: Number,
  totalAmount: Number,
  beneficiary: String,
  reason: String,
  beneficiaries: [String],
}, { timestamps: true });

const Worker = mongoose.model("Worker", workerSchema);
const Family = mongoose.model("Family", familySchema);

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB Atlas");

  await Worker.deleteMany({});
  await Family.deleteMany({});
  console.log("Cleared old data");

  const wbPath = path.join(EXCEL_DIR, "كشف فرق عمال راس عيسى في ميناء راس عيسى1.xlsx");
  const wb = XLSX.readFile(wbPath);
  const ws = wb.Sheets["الكشف الكلي"];
  const raw = XLSX.utils.sheet_to_json(ws);
  const workers = [];
  for (const row of raw) {
    const name = row["__EMPTY_2"];
    if (!name || typeof name !== "string" || name.length < 3) continue;
    const age = parseInt(row["__EMPTY_4"]);
    if (isNaN(age) || age < 10 || age > 100) continue;
    workers.push({
      nationalId: String(row["__EMPTY"] || ""),
      name,
      birthYear: parseInt(row["__EMPTY_3"]) || 0,
      age,
      ageGroup: String(row["__EMPTY_5"] || ""),
      region: String(row["__EMPTY_6"] || ""),
      birthPlace: String(row["__EMPTY_7"] || ""),
      currentPlace: String(row["__EMPTY_8"] || ""),
      profession: String(row["__EMPTY_9"] || ""),
      teamNumber: parseInt(row["__EMPTY_10"]) || 0,
      note: String(row["__EMPTY_12"] || ""),
    });
  }
  await Worker.insertMany(workers);
  console.log(`Seeded ${workers.length} workers`);

  const wbFamPath = path.join(EXCEL_DIR, "الاسر المحتاجة.xlsx");
  const wb2 = XLSX.readFile(wbFamPath);
  const ws2 = wb2.Sheets["فرق العمل"];
  const raw2 = XLSX.utils.sheet_to_json(ws2, { header: 1, defval: "" });
  const families = [];
  for (let i = 2; i < raw2.length; i++) {
    const r = raw2[i];
    const teamName = r[1];
    if (!teamName || typeof teamName !== "string") continue;
    const memberCount = parseInt(r[2]) || 0;
    if (memberCount < 1) continue;
    families.push({
      teamNumber: parseInt(r[0]) || i,
      teamName,
      memberCount,
      leader: String(r[3] || ""),
      status: String(r[4] || ""),
      village: String(r[5] || ""),
      individualAmount: parseInt(r[6]) || 0,
      totalAmount: parseInt(r[7]) || 0,
      beneficiary: String(r[8] || ""),
      reason: String(r[9] || ""),
      beneficiaries: r[8] ? [String(r[8])] : [],
    });
  }
  await Family.insertMany(families);
  console.log(`Seeded ${families.length} families`);

  console.log("Done!");
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
