import mongoose from 'mongoose';
import { User, Notification } from './src/models/index.js';

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/ghpayy');
  const admins = await User.find({ role: 'admin' }).lean();
  console.log('Admins:', admins.map(a => ({ id: a._id, email: a.email, employeeId: a.employeeId })));
  const notifs = await Notification.find({ kind: 'approval' }).lean();
  console.log('Notifications:', notifs);
  process.exit(0);
}
run().catch(console.error);
