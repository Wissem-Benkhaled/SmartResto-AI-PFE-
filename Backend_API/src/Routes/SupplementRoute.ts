import { Router, Request, Response } from 'express'
import { pool } from '../db'
 
const router = Router()
 
/* ══════════════════════════════════════════
   STRUCTURE JSONB stockée dans ids_items :
   [{ id: number, nom_produit: string }, ...]
══════════════════════════════════════════ */
 
/* ══════════════════════════════════════════
   GET ALL  –  GET /Supplement
══════════════════════════════════════════ */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT id, nom, obligatoire, ids_items
      FROM supplement
      ORDER BY nom ASC;
    `)
    res.json(result.rows)
  } catch (err: any) {
    console.error('[Supplement GET ALL]', err)
    res.status(500).json({ error: 'Erreur lors de la récupération des suppléments.' })
  }
})
 
/* ══════════════════════════════════════════
   GET ONE  –  GET /Supplement/:id
══════════════════════════════════════════ */
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    const result = await pool.query(
      `SELECT id, nom, obligatoire, ids_items FROM supplement WHERE id = $1`,
      [id]
    )
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Supplément introuvable.' })
    res.json(result.rows[0])
  } catch (err: any) {
    console.error('[Supplement GET ONE]', err)
    res.status(500).json({ error: 'Erreur lors de la récupération du supplément.' })
  }
})
 
/* ══════════════════════════════════════════
   CREATE  –  POST /Supplement
   Body: {
     nom        : string,
     obligatoire: boolean   (optional, default false),
     ids_items  : { id: number, nom_produit: string }[]
   }
══════════════════════════════════════════ */
router.post('/', async (req: Request, res: Response) => {
  const { nom, obligatoire = false, ids_items } = req.body
 
  if (!nom || !nom.toString().trim())
    return res.status(400).json({ error: 'Le nom est obligatoire.' })
  if (!Array.isArray(ids_items) || ids_items.length === 0)
    return res.status(400).json({ error: 'ids_items doit être un tableau non vide.' })
 
  // Validate each entry
  for (const entry of ids_items) {
    if (typeof entry.id !== 'number' || !entry.nom_produit?.toString().trim())
      return res.status(400).json({ error: 'Chaque entrée ids_items doit avoir { id, nom_produit }.' })
  }
 
  try {
    const result = await pool.query(
      `INSERT INTO supplement (nom, obligatoire, ids_items)
       VALUES ($1, $2, $3::jsonb)
       RETURNING *`,
      [nom.trim(), obligatoire, JSON.stringify(ids_items)]
    )
    res.status(201).json(result.rows[0])
  } catch (err: any) {
    console.error('[Supplement POST]', err)
    res.status(500).json({ error: 'Erreur lors de la création du supplément.' })
  }
})
 
/* ══════════════════════════════════════════
   UPDATE  –  PUT /Supplement/:id
   Body (all optional): {
     nom?        : string,
     obligatoire?: boolean,
     ids_items?  : { id: number, nom_produit: string }[]
   }
══════════════════════════════════════════ */
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params
  const { nom, obligatoire, ids_items } = req.body
 
  if (nom !== undefined && !nom.toString().trim())
    return res.status(400).json({ error: 'Le nom ne peut pas être vide.' })
  if (ids_items !== undefined) {
    if (!Array.isArray(ids_items) || ids_items.length === 0)
      return res.status(400).json({ error: 'ids_items doit être un tableau non vide.' })
    for (const entry of ids_items) {
      if (typeof entry.id !== 'number' || !entry.nom_produit?.toString().trim())
        return res.status(400).json({ error: 'Chaque entrée ids_items doit avoir { id, nom_produit }.' })
    }
  }
 
  const fields: string[] = []
  const values: any[]    = []
  let   idx              = 1
 
  if (nom         !== undefined) { fields.push(`nom = $${idx++}`);            values.push(nom.trim()) }
  if (obligatoire !== undefined) { fields.push(`obligatoire = $${idx++}`);    values.push(obligatoire) }
  if (ids_items   !== undefined) { fields.push(`ids_items = $${idx++}::jsonb`); values.push(JSON.stringify(ids_items)) }
 
  if (fields.length === 0)
    return res.status(400).json({ error: 'Aucun champ à mettre à jour.' })
 
  values.push(id)
  try {
    const result = await pool.query(
      `UPDATE supplement SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    )
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Supplément introuvable.' })
    res.json(result.rows[0])
  } catch (err: any) {
    console.error('[Supplement PUT]', err)
    res.status(500).json({ error: 'Erreur lors de la mise à jour du supplément.' })
  }
})
 
/* ══════════════════════════════════════════
   DELETE  –  DELETE /Supplement/:id
══════════════════════════════════════════ */
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    const result = await pool.query(
      'DELETE FROM supplement WHERE id = $1 RETURNING *',
      [id]
    )
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Supplément introuvable.' })
    res.json({ message: 'Supplément supprimé avec succès.', deleted: result.rows[0] })
  } catch (err: any) {
    console.error('[Supplement DELETE]', err)
    res.status(500).json({ error: 'Erreur lors de la suppression du supplément.' })
  }
})
 
export default router
