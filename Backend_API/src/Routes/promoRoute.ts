import { Router, Request, Response } from "express";
import { pool } from "../db";

const router = Router();

/* ══════════════════════════════════════════════
   GET /Promo — Tous les codes promo
══════════════════════════════════════════════ */
router.get("", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT * FROM promo ORDER BY promo_id ASC"
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

/* ══════════════════════════════════════════════
   GET /Promo/:id — Un code promo
══════════════════════════════════════════════ */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM promo WHERE promo_id = $1", [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Code promo non trouvé" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

/* ══════════════════════════════════════════════
   GET /Promo/code/:code — Par code (pour la caisse)
   Vérifie expiration + limite d'utilisations
══════════════════════════════════════════════ */
router.get("/code/:code", async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const result = await pool.query(
      "SELECT * FROM promo WHERE code_promo = $1",
      [code]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Code promo invalide ou inexistant" });
    }

    const promo = result.rows[0];

    if (promo.date_expiration && new Date(promo.date_expiration) < new Date()) {
      return res.status(400).json({ error: "Ce code promo a expiré" });
    }

    if (promo.nb_utilisation >= promo.nb_utilisation_max) {
      return res.status(400).json({ error: "Ce code promo a atteint sa limite d'utilisations" });
    }

    return res.status(200).json(promo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

/* ══════════════════════════════════════════════
   POST /Promo — Créer un code promo
   type_promo : 1 (Mono) ou 2 (Multi) — Global supprimé
   nb_utilisation_max : forcé à 1 pour Mono
══════════════════════════════════════════════ */
router.post("", async (req: Request, res: Response) => {
  try {
    const { code_promo, date_expiration, type_promo, discount, nb_utilisation_max } = req.body;

    // Validations
    if (!code_promo || !code_promo.trim()) {
      return res.status(400).json({ error: "Le code promo est obligatoire" });
    }
    if (!date_expiration || isNaN(Date.parse(date_expiration))) {
      return res.status(400).json({ error: "La date d'expiration est invalide (YYYY-MM-DD)" });
    }
    // Type : seulement 1 (Mono) ou 2 (Multi)
    if (![1, 2].includes(Number(type_promo))) {
      return res.status(400).json({ error: "Le type doit être 1 (Mono) ou 2 (Multi)" });
    }
    if (!discount || isNaN(Number(discount)) || Number(discount) <= 0 || Number(discount) > 100) {
      return res.status(400).json({ error: "Le pourcentage doit être entre 1 et 100" });
    }

    // nb_utilisation_max : forcé à 1 pour Mono, minimum 2 pour Multi
    // const type = Number(type_promo)
    // let nbrMax: number
    // if (type === 1) {
    //   nbrMax = 1
    // } else {
    //   nbrMax = Number(nb_utilisation_max)
    //   if (isNaN(nbrMax) || nbrMax < 2) {
    //     return res.status(400).json({ error: "Le nombre d'utilisations pour Multi doit être au moins 2" });
    //   }
    // }

    // Doublon code
    const existing = await pool.query(
      "SELECT promo_id FROM promo WHERE code_promo = $1",
      [code_promo.trim().toUpperCase()]
    );
    if (existing.rowCount && existing.rowCount > 0) {
      return res.status(400).json({ error: "Ce code promo existe déjà" });
    }

    const result = await pool.query(
      `INSERT INTO promo (code_promo, nb_utilisation, nb_utilisation_max, date_expiration, type_promo, discount)
       VALUES ($1, 0, $2, $3::date, $4, $5)
       RETURNING *`,
      [
        code_promo.trim().toUpperCase(),
        nb_utilisation_max,
        date_expiration,
        type_promo,
        Number(discount),
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

/* ══════════════════════════════════════════════
   PUT /Promo/:id — Modifier un code promo
══════════════════════════════════════════════ */
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { code_promo, date_expiration, type_promo, discount, nb_utilisation_max } = req.body;

    const existing = await pool.query(
      "SELECT * FROM promo WHERE promo_id = $1", [id]
    );
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: "Code promo non trouvé" });
    }
    const current = existing.rows[0];

    if (discount !== undefined && (isNaN(Number(discount)) || Number(discount) <= 0 || Number(discount) > 100)) {
      return res.status(400).json({ error: "Le pourcentage doit être entre 1 et 100" });
    }
    if (type_promo !== undefined && ![1, 2].includes(Number(type_promo))) {
      return res.status(400).json({ error: "Le type doit être 1 (Mono) ou 2 (Multi)" });
    }
    if (date_expiration && isNaN(Date.parse(date_expiration))) {
      return res.status(400).json({ error: "Format de date invalide" });
    }

    const updatedType = type_promo !== undefined ? Number(type_promo) : current.type_promo

    // Recalcul nb_utilisation_max selon type
    // let nbrMax: number
    // if (updatedType === 1) {
    //   nbrMax = 1
    // } else {
    //   nbrMax = nb_utilisation_max !== undefined ? Number(nb_utilisation_max) : current.nb_utilisation_max
    //   if (isNaN(nbrMax) || nbrMax < 2) {
    //     return res.status(400).json({ error: "Le nombre d'utilisations pour Multi doit être au moins 2" });
    //   }
    // }

    const result = await pool.query(
      `UPDATE promo
       SET code_promo          = $1,
           date_expiration     = $2::date,
           type_promo          = $3,
           discount            = $4,
           nb_utilisation_max  = $5
       WHERE promo_id = $6
       RETURNING *`,
      [
        code_promo?.trim().toUpperCase() ?? current.code_promo,
        date_expiration                  ?? current.date_expiration,
        updatedType,
        discount !== undefined ? Number(discount) : current.discount,
        nb_utilisation_max !== undefined ? Number(nb_utilisation_max) : current.nb_utilisation_max,
        id,
      ]
    );

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// 📌 Mettre à jour un code promo
// router.put("/:codePromo/:clientID", async (req: Request, res: Response) => {
//   try {
//     const { codePromo,clientID } = req.params;

//     const existing = await pool.query(
//       "SELECT * FROM promo WHERE code_promo = $1",
//       [codePromo]
//     );

//     if (existing.rowCount === 0) {
//       return res.status(404).json({ error: "Code promo non trouvé" });
//     }
//     if(existing.rows[0].nb_utilisation <= 0){
//       return res.status(400).json({ error: "Code promo épuisé" });
//     }

//     const result = await pool.query(
//       `UPDATE public.promo
// 	     SET nb_utilisation=nb_utilisation+1, client_id=$1
// 	     WHERE code_promo=$2`,
//       [clientID, codePromo]
//     );
       

//     res.status(200).json(result.rows[0]);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Database error" });
//   }
// });
/* ══════════════════════════════════════════════
   PATCH /Promo/:id/use — Incrémenter nb_utilisation
   Vérifie expiration + limite avant d'incrémenter
══════════════════════════════════════════════ */
router.patch("/useCode", async (req: Request, res: Response) => {
  try {
    const { id, clientId } = req.body;

    // if (!id || !clientId) {
    //   return res.status(400).json({ error: "value promo manquant" });
    // }
    const promoResult = await pool.query(
      "SELECT promo_id, type_promo, client_id, nb_utilisation, nb_utilisation_max, date_expiration FROM promo WHERE promo_id = $1",
      [id]
    );

    if (promoResult.rowCount === 0) {
      return res.status(404).json({ error: "Code promo non trouvé" });
    }

    const promo = promoResult.rows[0];
    const typePromo = Number(promo.type_promo);
    const ownerClientId = Number(promo.client_id || 0);
    const used = Number(promo.nb_utilisation || 0);
    const max = Number(promo.nb_utilisation_max || 0);

    if (max > 0 && used >= max) {
      return res.status(400).json({ error: "Ce code promo a atteint sa limite d'utilisations" });
    }
    
    {/* requête de mise à jour code promo mono-utilisateur */}
    if (typePromo === 1) {
      const currentClientId = Number(clientId || 0);
      if (currentClientId <= 0) {
        return res.status(400).json({ error: "Client obligatoire pour ce code promo mono-utilisateur" });
      }
      if (ownerClientId > 0 && ownerClientId !== currentClientId) {
        return res.status(400).json({ error: "Ce code promo est déjà lié à un autre client" });
      }

      const result = await pool.query(
        "UPDATE promo SET nb_utilisation = nb_utilisation + 1, client_id = $1 WHERE promo_id = $2 RETURNING *",
        [currentClientId, id]
      );
      return res.status(200).json(result.rows[0]);
    }
    {/* requête de mise à jour code promo multi-utilisateurs */}
    const result = await pool.query(
      "UPDATE promo SET nb_utilisation = nb_utilisation + 1 WHERE promo_id = $1 RETURNING *",
      [id]
    );
    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Database error" });
  }
});

/* ══════════════════════════════════════════════
   DELETE /Promo/:id
══════════════════════════════════════════════ */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM promo WHERE promo_id = $1 RETURNING *", [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Code promo non trouvé" });
    }
    res.status(200).json({ message: "Code promo supprimé avec succès" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;