import { Router, Request, Response } from "express";
import { pool } from "../db";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

/* ══════════════════════════════════════════════
   MULTER — Upload logo
   Stockage : uploads/boutique/
══════════════════════════════════════════════ */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(__dirname, "../../uploads/boutique");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const name = `logo_${Date.now()}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 Mo max
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Format non supporté. Utilisez JPG, PNG, WEBP ou GIF."));
    }
  },
});

/* ══════════════════════════════════════════════
   Helpers
══════════════════════════════════════════════ */

/** Valide la structure du tableau horaire */
function validateHoraire(horaire: any): string | null {
  if (!Array.isArray(horaire)) return "horaire doit être un tableau";
  const joursValides = ["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"];
  for (const item of horaire) {
    if (typeof item !== "object" || item === null)
      return "Chaque entrée de horaire doit être un objet";
    if (!joursValides.includes(item.jour))
      return `Jour invalide : "${item.jour}". Valeurs attendues : ${joursValides.join(", ")}`;
    if (typeof item.ouverture !== "string" || typeof item.fermeture !== "string")
      return `Les champs 'ouverture' et 'fermeture' doivent être des chaînes (ex: "08:00")`;
    if (typeof item.isActive !== "boolean")
      return `Le champ 'isActive' doit être un booléen`;
  }
  return null;
}

/** Valide la structure de mode_paiement */
function validateModePaiement(mp: any): string | null {
  if (typeof mp !== "object" || mp === null || Array.isArray(mp))
    return "mode_paiement doit être un objet";
  if (typeof mp.especes !== "boolean")
    return "mode_paiement.especes doit être un booléen";
  if (typeof mp.carte !== "boolean")
    return "mode_paiement.carte doit être un booléen";
  return null;
}

/** Valide la structure de fidelite */
function validateFidelite(fid: any): string | null {
  if (typeof fid !== "object" || fid === null || Array.isArray(fid))
    return "fidelite doit être un objet";
  if (isNaN(Number(fid.dinar)) || Number(fid.dinar) <= 0)
    return "fidelite.dinar doit être un nombre > 0";
  if (isNaN(Number(fid.point)) || Number(fid.point) <= 0)
    return "fidelite.point doit être un nombre > 0";
  return null;
}

/* ══════════════════════════════════════════════
   GET /Parametre — Récupérer la configuration boutique
   (toujours une seule ligne, id = 1)
══════════════════════════════════════════════ */
router.get("", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT * FROM parametre ORDER BY id ASC LIMIT 1"
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Aucune configuration trouvée. Veuillez initialiser la boutique." });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

/* ══════════════════════════════════════════════
   PUT /Parametre — Mettre à jour la configuration
   (champs texte + JSON — sans logo)
══════════════════════════════════════════════ */
router.put("", async (req: Request, res: Response) => {
  try {
    const { nom, adresse, telephone, email, horaire, mode_paiement, fidelite } = req.body;

    // Récupérer la config actuelle
    const existing = await pool.query("SELECT * FROM parametre ORDER BY id ASC LIMIT 1");
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: "Aucune configuration trouvée" });
    }
    const current = existing.rows[0];

    // Validation email
    if (email && !String(email).includes("@")) {
      return res.status(400).json({ error: "Email invalide" });
    }

    // Validation et parsing horaire
    let horaireData = current.horaire;
    if (horaire !== undefined) {
      const parsed = typeof horaire === "string" ? JSON.parse(horaire) : horaire;
      const err    = validateHoraire(parsed);
      if (err) return res.status(400).json({ error: err });
      horaireData = parsed;
    }

    // Validation et parsing mode_paiement
    let mpData = current.mode_paiement;
    if (mode_paiement !== undefined) {
      const parsed = typeof mode_paiement === "string" ? JSON.parse(mode_paiement) : mode_paiement;
      const err    = validateModePaiement(parsed);
      if (err) return res.status(400).json({ error: err });
      mpData = parsed;
    }

    // Validation et parsing fidelite
    let fidData = current.fidelite;
    if (fidelite !== undefined) {
      const parsed = typeof fidelite === "string" ? JSON.parse(fidelite) : fidelite;
      const err    = validateFidelite(parsed);
      if (err) return res.status(400).json({ error: err });
      fidData = parsed;
    }

    const result = await pool.query(
      `UPDATE parametre
       SET nom           = $1,
           adresse       = $2,
           telephone     = $3,
           email         = $4,
           horaire       = $5::jsonb,
           mode_paiement = $6::jsonb,
           fidelite      = $7::jsonb
       WHERE id = $8
       RETURNING *`,
      [
        nom       !== undefined ? String(nom).trim()       : current.nom,
        adresse   !== undefined ? String(adresse).trim()   : current.adresse,
        telephone !== undefined ? String(telephone).trim() : current.telephone,
        email     !== undefined ? String(email).trim()     : current.email,
        JSON.stringify(horaireData),
        JSON.stringify(mpData),
        JSON.stringify(fidData),
        current.id,
      ]
    );

    res.status(200).json(result.rows[0]);
  } catch (err: any) {
    console.error(err);
    if (err instanceof SyntaxError) {
      return res.status(400).json({ error: "JSON invalide dans le body" });
    }
    res.status(500).json({ error: "Database error" });
  }
});

/* ══════════════════════════════════════════════
   PUT /Parametre/logo — Upload / remplacer le logo
   Utilise multipart/form-data
══════════════════════════════════════════════ */
router.put("/logo", upload.single("logo"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier fourni" });
    }

    // Récupérer l'ancienne config
    const existing = await pool.query("SELECT * FROM parametre ORDER BY id ASC LIMIT 1");
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: "Aucune configuration trouvée" });
    }
    const current = existing.rows[0];

    // Supprimer l'ancien logo si existant
    if (current.logo) {
      const oldPath = path.join(__dirname, "../../", current.logo);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
        console.log(`[logo] Ancien logo supprimé : ${oldPath}`);
      }
    }

    // Chemin relatif stocké en base
    const logoPath = `uploads/boutique/${req.file.filename}`;

    const result = await pool.query(
      "UPDATE parametre SET logo = $1 WHERE id = $2 RETURNING *",
      [logoPath, current.id]
    );

    res.status(200).json(result.rows[0]);
  } catch (err: any) {
    console.error(err);
    if (err.message?.includes("Format non supporté")) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: "Database error" });
  }
});

/* ══════════════════════════════════════════════
   DELETE /Parametre/logo — Supprimer le logo
══════════════════════════════════════════════ */
router.delete("/logo", async (_req: Request, res: Response) => {
  try {
    const existing = await pool.query("SELECT * FROM parametre ORDER BY id ASC LIMIT 1");
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: "Aucune configuration trouvée" });
    }
    const current = existing.rows[0];

    if (!current.logo) {
      return res.status(400).json({ error: "Aucun logo à supprimer" });
    }

    // Supprimer le fichier physique
    const filePath = path.join(__dirname, "../../", current.logo);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[logo] Logo supprimé : ${filePath}`);
    }

    const result = await pool.query(
      "UPDATE parametre SET logo = NULL WHERE id = $1 RETURNING *",
      [current.id]
    );

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

/* ══════════════════════════════════════════════
   PATCH /Parametre/horaire — Mettre à jour les horaires uniquement
══════════════════════════════════════════════ */
router.patch("/horaire", async (req: Request, res: Response) => {
  try {
    const { horaire } = req.body;

    if (!horaire) {
      return res.status(400).json({ error: "Le champ 'horaire' est obligatoire" });
    }

    const parsed = typeof horaire === "string" ? JSON.parse(horaire) : horaire;
    const errMsg = validateHoraire(parsed);
    if (errMsg) return res.status(400).json({ error: errMsg });

    const existing = await pool.query("SELECT id FROM parametre ORDER BY id ASC LIMIT 1");
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: "Aucune configuration trouvée" });
    }

    const result = await pool.query(
      "UPDATE parametre SET horaire = $1::jsonb WHERE id = $2 RETURNING *",
      [JSON.stringify(parsed), existing.rows[0].id]
    );

    res.status(200).json(result.rows[0]);
  } catch (err: any) {
    console.error(err);
    if (err instanceof SyntaxError) {
      return res.status(400).json({ error: "JSON invalide pour horaire" });
    }
    res.status(500).json({ error: "Database error" });
  }
});

/* ══════════════════════════════════════════════
   PATCH /Parametre/paiement — Mettre à jour les modes de paiement uniquement
══════════════════════════════════════════════ */
router.patch("/paiement", async (req: Request, res: Response) => {
  try {
    const { mode_paiement } = req.body;

    if (!mode_paiement) {
      return res.status(400).json({ error: "Le champ 'mode_paiement' est obligatoire" });
    }

    const parsed = typeof mode_paiement === "string" ? JSON.parse(mode_paiement) : mode_paiement;
    const errMsg = validateModePaiement(parsed);
    if (errMsg) return res.status(400).json({ error: errMsg });

    const existing = await pool.query("SELECT id FROM parametre ORDER BY id ASC LIMIT 1");
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: "Aucune configuration trouvée" });
    }

    const result = await pool.query(
      "UPDATE parametre SET mode_paiement = $1::jsonb WHERE id = $2 RETURNING *",
      [JSON.stringify(parsed), existing.rows[0].id]
    );

    res.status(200).json(result.rows[0]);
  } catch (err: any) {
    console.error(err);
    if (err instanceof SyntaxError) {
      return res.status(400).json({ error: "JSON invalide pour mode_paiement" });
    }
    res.status(500).json({ error: "Database error" });
  }
});

/* ══════════════════════════════════════════════
   PATCH /Parametre/fidelite — Mettre à jour la fidélité uniquement
══════════════════════════════════════════════ */
router.patch("/fidelite", async (req: Request, res: Response) => {
  try {
    const { fidelite } = req.body;

    if (!fidelite) {
      return res.status(400).json({ error: "Le champ 'fidelite' est obligatoire" });
    }

    const parsed = typeof fidelite === "string" ? JSON.parse(fidelite) : fidelite;
    const errMsg = validateFidelite(parsed);
    if (errMsg) return res.status(400).json({ error: errMsg });

    const existing = await pool.query("SELECT id FROM parametre ORDER BY id ASC LIMIT 1");
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: "Aucune configuration trouvée" });
    }

    const result = await pool.query(
      "UPDATE parametre SET fidelite = $1::jsonb WHERE id = $2 RETURNING *",
      [JSON.stringify(parsed), existing.rows[0].id]
    );

    res.status(200).json(result.rows[0]);
  } catch (err: any) {
    console.error(err);
    if (err instanceof SyntaxError) {
      return res.status(400).json({ error: "JSON invalide pour fidelite" });
    }
    res.status(500).json({ error: "Database error" });
  }
});

export default router;