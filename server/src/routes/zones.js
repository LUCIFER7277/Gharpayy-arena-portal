import { Router } from "express";
import { Zone, Property } from "../models/index.js";

const router = Router();

// GET /api/zones
router.get("/", async (req, res) => {
  try {
    const zones = await Zone.find().lean();
    res.json(zones);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/zones/properties
router.get("/properties", async (req, res) => {
  try {
    const properties = await Property.find().lean();
    res.json(properties);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
