import { Zone, Property } from "../models/index.js";

const ZONES = [
  { id: "z1", name: "Whitefield", city: "Bangalore", leaderId: "e20", pods: 3, properties: 4 },
  { id: "z2", name: "HSR Layout", city: "Bangalore", leaderId: "e21", pods: 2, properties: 3 },
  { id: "z3", name: "Bandra West", city: "Mumbai", leaderId: "e22", pods: 2, properties: 3 },
  { id: "z4", name: "Andheri East", city: "Mumbai", leaderId: "e23", pods: 2, properties: 3 },
];

const PROPERTIES = [
  { id: "p1", name: "Brook Luxe", zoneId: "z1", partnerId: "e10", beds: 64, occupied: 58, monthlyRevenue: 928000, rating: 4.6, address: "Whitefield Main Rd", type: "Co-living" },
  { id: "p2", name: "Aeris Boys", zoneId: "z1", partnerId: "e10", beds: 48, occupied: 39, monthlyRevenue: 624000, rating: 4.3, address: "ITPL Rd", type: "Boys" },
  { id: "p3", name: "Oryn Girls", zoneId: "z1", partnerId: "e30", beds: 36, occupied: 34, monthlyRevenue: 578000, rating: 4.7, address: "Hope Farm Junction", type: "Girls" },
  { id: "p4", name: "Verde Stays", zoneId: "z1", partnerId: "e30", beds: 28, occupied: 19, monthlyRevenue: 304000, rating: 4.1, address: "Varthur Rd", type: "Co-living" },
  { id: "p5", name: "Helix HSR", zoneId: "z2", partnerId: "e30", beds: 52, occupied: 47, monthlyRevenue: 799000, rating: 4.5, address: "HSR Sector 2", type: "Co-living" },
  { id: "p6", name: "Crest Boys", zoneId: "z2", partnerId: "e10", beds: 40, occupied: 28, monthlyRevenue: 448000, rating: 4.0, address: "HSR Sector 7", type: "Boys" },
  { id: "p7", name: "Lumen Girls", zoneId: "z2", partnerId: "e30", beds: 32, occupied: 30, monthlyRevenue: 540000, rating: 4.8, address: "HSR 27th Main", type: "Girls" },
  { id: "p8", name: "Marine Heights", zoneId: "z3", partnerId: "e10", beds: 24, occupied: 22, monthlyRevenue: 660000, rating: 4.6, address: "Carter Rd", type: "Co-living" },
  { id: "p9", name: "Bandra A-12", zoneId: "z3", partnerId: "e10", beds: 20, occupied: 17, monthlyRevenue: 510000, rating: 4.4, address: "Linking Rd", type: "Co-living" },
  { id: "p10", name: "Versova B-204", zoneId: "z3", partnerId: "e30", beds: 16, occupied: 12, monthlyRevenue: 360000, rating: 4.2, address: "Versova", type: "Girls" },
  { id: "p11", name: "Bellandur Hub", zoneId: "z4", partnerId: "e10", beds: 44, occupied: 33, monthlyRevenue: 528000, rating: 4.0, address: "Andheri E", type: "Co-living" },
  { id: "p12", name: "Skyline Boys", zoneId: "z4", partnerId: "e30", beds: 30, occupied: 24, monthlyRevenue: 384000, rating: 4.1, address: "Marol", type: "Boys" },
  { id: "p13", name: "Echo Girls", zoneId: "z4", partnerId: "e30", beds: 24, occupied: 23, monthlyRevenue: 414000, rating: 4.7, address: "JB Nagar", type: "Girls" },
];

export async function seedZones() {
  try {
    const count = await Zone.countDocuments();
    if (count === 0) {
      console.log("[seed] Seeding zones and properties...");
      await Zone.insertMany(ZONES);
      await Property.insertMany(PROPERTIES);
      console.log("[seed] Successfully seeded zones and properties.");
    } else {
      console.log("[seed] Zones already exist, skipping seed.");
    }
  } catch (err) {
    console.error("[seed] Failed to seed zones:", err);
  }
}
