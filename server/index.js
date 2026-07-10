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

const User = mongoose.model("User", userSchema);
const Feedback = mongoose.model("Feedback", feedbackSchema);
const Subscriber = mongoose.model("Subscriber", subscriberSchema);

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

// ─── Excel Data ─────────────────────────────────────────────────────────────
let workersData = [];
let familiesData = [];

function readExcelFiles() {
  const wbPath = path.join(EXCEL_DIR, "workbook.xlsx");
  if (!fs.existsSync(wbPath)) {
    console.log("No Excel files found — using empty datasets");
    workersData = [];
    familiesData = [];
    return;
  }
  try {
    const wb = XLSX.readFile(wbPath);
    const sheets = wb.SheetNames;
    workersData = XLSX.utils.sheet_to_json(wb.Sheets[sheets[0]] || []);
    familiesData = sheets.length > 1 ? XLSX.utils.sheet_to_json(wb.Sheets[sheets[1]]) : [];
    console.log(`Loaded ${workersData.length} workers, ${familiesData.length} families`);
  } catch (e) {
    console.error("Excel read error:", e.message);
    workersData = [];
    familiesData = [];
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

// ─── Data Routes (Excel-backed) ─────────────────────────────────────────────
app.get("/api/workers", authMiddleware, subscriberMiddleware, (req, res) => {
  res.json(workersData);
});

app.get("/api/teams/:num/members", authMiddleware, subscriberMiddleware, (req, res) => {
  const team = parseInt(req.params.num);
  const members = workersData.filter((w) => {
    const t = parseInt(w["فريق"] || w["team"] || 0);
    return t === team;
  });
  res.json(members);
});

app.get("/api/families", authMiddleware, subscriberMiddleware, (req, res) => {
  res.json(familiesData);
});

app.get("/api/stats", authMiddleware, subscriberMiddleware, (req, res) => {
  res.json({
    totalWorkers: workersData.length,
    totalFamilies: familiesData.length,
    totalTeams: [...new Set(workersData.map((w) => parseInt(w["فريق"] || w["team"] || 0)))].filter(Boolean).length,
  });
});

app.get("/api/citizen-stats", authMiddleware, subscriberMiddleware, (req, res) => {
  const countByField = (field) => {
    const counts = {};
    workersData.forEach((w) => {
      const val = w[field] || w[field.toLowerCase()] || "غير محدد";
      counts[val] = (counts[val] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  };

  const ageGroupCounts = {};
  workersData.forEach((w) => {
    const age = parseInt(w["العمر"] || w["age"] || 0);
    let group = "غير محدد";
    if (age > 0 && age <= 20) group = "18-20";
    else if (age <= 30) group = "21-30";
    else if (age <= 40) group = "31-40";
    else if (age <= 50) group = "41-50";
    else if (age > 50) group = "50+";
    ageGroupCounts[group] = (ageGroupCounts[group] || 0) + 1;
  });
  const ageGroups = Object.entries(ageGroupCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'));

  res.json({
    totalCitizens: workersData.length,
    regions: countByField("المنطقة"),
    professions: countByField("المهنة"),
    ageGroups,
    teams: countByField("فريق"),
    villages: countByField("القرية"),
  });
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

    readExcelFiles();

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
