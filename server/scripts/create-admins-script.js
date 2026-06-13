import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User, Employee } from "../src/models/index.js";

const admins = [
  { email: "admin1@gharpayy.com", name: "Admin One", employeeId: "adm1" },
  { email: "admin2@gharpayy.com", name: "Admin Two", employeeId: "adm2" }
];

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is required");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  const passwordHash = await bcrypt.hash("Admin123!", 12);

  for (const admin of admins) {
    // Upsert Employee
    await Employee.findOneAndUpdate(
      { id: admin.employeeId },
      { id: admin.employeeId, name: admin.name, role: "Admin", profile: { appRole: "admin", team: "HQ", zone: "All", experience: "Core", shift: "9:00 AM - 6:00 PM" } },
      { upsert: true }
    );
    // Upsert User
    await User.findOneAndUpdate(
      { email: admin.email },
      {
        email: admin.email,
        passwordHash,
        employeeId: admin.employeeId,
        role: "admin",
        isApproved: true,
        status: "active",
        name: admin.name
      },
      { upsert: true }
    );
    console.log(`Created admin: ${admin.email} / password: Admin123!`);
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
