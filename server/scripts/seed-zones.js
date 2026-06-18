import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const ZoneSchema = new mongoose.Schema({
  id: String,
  name: String,
  city: String,
  leaderId: String,
  pods: Number,
  properties: Number,
  type: String,
});
const Zone = mongoose.models.Zone || mongoose.model('Zone', ZoneSchema);

const zones = [
  { id: 'z1', name: 'Kora Main', city: 'Bangalore', leaderId: 'e20', pods: 3, properties: 4, type: 'PG' },
  { id: 'z2', name: 'YPR Main', city: 'Bangalore', leaderId: 'e21', pods: 2, properties: 3, type: 'PG' },
  { id: 'z3', name: 'MWB', city: 'Bangalore', leaderId: 'e22', pods: 2, properties: 3, type: 'PG' },
  { id: 'z4', name: 'MTP', city: 'Bangalore', leaderId: 'e23', pods: 2, properties: 3, type: 'PG' },
  { id: 'z5', name: 'WFD/SJU', city: 'Bangalore', leaderId: 'e24', pods: 2, properties: 3, type: 'PG' },
  { id: 'z6', name: 'Kora Homes', city: 'Bangalore', leaderId: 'e25', pods: 2, properties: 3, type: 'Flat' },
  { id: 'z7', name: 'MWB Homes', city: 'Bangalore', leaderId: 'e26', pods: 2, properties: 3, type: 'Flat' },
  { id: 'z8', name: 'Bellandur', city: 'Bangalore', leaderId: 'e27', pods: 2, properties: 3, type: 'Flat' },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gharpayy');
  for (const z of zones) {
    await Zone.updateOne({ id: z.id }, { $set: z }, { upsert: true });
  }
  console.log('Zones seeded.');
  process.exit(0);
}

seed();
