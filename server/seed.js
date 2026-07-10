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

  const wbPath = path.join(EXCEL_DIR, "كشف فرق راس عيسى.xlsx");
  const wb = XLSX.readFile(wbPath);
  const ws = wb.Sheets["الكشف الكلي"];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    const workers = [];
    for (let i = 2; i < raw.length; i++) {
      const r = raw[i];
      const name = r[2];
      if (!name || typeof name !== "string" || name.length < 3) continue;
      let age = parseInt(r[4]);
      const birthYear = parseInt(r[3]) || 0;
      if (birthYear > 1900 && birthYear < 2030) age = 2026 - birthYear;
      if (age > 100 || isNaN(age) || age < 1) age = 30;
      workers.push({
        nationalId: String(r[1] || ""),
        name,
        birthYear,
        age,
        ageGroup: String(r[5] || ""),
        region: String(r[6] || ""),
        birthPlace: String(r[7] || ""),
        currentPlace: String(r[8] || ""),
        profession: String(r[9] || ""),
        teamNumber: parseInt(r[10]) || 0,
        note: String(r[12] || ""),
      });
    }
  await Worker.insertMany(workers);
  console.log("Seeded " + workers.length + " workers");

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
  console.log("Seeded " + families.length + " families");

  console.log("Done!");
  process.exit(0);
}

seed().catch(function(e) { console.error(e); process.exit(1); });
