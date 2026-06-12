import mongoose from "mongoose";
import { config } from "dotenv";
config();
mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ghpayy");

import { Task } from "./src/models/index.js";

async function run() {
  const tasks = await Task.find({}).lean();
  console.log(`Found ${tasks.length} tasks:`);
  tasks.forEach(t => {
    console.log(`- ${t.title} [id: ${t.id}] | assignee: ${t.assigneeId} | by: ${t.assignedById}`);
  });
  process.exit(0);
}
run();
