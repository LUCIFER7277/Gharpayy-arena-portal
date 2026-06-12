import mongoose from "mongoose";
import { config } from "dotenv";
config();
mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ghpayy");

import { Notification } from "./src/models/index.js";

async function run() {
  const notifs = await Notification.find({}).lean();
  console.log(`Found ${notifs.length} notifications:`);
  notifs.forEach(n => {
    console.log(`- [${n.kind}] to: ${n.toId} | from: ${n.fromId} | title: ${n.title}`);
  });
  process.exit(0);
}
run();
