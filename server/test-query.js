import mongoose from 'mongoose';
import { config } from 'dotenv';
config({path: '.env'});
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const { Employee } = await import('./src/models/index.js');
  const docs = await Employee.find({ $or: [{ id: 'e-mqetmn6j312a' }, { role: { $in: ['Admin', 'HR'] } }] });
  console.log('Docs found:', docs.length);
  docs.forEach(d => console.log(d.name, d.role));
  process.exit(0);
}).catch(console.error);
