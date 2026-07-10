require("dotenv").config();
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
  beneficiary: String,
  reason: String,
  beneficiaries: [String],
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
const Feedback = mongoose.model("Feedback", feedbackSchema);
const Subscriber = mongoose.model("Subscriber", subscriberSchema);
const Worker = mongoose.model("Worker", workerSchema);
const Family = mongoose.model("Family", familySchema);

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

  const wbWorkersPath = path.join(EXCEL_DIR, "كشف فرق عمال راس عيسى في ميناء راس عيسى.xlsx");
  if (!fs.existsSync(wbWorkersPath)) {
    console.log("Excel files not found — skipping seed");
    return;
  }

  try {
    const wb = XLSX.readFile(wbWorkersPath);
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
    const ws = wb.Sheets["فرق العمل"];
    const raw = XLSX.utils.sheet_to_json({ header: 1, defval: "" });
    const families = [];
    for (let i = 1; i < raw.length; i++) {
      const r = raw[i];
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
    res.json({ token: user.token, role: user.role, name: user.name, username: user.username });
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
  res.json({ username: u.username, name: u.name, role: u.role, email: u.email, phone: u.phone });
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
    res.json({ token: user.token, role: user.role, name: user.name, username: user.username });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Admin Routes ───────────────────────────────────────────────────────────
app.get("/api/admin/users", authMiddleware, adminMiddleware, async (req, res) => {
  try { res.json(await User.find().select("-password")); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/admin/approve/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "Not found" });
    user.approved = true;
    user.role = "user";
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
    const { page = 1, limit = 15, search = "", region = "", profession = "" } = req.query;
    const filter = {};
    if (search) filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { nationalId: { $regex: search, $options: "i" } },
      { teamNumber: parseInt(search) || 0 },
    ];
    if (region) filter.region = region;
    if (profession) filter.profession = profession;
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
      { beneficiary: { $regex: search, $options: "i" } },
      { village: { $regex: search, $options: "i" } },
    ];
    const total = await Family.countDocuments(filter);
    const data = await Family.find(filter).skip((page - 1) * limit).limit(parseInt(limit));
    res.json({
      data: data.map(f => ({ ...f.toObject(), id: f._id })),
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) },
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
    const { email, name, phone, reason } = req.body;
    const exists = await Subscriber.findOne({ email });
    if (exists) return res.status(400).json({ error: "Already subscribed" });
    const sub = await Subscriber.create({ email, name, phone, reason });
    await sendEmail(email, "Subscription Request", "<p>Your subscription request has been received.</p>");
    res.json({ message: "Subscription request submitted", subscriber: sub });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/subscribers/:id/approve", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const sub = await Subscriber.findByIdAndUpdate(req.params.id, { approved: true }, { new: true });
    if (!sub) return res.status(404).json({ error: "Not found" });
    await sendEmail(sub.email, "Subscription Approved", "<p>Your subscription has been approved!</p>");
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
