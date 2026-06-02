'use client'
import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { API_BASE_URL } from './Types'
import { Toast } from './UI'

/* ══════════════════════════════════════════
   TYPES
══════════════════════════════════════════ */
interface IdEtape {
  id_etape: number
  nom_etape: string
}

interface Produit {
  item_id: number
  name: string
  category_id: number | null
  category_name: string | null
  price: number
  is_available: boolean
  point_fidelite: number
  image?: string
  id_etape: IdEtape[]   // JSONB array
  created_at?: string
}

interface Categorie {
  category_id: number
  name: string
}

interface Supplement {
  id: number
  nom: string
}

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
const getImageUrl = (image?: string): string | null => {
  if (!image) return null
  if (image.startsWith('http') || image.startsWith('blob:') || image.startsWith('data:')) return image
  return `${API_BASE_URL}/${image}`
}

/* ══════════════════════════════════════════
   ETAPE MULTI-SELECTOR — liste roulante inline

══════════════════════════════════════════ */
function SupplementSelector({
  supplements,
  selected,
  onChange,
}: {
  supplements: Supplement[]
  selected: IdEtape[]
  onChange: (v: IdEtape[]) => void
}) {
  const [open, setOpen]     = useState(false)
  const [search, setSearch] = useState('')
  const wrapRef             = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectedIds = selected.map(s => s.id_etape)

  const toggle = (etape: Etape) => {
    if (selectedIds.includes(etape.id)) {
      onChange(selected.filter(s => s.id_etape !== etape.id))
    } else {
      onChange([...selected, { id_etape: etape.id, nom_etape: etape.nom }])
    }
  }

  const removeOne = (id: number) => onChange(selected.filter(s => s.id_etape !== id))

  const filtered = supplements.filter(e =>
    e.nom.toLowerCase().includes(search.toLowerCase())
  )

  // Selected pinned to top
  const sortedFiltered = [
    ...filtered.filter(e => selectedIds.includes(e.id)),
    ...filtered.filter(e => !selectedIds.includes(e.id)),
  ]
  const hasGroups =
    filtered.some(e => selectedIds.includes(e.id)) &&
    filtered.some(e => !selectedIds.includes(e.id))

  return (
    <div ref={wrapRef} style={{ color: '#1a1a2e' }}>

      {/* ── Trigger box ── */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          background: '#faf8f5',
          border: `1.5px solid ${open ? '#c9a258' : '#e8e4de'}`,
          borderRadius: 9,
          padding: selected.length === 0 ? '0.68rem 2.2rem 0.68rem 0.9rem' : '0.45rem 2.2rem 0.45rem 0.75rem',
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'border-color 0.15s',
          boxSizing: 'border-box' as const,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.35rem',
          position: 'relative' as const,
          minHeight: 42,
        }}
      >
        {selected.length === 0 ? (
          <span style={{ color: '#0c0c0b', fontSize: '0.87rem' }}>— Sans supplément —</span>
        ) : (
          selected.map(s => (
            <span key={s.id_etape} style={{
              background: 'rgba(201,162,88,0.13)',
              color: '#a07830',
              border: '1px solid rgba(201,162,88,0.32)',
              borderRadius: 20,
              padding: '0.15rem 0.5rem 0.15rem 0.65rem',
              fontSize: '0.72rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.28rem',
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'linear-gradient(135deg,#c9a258,#a07830)', display: 'inline-block', flexShrink: 0 }} />
              {s.nom_etape}
              <span
                onClick={e => { e.stopPropagation(); removeOne(s.id_etape) }}
                style={{ cursor: 'pointer', opacity: 0.55, fontSize: '0.72rem', lineHeight: 1 }}
              >✕</span>
            </span>
          ))
        )}

        {/* Arrow */}
        <span style={{
          position: 'absolute', right: '0.85rem', top: '50%',
          transform: `translateY(-50%) rotate(${open ? '180deg' : '0deg'})`,
          transition: 'transform 0.2s',
          color: '#c0bdb8', fontSize: '0.6rem', pointerEvents: 'none',
        }}>▼</span>
      </div>

      {/* ── Dropdown inline (liste roulante) ── */}
      {open && (
        <div style={{
          marginTop: 5,
          border: '1.5px solid #e8e4de',
          borderRadius: 10,
          background: '#faf8f5',
          overflow: 'hidden',
        }}>

  
          {/* Scrollable list */}
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {sortedFiltered.length === 0 ? (
              <div style={{ padding: '0.9rem', textAlign: 'center', color: '#c0bdb8', fontSize: '0.78rem' }}>
                Aucun supplément trouvé
              </div>
            ) : (
              sortedFiltered.map((supplement, idx) => {
                const isActive  = selectedIds.includes(supplement.id)
                const prevActive = idx > 0 && selectedIds.includes(sortedFiltered[idx - 1].id)
                const showDivider = hasGroups && !isActive && prevActive

                return (
                  <div key={supplement.id}>
                    {/* Separator between selected/unselected */}
                    {showDivider && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.25rem 0.75rem', background: '#f5f2ee',
                      }}>
                        <div style={{ flex: 1, height: 1, background: '#ece8e2' }} />
                        <span style={{ color: '#c0bdb8', fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>
                          Autres suppléments
                        </span>
                        <div style={{ flex: 1, height: 1, background: '#ece8e2' }} />
                      </div>
                    )}

                    <div
                      onClick={() => toggle(supplement)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                        padding: '0.55rem 0.85rem', cursor: 'pointer',
                        background: isActive ? 'rgba(201,162,88,0.06)' : 'transparent',
                        borderBottom: '1px solid #f5f2ee',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => {
                        if (!isActive) (e.currentTarget as HTMLDivElement).style.background = '#f0ede8'
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLDivElement).style.background =
                          isActive ? 'rgba(201,162,88,0.06)' : 'transparent'
                      }}
                    >
                     
                      {/* Name */}
                      <span style={{
                        flex: 1, fontSize: '0.84rem',
                        color: isActive ? '#1a1a2e' : '#4a4540',
                        fontWeight: isActive ? 600 : 500,
                      }}>
                        {supplement.nom}
                      </span>

                 
                    </div>
                  </div>
                )
              })
            )}
          </div>


 
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════
   CONFIRM DELETE
══════════════════════════════════════════ */
function ConfirmDelete({ name, onConfirm, onCancel }: {
  name: string; onConfirm: () => void; onCancel: () => void
}) {
  return (
    <>
      <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,20,0.6)', backdropFilter: 'blur(6px)', zIndex: 200 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'clamp(280px,88vw,380px)', background: '#fff', borderRadius: 16, boxShadow: '0 24px 70px rgba(0,0,0,0.22)', zIndex: 201, padding: '1.75rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🗑️</div>
        <div style={{ fontWeight: 700, color: '#1a1a2e', fontSize: '1rem', marginBottom: '0.4rem' }}>Supprimer le produit ?</div>
        <div style={{ color: '#9a9590', fontSize: '0.83rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          Le produit <strong style={{ color: '#1a1a2e' }}>«&nbsp;{name}&nbsp;»</strong> sera définitivement supprimé.
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button onClick={onCancel} style={{ flex: 1, background: 'none', border: '1.5px solid #e8e4de', borderRadius: 9, padding: '0.65rem', color: '#9a9590', fontFamily: 'Plus Jakarta Sans,sans-serif', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
          <button onClick={onConfirm} style={{ flex: 1, background: 'linear-gradient(135deg,#ef4444,#b91c1c)', border: 'none', borderRadius: 9, padding: '0.65rem', color: '#fff', fontFamily: 'Plus Jakarta Sans,sans-serif', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>Supprimer</button>
        </div>
      </div>
    </>
  )
}

/* ══════════════════════════════════════════
   MODAL FORMULAIRE PRODUIT
══════════════════════════════════════════ */
interface ModalProps {
  mode: 'create' | 'edit'
  initial?: Produit
  categories: Categorie[]
  etapes: Etape[]
  onClose: () => void
  onSaved: () => void
}

function ProduitModal({ mode, initial, categories, etapes, onClose, onSaved }: ModalProps) {
  const [name, setName]                   = useState(initial?.name ?? '')
  const [categoryId, setCategoryId]       = useState<string>(initial?.category_id?.toString() ?? '')
  const [price, setPrice]                 = useState<string>(initial?.price?.toString() ?? '')
  const [isAvailable, setIsAvailable]     = useState<boolean>(initial?.is_available ?? true)
  const [pointFidelite, setPointFidelite] = useState<string>(initial?.point_fidelite?.toString() ?? '0')
  const [selectedEtapes, setSelectedEtapes] = useState<IdEtape[]>(
    Array.isArray(initial?.id_etape) ? initial!.id_etape : []
  )
  const [file, setFile]       = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(
    initial?.image ? getImageUrl(initial.image) : null
  )
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const fileRef               = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f); setPreview(URL.createObjectURL(f))
  }

  const handleSubmit = async () => {
    if (!name.trim())        { setError('Le nom est obligatoire.');  return }
    if (!price || isNaN(Number(price)) || Number(price) < 0) { setError('Prix invalide.'); return }

    setLoading(true); setError(null)
    try {
      const formData = new FormData()
      formData.append('name',           name.trim())
      formData.append('price',          price)
      formData.append('is_available',   String(isAvailable))
      formData.append('point_fidelite', pointFidelite || '0')
      if (categoryId) formData.append('category_id', categoryId)
      formData.append('id_etape', JSON.stringify(selectedEtapes))
      if (file)             formData.append('image', file)
      else if (initial?.image) formData.append('image', initial.image)

      if (mode === 'create') {
        await axios.post(`${API_BASE_URL}/Produit/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      } else {
        await axios.put(`${API_BASE_URL}/Produit/${initial!.item_id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }
      onSaved(); onClose()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Une erreur est survenue.')
    } finally { setLoading(false) }
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.72rem', color: '#9a9590',
    textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '0.4rem',
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#faf8f5', border: '1.5px solid #e8e4de',
    borderRadius: 9, padding: '0.68rem 0.9rem', color: '#1a1a2e',
    fontFamily: 'Plus Jakarta Sans,sans-serif', fontSize: '0.87rem',
    outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box',
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,20,0.6)', backdropFilter: 'blur(6px)', zIndex: 200 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'clamp(320px,92vw,520px)', background: '#fff', borderRadius: 18, boxShadow: '0 32px 100px rgba(0,0,0,0.28)', zIndex: 201, overflow: 'hidden', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>

        {/* ── Header ── */}
        <div style={{ background: 'linear-gradient(135deg,#1a1a2e,#2a2a4e)', padding: '1.2rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#c9a258,#a07830)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>📦</div>
            <div>
              <div style={{ color: '#f5f0e8', fontWeight: 700, fontSize: '0.97rem' }}>
                {mode === 'create' ? 'Nouveau produit' : 'Modifier le produit'}
              </div>
              <div style={{ color: 'rgba(245,240,232,0.35)', fontSize: '0.68rem', marginTop: 1 }}>
                {mode === 'create' ? 'Remplir les informations' : `ID : ${initial?.item_id}`}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, width: 34, height: 34, color: 'rgba(245,240,232,0.5)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* ── Body scrollable ── */}
        <div style={{ padding: '1.4rem 1.5rem', overflowY: 'auto', flex: 1 }}>

          {/* Image upload */}
          <div style={{ marginBottom: '1.2rem' }}>
            <label style={labelStyle}>Image du produit</label>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
            {preview ? (
              <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1.5px solid #e8e4de' }}>
                <img src={preview} alt="aperçu" style={{ width: '100%', height: 150, objectFit: 'cover', display: 'block' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,0.45) 0%,transparent 55%)' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0.65rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.73rem', fontWeight: 600 }}>
                    {file ? `📎 ${file.name}` : '🌐 Image actuelle'}
                  </span>
                  <button onClick={() => fileRef.current?.click()} style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 7, padding: '0.28rem 0.7rem', color: '#fff', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}>🔄 Changer</button>
                </div>
              </div>
            ) : (
              <div onClick={() => fileRef.current?.click()}
                style={{ border: '2px dashed #e8e4de', borderRadius: 12, padding: '1.4rem 1rem', textAlign: 'center', cursor: 'pointer', background: '#faf8f5', transition: 'all 0.2s' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#c9a258'; el.style.background = 'rgba(201,162,88,0.03)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#e8e4de'; el.style.background = '#faf8f5' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>🖼️</div>
                <div style={{ fontSize: '0.83rem', color: '#5a5550', fontWeight: 600, marginBottom: '0.2rem' }}>Cliquer pour importer</div>
                <div style={{ fontSize: '0.71rem', color: '#b0aba5' }}>PNG, JPG, WEBP — max 5 MB</div>
              </div>
            )}
          </div>

          {/* Nom */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Nom du produit *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Pizza Margherita, Coca-Cola…"
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = '#c9a258')}
              onBlur={e => (e.target.style.borderColor = '#e8e4de')} />
          </div>

          {/* Catégorie */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Catégorie</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%239a9590' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.9rem center', paddingRight: '2.5rem' }}
              onFocus={e => (e.target.style.borderColor = '#c9a258')}
              onBlur={e => (e.target.style.borderColor = '#e8e4de')}>
              <option value="">— Sans catégorie —</option>
              {categories.map(c => (
                <option key={c.category_id} value={c.category_id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Suppléments — multi-sélection */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>
              Suppléments associés
              {selectedEtapes.length > 0 && (
                <span style={{ color: '#c9a258', fontWeight: 700, textTransform: 'none', letterSpacing: 0, marginLeft: 6 }}>
                  — {selectedEtapes.length} sélectionné{selectedEtapes.length > 1 ? 's' : ''}
                </span>
              )}
            </label>
            <SupplementSelector
              supplements={etapes}
              selected={selectedEtapes}
              onChange={setSelectedEtapes}
            />
          </div>

          {/* Prix + Points fidélité */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1rem' }}>
            <div>
              <label style={labelStyle}>Prix (€) *</label>
              <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00"
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = '#c9a258')}
                onBlur={e => (e.target.style.borderColor = '#e8e4de')} />
            </div>
            <div>
              <label style={labelStyle}>Points fidélité</label>
              <input type="number" min="0" value={pointFidelite} onChange={e => setPointFidelite(e.target.value)} placeholder="0"
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = '#c9a258')}
                onBlur={e => (e.target.style.borderColor = '#e8e4de')} />
            </div>
          </div>

          {/* Disponibilité */}
          <div style={{ marginBottom: '1.2rem' }}>
            <label style={labelStyle}>Disponibilité</label>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              {[true, false].map(val => (
                <button key={String(val)} onClick={() => setIsAvailable(val)}
                  style={{ flex: 1, padding: '0.65rem', borderRadius: 9, border: `1.5px solid ${isAvailable === val ? (val ? '#16a34a' : '#dc2626') : '#e8e4de'}`, background: isAvailable === val ? (val ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.07)') : '#faf8f5', color: isAvailable === val ? (val ? '#16a34a' : '#dc2626') : '#9a9590', fontWeight: 700, fontSize: '0.83rem', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'Plus Jakarta Sans,sans-serif' }}>
                  {val ? '✅ Disponible' : '❌ Indisponible'}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '0.6rem 0.85rem', color: '#dc2626', fontSize: '0.8rem', marginBottom: '1rem' }}>⚠️ {error}</div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button onClick={onClose} style={{ flex: 1, background: 'none', border: '1.5px solid #e8e4de', borderRadius: 9, padding: '0.68rem', color: '#9a9590', fontFamily: 'Plus Jakarta Sans,sans-serif', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
            <button onClick={handleSubmit} disabled={loading}
              style={{ flex: 2, background: loading ? '#d4b87a' : 'linear-gradient(135deg,#c9a258,#a07830)', border: 'none', borderRadius: 9, padding: '0.68rem', color: '#fff', fontFamily: 'Plus Jakarta Sans,sans-serif', fontSize: '0.85rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 3px 12px rgba(201,162,88,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
              {loading ? '⏳ Enregistrement…' : mode === 'create' ? '✚ Créer le produit' : '💾 Sauvegarder'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

/* ══════════════════════════════════════════
   MAIN PRODUIT
══════════════════════════════════════════ */
export default function Produit() {
  const [produits, setProduits]         = useState<Produit[]>([])
  const [categories, setCategories]     = useState<Categorie[]>([])
  const [etapes, setEtapes]             = useState<Supplement[]>([])
  const [loading, setLoading]           = useState(true)
  const [modal, setModal]               = useState<'create' | 'edit' | null>(null)
  const [editTarget, setEditTarget]     = useState<Produit | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Produit | null>(null)
  const [deletingId, setDeletingId]     = useState<number | null>(null)
  const [toast, setToast]               = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type }); setTimeout(() => setToast(null), 3200)
  }

  const fetchProduits = async () => {
    try {
      const r = await axios.get(`${API_BASE_URL}/Produit`)
      const d = r.data
      setProduits(Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [])
    } catch { showToast('Impossible de charger les produits.', 'error') }
    finally { setLoading(false) }
  }

  const fetchCategories = async () => {
    try {
      const r = await axios.get(`${API_BASE_URL}/Categorie`)
      const d = r.data
      setCategories(Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [])
    } catch { console.error('Impossible de charger les catégories') }
  }

  const fetchEtapes = async () => {
    try {
      const r = await axios.get(`${API_BASE_URL}/Supplement`)
      const d = r.data
      setEtapes(Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [])
    } catch { console.error('Impossible de charger les suppléments') }
  }

  useEffect(() => { fetchProduits(); fetchCategories(); fetchEtapes() }, [])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeletingId(deleteTarget.item_id)
    try {
      await axios.delete(`${API_BASE_URL}/Produit/${deleteTarget.item_id}`)
      showToast(`Produit «\u00a0${deleteTarget.name}\u00a0» supprimé.`, 'success')
      await fetchProduits()
    } catch { showToast('Échec de la suppression.', 'error') }
    finally { setDeletingId(null); setDeleteTarget(null) }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 220, color: '#c9a258', gap: '0.6rem', fontSize: '0.9rem' }}>
      <span style={{ animation: 'spin 0.9s linear infinite', display: 'inline-block', fontSize: '1.3rem' }}>⏳</span>
      Chargement des produits…
      <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <>
      <style>{`
        @keyframes spin    { to { transform:rotate(360deg) } }
        @keyframes fadeIn  { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
        .prod-row { transition: background 0.15s; animation: fadeIn 0.25s ease both; }
        .prod-row:hover { background: #faf8f5 !important; }
        .prod-img-thumb { transition: transform 0.3s ease; }
        .prod-row:hover .prod-img-thumb { transform: scale(1.08); }
      `}</style>

      {modal === 'create' && (
        <ProduitModal mode="create" categories={categories} etapes={etapes}
          onClose={() => setModal(null)}
          onSaved={() => { fetchProduits(); showToast('Produit créé avec succès !', 'success') }} />
      )}
      {modal === 'edit' && editTarget && (
        <ProduitModal mode="edit" initial={editTarget} categories={categories} etapes={etapes}
          onClose={() => { setModal(null); setEditTarget(null) }}
          onSaved={() => { fetchProduits(); showToast('Produit mis à jour !', 'success') }} />
      )}
      {deleteTarget && (
        <ConfirmDelete name={deleteTarget.name} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="card">
        <div className="table-header">
          <div>
            <div className="section-title">Produits</div>
            <div className="section-sub">{produits.length} article{produits.length !== 1 ? 's' : ''} dans le menu</div>
          </div>
          <button className="add-btn" onClick={() => setModal('create')}>+ Ajouter un produit</button>
        </div>

        {produits.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', border: '1.5px dashed #e8e4de', borderRadius: 12 }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📦</div>
            <div style={{ color: '#5a5550', fontWeight: 700, marginBottom: '0.4rem' }}>Aucun produit</div>
            <div style={{ color: '#b0aba5', fontSize: '0.83rem', marginBottom: '1.25rem' }}>Commencez par ajouter votre premier produit.</div>
            <button className="add-btn" onClick={() => setModal('create')}>+ Ajouter un produit</button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', minWidth: 780 }}>
              <thead>
                <tr>
                  {['Image', 'Produit', 'Catégorie', 'Suppléments', 'Prix (€)', 'Points', 'Disponibilité', 'Actions'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: '#b0aba5', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1.5px solid #f0ede8', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {produits.map((p, idx) => {
                  const imgUrl   = getImageUrl(p.image)
                  const etapeArr = Array.isArray(p.id_etape) ? p.id_etape : []
                  return (
                    <tr key={p.item_id} className="prod-row"
                      style={{ opacity: deletingId === p.item_id ? 0.4 : 1, animationDelay: `${idx * 0.03}s` }}>

                      {/* Image */}
                      <td style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid #faf8f5', width: 54 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 9, overflow: 'hidden', background: 'linear-gradient(135deg,rgba(201,162,88,0.1),rgba(201,162,88,0.04))', border: '1px solid rgba(201,162,88,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {imgUrl ? (
                            <img className="prod-img-thumb" src={imgUrl} alt={p.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                          ) : <span style={{ fontSize: '1.3rem', opacity: 0.5 }}>📦</span>}
                        </div>
                      </td>

                      {/* Nom */}
                      <td style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid #faf8f5' }}>
                        <div style={{ color: '#1a1a2e', fontWeight: 600, fontSize: '0.88rem' }}>{p.name}</div>
                      </td>

                      {/* Catégorie */}
                      <td style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid #faf8f5' }}>
                        {p.category_name ? (
                          <span style={{ background: 'rgba(37,99,235,0.08)', color: '#2563eb', border: '1px solid rgba(37,99,235,0.18)', borderRadius: 20, padding: '0.18rem 0.65rem', fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {p.category_name}
                          </span>
                        ) : <span style={{ color: '#c0bdb8', fontSize: '0.78rem' }}>—</span>}
                      </td>

                      {/* Suppléments — chips depuis JSONB array */}
                      <td style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid #faf8f5', maxWidth: 260 }}>
                        {etapeArr.length === 0 ? (
                          <span style={{ color: '#c0bdb8', fontSize: '0.78rem' }}>—</span>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                            {etapeArr.slice(0, 2).map(e => (
                              <span key={e.id_etape} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.28rem', background: 'rgba(201,162,88,0.09)', color: '#a07830', border: '1px solid rgba(201,162,88,0.25)', borderRadius: 20, padding: '0.15rem 0.6rem', fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'linear-gradient(135deg,#c9a258,#a07830)', display: 'inline-block' }} />
                                {e.nom_etape}
                              </span>
                            ))}
                            {etapeArr.length > 2 && (
                              <span style={{ background: 'rgba(201,162,88,0.1)', color: '#a07830', border: '1px solid rgba(201,162,88,0.22)', borderRadius: 20, padding: '0.15rem 0.6rem', fontSize: '0.7rem', fontWeight: 700 }}>
                                +{etapeArr.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Prix */}
                      <td style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid #faf8f5' }}>
                        <span style={{ color: '#c9a258', fontWeight: 700, fontSize: '0.92rem' }}>{Number(p.price).toLocaleString('fr-DZ')}</span>
                        <span style={{ color: '#c0bdb8', fontSize: '0.7rem', marginLeft: 3 }}>€</span>
                      </td>

                      {/* Points */}
                      <td style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid #faf8f5' }}>
                        <span style={{ background: 'rgba(201,162,88,0.1)', color: '#a07830', border: '1px solid rgba(201,162,88,0.2)', borderRadius: 20, padding: '0.18rem 0.6rem', fontSize: '0.72rem', fontWeight: 600 }}>
                          ⭐ {p.point_fidelite ?? 0} pts
                        </span>
                      </td>

                      {/* Disponibilité */}
                      <td style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid #faf8f5' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: p.is_available ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.07)', color: p.is_available ? '#16a34a' : '#dc2626', border: `1px solid ${p.is_available ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)'}`, borderRadius: 20, padding: '0.18rem 0.65rem', fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: p.is_available ? '#16a34a' : '#dc2626', display: 'inline-block' }} />
                          {p.is_available ? 'Disponible' : 'Indisponible'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid #faf8f5' }}>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button
                            onClick={() => { setEditTarget(p); setModal('edit') }}
                            style={{ background: 'none', border: '1px solid #e8e4de', borderRadius: 7, padding: '0.3rem 0.6rem', color: '#9a9590', fontSize: '0.73rem', cursor: 'pointer', transition: 'all 0.15s', fontWeight: 500 }}
                            onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = '#c9a258'; b.style.color = '#c9a258' }}
                            onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = '#e8e4de'; b.style.color = '#9a9590' }}>
                            ✏️
                          </button>
                          <button
                            onClick={() => setDeleteTarget(p)}
                            style={{ background: 'none', border: '1px solid #fca5a5', borderRadius: 7, padding: '0.3rem 0.55rem', color: '#dc2626', fontSize: '0.73rem', cursor: 'pointer', transition: 'background 0.15s' }}
                            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = '#fef2f2')}
                            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'none')}>
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}