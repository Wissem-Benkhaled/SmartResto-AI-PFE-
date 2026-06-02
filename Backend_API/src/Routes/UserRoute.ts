import { Router, Request, Response } from "express";
import { pool } from "../db";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
 
const router = Router();
 
// ─────────────────────────────────────────────
// 📧 Configurez Nodemailer avec Gmail
// ─────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "alibelhaj2205@gmail.com",       // ← Remplacez par votre Gmail
    pass: "sbni jumu svmj qvvw",       // ← Votre mot de passe d'application
  },
});
 
// ─────────────────────────────────────────────
// 🔐 Chiffrer un mot de passe (hachage bcrypt)
// ─────────────────────────────────────────────
async function chiffre_mdp(password: string): Promise<string> {
  const saltRounds = 10;
  const hashed = await bcrypt.hash(password, saltRounds);
  return hashed;
}
 
// ─────────────────────────────────────────────
// 🔓 Déchiffrer (vérifier) un mot de passe
// ─────────────────────────────────────────────
async function dechiffre_mdp(password: string, hash: string): Promise<boolean> {
  const match = await bcrypt.compare(password, hash);
  return match;
}

// 📌 Récupérer tous les Rôles de la table role
// (Doit être placé AVANT router.get("/:id") !)
router.get("/roles", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT * FROM role ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});
 
// 📌 Récupérer tous les Utilisateurs (avec leur nom de rôle)
router.get("", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT u.user_id, u.username, u.email, u.role_id, r.nom_role as role, u.created_at
       FROM users u
       LEFT JOIN role r ON u.role_id = r.id
       ORDER BY role_id ASC`
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
 
// 📌 Récupérer un Utilisateur
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT u.user_id, u.username, u.email, u.role_id, r.nom_role as role, u.created_at
       FROM users u
       LEFT JOIN role r ON u.role_id = r.id
       WHERE u.user_id = $1`,
      [id]
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
 
// 📌 Insérer un Utilisateur (avec role_id)
router.post("", async (req: Request, res: Response) => {
  try {
    const { username, email, password, role_id } = req.body;
    const existing = await pool.query("SELECT user_id FROM users WHERE username = $1", [username]);
    if (existing.rowCount && existing.rowCount > 0) {
      return res.status(400).json({ error: "Ce nom d'utilisateur est déjà utilisé" });
    }
 
    if (!password || !password.trim()) {
      return res.status(400).json({ error: "Le mot de passe est obligatoire." });
    }

    const hashedPassword = await chiffre_mdp(password);
 
    const insert_data = await pool.query(
      `INSERT INTO users (username, email, password, role_id, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING user_id, username, email, role_id, created_at`,
      [username, email, hashedPassword, role_id]
    );
 
    if (insert_data.rowCount === 0) {
      return res.status(400).json({ error: "Insertion failed" });
    }

    // Récupérer le nom de rôle pour la réponse
    const user_id = insert_data.rows[0].user_id;
    const user_details = await pool.query(
      `SELECT u.user_id, u.username, u.email, u.role_id, r.nom_role as role, u.created_at
       FROM users u
       LEFT JOIN role r ON u.role_id = r.id
       WHERE u.user_id = $1`,
      [user_id]
    );
 
    res.status(201).json(user_details.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});
 
// 📌 Supprimer un Utilisateur
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM users WHERE user_id = $1", [id]);
 
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "users not found" });
    }
 
    res.status(200).json({ message: "category deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});
 
// 📌 Mettre à jour un Utilisateur (avec role_id)
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { username, email, password, role_id } = req.body;
 
    let result;
    if (password && password.trim() !== "") {
      const hashedPassword = await chiffre_mdp(password);
      result = await pool.query(
        `UPDATE users
         SET username = $1, email = $2, password = $3, role_id = $4
         WHERE user_id = $5
         RETURNING *`,
        [username, email, hashedPassword, role_id, id]
      );
    } else {
      result = await pool.query(
        `UPDATE users
         SET username = $1, email = $2, role_id = $3
         WHERE user_id = $4
         RETURNING *`,
        [username, email, role_id, id]
      );
    }
 
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "users not found" });
    }
 
    // Récupérer le nom de rôle mis à jour
    const updated_user = await pool.query(
      `SELECT u.user_id, u.username, u.email, u.role_id, r.nom_role as role, u.created_at
       FROM users u
       LEFT JOIN role r ON u.role_id = r.id
       WHERE u.user_id = $1`,
      [id]
    );

    res.status(200).json(updated_user.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});
 
// 📌 Login Utilisateur
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email et mot de passe requis" });
    }
 
    const result = await pool.query(
      `SELECT u.*, r.nom_role as role
       FROM users u
       LEFT JOIN role r ON u.role_id = r.id
       WHERE u.email = $1`,
      [email]
    );
 
    if (result.rowCount === 0) {
      return res.status(400).json({ error: "Email ou mot de passe incorrect" });
    }
 
    const user = result.rows[0];
 
    const isMatch = await dechiffre_mdp(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Email ou mot de passe incorrect" });
    }
 
    res.status(200).json({
      message: "Connexion réussie",
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        role: user.role,
        role_id: user.role_id,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});
 
// ══════════════════════════════════════════════════
// 📌 FORGOT PASSWORD — Envoyer le code par email
// POST /User/forgot-password
// ══════════════════════════════════════════════════
router.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
 
    if (!email) {
      return res.status(400).json({ error: "Email requis." });
    }
 
    // 1. Vérifier si l'email existe
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
 
    // Vérifier si l'adresse email existe dans la base de données
    if (result.rowCount === 0) {
      return res.status(400).json({ error: "Cette adresse e-mail n'existe pas dans notre base de données." });
    }
 
    // 2. Générer un code à 6 chiffres
    const code = Math.floor(100000 + Math.random() * 900000).toString();
 
    // 3. Expiration dans 10 minutes
    const expires = new Date(Date.now() + 10 * 60 * 1000);
 
    // 4. Sauvegarder en base de données
    await pool.query(
      "UPDATE users SET reset_code = $1, reset_code_expires = $2 WHERE email = $3",
      [code, expires, email]
    );
 
    // 5. Envoyer l'email
    await transporter.sendMail({
      from: '"Mon Application" <alibelhaj2205@gmail.com>',
      to: email,
      subject: "🔐 Code de réinitialisation de mot de passe",
      html: `
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 480px; margin: auto;
                    background: #f9fafb; border-radius: 16px; overflow: hidden;">
         
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #3498db, #2980b9);
                      padding: 32px 40px; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 1.6rem; font-weight: 700;">
              Réinitialisation du mot de passe
            </h1>
          </div>
 
          <!-- Body -->
          <div style="padding: 36px 40px; background: #ffffff;">
            <p style="color: #2c3e50; font-size: 1rem; margin-bottom: 8px;">
              Bonjour,
            </p>
            <p style="color: #555; font-size: 0.95rem; line-height: 1.6; margin-bottom: 28px;">
              Vous avez demandé à réinitialiser votre mot de passe.
              Voici votre <strong>code de vérification à 6 chiffres</strong> :
            </p>
 
            <!-- Code Box -->
            <div style="background: #eaf4fd; border: 2px dashed #3498db;
                        border-radius: 12px; padding: 24px; text-align: center;
                        margin-bottom: 28px;">
              <span style="font-size: 2.8rem; font-weight: 800;
                           letter-spacing: 14px; color: #2c3e50;">
                ${code}
              </span>
            </div>
 
            <p style="color: #e74c3c; font-size: 0.85rem; text-align: center;
                      margin-bottom: 28px;">
              ⏱ Ce code expire dans <strong>10 minutes</strong>
            </p>
 
            <hr style="border: none; border-top: 1px solid #ecf0f1; margin-bottom: 24px;" />
 
            <p style="color: #95a5a6; font-size: 0.82rem; line-height: 1.5; margin: 0;">
              Si vous n'avez pas demandé cette réinitialisation, ignorez cet e-mail.
              Votre mot de passe restera inchangé.
            </p>
          </div>
 
          <!-- Footer -->
          <div style="background: #f0f4f8; padding: 16px 40px; text-align: center;">
            <p style="color: #bdc3c7; font-size: 0.78rem; margin: 0;">
              © 2025 Mon Application — Ne pas répondre à cet email
            </p>
          </div>
        </div>
      `,
    });
 
    res.status(200).json({ message: "Code envoyé avec succès." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'envoi du code." });
  }
});
 
// ══════════════════════════════════════════════════
// 📌 RESET PASSWORD — Vérifier le code + nouveau mdp
// POST /User/reset-password
// ══════════════════════════════════════════════════
router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { email, code, newPassword } = req.body;
 
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: "Tous les champs sont requis." });
    }
 
    // 1. Récupérer l'utilisateur
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
 
    if (result.rowCount === 0) {
      return res.status(400).json({ error: "Utilisateur introuvable." });
    }
 
    const user = result.rows[0];
 
    // 2. Vérifier le code
    if (user.reset_code !== code) {
      return res.status(400).json({ error: "Code invalide." });
    }
 
    // 3. Vérifier l'expiration
    if (!user.reset_code_expires || new Date() > new Date(user.reset_code_expires)) {
      return res.status(400).json({ error: "Code expiré. Veuillez recommencer la procédure." });
    }
 
    // 4. Vérifier la longueur du nouveau mot de passe
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caractères." });
    }
 
    // 5. Hasher le nouveau mot de passe
    const hashedPassword = await chiffre_mdp(newPassword);
 
    // 6. Mettre à jour + effacer le code
    await pool.query(
      "UPDATE users SET password = $1, reset_code = NULL, reset_code_expires = NULL WHERE email = $2",
      [hashedPassword, email]
    );
 
    res.status(200).json({ message: "Mot de passe réinitialisé avec succès." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la réinitialisation." });
  }
});
 
export default router;