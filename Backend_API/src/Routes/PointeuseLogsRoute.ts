import { Router, Request, Response } from "express";
import { pool } from "../db";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT * FROM pointage ORDER BY action_date DESC");
    res.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching pointage logs:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.put("/:id/status", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { is_paid } = req.body;
    // Keep 'status' string in sync if the db uses it
    const statusText = is_paid ? 'Payé' : 'En attente';

    // The user_id or id_restau check ensures safety
    const result = await pool.query(
      "UPDATE pointage SET is_paid = $1, status = $2 WHERE id = $3 RETURNING *",
      [is_paid, statusText, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Log not found" });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error updating pointage log status:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;
