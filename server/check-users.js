import mongoose from "mongoose";
import { config } from "dotenv";
config();
mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ghpayy");

import { User } from "./src/models/index.js";

async function run() {
  const users = await User.find({}).lean();
  console.log(`Found ${users.length} users:`);
  users.forEach(u => {
    console.log(`- ${u.email} [id: ${u._id}] | employeeId: ${u.employeeId} | role: ${u.role}`);
  });
  process.exit(0);
}
run();
