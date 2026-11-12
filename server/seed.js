import 'dotenv/config';
import fs from 'fs';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Comment from './models/Comment.js';

const data = JSON.parse(fs.readFileSync(new URL('./sample-data.json', import.meta.url), 'utf8'));

await mongoose.connect(process.env.MONGO_URI);
await Promise.all([User.deleteMany({}), Comment.deleteMany({})]);

const users = {};
for (const u of data.users) {
  users[u.email] = await User.create({ ...u, password: await bcrypt.hash(u.password, 10) });
}

const ids = {};
for (const c of data.comments) {
  const when = new Date(Date.now() - c.daysAgo * 86400000 - Math.random() * 3600000);
  const _id = new mongoose.Types.ObjectId();
  ids[c.key] = _id;
  // insert directly so createdAt/updatedAt stay equal (no "edited" label)
  await Comment.collection.insertOne({
    _id,
    author: users[c.author]._id,
    text: c.text,
    parent: c.parent ? ids[c.parent] : null,
    status: c.status || 'visible',
    likes: (c.likes || []).map((e) => users[e]._id),
    reports: (c.reports || []).map((e) => users[e]._id),
    createdAt: when,
    updatedAt: when,
    __v: 0,
  });
}

console.log(`Seeded ${data.users.length} users and ${data.comments.length} comments.`);
console.log('Admin login: admin@example.com / Admin@123');
console.log('User login:  rahul@example.com / User@123');
await mongoose.disconnect();
