import { Router, Request, Response } from "express";
import { pool } from "../db";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

/* ══════════════════════════════════════════════
   MULTER — stockage dans /uploads/produits
   __dirname = src/Routes  →  ../../uploads = racine/uploads
══════════════════════════════════════════════ */
const uploadDir = path.join(__dirname, "../../uploads/produits");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

/* ══════════════════════════════════════════════
   GET /Produit — Tous les produits avec catégorie
══════════════════════════════════════════════ */
router.get("", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT i.*, c.name AS category_name 
      FROM produits i 
      LEFT JOIN categories c ON i.category_id = c.category_id 
      ORDER BY i.item_id ASC 
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

/* ══════════════════════════════════════════════
   GET /Produit/:id — Un produit
══════════════════════════════════════════════ */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT i.*, c.name AS category_name
      FROM produits i
      LEFT JOIN categories c ON i.category_id = c.category_id
      WHERE i.item_id = $1
    `, [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Produit non trouvé" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

/* ══════════════════════════════════════════════
   GET /Produit/category/:categoryId
══════════════════════════════════════════════ */
router.get("/category/:categoryId", async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const result = await pool.query(`
      SELECT i.*, c.name AS category_name
      FROM produits i
      LEFT JOIN categories c ON i.category_id = c.category_id
      WHERE i.category_id = $1
      ORDER BY i.item_id ASC
    `, [categoryId]);
    if (result.rowCount === 0) {
      return res.status(200).json({ message: "Aucun produit dans cette catégorie" });
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

/* ══════════════════════════════════════════════
   POST /Produit — Créer un produit avec image
══════════════════════════════════════════════ */
router.post("", upload.single("image"), async (req: Request, res: Response) => {
  try {
    const { category_id, name, price, is_available, point_fidelite ,id_etape} = req.body;

    // Validations
    if (!name || !name.trim()) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Le champ 'name' est obligatoire" });
    }
    if (price === undefined || price === null || isNaN(Number(price))) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Le champ 'price' est obligatoire et doit être un nombre" });
    }
    if (Number(price) < 0) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Le prix ne peut pas être négatif" });
    }

    // Vérification catégorie
    if (category_id) {
      const catExists = await pool.query(
        "SELECT category_id FROM categories WHERE category_id = $1", [category_id]
      );
      if (catExists.rowCount === 0) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: "Catégorie non trouvée" });
      }
    }

    // Vérification doublon nom + catégorie
    const existing = await pool.query(
      "SELECT item_id FROM produits WHERE name = $1 AND category_id = $2",
      [name.trim(), category_id || null]
    );
    if (existing.rowCount && existing.rowCount > 0) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Un produit avec ce nom existe déjà dans cette catégorie" });
    }

    // Chemin image
    const imagePath = req.file ? `uploads/produits/${req.file.filename}` : null;

    const result = await pool.query(
      `INSERT INTO produits (category_id, name, price, is_available, point_fidelite, image,id_etape)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        category_id || null,
        name.trim(),
        Number(price),
        is_available !== undefined ? is_available === 'true' || is_available === true : true,
        Number(point_fidelite) || 0,
        imagePath,
        id_etape || null,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({ error: "Insertion failed" });
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

/* ══════════════════════════════════════════════
   PUT /Produit/:id — Modifier un produit
══════════════════════════════════════════════ */
router.put("/:id", upload.single("image"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { category_id, name, price, is_available, point_fidelite,id_etape } = req.body;

    // Vérifier existence
    const existing = await pool.query("SELECT * FROM produits WHERE item_id = $1", [id]);
    if (existing.rowCount === 0) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: "Produit non trouvé" });
    }

    const current = existing.rows[0];

    // Validations prix
    if (price !== undefined && Number(price) < 0) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Le prix ne peut pas être négatif" });
    }

    // Gestion image
    let imagePath: string | null = current.image;
    if (req.file) {
      // Supprime l'ancienne image du disque
      if (imagePath) {
        const oldPath = path.join(__dirname, "../../", imagePath);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      imagePath = `uploads/produits/${req.file.filename}`;
    } else if (req.body.image !== undefined) {
      imagePath = req.body.image || null;
    }

    const result = await pool.query(
      `UPDATE produits
       SET category_id    = $1,
           name           = $2,
           price          = $3,
           is_available   = $4,
           point_fidelite = $5,
           image          = $6,
           id_etape       = $7
       WHERE item_id = $8
       RETURNING *`,
      [
        category_id !== undefined ? (category_id || null) : current.category_id,
        name?.trim()     || current.name,
        price !== undefined ? Number(price) : current.price,
        is_available !== undefined ? (is_available === 'true' || is_available === true) : current.is_available,
        point_fidelite !== undefined ? Number(point_fidelite) : current.point_fidelite,
        imagePath,
        id_etape || null,
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
   PATCH /Produit/:id/availability
══════════════════════════════════════════════ */
router.patch("/:id/availability", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { is_available } = req.body;
    if (is_available === undefined) {
      return res.status(400).json({ error: "Le champ 'is_available' est requis" });
    }
    const result = await pool.query(
      "UPDATE produits SET is_available = $1 WHERE item_id = $2 RETURNING *",
      [is_available, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Produit non trouvé" });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

/* ══════════════════════════════════════════════
   DELETE /Produit/:id — Supprime produit + image
══════════════════════════════════════════════ */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await pool.query(
      "SELECT image FROM produits WHERE item_id = $1", [id]
    );
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: "Produit non trouvé" });
    }

    const imagePath = existing.rows[0].image;
    await pool.query("DELETE FROM produits WHERE item_id = $1", [id]);

    // Supprime le fichier du disque
    if (imagePath) {
      const filePath = path.join(__dirname, "../../", imagePath);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    res.status(200).json({ message: "Produit supprimé avec succès" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

/* ══════════════════════════════════════════════
   GET /Produit/search/:query
══════════════════════════════════════════════ */
router.get("/search/:query", async (req: Request, res: Response) => {
  try {
    const { query } = req.params;
    const result = await pool.query(`
      SELECT i.*, c.name AS category_name
      FROM produits i
      LEFT JOIN categories c ON i.category_id = c.category_id
      WHERE i.name ILIKE $1
      ORDER BY i.item_id ASC
    `, [`%${query}%`]);
    if (result.rowCount === 0) {
      return res.status(200).json({ message: "Aucun produit trouvé" });
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;