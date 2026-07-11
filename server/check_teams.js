require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');

const familySchema = new mongoose.Schema({
  teamNumber: Number, teamName: String, memberCount: Number,
  beneficiaries: [{ name: String, amount: Number }],
}, { timestamps: true });
const workerSchema = new mongoose.Schema({
  name: String, teamNumber: Number,
}, { timestamps: true });

const Family = mongoose.model('Family', familySchema);
const Worker = mongoose.model('Worker', workerSchema);

async function check() {
  await mongoose.connect(process.env.MONGO_URI);

  const teamCounts = await Worker.aggregate([
    { $group: { _id: "$teamNumber", count: { $sum: 1 } } }
  ]);
  const countMap = {};
  teamCounts.forEach(t => { countMap[t._id] = t.count; });

  const families = await Family.find().sort({ teamNumber: 1 });
  console.log('=== Family teamNumber vs Worker count ===');
  families.forEach(f => {
    const realCount = countMap[f.teamNumber] || 0;
    const bens = f.beneficiaries.map(b => b.name + '(' + b.amount + ')').join(' + ');
    console.log('Team', f.teamNumber, '-', f.teamName, '| Workers:', realCount, '| Bens:', f.beneficiaries.length, '|', bens);
  });

  const team3 = families.find(f => f.teamNumber === 3);
  const team3workers = await Worker.find({ teamNumber: 3 });
  console.log('\n=== Team 3 verification ===');
  console.log('Family:', team3 ? team3.teamName : 'NOT FOUND');
  console.log('Workers with teamNumber=3:', team3workers.length);
  team3workers.slice(0, 3).forEach(w => console.log(' ', w.name));

  process.exit(0);
}
check();
