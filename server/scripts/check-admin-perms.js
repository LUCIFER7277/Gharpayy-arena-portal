import "dotenv/config";
import mongoose from "mongoose";
import { RolePermission } from "../src/models/index.js";

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is required");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  
  const adminPerms = await RolePermission.find({ role: "admin" }).lean();
  console.log("Admin DB permissions:", adminPerms.map(p => ({ feature: p.feature, enabled: p.enabled })));

  await mongoose.disconnect();
}
main().catch(console.error);
