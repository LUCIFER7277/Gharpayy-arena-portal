import "dotenv/config";
import mongoose from "mongoose";
import { Employee } from "../server/src/models/index.js";

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const emps = await Employee.find({}).lean();
  console.log(emps.map(e => ({ id: e.id, name: e.name, role: e.role, profileRole: e.profile?.appRole })));
  await mongoose.disconnect();
}
main();
