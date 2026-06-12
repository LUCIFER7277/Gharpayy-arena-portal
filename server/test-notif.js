import mongoose from "mongoose";
import { config } from "dotenv";
config();
mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ghpayy");

import { Notification } from "./src/models/index.js";
import crypto from "crypto";

async function run() {
  try {
    const admin = { _id: "adminid123" };
    const notifications = [{
      id: crypto.randomUUID(),
      kind: "approval",
      toId: String(admin._id),
      title: "New Account Request",
      body: `test has requested an account.`,
      actionLabel: "Review",
      actionTo: "/admin/workforce",
      ts: Date.now(),
      read: false,
    }];
    await Notification.insertMany(notifications);
    console.log("Success");
  } catch (err) {
    console.error("Failed to insert:", err.message);
  }
  process.exit(0);
}
run();
