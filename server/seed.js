require("dotenv").config();
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const mongoose = require("mongoose");
const XLSX = require("xlsx");
const path = require("path");

const MONGO_URI = process.env.MONGO_URI;
const EXCEL_DIR = process.env.EXCEL_DIR || "C:\\Users\\Administrator\\Documents\\port";

const workerSchema = new mongoose.Schema({
  nationalId: String, name: String, birthYear: Number, age: Number, ageGroup: String,
  region: String, birthPlace: String, currentPlace: String, profession: String,
  teamNumber: Number, note: String,
}, { timestamps: true });

const familySchema = new mongoose.Schema({
  teamNumber: Number, teamName: String, memberCount: Number, leader: String,
  status: String, village: String, individualAmount: Number, totalAmount: Number,
  reason: String,
  beneficiaries: [{ name: String, amount: Number }],
}, { timestamps: true });

const Worker = mongoose.model("Worker", workerSchema);
const Family = mongoose.model("Family", familySchema);

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB Atlas");
  await Worker.deleteMany({});
  await Family.deleteMany({});

  // ─── Workers ──────────────────────────────────────────────────
  const wbW = XLSX.readFile(path.join(EXCEL_DIR, "كشف فرق راس عيسى.xlsx"));
  const rawW = XLSX.utils.sheet_to_json(wbW.Sheets["الكشف الكلي"], { header: 1, defval: "" });
  const workers = [];
  for (let i = 2; i < rawW.length; i++) {
    const r = rawW[i];
    const name = r[2];
    if (!name || typeof name !== "string" || name.length < 3) continue;
    let age = parseInt(r[4]);
    const birthYear = parseInt(r[3]) || 0;
    if (birthYear > 1900 && birthYear < 2030) age = 2026 - birthYear;
    if (age > 100 || isNaN(age) || age < 1) age = 30;
    workers.push({
      nationalId: String(r[1] || ""), name, birthYear, age,
      ageGroup: String(r[5] || ""), region: String(r[6] || ""),
      birthPlace: String(r[7] || ""), currentPlace: String(r[8] || ""),
      profession: String(r[9] || ""), teamNumber: parseInt(r[10]) || 0,
      note: String(r[12] || ""),
    });
  }
  await Worker.insertMany(workers);
  console.log("Seeded " + workers.length + " workers");

  // Count actual workers per team
  const teamWorkerCounts = {};
  workers.forEach(w => {
    if (w.teamNumber > 0) teamWorkerCounts[w.teamNumber] = (teamWorkerCounts[w.teamNumber] || 0) + 1;
  });

  // ─── Families (from both sheets) ──────────────────────────────
  const wbF = XLSX.readFile(path.join(EXCEL_DIR, "الاسر المحتاجة.xlsx"));

  // Sheet 1: الكشف الحديث - beneficiaries in columns 8, 10, 12 (Name(Amount) format)
  const rawH = XLSX.utils.sheet_to_json(wbF.Sheets["الكشف الحديث"], { header: 1, defval: "" });
  const familyMap = {};

  for (let i = 2; i < rawH.length; i++) {
    const r = rawH[i];
    const teamName = r[1];
    if (!teamName || typeof teamName !== "string") continue;
    // Extract real team number from name like "الفرقة 3" → 3
    const nameMatch = teamName.match(/(\d+)/);
    const teamNum = nameMatch ? parseInt(nameMatch[1]) : (parseInt(r[0]) || 0);
    const total = parseInt(r[7]) || 0;

    // Read beneficiaries from columns 8, 10, 12
    const beneficiaries = [];
    const benefCols = [8, 10, 12];
    let knownSum = 0;

    benefCols.forEach(col => {
      const raw = String(r[col] || "").trim();
      if (!raw) return;
      // Try to parse Name(Amount) format
      const match = raw.match(/(.+)\((\d+)\)/);
      if (match) {
        const name = match[1].trim();
        const amount = parseInt(match[2]) || 0;
        beneficiaries.push({ name, amount });
        knownSum += amount;
      } else {
        // Name without amount - will calculate later
        beneficiaries.push({ name: raw, amount: 0 });
      }
    });

    // Calculate missing amounts: distribute remaining total among bens with amount=0
    const missingCount = beneficiaries.filter(b => b.amount === 0).length;
    if (missingCount > 0 && total > 0) {
      const remaining = total - knownSum;
      const perMissing = Math.floor(remaining / missingCount);
      beneficiaries.forEach(b => {
        if (b.amount === 0) b.amount = perMissing;
      });
    }

    const reasonCol = beneficiaries.length > 1 ? 14 : 13;
    familyMap[teamNum] = {
      teamNumber: teamNum,
      teamName,
      leader: String(r[3] || ""),
      status: String(r[4] || ""),
      village: String(r[5] || ""),
      individualAmount: parseInt(r[6]) || 0,
      totalAmount: total,
      reason: String(r[reasonCol] || ""),
      beneficiaries,
    };
  }

  // Sheet 2: فرق العمل - multiple names separated by +, no amounts
  const rawF = XLSX.utils.sheet_to_json(wbF.Sheets["فرق العمل"], { header: 1, defval: "" });
  for (let i = 2; i < rawF.length; i++) {
    const r = rawF[i];
    const teamName = r[1];
    if (!teamName || typeof teamName !== "string") continue;
    const nameMatch2 = teamName.match(/(\d+)/);
    const teamNum = nameMatch2 ? parseInt(nameMatch2[1]) : (parseInt(r[0]) || 0);
    const existing = familyMap[teamNum];

    // Parse multiple names separated by +
    const benefRaw = String(r[8] || "");
    const names = benefRaw.split("+").map(n => n.trim()).filter(n => n.length > 0);

    if (names.length > 1) {
      // Multiple beneficiaries: split total amount from sheet 1 equally
      const total = existing ? existing.totalAmount : (parseInt(r[7]) || 0);
      const perPerson = Math.floor(total / names.length);
      const beneficiaries = names.map(name => ({ name, amount: perPerson }));

      if (existing) {
        existing.beneficiaries = beneficiaries;
        existing.reason = String(r[9] || "");
      } else {
        familyMap[teamNum] = {
          teamNumber: teamNum, teamName,
          memberCount: parseInt(r[2]) || 0,
          leader: String(r[3] || ""), status: String(r[4] || ""),
          village: String(r[5] || ""),
          individualAmount: parseInt(r[6]) || 0,
          totalAmount: total,
          reason: String(r[9] || ""),
          beneficiaries,
        };
      }
    }
  }

  // Set memberCount from actual workers
  const families = Object.values(familyMap).map(f => {
    f.memberCount = teamWorkerCounts[f.teamNumber] || f.memberCount || 0;
    return f;
  });
  await Family.insertMany(families);
  console.log("Seeded " + families.length + " families");
  console.log("Done!");
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
