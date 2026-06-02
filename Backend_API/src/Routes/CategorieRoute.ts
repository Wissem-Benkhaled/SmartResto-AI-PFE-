import { Router, Request, Response } from "express";
import { pool } from "../db";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

/* ══════════════════════════════════════════════
   MULTER — stockage des images dans /uploads/categories
══════════════════════════════════════════════ */
// __dirname = src/Routes  →  ../../ = racine du projet
const uploadDir = path.join(__dirname, "../../uploads/categories");

// Crée le dossier s'il n'existe pas encore
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    // Nom unique : timestamp + nom original nettoyé
    const ext  = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, "_");
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Type de fichier non autorisé. Utilisez JPG, PNG ou WEBP."));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
});

/* ══════════════════════════════════════════════
   GET /Categorie — Récupérer toutes les catégories
══════════════════════════════════════════════ */
router.get("", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT * FROM categories ORDER BY category_id ASC"
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
   GET /Categorie/:id — Récupérer une catégorie
══════════════════════════════════════════════ */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM categories WHERE category_id = $1",
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Catégorie non trouvée" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

/* ══════════════════════════════════════════════
   POST /Categorie — Créer une catégorie
   Accepte multipart/form-data avec champ "image"
══════════════════════════════════════════════ */
router.post("", upload.single("image"), async (req: Request, res: Response) => {
  try {
    const { category_id, name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Le nom est obligatoire" });
    }

    // Vérifie si le nom existe déjà
    const existing = await pool.query(
      "SELECT category_id FROM categories WHERE name = $1",
      [name.trim()]
    );
    if (existing.rowCount && existing.rowCount > 0) {
      // Supprime le fichier uploadé si insertion annulée
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Ce nom de catégorie est déjà utilisé" });
    }

    // Chemin relatif stocké en base : "uploads/categories/filename.jpg"
    const imagePath = req.file
      ? `uploads/categories/${req.file.filename}`
      : (req.body.image ?? null);

    const insert_data = await pool.query(
      `INSERT INTO categories (category_id, name, image)
       VALUES ($1, $2, $3)
       RETURNING category_id, name, image`,
      [category_id, name.trim(), imagePath]
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

/* ══════════════════════════════════════════════
   PUT /Categorie/:id — Modifier une catégorie
   Accepte multipart/form-data avec champ "image" optionnel
══════════════════════════════════════════════ */
router.put("/:id", upload.single("image"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { category_id, name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Le nom est obligatoire" });
    }

    // Récupère l'ancienne image pour la supprimer si on en uploade une nouvelle
    const old = await pool.query(
      "SELECT image FROM categories WHERE category_id = $1",
      [id]
    );
    if (old.rowCount === 0) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: "Catégorie non trouvée" });
    }

    let imagePath: string | null = old.rows[0].image; // garde l'ancienne par défaut

    if (req.file) {
      // Nouvelle image uploadée → supprime l'ancienne du disque
      if (imagePath) {
      const oldFilePath = path.join(__dirname, "../../", imagePath);
        if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
      }
      imagePath = `uploads/categories/${req.file.filename}`;
    } else if (req.body.image !== undefined) {
      // Le frontend a envoyé explicitement une valeur (ex: garder l'URL existante)
      imagePath = req.body.image || null;
    }

    const result = await pool.query(
      `UPDATE categories
       SET category_id = $1, name = $2, image = $3
       WHERE category_id = $4
       RETURNING *`,
      [category_id ?? id, name.trim(), imagePath, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Catégorie non trouvée" });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

/* ══════════════════════════════════════════════
   DELETE /Categorie/:id — Supprimer une catégorie
   Supprime aussi le fichier image du disque
══════════════════════════════════════════════ */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Récupère le chemin image avant suppression
    const existing = await pool.query(
      "SELECT image FROM categories WHERE category_id = $1",
      [id]
    );
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: "Catégorie non trouvée" });
    }

    const imagePath = existing.rows[0].image;

    // Supprime en base
    await pool.query("DELETE FROM categories WHERE category_id = $1", [id]);

    // Supprime le fichier image du disque si existant
    if (imagePath) {
      const filePath = path.join(__dirname, "../../", imagePath);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    res.status(200).json({ message: "Catégorie supprimée avec succès" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;