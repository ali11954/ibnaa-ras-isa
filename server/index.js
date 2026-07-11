require("dotenv").config();
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const path = require("path");
const XLSX = require("xlsx");
const fs = require("fs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");

const app = express();
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3001;
const EXCEL_DIR = process.env.EXCEL_DIR || "C:\\Users\\Administrator\\Documents\\port";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "alimubark440@gmail.com";
const MONGO_URI = process.env.MONGO_URI;

// ─── Schemas ────────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  role: { type: String, default: "pending" },
  name: String,
  email: String,
  phone: String,
  token: String,
  approved: { type: Boolean, default: false },
  verified: { type: Boolean, default: false },
  permissions: { type: [String], default: [] },
}, { timestamps: true });

const feedbackSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  name: String,
  email: String,
  subject: String,
  message: String,
  status: { type: String, default: "pending" },
  adminReply: String,
  adminReplyAt: Date,
}, { timestamps: true });

const subscriberSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  name: String,
  phone: String,
  reason: String,
  approved: { type: Boolean, default: false },
  permissions: { type: [String], default: [] },
}, { timestamps: true });

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
  reason: String,
  beneficiaries: [{ name: String, amount: Number }],
}, { timestamps: true });

// ─── Census Schema ───────────────────────────────────────────────────────────
const censusSchema = new mongoose.Schema({
  formNumber: String,
  familyNumber: String,
  visitDate: String,
  researcherName: String,
  governorate: String,
  directorate: String,
  isolation: String,
  village: String,
  neighborhood: String,
  street: String,
  houseNumber: String,
  headName: String,
  phone: String,
  currentFamilySize: Number,
  previousFamilySize: Number,
  maleCount: Number,
  femaleCount: Number,
  marriedCount: Number,
  deceasedCount: Number,
  migrantCount: Number,
  migrationDestination: String,
  residenceDate: String,
  previousResidence: String,
  previousGovernorate: String,
  previousDirectorate: String,
  previousIsolation: String,
  previousVillage: String,
  housingType: String,
  housingCondition: String,
  mainIncomeSource: String,
  otherIncomeSources: String,
  averageIncome: Number,
  financialStatus: String,
  notes: String,
  members: [{
    seq: Number,
    name: String,
    gender: String,
    age: Number,
    relationship: String,
    parentName: String,
    maritalStatus: String,
    educationLevel: String,
    educationStatus: String,
    work: String,
    memberIncome: Number,
    healthStatus: String,
    chronicDisease: String,
    injury: String,
    disability: String,
    memberNotes: String,
  }],
  housing: {
    type: String,
    ownership: String,
    moveDate: String,
    rooms: Number,
    electricity: String,
    water: String,
    sewage: String,
    internet: String,
    gas: String,
    housingNotes: String,
  },
  migration: [{
    migName: String,
    departureDate: String,
    migDestination: String,
    migReason: String,
    insideYemen: String,
    country: String,
    migNotes: String,
  }],
  diseases: [{
    disName: String,
    chronicDisease: String,
    injuryType: String,
    disabilityType: String,
    injuryDate: String,
    needsTreatment: String,
    disNotes: String,
  }],
}, { timestamps: true });
const Census = mongoose.model("Census", censusSchema);

const User = mongoose.model("User", userSchema);
const Feedback = mongoose.model("Feedback", feedbackSchema);
const Subscriber = mongoose.model("Subscriber", subscriberSchema);
const Worker = mongoose.model("Worker", workerSchema);
const Family = mongoose.model("Family", familySchema);

const transferLogSchema = new mongoose.Schema({
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: "Worker" },
  workerName: String,
  fromTeam: Number,
  toTeam: Number,
  movedBy: String,
}, { timestamps: true });
const TransferLog = mongoose.model("TransferLog", transferLogSchema);

// ─── Helpers ────────────────────────────────────────────────────────────────
function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.SMTP_USER || ADMIN_EMAIL, pass: process.env.SMTP_PASS || "" },
});

async function sendEmail(to, subject, html) {
  try {
    await transporter.sendMail({ from: ADMIN_EMAIL, to, subject, html });
    return true;
  } catch (e) {
    console.error("Email error:", e.message);
    return false;
  }
}

// ─── Middleware ──────────────────────────────────────────────────────────────
async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token" });
  const token = header.replace("Bearer ", "");
  try {
    const user = await User.findOne({ token });
    if (!user) return res.status(401).json({ error: "Invalid token" });
    req.user = user;
    next();
  } catch (e) { res.status(500).json({ error: e.message }); }
}

function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });
  next();
}

async function subscriberMiddleware(req, res, next) {
  if (req.user && req.user.role === "admin") return next();
  try {
    const sub = await Subscriber.findOne({ approved: true });
    if (sub) return next();
    return res.status(403).json({ error: "Not subscribed" });
  } catch (e) { res.status(500).json({ error: e.message }); }
}

// ─── Excel Data → MongoDB ───────────────────────────────────────────────────
async function seedExcelToMongo() {
  const workerCount = await Worker.countDocuments();
  if (workerCount > 0) {
    console.log(`MongoDB already has ${workerCount} workers — skipping seed`);
    return;
  }

  const wbWorkersPath = path.join(EXCEL_DIR, "كشف فرق راس عيسى.xlsx");
  if (!fs.existsSync(wbWorkersPath)) {
    console.log("Excel files not found — skipping seed");
    return;
  }

  try {
    const wb = XLSX.readFile(wbWorkersPath);
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
    if (workers.length > 0) {
      await Worker.insertMany(workers);
      console.log(`Seeded ${workers.length} workers to MongoDB`);
    }
  } catch (e) {
    console.error("Worker seed error:", e.message);
  }

  const wbFamiliesPath = path.join(EXCEL_DIR, "الاسر المحتاجة.xlsx");
  if (!fs.existsSync(wbFamiliesPath)) return;

  try {
    const wb = XLSX.readFile(wbFamiliesPath);
    const familyMap = {};

    // Sheet 1: الكشف الحديث - beneficiaries in columns 8, 10, 12 (Name(Amount) format)
    const rawH = XLSX.utils.sheet_to_json(wb.Sheets["الكشف الحديث"], { header: 1, defval: "" });
    for (let i = 2; i < rawH.length; i++) {
      const r = rawH[i];
      const teamName = r[1];
      if (!teamName || typeof teamName !== "string") continue;
      const nameMatch = teamName.match(/(\d+)/);
      const teamNum = nameMatch ? parseInt(nameMatch[1]) : (parseInt(r[0]) || 0);
      const total = parseInt(r[7]) || 0;

      const beneficiaries = [];
      const benefCols = [8, 10, 12];
      let knownSum = 0;

      benefCols.forEach(col => {
        const raw = String(r[col] || "").trim();
        if (!raw) return;
        const match = raw.match(/(.+)\((\d+)\)/);
        if (match) {
          const name = match[1].trim();
          const amount = parseInt(match[2]) || 0;
          beneficiaries.push({ name, amount });
          knownSum += amount;
        } else {
          beneficiaries.push({ name: raw, amount: 0 });
        }
      });

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
        teamNumber: teamNum, teamName,
        leader: String(r[3] || ""), status: String(r[4] || ""),
        village: String(r[5] || ""),
        individualAmount: parseInt(r[6]) || 0,
        totalAmount: total,
        reason: String(r[reasonCol] || ""),
        beneficiaries,
      };
    }

    // Sheet 2: فرق العمل - multiple names separated by +, no amounts
    const rawF = XLSX.utils.sheet_to_json(wb.Sheets["فرق العمل"], { header: 1, defval: "" });
    for (let i = 2; i < rawF.length; i++) {
      const r = rawF[i];
      const teamName = r[1];
      if (!teamName || typeof teamName !== "string") continue;
      const teamNum = parseInt(r[0]) || 0;
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

    const families = Object.values(familyMap);
    if (families.length > 0) {
      await Family.insertMany(families);
      console.log(`Seeded ${families.length} families to MongoDB`);
    }
  } catch (e) {
    console.error("Family seed error:", e.message);
  }
}

// ─── Auth Routes ────────────────────────────────────────────────────────────
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password: hashPassword(password) });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    if (!user.approved) return res.status(403).json({ error: "Account pending approval" });
    res.json({ token: user.token, user: { username: user.username, role: user.role, name: user.name, email: user.email, permissions: user.permissions || [] } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, password, name, email, phone } = req.body;
    const exists = await User.findOne({ username });
    if (exists) return res.status(400).json({ error: "Username taken" });
    const token = crypto.randomBytes(32).toString("hex");
    const user = await User.create({ username, password: hashPassword(password), name, email, phone, token });
    res.json({ message: "Registration submitted, awaiting approval", userId: user._id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/auth/me", authMiddleware, (req, res) => {
  const u = req.user;
  res.json({ user: { username: u.username, name: u.name, role: u.role, email: u.email, phone: u.phone, permissions: u.permissions || [] } });
});

app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.token = resetToken;
    await user.save();
    await sendEmail(email, "Password Reset", `<p>Use this token: ${resetToken}</p>`);
    res.json({ message: "Reset email sent" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/auth/verify-reset", async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findOne({ token });
    if (!user) return res.status(400).json({ error: "Invalid token" });
    res.json({ message: "Token valid", userId: user._id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const user = await User.findOne({ token });
    if (!user) return res.status(400).json({ error: "Invalid token" });
    user.password = hashPassword(newPassword);
    user.token = crypto.randomBytes(32).toString("hex");
    await user.save();
    res.json({ message: "Password reset" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/auth/login-phone", async (req, res) => {
  try {
    const { phone } = req.body;
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ error: "Phone not found" });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.token = otp;
    await user.save();
    await sendEmail(user.email, "OTP Code", `<p>Your OTP: ${otp}</p>`);
    res.json({ message: "OTP sent" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/auth/verify-otp", async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const user = await User.findOne({ phone, token: otp });
    if (!user) return res.status(401).json({ error: "Invalid OTP" });
    user.token = crypto.randomBytes(32).toString("hex");
    await user.save();
    res.json({ token: user.token, user: { username: user.username, role: user.role, name: user.name, email: user.email, permissions: user.permissions || [] } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Admin Routes ───────────────────────────────────────────────────────────
app.get("/api/admin/users", authMiddleware, adminMiddleware, async (req, res) => {
  try { res.json(await User.find().select("-password")); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/admin/approve/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { permissions = [] } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "Not found" });
    user.approved = true;
    user.role = "user";
    user.permissions = permissions;
    await user.save();
    res.json({ message: "Approved", user });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/admin/reject/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "Rejected" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Data Routes (MongoDB-backed) ───────────────────────────────────────────
app.get("/api/workers", authMiddleware, subscriberMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 15, search = "", region = "", profession = "", team = "" } = req.query;
    const filter = {};
    if (search) filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { nationalId: { $regex: search, $options: "i" } },
      { teamNumber: parseInt(search) || 0 },
    ];
    if (region) filter.region = region;
    if (profession) filter.profession = profession;
    if (team) filter.teamNumber = parseInt(team);
    const total = await Worker.countDocuments(filter);
    const data = await Worker.find(filter).skip((page - 1) * limit).limit(parseInt(limit));
    const regionAgg = await Worker.aggregate([{ $group: { _id: "$region", count: { $sum: 1 } } }, { $sort: { count: -1 } }]);
    const profAgg = await Worker.aggregate([{ $group: { _id: "$profession", count: { $sum: 1 } } }, { $sort: { count: -1 } }]);
    res.json({
      data: data.map(w => ({ ...w.toObject(), id: w._id })),
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) },
      filters: {
        regions: regionAgg.map(r => ({ name: r._id, count: r.count })).filter(r => r.name),
        professions: profAgg.map(p => ({ name: p._id, count: p.count })).filter(p => p.name),
      },
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/teams/:num/members", authMiddleware, subscriberMiddleware, async (req, res) => {
  try {
    const team = parseInt(req.params.num);
    const members = await Worker.find({ teamNumber: team });
    res.json({ members: members.map(m => ({ ...m.toObject(), id: m._id })) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/families", authMiddleware, subscriberMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 15, search = "" } = req.query;
    const filter = {};
    if (search) filter.$or = [
      { teamName: { $regex: search, $options: "i" } },
      { leader: { $regex: search, $options: "i" } },
      { village: { $regex: search, $options: "i" } },
      { reason: { $regex: search, $options: "i" } },
      { "beneficiaries.name": { $regex: search, $options: "i" } },
    ];
    const total = await Family.countDocuments(filter);
    const data = await Family.find(filter).skip((page - 1) * limit).limit(parseInt(limit));

    // Calculate real memberCount from Worker collection for each family
    const teamCounts = await Worker.aggregate([
      { $group: { _id: "$teamNumber", count: { $sum: 1 } } }
    ]);
    const countMap = {};
    teamCounts.forEach(t => { countMap[t._id] = t.count; });

    res.json({
      data: data.map(f => {
        const obj = f.toObject();
        obj.id = f._id;
        obj.memberCount = countMap[f.teamNumber] || 0;
        return obj;
      }),
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) },
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/families/summary", authMiddleware, subscriberMiddleware, async (req, res) => {
  try {
    const totalTeams = await Family.countDocuments();
    const agg = await Family.aggregate([
      { $group: { _id: null, totalAmount: { $sum: "$totalAmount" }, totalBens: { $sum: { $size: "$beneficiaries" } } } }
    ]);
    const teamCounts = await Worker.aggregate([
      { $group: { _id: "$teamNumber", count: { $sum: 1 } } }
    ]);
    const totalWorkers = teamCounts.reduce((s, t) => s + t.count, 0);
    res.json({
      totalTeams,
      totalWorkers,
      totalAmount: agg[0]?.totalAmount || 0,
      totalBens: agg[0]?.totalBens || 0,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/stats", authMiddleware, subscriberMiddleware, async (req, res) => {
  try {
    const totalWorkers = await Worker.countDocuments();
    const totalFamilies = await Family.countDocuments();
    const regionAgg = await Worker.aggregate([{ $group: { _id: "$region", count: { $sum: 1 } } }]);
    const profAgg = await Worker.aggregate([{ $group: { _id: "$profession", count: { $sum: 1 } } }]);
    const teamAgg = await Worker.aggregate([{ $group: { _id: "$teamNumber" } }]);
    res.json({
      totalWorkers,
      totalFamilies,
      totalTeams: teamAgg.filter(t => t._id > 0).length,
      regions: regionAgg.map(r => ({ name: r._id, count: r.count })).filter(r => r.name),
      professions: profAgg.map(p => ({ name: p._id, count: p.count })).filter(p => p.name),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/citizen-stats", authMiddleware, subscriberMiddleware, async (req, res) => {
  try {
    const totalCitizens = await Worker.countDocuments();
    const regionAgg = await Worker.aggregate([{ $group: { _id: "$region", count: { $sum: 1 } } }, { $sort: { count: -1 } }]);
    const profAgg = await Worker.aggregate([{ $group: { _id: "$profession", count: { $sum: 1 } } }, { $sort: { count: -1 } }]);
    const ageAgg = await Worker.aggregate([{ $group: { _id: "$ageGroup", count: { $sum: 1 } } }, { $sort: { _id: 1 } }]);
    const teamAgg = await Worker.aggregate([{ $group: { _id: "$teamNumber", count: { $sum: 1 } } }, { $sort: { _id: 1 } }]);
    const villageAgg = await Family.aggregate([{ $group: { _id: "$village", count: { $sum: 1 } } }, { $sort: { count: -1 } }]);
    res.json({
      totalCitizens,
      regions: regionAgg.map(r => ({ name: r._id, count: r.count })).filter(r => r.name),
      professions: profAgg.map(p => ({ name: p._id, count: p.count })).filter(p => p.name),
      ageGroups: ageAgg.map(a => ({ name: a._id, count: a.count })).filter(a => a.name),
      teams: teamAgg.map(t => ({ name: String(t._id), count: t.count })).filter(t => t.name !== "0"),
      villages: villageAgg.map(v => ({ name: v._id, count: v.count })).filter(v => v.name),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Worker Transfer Routes ─────────────────────────────────────────────────
app.post("/api/workers/:id/transfer", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { toTeam } = req.body;
    const worker = await Worker.findById(req.params.id);
    if (!worker) return res.status(404).json({ error: "Worker not found" });
    const fromTeam = worker.teamNumber;
    worker.teamNumber = toTeam;
    await worker.save();
    await TransferLog.create({
      workerId: worker._id,
      workerName: worker.name,
      fromTeam,
      toTeam,
      movedBy: req.user.name || req.user.username,
    });
    res.json({ message: "Worker transferred", worker });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/transfer-log", authMiddleware, async (req, res) => {
  try {
    const logs = await TransferLog.find().sort({ createdAt: -1 }).limit(200);
    res.json(logs);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Worker CRUD ─────────────────────────────────────────────────────────────
app.post("/api/workers", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, nationalId, age, ageGroup, region, birthPlace, currentPlace, profession, teamNumber, note } = req.body;
    const worker = await Worker.create({ name, nationalId, age, ageGroup, region, birthPlace, currentPlace, profession, teamNumber, note, birthYear: 2026 - age });
    res.json(worker);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/workers/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await Worker.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put("/api/workers/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const worker = await Worker.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(worker);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Family CRUD ─────────────────────────────────────────────────────────────
app.post("/api/families", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const family = await Family.create(req.body);
    res.json(family);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put("/api/families/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const family = await Family.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(family);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/families/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await Family.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Sync: Get team stats from workers ───────────────────────────────────────
app.get("/api/team-stats", authMiddleware, subscriberMiddleware, async (req, res) => {
  try {
    const stats = await Worker.aggregate([
      { $group: { _id: "$teamNumber", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    res.json(stats.filter(s => s._id > 0).map(s => ({ team: s._id, count: s.count })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/export/workers", authMiddleware, subscriberMiddleware, async (req, res) => {
  try {
    const { team, format } = req.query;
    const filter = team ? { teamNumber: parseInt(team) } : {};
    const workers = await Worker.find(filter).sort({ teamNumber: 1, name: 1 });
    if (format === "excel") {
      const data = workers.map((w, i) => ({
        "#": i + 1,
        "الاسم": w.name,
        "الرقم الوطني": w.nationalId,
        "العمر": w.age,
        "الفئة العمرية": w.ageGroup,
        "المنطقة": w.region,
        "محل الميلاد": w.birthPlace,
        "المهنة": w.profession,
        "رقم الفرقة": w.teamNumber,
        "ملاحظة": w.note,
        "البصمة": "",
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "العمال");
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      res.setHeader("Content-Disposition", `attachment; filename=workers${team ? `_team${team}` : "_all"}.xlsx`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      return res.send(buf);
    }
    res.json(workers);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Feedback Routes ────────────────────────────────────────────────────────
app.get("/api/feedback", authMiddleware, async (req, res) => {
  try {
    const filter = req.user.role === "admin" ? {} : { userId: req.user._id };
    res.json(await Feedback.find(filter).populate("userId", "name username"));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/feedback", async (req, res) => {
  try {
    const { name, email, subject, message, userId } = req.body;
    const fb = await Feedback.create({ name, email, subject, message, userId: userId || undefined });
    res.json(fb);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/feedback/:id/reply", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const fb = await Feedback.findById(req.params.id);
    if (!fb) return res.status(404).json({ error: "Not found" });
    fb.adminReply = req.body.reply;
    fb.adminReplyAt = new Date();
    fb.status = "replied";
    await fb.save();
    res.json(fb);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/feedback/:id/approve", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const fb = await Feedback.findByIdAndUpdate(req.params.id, { status: "approved" }, { new: true });
    if (!fb) return res.status(404).json({ error: "Not found" });
    res.json(fb);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Subscriber Routes ──────────────────────────────────────────────────────
app.get("/api/subscribers", authMiddleware, adminMiddleware, async (req, res) => {
  try { res.json(await Subscriber.find()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/subscribers/subscribe", async (req, res) => {
  try {
    const { email, name, phone, reason, permissions = [] } = req.body;
    const exists = await Subscriber.findOne({ email });
    if (exists) return res.status(400).json({ error: "Already subscribed" });
    const sub = await Subscriber.create({ email, name, phone, reason, permissions });
    await sendEmail(email, "Subscription Request", "<p>Your subscription request has been received.</p>");
    res.json({ message: "Subscription request submitted", subscriber: sub });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/subscribers/:id/approve", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { permissions = [] } = req.body;
    const sub = await Subscriber.findByIdAndUpdate(req.params.id, { approved: true, permissions }, { new: true });
    if (!sub) return res.status(404).json({ error: "Not found" });
    let user = await User.findOne({ email: sub.email });
    if (user) {
      user.approved = true;
      user.role = "user";
      user.permissions = permissions;
      await user.save();
    }
    await sendEmail(sub.email, "Subscription Approved", `<p>Your subscription has been approved! You can now log in.</p>`);
    res.json(sub);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Email Config Routes ────────────────────────────────────────────────────
app.get("/api/email-config/status", authMiddleware, adminMiddleware, (req, res) => {
  res.json({ configured: !!process.env.SMTP_PASS });
});

app.post("/api/email-config", authMiddleware, adminMiddleware, async (req, res) => {
  const { smtpUser, smtpPass } = req.body;
  process.env.SMTP_USER = smtpUser || ADMIN_EMAIL;
  process.env.SMTP_PASS = smtpPass || "";
  transporter.options.auth.user = process.env.SMTP_USER;
  transporter.options.auth.pass = process.env.SMTP_PASS;
  res.json({ message: "Email config updated" });
});

app.post("/api/email-config/test-email", authMiddleware, adminMiddleware, async (req, res) => {
  const sent = await sendEmail(req.body.email || ADMIN_EMAIL, "Test Email", "<p>Test successful!</p>");
  res.json({ success: sent });
});

// ─── Census Routes ───────────────────────────────────────────────────────────
app.get("/api/census", authMiddleware, subscriberMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "" } = req.query;
    const filter = {};
    if (search) filter.$or = [
      { headName: { $regex: search, $options: "i" } },
      { village: { $regex: search, $options: "i" } },
      { familyNumber: { $regex: search, $options: "i" } },
      { directorate: { $regex: search, $options: "i" } },
    ];
    const total = await Census.countDocuments(filter);
    const data = await Census.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
    res.json({
      data: data.map(c => ({ ...c.toObject(), id: c._id })),
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) },
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/census/summary", authMiddleware, subscriberMiddleware, async (req, res) => {
  try {
    const totalForms = await Census.countDocuments();
    const agg = await Census.aggregate([
      { $group: {
        _id: null,
        totalPopulation: { $sum: { $add: ["$maleCount", "$femaleCount"] } },
        totalMales: { $sum: "$maleCount" },
        totalFemales: { $sum: "$femaleCount" },
        totalMigrants: { $sum: "$migrantCount" },
        totalDeceased: { $sum: "$deceasedCount" },
        totalMarried: { $sum: "$marriedCount" },
        avgIncome: { $avg: "$averageIncome" },
      }}
    ]);
    const totalMembers = await Census.aggregate([
      { $unwind: "$members" },
      { $count: "total" },
    ]);
    const villageStats = await Census.aggregate([
      { $group: { _id: "$village", forms: { $sum: 1 }, population: { $sum: { $add: ["$maleCount", "$femaleCount"] } } } },
      { $sort: { population: -1 } },
    ]);
    const genderByAge = await Census.aggregate([
      { $unwind: "$members" },
      { $group: {
        _id: { gender: "$members.gender", age: "$members.age" },
        count: { $sum: 1 },
      }},
      { $sort: { "_id.age": 1 } },
    ]);
    const healthStats = await Census.aggregate([
      { $unwind: "$members" },
      { $group: {
        _id: "$members.healthStatus",
        count: { $sum: 1 },
      }},
      { $sort: { count: -1 } },
    ]);
    const educationStats = await Census.aggregate([
      { $unwind: "$members" },
      { $group: {
        _id: "$members.educationLevel",
        count: { $sum: 1 },
      }},
      { $sort: { count: -1 } },
    ]);
    const housingTypes = await Census.aggregate([
      { $group: { _id: "$housingType", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json({
      totalForms,
      totalPopulation: agg[0]?.totalPopulation || 0,
      totalMales: agg[0]?.totalMales || 0,
      totalFemales: agg[0]?.totalFemales || 0,
      totalMigrants: agg[0]?.totalMigrants || 0,
      totalDeceased: agg[0]?.totalDeceased || 0,
      totalMarried: agg[0]?.totalMarried || 0,
      avgIncome: Math.round(agg[0]?.avgIncome || 0),
      totalMembers: totalMembers[0]?.total || 0,
      villageStats: villageStats.filter(v => v._id).map(v => ({ name: v._id, forms: v.forms, population: v.population })),
      genderByAge: genderByAge.filter(g => g._id.age).map(g => ({ gender: g._id.gender, age: g._id.age, count: g.count })),
      healthStats: healthStats.filter(h => h._id).map(h => ({ name: h._id, count: h.count })),
      educationStats: educationStats.filter(e => e._id).map(e => ({ name: e._id, count: e.count })),
      housingTypes: housingTypes.filter(h => h._id).map(h => ({ name: h._id, count: h.count })),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/census/:id", authMiddleware, subscriberMiddleware, async (req, res) => {
  try {
    const census = await Census.findById(req.params.id);
    if (!census) return res.status(404).json({ error: "Not found" });
    res.json(census);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/census", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const census = await Census.create(req.body);
    res.json(census);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put("/api/census/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const census = await Census.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(census);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/census/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await Census.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/export/census", authMiddleware, subscriberMiddleware, async (req, res) => {
  try {
    const { format } = req.query;
    const data = await Census.find().sort({ createdAt: -1 });
    if (format === "excel") {
      const rows = [];
      data.forEach(c => {
        if (c.members && c.members.length > 0) {
          c.members.forEach((m, i) => {
            rows.push({
              "رقم الاستمارة": c.formNumber, "رقم الأسرة": c.familyNumber,
              "اسم رب الأسرة": c.headName, "القرية": c.village, "المديرية": c.directorate,
              "المحافظة": c.governorate, "الحي": c.neighborhood, "الشارع": c.street,
              "رقم المنزل": c.houseNumber, "الهاتف": c.phone,
              "عدد الأسرة": c.currentFamilySize, "الذكور": c.maleCount, "الإناث": c.femaleCount,
              "المتزوجين": c.marriedCount, "المتوفين": c.deceasedCount, "المهاجرين": m.migrantCount,
              "متوسط الدخل": c.averageIncome, "الحالة المادية": c.financialStatus,
              "م": m.seq, "الاسم_الفرد": m.name, "الجنس": m.gender, "العمر": m.age,
              "صلة القرابة": m.relationship, "الحالة الاجتماعية": m.maritalStatus,
              "المستوى التعليمي": m.educationLevel, "العمل": m.work, "الحالة الصحية": m.healthStatus,
              "مرض مزمن": m.chronicDisease, "إعاقة": m.disability,
            });
          });
        } else {
          rows.push({
            "رقم الاستمارة": c.formNumber, "رقم الأسرة": c.familyNumber,
            "اسم رب الأسرة": c.headName, "القرية": c.village, "المديرية": c.directorate,
            "المحافظة": c.governorate, "عدد الأسرة": c.currentFamilySize,
            "الذكور": c.maleCount, "الإناث": c.femaleCount,
          });
        }
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "التعداد السكاني");
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      res.setHeader("Content-Disposition", "attachment; filename=census_data.xlsx");
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      return res.send(buf);
    }
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Serve React Build ──────────────────────────────────────────────────────
const buildPath = path.join(__dirname, "..", "client", "build");
const buildPathAlt = path.join(__dirname, "..", "build");
const staticPath = fs.existsSync(buildPath) ? buildPath : buildPathAlt;
if (fs.existsSync(staticPath)) {
  app.use(express.static(staticPath));
  app.get("*", (req, res) => res.sendFile(path.join(staticPath, "index.html")));
}

// ─── Startup ────────────────────────────────────────────────────────────────
async function start() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB Atlas");

    await seedExcelToMongo();

    const adminExists = await User.findOne({ role: "admin" });
    if (!adminExists) {
      const token = crypto.randomBytes(32).toString("hex");
      await User.create({
        username: "admin",
        password: hashPassword("admin123"),
        role: "admin",
        name: "Admin",
        email: ADMIN_EMAIL,
        approved: true,
        verified: true,
        token,
      });
      console.log("Admin user created (admin / admin123)");
    }

    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (e) {
    console.error("Startup error:", e.message);
    process.exit(1);
  }
}

start();
