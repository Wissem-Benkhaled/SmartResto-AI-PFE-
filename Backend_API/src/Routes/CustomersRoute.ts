import { Router, Request, Response } from "express";
import { pool } from "../db";

const router = Router();

// 📌 Récupérer tous les clients
router.get("", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT * FROM customers order by customer_id asc");
    if (result.rowCount === 0) {
      return res.status(200).json({ message: "La table est vide" });
    }
    res.json(result.rows);
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// 📌 Récupérer un client
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM customers WHERE customer_id = $1", [id]);
    if (result.rowCount === 0) {
      return res.status(200).json({ message: "La table est vide" });
    }
    res.json(result.rows);
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// 📌 Insérer client
router.post("", async (req: Request, res: Response) => {
  try {
    const {  customer_id,name,tel,email,preferred_category,preferred_item, carte_fedalite } = req.body;
    const existing = await pool.query("SELECT customer_id FROM customers WHERE name = $1 or email = $2", [name, email]);
    if (existing.rowCount && existing.rowCount > 0) {
      return res.status(400).json({ error: "Ce nom de client est déjà utilisé" });
    }

    const insert_data = await pool.query(
      `INSERT INTO customers (customer_id, name, tel, email, preferred_category, preferred_item, carte_fedalite) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING customer_id, name, email`,
      [ customer_id,name,tel,email,preferred_category,preferred_item, carte_fedalite ] 
    );

    if (insert_data.rowCount === 0) {
      return res.status(400).json({ error: "Insertion failed" });
    }

    res.status(201).json(insert_data.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// 📌 Supprimer client
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM customers WHERE customer_id = $1", [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "customers not found" });
    }

    res.status(200).json({ message: "category deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// 📌 Mettre à jour client
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { customer_id,name,tel,email,preferred_category,preferred_item, carte_fedalite } = req.body;


    const result = await pool.query(
      "UPDATE customers SET customer_id = $1, name = $2, tel = $3, email = $4, preferred_category = $5, preferred_item = $6, carte_fedalite = $7 WHERE customer_id = $8 RETURNING *",
      [customer_id,name,tel,email,preferred_category,preferred_item, carte_fedalite, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "customers not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
