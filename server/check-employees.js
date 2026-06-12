import mongoose from "mongoose";
import { config } from "dotenv";
config();
mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ghpayy");

import { Employee } from "./src/models/index.js";

async function run() {
  const emps = await Employee.find({}).lean();
  console.log(`Found ${emps.length} employees:`);
  emps.forEach(e => {
    console.log(`- ${e.name} [id: ${e.id}] | role: ${e.role} | team: ${e.team} | managerId: ${e.managerId}`);
  });
  process.exit(0);
}
run();
