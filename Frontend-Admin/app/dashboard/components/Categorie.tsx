'use client'
import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { API_BASE_URL } from './Types'
import { Toast } from './UI'

interface ModalProps {
  mode: 'create' | 'edit'
  initial?: { category_id: string; name: string; image: string }
  onClose: () => void
  onSaved: () => void
}

/* ══════════════════════════════════════════
   MODAL
══════════════════════════════════════════ */
function CategorieModal({ mode, initial, onClose, onSaved }: ModalProps) {
  const [name, setName]           = useState(initial?.name ?? '')
  const [file, setFile]           = useState<File | null>(null)
  const [preview, setPreview]     = useState<string | null>(
    // Si l'image existante est une URL serveur, on l'affiche directement
    initial?.image ? `${API_BASE_URL}/${initial.image}` : null
  )
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const genId = () => Math.floor(Math.random() * 90000 + 10000).toString()

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    // Aperçu local uniquement pour l'affichage
    setPreview(URL.createObjectURL(f))
  }

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Le nom est obligatoire.'); return }
    setLoading(true); setError(null)

    try {
      // On envoie multipart/form-data pour que le backend puisse
      // recevoir le fichier et le stocker dans son dossier uploads/
      const formData = new FormData()
      formData.append('category_id', mode === 'create' ? genId() : initial!.category_id)
      formData.append('name', name.trim())
      if (file) formData.append('image', file)          // fichier réel
      else if (initial?.image) formData.append('image', initial.image) // garde l'URL existante

      if (mode === 'create') {
        await axios.post(`${API_BASE_URL}/Categorie`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      } else {
        await axios.put(`${API_BASE_URL}/Categorie/${initial!.category_id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }

      onSaved(); onClose()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Une erreur est survenue.')
    } finally { setLoading(false) }
  }

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(10,10,20,0.6)', backdropFilter:'blur(6px)', zIndex:200 }} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'clamp(300px,90vw,460px)', background:'#fff', borderRadius:18, boxShadow:'0 32px 100px rgba(0,0,0,0.28)', zIndex:201, overflow:'hidden' }}>

        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,#1a1a2e,#2a2a4e)', padding:'1.25rem 1.5rem', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.7rem' }}>
            <div style={{ width:38, height:38, borderRadius:10, background:'linear-gradient(135deg,#c9a258,#a07830)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem' }}>🗂️</div>
            <div>
              <div style={{ color:'#f5f0e8', fontWeight:700, fontSize:'0.97rem' }}>
                {mode==='create' ? 'Nouvelle catégorie' : 'Modifier la catégorie'}
              </div>
              <div style={{ color:'rgba(245,240,232,0.35)', fontSize:'0.68rem', marginTop:1 }}>
                {mode==='create' ? 'Remplir les informations' : `ID : ${initial?.category_id}`}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.08)', border:'none', borderRadius:8, width:34, height:34, color:'rgba(245,240,232,0.5)', cursor:'pointer', fontSize:'1rem', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding:'1.5rem' }}>

          {/* Nom */}
          <div style={{ marginBottom:'1.25rem' }}>
            <label style={{ display:'block', fontSize:'0.72rem', color:'#9a9590', textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:600, marginBottom:'0.45rem' }}>
              Nom de la catégorie *
            </label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="Ex: Plats principaux, Desserts…"
              style={{ width:'100%', background:'#faf8f5', border:'1.5px solid #e8e4de', borderRadius:9, padding:'0.72rem 0.95rem', color:'#1a1a2e', fontFamily:'Plus Jakarta Sans,sans-serif', fontSize:'0.88rem', outline:'none', transition:'border-color 0.15s' }}
              onFocus={e => (e.target.style.borderColor='#c9a258')}
              onBlur={e => (e.target.style.borderColor='#e8e4de')}
            />
          </div>

          {/* Upload image */}
          <div style={{ marginBottom:'1.25rem' }}>
            <label style={{ display:'block', fontSize:'0.72rem', color:'#9a9590', textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:600, marginBottom:'0.45rem' }}>
              Image de la catégorie
            </label>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display:'none' }} />

            {preview ? (
              /* ── Aperçu image ── */
              <div style={{ position:'relative', borderRadius:12, overflow:'hidden', border:'1.5px solid #e8e4de' }}>
                <img src={preview} alt="aperçu" style={{ width:'100%', height:170, objectFit:'cover', display:'block' }} />
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 55%)' }} />
                <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'0.75rem 1rem', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ color:'rgba(255,255,255,0.85)', fontSize:'0.74rem', fontWeight:600 }}>
                    {file ? `📎 ${file.name}` : '🌐 Image actuelle'}
                  </span>
                  <button
                    onClick={() => fileRef.current?.click()}
                    style={{ background:'rgba(255,255,255,0.18)', backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.3)', borderRadius:7, padding:'0.3rem 0.75rem', color:'#fff', fontSize:'0.73rem', fontWeight:600, cursor:'pointer' }}>
                    🔄 Changer
                  </button>
                </div>
              </div>
            ) : (
              /* ── Zone drop vide ── */
              <div
                onClick={() => fileRef.current?.click()}
                style={{ border:'2px dashed #e8e4de', borderRadius:12, padding:'1.8rem 1rem', textAlign:'center', cursor:'pointer', background:'#faf8f5', transition:'all 0.2s' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor='#c9a258'; el.style.background='rgba(201,162,88,0.03)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor='#e8e4de'; el.style.background='#faf8f5' }}
              >
                <div style={{ fontSize:'2.2rem', marginBottom:'0.5rem' }}>🖼️</div>
                <div style={{ fontSize:'0.85rem', color:'#5a5550', fontWeight:600, marginBottom:'0.25rem' }}>Cliquer pour importer une image</div>
                <div style={{ fontSize:'0.72rem', color:'#b0aba5' }}>PNG, JPG, WEBP — max 5 MB</div>
              </div>
            )}
          </div>

          {error && (
            <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:8, padding:'0.6rem 0.85rem', color:'#dc2626', fontSize:'0.8rem', marginBottom:'1rem' }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display:'flex', gap:'0.6rem' }}>
            <button onClick={onClose} style={{ flex:1, background:'none', border:'1.5px solid #e8e4de', borderRadius:9, padding:'0.68rem', color:'#9a9590', fontFamily:'Plus Jakarta Sans,sans-serif', fontSize:'0.85rem', fontWeight:600, cursor:'pointer' }}>
              Annuler
            </button>
            <button onClick={handleSubmit} disabled={loading}
              style={{ flex:2, background:loading?'#d4b87a':'linear-gradient(135deg,#c9a258,#a07830)', border:'none', borderRadius:9, padding:'0.68rem', color:'#fff', fontFamily:'Plus Jakarta Sans,sans-serif', fontSize:'0.85rem', fontWeight:700, cursor:loading?'not-allowed':'pointer', boxShadow:'0 3px 12px rgba(201,162,88,0.3)', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.4rem' }}>
              {loading ? '⏳ Enregistrement…' : mode==='create' ? '✚ Créer' : '💾 Sauvegarder'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

/* ══════════════════════════════════════════
   CONFIRM DELETE
══════════════════════════════════════════ */
function ConfirmDelete({ name, onConfirm, onCancel }: { name:string; onConfirm:()=>void; onCancel:()=>void }) {
  return (
    <>
      <div onClick={onCancel} style={{ position:'fixed', inset:0, background:'rgba(10,10,20,0.6)', backdropFilter:'blur(6px)', zIndex:200 }} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'clamp(280px,88vw,380px)', background:'#fff', borderRadius:16, boxShadow:'0 24px 70px rgba(0,0,0,0.22)', zIndex:201, padding:'1.75rem', textAlign:'center' }}>
        <div style={{ fontSize:'2.5rem', marginBottom:'0.75rem' }}>🗑️</div>
        <div style={{ fontWeight:700, color:'#1a1a2e', fontSize:'1rem', marginBottom:'0.4rem' }}>Supprimer la catégorie ?</div>
        <div style={{ color:'#9a9590', fontSize:'0.83rem', marginBottom:'1.5rem', lineHeight:1.5 }}>
          La catégorie <strong style={{ color:'#1a1a2e' }}>«&nbsp;{name}&nbsp;»</strong> sera définitivement supprimée.
        </div>
        <div style={{ display:'flex', gap:'0.6rem' }}>
          <button onClick={onCancel} style={{ flex:1, background:'none', border:'1.5px solid #e8e4de', borderRadius:9, padding:'0.65rem', color:'#9a9590', fontFamily:'Plus Jakarta Sans,sans-serif', fontSize:'0.85rem', fontWeight:600, cursor:'pointer' }}>Annuler</button>
          <button onClick={onConfirm} style={{ flex:1, background:'linear-gradient(135deg,#ef4444,#b91c1c)', border:'none', borderRadius:9, padding:'0.65rem', color:'#fff', fontFamily:'Plus Jakarta Sans,sans-serif', fontSize:'0.85rem', fontWeight:700, cursor:'pointer' }}>Supprimer</button>
        </div>
      </div>
    </>
  )
}

/* ══════════════════════════════════════════
   Helper : construit l'URL de l'image
   Le backend retourne soit :
   - un chemin relatif  → "uploads/img.png"
   - une URL complète   → "http://..."
══════════════════════════════════════════ */
const getImageUrl = (image: string): string | null => {
  if (!image) return null
  if (image.startsWith('http') || image.startsWith('blob:') || image.startsWith('data:')) return image
  // chemin relatif → préfixe avec l'URL du backend
  return `${API_BASE_URL}/${image}`
}

/* ══════════════════════════════════════════
   MAIN
══════════════════════════════════════════ */
export default function Categorie() {
  const [cats, setCats]                 = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [modal, setModal]               = useState<'create'|'edit'|null>(null)
  const [editTarget, setEditTarget]     = useState<any|null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any|null>(null)
  const [toast, setToast]               = useState<{ message:string; type:'success'|'error' }|null>(null)
  const [deletingId, setDeletingId]     = useState<string|null>(null)

  const showToast = (message: string, type: 'success'|'error') => {
    setToast({ message, type }); setTimeout(() => setToast(null), 3200)
  }

  const fetchCats = async () => {
    try {
      const r = await axios.get(`${API_BASE_URL}/Categorie`)
      const d = r.data
      setCats(Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : Array.isArray(d?.categories) ? d.categories : [])
    } catch { showToast('Impossible de charger les catégories.', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchCats() }, [])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeletingId(deleteTarget.category_id)
    try {
      await axios.delete(`${API_BASE_URL}/Categorie/${deleteTarget.category_id}`)
      showToast(`Catégorie «\u00a0${deleteTarget.name}\u00a0» supprimée.`, 'success')
      await fetchCats()
    } catch { showToast('Échec de la suppression.', 'error') }
    finally { setDeletingId(null); setDeleteTarget(null) }
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:220, color:'#c9a258', gap:'0.6rem', fontSize:'0.9rem' }}>
      <span style={{ animation:'spin 0.9s linear infinite', display:'inline-block', fontSize:'1.3rem' }}>⏳</span>
      Chargement des catégories…
      <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <>
      <style>{`
        @keyframes spin   { to { transform:rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
        .cat-card { transition:transform 0.22s ease, box-shadow 0.22s ease; animation:fadeUp 0.3s ease both; }
        .cat-card:hover { transform:translateY(-5px) !important; box-shadow:0 18px 50px rgba(0,0,0,0.14) !important; }
        .cat-img { transition:transform 0.45s ease; }
        .cat-card:hover .cat-img { transform:scale(1.07); }
        .cat-actions-hover { opacity:0; transition:opacity 0.2s; }
        .cat-card:hover .cat-actions-hover { opacity:1; }
      `}</style>

      {modal==='create' && (
        <CategorieModal mode="create"
          onClose={() => setModal(null)}
          onSaved={() => { fetchCats(); showToast('Catégorie créée avec succès !', 'success') }} />
      )}
      {modal==='edit' && editTarget && (
        <CategorieModal mode="edit" initial={editTarget}
          onClose={() => { setModal(null); setEditTarget(null) }}
          onSaved={() => { fetchCats(); showToast('Catégorie mise à jour !', 'success') }} />
      )}
      {deleteTarget && (
        <ConfirmDelete name={deleteTarget.name} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* ── Header ── */}
      <div className="table-header">
        <div>
          <div className="section-title">Catégories</div>
          <div className="section-sub">{cats.length} catégorie{cats.length!==1?'s':''} configurée{cats.length!==1?'s':''}</div>
        </div>
        <button className="add-btn" onClick={() => setModal('create')}>+ Nouvelle catégorie</button>
      </div>

      {/* ── Empty state ── */}
      {cats.length===0 ? (
        <div style={{ textAlign:'center', padding:'4rem 1rem', background:'#fff', borderRadius:14, border:'1.5px dashed #e8e4de' }}>
          <div style={{ fontSize:'3.5rem', marginBottom:'0.75rem' }}>🗂️</div>
          <div style={{ color:'#5a5550', fontWeight:700, fontSize:'1rem', marginBottom:'0.4rem' }}>Aucune catégorie</div>
          <div style={{ color:'#b0aba5', fontSize:'0.83rem', marginBottom:'1.5rem' }}>Commencez par créer votre première catégorie.</div>
          <button className="add-btn" onClick={() => setModal('create')}>+ Créer une catégorie</button>
        </div>
      ) : (
        <div className="card-grid">
          {cats.map((c, idx) => {
            const imgUrl = getImageUrl(c.image)
            return (
              <div
                key={c.category_id}
                className="cat-card"
                style={{
                  borderRadius:14, overflow:'hidden',
                  border:'1.5px solid #ede9e3',
                  background:'#fff',
                  boxShadow:'0 2px 10px rgba(0,0,0,0.06)',
                  opacity: deletingId===c.category_id ? 0.4 : 1,
                  animationDelay:`${idx*0.05}s`,
                }}
              >
                {/* ══ Zone image ══ */}
                <div style={{ position:'relative', height:160, overflow:'hidden', background: imgUrl ? '#111' : 'linear-gradient(135deg,rgba(201,162,88,0.1),rgba(201,162,88,0.03))' }}>

                  {imgUrl ? (
                    <img
                      className="cat-img"
                      src={imgUrl}
                      alt={c.name}
                      style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
                      onError={e => {
                        // Si l'image ne charge pas → masque et affiche placeholder
                        (e.currentTarget as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'0.4rem' }}>
                      <span style={{ fontSize:'3rem', opacity:0.25 }}>🗂️</span>
                      <span style={{ fontSize:'0.7rem', color:'#c9a258', opacity:0.6, fontWeight:600 }}>Pas d'image</span>
                    </div>
                  )}

                  {/* Gradient overlay bas */}
                  <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(15,15,30,0.78) 0%, rgba(15,15,30,0.08) 50%, transparent 75%)' }} />

               

                  {/* Actions hover — haut gauche */}
                  <div className="cat-actions-hover" style={{ position:'absolute', top:10, left:10, display:'flex', gap:'0.35rem' }}>
                    <button
                      onClick={() => { setEditTarget(c); setModal('edit') }}
                      style={{ background:'rgba(255,255,255,0.2)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', border:'1px solid rgba(255,255,255,0.28)', borderRadius:8, padding:'0.32rem 0.65rem', color:'#fff', fontSize:'0.72rem', fontWeight:700, cursor:'pointer' }}>
                      ✏️ Modifier
                    </button>
                    <button
                      onClick={() => setDeleteTarget(c)}
                      style={{ background:'rgba(220,38,38,0.3)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', border:'1px solid rgba(255,100,100,0.4)', borderRadius:8, padding:'0.32rem 0.55rem', color:'#fca5a5', fontSize:'0.72rem', cursor:'pointer' }}>
                      🗑️
                    </button>
                  </div>

                  {/* Nom + indicateur — bas gauche */}
                  <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'0.72rem 0.9rem' }}>
                    <div style={{ color:'#fff', fontWeight:700, fontSize:'1rem', letterSpacing:'0.01em', textShadow:'0 2px 10px rgba(0,0,0,0.6)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {c.name}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.3rem', marginTop:'0.2rem' }}>
                      <span style={{ width:5, height:5, borderRadius:'50%', background: imgUrl ? '#4ade80' : '#f59e0b', display:'inline-block' }} />
                      <span style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.67rem' }}>
                        {imgUrl ? 'Image importée' : 'Sans image'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ══ Footer ══ */}
                <div style={{ padding:'0.75rem 0.9rem', display:'flex', alignItems:'center', justifyContent:'space-between', borderTop:'1px solid #f5f2ee' }}>
               

                  {/* Boutons */}
                  <div style={{ display:'flex', gap:'0.35rem', flexShrink:0 }}>
                    <button
                      onClick={() => { setEditTarget(c); setModal('edit') }}
                      style={{ background:'none', border:'1px solid #e8e4de', borderRadius:7, padding:'0.28rem 0.6rem', color:'#9a9590', fontSize:'0.72rem', cursor:'pointer', transition:'all 0.15s', fontWeight:500 }}
                      onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor='#c9a258'; b.style.color='#c9a258' }}
                      onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor='#e8e4de'; b.style.color='#9a9590' }}>
                      ✏️ Modifier
                    </button>
                    <button
                      onClick={() => setDeleteTarget(c)}
                      style={{ background:'none', border:'1px solid #fca5a5', borderRadius:7, padding:'0.28rem 0.5rem', color:'#dc2626', fontSize:'0.72rem', cursor:'pointer', transition:'background 0.15s' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background='#fef2f2')}
                      onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background='none')}>
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}