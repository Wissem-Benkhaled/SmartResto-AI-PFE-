import { Router, Request, Response } from "express";
import { pool } from "../db";

const router = Router();

// 📌 Récupérer tous les produits
router.get("", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT * FROM produits order by name asc");
    if (result.rowCount === 0) {
      return res.status(200).json({ message: "La table est vide" });
    }
    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// 📌 Récupérer un Produit
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM produits WHERE item_id = $1", [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Produit introuvable" });
    }
    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// router.get("/:id", async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;

//     const query = `
//       SELECT 
//         i.item_id,
//         i.category_id,
//         i.name,
//         i.price,
//         i.is_available,
//         i.point_fidelite,
//         i.image,
//         -- Transformation du champ id_etape (JSONB) en objets enrichis
//         COALESCE(
//           (SELECT jsonb_agg(
//             jsonb_build_object(
//               'id_etape', e.id,
//               'nom_etape', e.nom,
//               'etape_details', COALESCE(
//                 (SELECT jsonb_agg(
//                   jsonb_build_object(
//                     'id', sub_i.item_id,
//                     'nom_produit', sub_i.name,
//                     'prix', sub_i.price
//                   )
//                 )
//                 FROM public.items sub_i
//                 -- On extrait les IDs du tableau JSONB de l'étape
//                 WHERE sub_i.item_id::text IN (SELECT jsonb_array_elements_text(e.ids_items))
//                 ), '[]'::jsonb)
//             )
//           )
//           FROM public.etape e
//           -- On extrait les IDs du tableau JSONB de l'item principal
//           WHERE e.id::text IN (SELECT jsonb_array_elements_text(i.id_etape))
//         ), '[]'::jsonb) AS id_etape,
//         0 AS count
//       FROM 
//         public.items i
//       WHERE 
//         i.item_id = $1;
//     `;

//     const { rows, rowCount } = await pool.query(query, [id]);

//     if (rowCount === 0) {
//       return res.status(404).json({ message: "Produit introuvable" });
//     }

//     // Retourne l'objet unique directement
//     res.json(rows[0]);

//   } catch (err) {
//     console.error("Erreur SmartResto API :", err);
//     res.status(500).json({ error: "Erreur serveur lors de la récupération du produit" });
//   }
// });


// 📌 Insérer Produit

router.post("", async (req: Request, res: Response) => {
  try {
    const { item_id, category_id, name, price, is_available, point_fidelite } = req.body;
    const existing = await pool.query("SELECT item_id FROM produits WHERE name = $1 or item_id = $2", [name, item_id]);
    if (existing.rowCount && existing.rowCount > 0) {
      return res.status(400).json({ error: "Cet id ou ce nom de Produit est déjà utilisé" });
    }

    const insert_data = await pool.query(
      `INSERT INTO produits (item_id, category_id, name, price, is_available, point_fidelite) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [item_id, category_id, name, price, is_available, point_fidelite]
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

// 📌 Supprimer Produit
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM produits WHERE item_id = $1", [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "produits not found" });
    }

    res.status(200).json({ message: "Produit deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// 📌 Mettre à jour tous les produits
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { category_id, name, price, is_available, point_fidelite ,image } = req.body;

    // const existing = await pool.query("SELECT item_id FROM produits WHERE item_id = $1", [id]);
    // if (existing.rowCount === 0) {
    //   return res.status(404).json({ error: "Produit introuvable" });
    // }

    const result = await pool.query(
      "UPDATE produits SET  category_id = $1, name = $2, price = $3, is_available = $4, point_fidelite = $5, image = $6 WHERE item_id = $7 RETURNING *",
      [ category_id, name, price, is_available, point_fidelite, image, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "produits not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
