import { Router, Request, Response } from "express";
import { pool } from "../db";

const router = Router();

// 📌 Récupérer tous les paiements
router.get("", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT p.*, o.total_price as order_total
      FROM payments p
      LEFT JOIN orders o ON p.order_id = o.order_id
      ORDER BY p.payment_id ASC
    `);
    
    if (result.rowCount === 0) {
      return res.status(200).json({ message: "La table est vide" });
    }
    
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// 📌 Récupérer un paiement par ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT p.*, o.total_price as order_total, o.customer_id
      FROM payments p
      LEFT JOIN orders o ON p.order_id = o.order_id
      WHERE p.payment_id = $1
    `, [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Paiement non trouvé" });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// 📌 Récupérer les paiements par commande
router.get("/order/:orderId", async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const result = await pool.query(`
      SELECT p.*, o.total_price as order_total
      FROM payments p
      LEFT JOIN orders o ON p.order_id = o.order_id
      WHERE p.order_id = $1
      ORDER BY p.times_transaction DESC
    `, [orderId]);
    
    if (result.rowCount === 0) {
      return res.status(200).json({ message: "Aucun paiement pour cette commande" });
    }
    
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// 📌 Récupérer les paiements par statut
// router.get("/status/:status", async (req: Request, res: Response) => {
//   try {
//     const { status } = req.params;
    
//     // Validation du statut
//     const validStatuses = ['1', '2', '3'];
//     if (!validStatuses.includes(status)) {
//       return res.status(400).json({ 
//         error: "Statut invalide. Doit être '1' (Réussi), '2' (Échoué) ou '3' (Remboursé)" 
//       });
//     }
    
//     const result = await pool.query(`
//       SELECT p.*, o.total_price as order_total
//       FROM payments p
//       LEFT JOIN orders o ON p.order_id = o.order_id
//       WHERE p.status = $1
//       ORDER BY p.times_transaction DESC
//     `, [status]);
    
//     if (result.rowCount === 0) {
//       return res.status(200).json({ message: "Aucun paiement avec ce statut" });
//     }
    
//     res.json(result.rows);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Database error" });
//   }
// });

// 📌 Récupérer les paiements par méthode
// router.get("/method/:method", async (req: Request, res: Response) => {
//   try {
//     const { method } = req.params;
    
//     // Validation de la méthode
//     const validMethods = ['Carte', 'Espèces' ];
//     if (!validMethods.includes(method)) {
//       return res.status(400).json({ 
//         error: "Méthode invalide. Doit être 'Carte', 'Espèces'" 
//       });
//     }
    
//     const result = await pool.query(`
//       SELECT p.*, o.total_price as order_total
//       FROM payments p
//       LEFT JOIN orders o ON p.order_id = o.order_id
//       WHERE p.method = $1
//       ORDER BY p.times_transaction DESC
//     `, [method]);
    
//     if (result.rowCount === 0) {
//       return res.status(200).json({ message: "Aucun paiement avec cette méthode" });
//     }
    
//     res.json(result.rows);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Database error" });
//   }
// });

// 📌 Insérer un paiement
router.post("", async (req: Request, res: Response) => {
  try {
    const { order_id, amount, method, status, times_transaction } = req.body;

    // Validation des champs requis
    if (!order_id || amount === undefined || !method) {
      return res.status(400).json({ 
        error: "Les champs 'order_id', 'amount' et 'method' sont requis" 
      });
    }

    // Validation de la méthode
    const validMethods = ['Carte', 'Espèces'];
    if (!validMethods.includes(method)) {
      return res.status(400).json({ 
        error: "Méthode invalide. Doit être 'Carte', 'Espèces'" 
      });
    }

    // Validation du statut
    const validStatuses = ['1', '2', '3'];
    const paymentStatus = status || '1'; // Par défaut : Réussi
    if (!validStatuses.includes(paymentStatus)) {
      return res.status(400).json({ 
        error: "Statut invalide. Doit être '1' (Réussi), '2' (Échoué) ou '3' (Remboursé)" 
      });
    }

    // Validation du montant
    if (amount <= 0) {
      return res.status(400).json({ error: "Le montant doit être supérieur à 0" });
    }

    // Vérifier si la commande existe
    const orderExists = await pool.query(
      "SELECT order_id, total_price FROM orders WHERE order_id = $1",
      [order_id]
    );
    
    if (orderExists.rowCount === 0) {
      return res.status(404).json({ error: "Commande non trouvée" });
    }

    const insert_data = await pool.query(
      `INSERT INTO payments (order_id, amount, method, status, times_transaction) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [
        order_id,
        amount,
        method,
        paymentStatus,
        times_transaction || new Date()
      ]
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

// 📌 Mettre à jour un paiement
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { order_id, amount, method, status, times_transaction } = req.body;

    // Vérifier si le paiement existe
    const existing = await pool.query(
      "SELECT * FROM payments WHERE payment_id = $1",
      [id]
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({ error: "Paiement non trouvé" });
    }

    const currentPayment = existing.rows[0];

    // Validation de la méthode si fournie
    if (method) {
      const validMethods = ['Carte', 'Espèces'];
      if (!validMethods.includes(method)) {
        return res.status(400).json({ 
          error: "Méthode invalide. Doit être 'Carte', 'Espèces'" 
        });
      }
    }

    // Validation du statut si fourni
    if (status) {
      const validStatuses = ['1', '2', '3'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          error: "Statut invalide. Doit être '1' (Réussi), '2' (Échoué) ou '3' (Remboursé)" 
        });
      }
    }

    // Validation du montant si fourni
    if (amount !== undefined && amount <= 0) {
      return res.status(400).json({ error: "Le montant doit être supérieur à 0" });
    }

    // Vérifier si la commande existe (si fournie)
    if (order_id) {
      const orderExists = await pool.query(
        "SELECT order_id FROM orders WHERE order_id = $1",
        [order_id]
      );
      
      if (orderExists.rowCount === 0) {
        return res.status(404).json({ error: "Commande non trouvée" });
      }
    }

    const result = await pool.query(
      `UPDATE payments 
       SET order_id = $1, amount = $2, method = $3, status = $4, times_transaction = $5
       WHERE payment_id = $6 
       RETURNING *`,
      [
        order_id || currentPayment.order_id,
        amount !== undefined ? amount : currentPayment.amount,
        method || currentPayment.method,
        status || currentPayment.status,
        times_transaction || currentPayment.times_transaction,
        id
      ]
    );

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// 📌 Mettre à jour uniquement le statut d'un paiement
router.patch("/:id/status", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Le champ 'status' est requis" });
    }

    // Validation du statut
    const validStatuses = ['1', '2', '3'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: "Statut invalide. Doit être '1' (Réussi), '2' (Échoué) ou '3' (Remboursé)" 
      });
    }

    const result = await pool.query(
      `UPDATE payments 
       SET status = $1
       WHERE payment_id = $2 
       RETURNING *`,
      [status, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Paiement non trouvé" });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// 📌 Supprimer un paiement
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM payments WHERE payment_id = $1", [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Paiement non trouvé" });
    }
    
    res.status(200).json({ message: "Paiement supprimé avec succès" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// 📌 Statistiques des paiements
router.get("/stats/summary", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_payments,
        SUM(CASE WHEN status = '1' THEN 1 ELSE 0 END) as reussi_count,
        SUM(CASE WHEN status = '2' THEN 1 ELSE 0 END) as echoue_count,
        SUM(CASE WHEN status = '3' THEN 1 ELSE 0 END) as rembourse_count,
        SUM(CASE WHEN status = '1' THEN amount ELSE 0 END) as total_reussi,
        SUM(CASE WHEN status = '3' THEN amount ELSE 0 END) as total_rembourse,
        COUNT(DISTINCT method) as methods_used
      FROM payments
    `);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// 📌 Statistiques par méthode de paiement
router.get("/stats/by-method", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        method,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        AVG(amount) as avg_amount,
        SUM(CASE WHEN status = '1' THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN status = '2' THEN 1 ELSE 0 END) as failed_count
      FROM payments
      GROUP BY method
      ORDER BY total_amount DESC
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
