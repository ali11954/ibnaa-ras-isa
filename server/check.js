require("dotenv").config();
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const mongoose = require("mongoose");

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const schema = new mongoose.Schema({}, { strict: false });
  const Worker = mongoose.model("Worker", schema);
  const Family = mongoose.model("Family", schema);
  const wc = await Worker.countDocuments();
  const fc = await Family.countDocuments();
  const teams = await Worker.aggregate([
    { $group: { _id: "$teamNumber", c: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
  console.log("Workers:", wc, "Families:", fc);
  console.log("Teams:", teams.length);
  teams.forEach(t => console.log("  Team", t._id, ":", t.c));
  process.exit(0);
}
check();
