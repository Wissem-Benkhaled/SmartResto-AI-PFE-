import { Router, Request, Response } from "express";
import { pool } from "../db";

const router = Router();

// 📌 Récupérer toutes les commandes
router.get("", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT * FROM order_details ORDER BY id ASC"
    );

    if (result.rowCount === 0) {
      return res.status(200).json({ message: "La table est vide" });
    }

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// 📌 Récupérer une commande par ID
router.get(":id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM order_details od , orders o WHERE od.id = $1 AND od.order_id = o.id",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Commande non trouvée" });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

router.get("/By_order_id/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM order_details WHERE order_id = $1",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Commande non trouvée" });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// 📌 Supprimer une commande
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM order_details WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Commande non trouvée" });
    }

    res.status(200).json({ message: "Commande supprimée avec succès" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// 📌 Insérer une commande 
// router.post("/", async (req: Request, res: Response) => {
//   try {
//     const { order_id, name, point_fidelite, price, count} = req.body;

//     const insertData = await pool.query(
//       `INSERT INTO order_details 
//        (order_id, name, point_fidelite, price, count)
//        VALUES ($1, $2, $3, $4, $5)
//        RETURNING *`,
//       [
//         order_id,
//         name,
//         point_fidelite,
//         price,
//         count
//       ]
//     );

//     res.status(201).json(insertData.rows[0]);

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Database error" });
//   }
// });

// 📌 Mettre à jour une commande
// router.put("/:id", async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const { client_id, service_mode, detail_cmd, points_merci_gagner, total_cmd, code_promo } = req.body;

//     const result = await pool.query(
//       `UPDATE order_details SET client_id = $1, service_mode = $2, detail_cmd = $3,points_merci_gagner = $4, total_cmd = $5,code_promo = $6 WHERE id = $7
//        RETURNING *`,
//       [client_id, service_mode, JSON.stringify(detail_cmd), points_merci_gagner, total_cmd, code_promo, id
//       ]
//     );

//     if (result.rowCount === 0) {
//       return res.status(404).json({ error: "Commande non trouvée" });
//     }

//     res.status(200).json(result.rows[0]);

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Database error" });
//   }
// });

export default router;


// import { Router, Request, Response } from "express";
// import { pool } from "../db";

// const router = Router();

// /* ══════════════════════════════════════════════
//    Table : order_details
//    Colonnes : id (serial PK), order_id, name, point_fidelite, price, count
// ══════════════════════════════════════════════ */

// /* ══════════════════════════════════════════════
//    GET /OrderDetails — Tous les détails de commande
// ══════════════════════════════════════════════ */
// router.get("", async (_req: Request, res: Response) => {
//   try {
//     const result = await pool.query(
//       "SELECT * FROM order_details ORDER BY id ASC"
//     );
//     if (result.rowCount === 0) {
//       return res.status(200).json({ message: "La table est vide" });
//     }
//     res.json(result.rows);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Database error" });
//   }
// });

// /* ══════════════════════════════════════════════
//    GET /OrderDetails/:id — Un détail par ID
// ══════════════════════════════════════════════ */
// router.get("/:id", async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const result = await pool.query(
//       "SELECT * FROM order_details WHERE id = $1",
//       [id]
//     );
//     if (result.rowCount === 0) {
//       return res.status(404).json({ error: "Détail de commande non trouvé" });
//     }
//     res.json(result.rows[0]);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Database error" });
//   }
// });

// /* ══════════════════════════════════════════════
//    GET /OrderDetails/order/:order_id — Tous les détails d'une commande
// ══════════════════════════════════════════════ */
// router.get("/order/:order_id", async (req: Request, res: Response) => {
//   try {
//     const { order_id } = req.params;
//     const result = await pool.query(
//       "SELECT * FROM order_details WHERE order_id = $1 ORDER BY id ASC",
//       [order_id]
//     );
//     if (result.rowCount === 0) {
//       return res.status(404).json({ error: "Aucun détail pour cette commande" });
//     }
//     res.json(result.rows);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Database error" });
//   }
// });

// /* ══════════════════════════════════════════════
//    POST /OrderDetails — Insérer un détail
//    id : auto-généré (serial) — ne pas fournir
//    Champs requis : order_id, name, price, count
//    Champ optionnel : point_fidelite (défaut 0)
// ══════════════════════════════════════════════ */
// router.post("", async (req: Request, res: Response) => {
//   try {
//     const { order_id, name, point_fidelite, price, count } = req.body;

//     // Validations
//     if (!order_id) {
//       return res.status(400).json({ error: "Le champ 'order_id' est obligatoire" });
//     }
//     if (!name || !String(name).trim()) {
//       return res.status(400).json({ error: "Le champ 'name' est obligatoire" });
//     }
//     if (price === undefined || price === null || isNaN(Number(price)) || Number(price) < 0) {
//       return res.status(400).json({ error: "Le champ 'price' doit être un nombre >= 0" });
//     }
//     if (!count || isNaN(Number(count)) || Number(count) <= 0) {
//       return res.status(400).json({ error: "Le champ 'count' doit être un entier > 0" });
//     }
//     if (point_fidelite !== undefined && (isNaN(Number(point_fidelite)) || Number(point_fidelite) < 0)) {
//       return res.status(400).json({ error: "Le champ 'point_fidelite' doit être >= 0" });
//     }

//     const result = await pool.query(
//       `INSERT INTO order_details (order_id, name, point_fidelite, price, count)
//        VALUES ($1, $2, $3, $4, $5)
//        RETURNING *`,
//       [
//         Number(order_id),
//         String(name).trim(),
//         Number(point_fidelite) || 0,
//         Number(price),
//         Number(count),
//       ]
//     );

//     res.status(201).json(result.rows[0]);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Database error" });
//   }
// });

// /* ══════════════════════════════════════════════
//    PUT /OrderDetails/:id — Modifier un détail
// ══════════════════════════════════════════════ */
// router.put("/:id", async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const { order_id, name, point_fidelite, price, count } = req.body;

//     // Vérifier existence
//     const existing = await pool.query(
//       "SELECT * FROM order_details WHERE id = $1", [id]
//     );
//     if (existing.rowCount === 0) {
//       return res.status(404).json({ error: "Détail de commande non trouvé" });
//     }
//     const current = existing.rows[0];

//     // Validations si fourni
//     if (price !== undefined && (isNaN(Number(price)) || Number(price) < 0)) {
//       return res.status(400).json({ error: "Le champ 'price' doit être >= 0" });
//     }
//     if (count !== undefined && (isNaN(Number(count)) || Number(count) <= 0)) {
//       return res.status(400).json({ error: "Le champ 'count' doit être > 0" });
//     }
//     if (point_fidelite !== undefined && (isNaN(Number(point_fidelite)) || Number(point_fidelite) < 0)) {
//       return res.status(400).json({ error: "Le champ 'point_fidelite' doit être >= 0" });
//     }

//     const result = await pool.query(
//       `UPDATE order_details
//        SET order_id       = $1,
//            name           = $2,
//            point_fidelite = $3,
//            price          = $4,
//            count          = $5
//        WHERE id = $6
//        RETURNING *`,
//       [
//         order_id        !== undefined ? Number(order_id)        : current.order_id,
//         name            !== undefined ? String(name).trim()     : current.name,
//         point_fidelite  !== undefined ? Number(point_fidelite)  : current.point_fidelite,
//         price           !== undefined ? Number(price)           : current.price,
//         count           !== undefined ? Number(count)           : current.count,
//         id,
//       ]
//     );

//     res.status(200).json(result.rows[0]);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Database error" });
//   }
// });

// /* ══════════════════════════════════════════════
//    DELETE /OrderDetails/:id — Supprimer un détail
// ══════════════════════════════════════════════ */
// router.delete("/:id", async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const result = await pool.query(
//       "DELETE FROM order_details WHERE id = $1 RETURNING *",
//       [id]
//     );
//     if (result.rowCount === 0) {
//       return res.status(404).json({ error: "Détail de commande non trouvé" });
//     }
//     res.status(200).json({ message: "Détail supprimé avec succès" });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Database error" });
//   }
// });

// /* ══════════════════════════════════════════════
//    DELETE /OrderDetails/order/:order_id — Supprimer tous les détails d'une commande
// ══════════════════════════════════════════════ */
// router.delete("/order/:order_id", async (req: Request, res: Response) => {
//   try {
//     const { order_id } = req.params;
//     const result = await pool.query(
//       "DELETE FROM order_details WHERE order_id = $1 RETURNING *",
//       [order_id]
//     );
//     if (result.rowCount === 0) {
//       return res.status(404).json({ error: "Aucun détail trouvé pour cette commande" });
//     }
//     res.status(200).json({ message: `${result.rowCount} détail(s) supprimé(s)` });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Database error" });
//   }
// });

// export default router;