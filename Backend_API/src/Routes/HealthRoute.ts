import { Router, Request, Response } from "express";
import { pool } from "../db";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT * FROM detec_sante ORDER BY id DESC");
    res.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching detec_sante issues:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, violation_type } = req.body;
    
    if (!name || !violation_type) {
      return res.status(400).json({ message: "Missing required fields (name, violation_type)" });
    }

    const query = "INSERT INTO detec_sante (name, violation_type, violation_date) VALUES ($1, $2, NOW()) RETURNING *";
    const values = [name, violation_type];
    
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error("Error creating detec_sante issue:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;
