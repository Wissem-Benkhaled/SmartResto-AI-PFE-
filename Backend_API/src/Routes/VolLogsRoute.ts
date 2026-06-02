import { Router, Request, Response } from "express";
import { pool } from "../db";
 
const router = Router();
 
router.get("/", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT * FROM detec_mouvement ORDER BY id DESC");
    res.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching mouvement logs:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
 
router.post("/", async (req: Request, res: Response) => {
  try {
    const { filename } = req.body;
   
    if (!filename) {
      return res.status(400).json({ message: "Missing required field (filename)" });
    }
 
    const query = "INSERT INTO detec_mouvement (filename, log_date) VALUES ($1, NOW()) RETURNING *";
    const values = [filename];
   
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error("Error saving mouvement log:", error.message);
    res.status(500).json({
      message: "Database error while saving mouvement log",
      error: error.message,
      tip: "Ensure 'detec_mouvement' table exists and 'id' is set to SERIAL."
    });
  }
});
 
export default router;
 
 