import { Router, Request, Response } from "express";
import { pool } from "../db";

const router = Router();

/* ══════════════════════════════════════════════
   Helper : génère un num_fid de 13 chiffres aléatoires unique
   → Boucle jusqu'à trouver un numéro absent de la base
   → Max 10 tentatives (probabilité de collision quasi nulle : 1/10^13)
══════════════════════════════════════════════ */
async function genNumFidUnique(): Promise<string> {
  const MAX_ATTEMPTS = 10
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // Génère 13 chiffres aléatoires indépendants
    let num = ''
    for (let i = 0; i < 13; i++) {
      num += Math.floor(Math.random() * 10).toString()
    }

    // ✅ Teste l'unicité en base avant de retourner
    const exists = await pool.query(
      "SELECT client_id FROM clients WHERE num_fid = $1",
      [num]
    )
    if (!exists.rowCount || exists.rowCount === 0) {
      console.log(`[num_fid] Généré en ${attempt + 1} tentative(s) : ${num}`)
      return num
    }
    console.warn(`[num_fid] Collision détectée (tentative ${attempt + 1}) : ${num} — nouvelle tentative…`)
  }
  throw new Error("Impossible de générer un num_fid unique après 10 tentatives")
}

/* ══════════════════════════════════════════════
   GET /Client — Tous les clients
══════════════════════════════════════════════ */
router.get("", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT * FROM clients ORDER BY client_id ASC"
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
   GET /Client/:id — Un client par ID
══════════════════════════════════════════════ */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (isNaN(Number(id))) {
      return res.status(400).json({ error: "ID invalide" });
    }
    const result = await pool.query(
      "SELECT * FROM clients WHERE client_id = $1", [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Client non trouvé" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

/* ══════════════════════════════════════════════
   GET /Client/numero/:numero — Par numéro de téléphone
══════════════════════════════════════════════ */
router.get("/numero/:numero", async (req: Request, res: Response) => {
  try {
    const { numero } = req.params;
    const result = await pool.query(
      "SELECT * FROM clients WHERE numero = $1", [numero]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Client non trouvé" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

/* ══════════════════════════════════════════════
   POST /Client — Créer un client
   num_fid : 13 chiffres aléatoires uniques (vérifié en base)
══════════════════════════════════════════════ */
router.post("", async (req: Request, res: Response) => {
  try {
    const { nom,prenom, numero, email } = req.body;

    // Validations
    if (!nom || !nom.trim()) {
      return res.status(400).json({ error: "Le champ 'nom' est obligatoire" });
    }
    if (!prenom || !prenom.trim()) {
      return res.status(400).json({ error: "Le champ 'prenom' est obligatoire" });
    }

    if (!numero || !numero.trim()) {
      return res.status(400).json({ error: "Le champ 'numero' est obligatoire" });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: "Le champ 'email' est obligatoire" });
    }

    // Doublon numéro
    const existingNumero = await pool.query(
      "SELECT client_id FROM clients WHERE numero = $1", [numero.trim()]
    );
    if (existingNumero.rowCount && existingNumero.rowCount > 0) {
      return res.status(400).json({ error: "Un client avec ce numéro existe déjà" });
    }

    // Doublon email
    const existingEmail = await pool.query(
      "SELECT client_id FROM clients WHERE email = $1", [email.trim()]
    );
    if (existingEmail.rowCount && existingEmail.rowCount > 0) {
      return res.status(400).json({ error: "Un client avec cet email existe déjà" });
    }

    // ✅ Génération num_fid unique (13 chiffres, testé en base)
    const num_fid = await genNumFidUnique()

    const result = await pool.query(
      `INSERT INTO clients (nom, prenom, numero, num_fid, point_fid, email)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        nom.trim(),
        prenom?.trim(),
        numero.trim(),
        num_fid,
        0,
        email.trim(),
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

/* ══════════════════════════════════════════════
   PUT /Client/:id — Modifier un client
   num_fid n'est PAS recalculé lors d'une modification
   (le numéro de fidélité reste celui attribué à la création)
══════════════════════════════════════════════ */
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nom, numero, email, point_fid } = req.body;

    const existing = await pool.query(
      "SELECT * FROM clients WHERE client_id = $1", [id]
    );
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: "Client non trouvé" });
    }
    const current = existing.rows[0];

    const result = await pool.query(
      `UPDATE clients
       SET nom       = $1,
           numero    = $2,
           point_fid = $3,
           email     = $4
       WHERE client_id = $5
       RETURNING *`,
      [
        nom?.trim()   || current.nom,
        numero?.trim() || current.numero,
        point_fid !== undefined ? Number(point_fid) : current.point_fid,
        email?.trim() || current.email,
        id,
      ]
    );

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

/* ══════════════════════════════════════════════
   PUT /Client/add-points/:numero — Ajouter des points
══════════════════════════════════════════════ */
// router.put("/update-points/:id", async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const { point_fid } = req.body;

//     if (point_fid<0) {
//       return res.status(400).json({ error: "Le champ point_fid est manquant" });
//     }

//     const result = await pool.query(
//       "UPDATE clients SET point_fid = $1  WHERE client_id = $2 RETURNING *",
//       [point_fid, id]
//     );

//     if (result.rows.length === 0) {
//       return res.status(404).json({ message: "Client non trouvé" });
//     }

//     res.json(result.rows[0]);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Database error" });
//   }
// });

/* ══════════════════════════════════════════════
   DELETE /Client/:id — Supprimer un client
══════════════════════════════════════════════ */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM clients WHERE client_id = $1 RETURNING *", [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Client non trouvé" });
    }

    res.status(200).json({ message: "Client supprimé avec succès" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;