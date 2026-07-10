const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, 'platform.db');
const DATA_FILE = path.join(__dirname, 'data.json');

if (!fs.existsSync(DATA_FILE)) { console.log('No data.json found, skipping migration.'); process.exit(0); }

const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'pending',
    name TEXT NOT NULL,
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    token TEXT DEFAULT '',
    approved INTEGER DEFAULT 0,
    verified INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT NOT NULL,
    email TEXT DEFAULT '',
    subject TEXT DEFAULT '',
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    admin_reply TEXT DEFAULT '',
    admin_reply_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    reason TEXT DEFAULT '',
    approved INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

function hashPassword(pw) { return crypto.createHash('sha256').update(pw).digest('hex'); }

const insertUser = db.prepare('INSERT OR IGNORE INTO users (id, username, password, role, name, email, phone, token, approved, verified, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
const insertFeedback = db.prepare('INSERT OR IGNORE INTO feedback (id, user_id, name, email, subject, message, status, admin_reply, admin_reply_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
const insertSubscriber = db.prepare('INSERT OR IGNORE INTO subscribers (id, email, name, phone, reason, approved, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');

const migrateUsers = db.transaction(() => {
  for (const u of (data.users || [])) {
    insertUser.run(u.id, u.username, u.password, u.role, u.name, u.email || '', u.phone || '', u.token || '', u.approved ? 1 : 0, u.verified ? 1 : 0, u.createdAt || new Date().toISOString());
  }
});
const migrateFeedback = db.transaction(() => {
  for (const f of (data.feedback || [])) {
    insertFeedback.run(f.id, f.userId, f.name, f.email || '', f.subject || '', f.message, f.status || 'pending', f.adminReply || '', f.adminReplyAt, f.createdAt || new Date().toISOString());
  }
});
const migrateSubscribers = db.transaction(() => {
  for (const s of (data.subscribers || [])) {
    insertSubscriber.run(s.id, s.email, s.name || '', s.phone || '', s.reason || '', s.approved ? 1 : 0, s.createdAt || new Date().toISOString());
  }
});

migrateUsers();
migrateFeedback();
migrateSubscribers();

const counts = {
  users: db.prepare('SELECT COUNT(*) as c FROM users').get().c,
  feedback: db.prepare('SELECT COUNT(*) as c FROM feedback').get().c,
  subscribers: db.prepare('SELECT COUNT(*) as c FROM subscribers').get().c
};

console.log(`✅ Migration complete: ${counts.users} users, ${counts.feedback} feedback, ${counts.subscribers} subscribers`);
db.close();