// Test task script
import mongoose from "mongoose";
import { Task, Notification, User, Employee } from "./server/src/models/index.js";

async function main() {
  await mongoose.connect("mongodb://127.0.0.1:27017/gharpayy_arena");
  
  const admin = await Employee.findOne({ role: "Admin" });
  const emp = await Employee.findOne({ role: "Operator" });
  
  console.log("Admin:", admin?.id, admin?.name);
  console.log("Emp:", emp?.id, emp?.name);

  // See if there are any tasks assigned to emp
  const tasks = await Task.find({ assigneeId: emp.id });
  console.log(`Emp has ${tasks.length} tasks.`);

  // Find notifications for emp
  const notifs = await Notification.find({ toId: emp.id });
  console.log(`Emp has ${notifs.length} notifications.`);

  await mongoose.disconnect();
}
main().catch(console.error);
