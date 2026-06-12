import mongoose from "mongoose";
import { Task, Notification, User, Employee } from "./server/src/models/index.js";

async function main() {
  await mongoose.connect("mongodb://127.0.0.1:27017/ghpayy");
  
  const tasks = await Task.find({}).lean();
  console.log(`Total Tasks: ${tasks.length}`);
  if (tasks.length > 0) {
    console.log("Sample Tasks:");
    tasks.slice(-3).forEach(t => {
      console.log(`- ${t.title} | Assignee: ${t.assigneeId} | AssignedBy: ${t.assignedById}`);
    });
  }

  const notifs = await Notification.find({}).lean();
  console.log(`Total Notifications: ${notifs.length}`);
  if (notifs.length > 0) {
    console.log("Sample Notifications:");
    notifs.slice(-3).forEach(n => {
      console.log(`- ${n.title} | To: ${n.toId} | From: ${n.fromId}`);
    });
  }

  await mongoose.disconnect();
}
main().catch(console.error);
