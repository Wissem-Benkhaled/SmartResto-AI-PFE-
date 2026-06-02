'use client'
import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { API_BASE_URL } from './Types'
import { Toast } from './UI'

/* ══════════════════════════════════════════
   TYPES
══════════════════════════════════════════ */
interface Item {
  item_id: number
  name: string
  price: number
}

// Stored in JSONB column: { id, nom_produit }
interface IdsItem {
  id: number
  nom_produit: string
}

interface Supplement {
  id: number
  nom: string
  obligatoire: boolean
  ids_items: IdsItem[]
}

/* ══════════════════════════════════════════
   ITEM SELECTOR  (dropdown style)
══════════════════════════════════════════ */
function ItemSelector({
  allItems,
  selected,       // IdsItem[]
  onChange,
}: {
  allItems: Item[]
  selected: IdsItem[]
  onChange: (items: IdsItem[]) => void
}) {
  const [open, setOpen]     = useState(false)
  const [search, setSearch] = useState('')
  const wrapRef             = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectedIds = selected.map(s => s.id)

  const toggle = (item: Item) => {
    if (selectedIds.includes(item.item_id)) {
      onChange(selected.filter(s => s.id !== item.item_id))
    } else {
      onChange([...selected, { id: item.item_id, nom_produit: item.name }])
    }
  }

  const removeOne = (id: number) => onChange(selected.filter(s => s.id !== id))

  const filtered = allItems.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  )
  // Selected pinned to top
  const sortedFiltered = [
    ...filtered.filter(i => selectedIds.includes(i.item_id)),
    ...filtered.filter(i => !selectedIds.includes(i.item_id)),
  ]
  const hasGroups =
    filtered.some(i => selectedIds.includes(i.item_id)) &&
    filtered.some(i => !selectedIds.includes(i.item_id))

  return (
    <div ref={wrapRef} style={{ position: 'relative', color: '#1a1a2e' }}>

      {/* ── Trigger box ── */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          border: `1.5px solid ${open ? '#c9a258' : '#e8e4de'}`,
          borderRadius: 10,
          background: '#faf8f5',
          padding: selected.length === 0 ? '0.68rem 0.9rem' : '0.45rem 0.75rem',
          cursor: 'pointer',
          minHeight: 42,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.35rem',
          transition: 'border-color 0.15s',
          userSelect: 'none',
        }}
      >
        {selected.length === 0 ? (
          <span style={{ color: '#b0aba5', fontSize: '0.87rem' }}>Choisir des items…</span>
        ) : (
          selected.map(s => (
            <span key={s.id} style={{
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
              {s.nom_produit}
              <span
                onClick={e => { e.stopPropagation(); removeOne(s.id) }}
                style={{ cursor: 'pointer', opacity: 0.55, fontSize: '0.72rem', lineHeight: 1 }}
              >✕</span>
            </span>
          ))
        )}
        {/* Arrow */}
        <span style={{
          marginLeft: 'auto', color: '#c0bdb8', fontSize: '0.6rem',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
          flexShrink: 0,
        }}>▼</span>
      </div>

      {/* ── Dropdown ── */}
      {open && (
        <div style={{
          marginTop: 6,
          border: '1.5px solid #e8e4de',
          borderRadius: 10,
          background: '#faf8f5',
          overflow: 'hidden',
        }}>

          {/* Search */}
          <div style={{
            padding: '0.5rem 0.75rem',
            borderBottom: '1px solid #f0ede8',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}>
   
            {selected.length > 0 && (
              <span style={{
                background: 'linear-gradient(135deg,#c9a258,#a07830)',
                color: '#fff', borderRadius: 20, padding: '0.1rem 0.55rem',
                fontSize: '0.65rem', fontWeight: 700, flexShrink: 0,
              }}>
                {selected.length} sélectionné{selected.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {sortedFiltered.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#c0bdb8', fontSize: '0.8rem' }}>
                Aucun item trouvé
              </div>
            ) : (
              sortedFiltered.map((item, idx) => {
                const isSel = selectedIds.includes(item.item_id)
                const prevIsSel = idx > 0 && selectedIds.includes(sortedFiltered[idx - 1].item_id)
                const showDivider = hasGroups && !isSel && prevIsSel
                const showDividerEl = showDivider && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.25rem 0.75rem', background: '#faf8f5',
                  }}>
                    <div style={{ flex: 1, height: 1, background: '#ece8e2' }} />
                    <span style={{ color: '#c0bdb8', fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>
                      Autres items
                    </span>
                    <div style={{ flex: 1, height: 1, background: '#ece8e2' }} />
                  </div>
                )

                return (
                  <div key={item.item_id}>
                    {showDividerEl}
                    <div
                      onClick={() => toggle(item)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.65rem',
                        padding: '0.55rem 0.75rem', cursor: 'pointer',
                        background: isSel ? 'rgba(201,162,88,0.06)' : 'transparent',
                        borderBottom: '1px solid #f5f2ee',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => {
                        if (!isSel) (e.currentTarget as HTMLDivElement).style.background = '#f5f2ee'
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLDivElement).style.background =
                          isSel ? 'rgba(201,162,88,0.06)' : 'transparent'
                      }}
                    >
                      {/* Checkbox */}
                      <div style={{
                        width: 17, height: 17, borderRadius: 4, flexShrink: 0,
                        border: `1.5px solid ${isSel ? '#c9a258' : '#d4cfc8'}`,
                        background: isSel ? 'linear-gradient(135deg,#c9a258,#a07830)' : '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}>
                        {isSel && (
                          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                            <path d="M1 3.5l2 2L8 1" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span style={{
                        flex: 1, fontSize: '0.84rem',
                        color: isSel ? '#1a1a2e' : '#4a4540',
                        fontWeight: isSel ? 600 : 500,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {item.name}
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
        <div style={{ fontWeight: 700, color: '#1a1a2e', fontSize: '1rem', marginBottom: '0.4rem' }}>Supprimer le supplément ?</div>
        <div style={{ color: '#9a9590', fontSize: '0.83rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          Le supplément <strong style={{ color: '#1a1a2e' }}>«&nbsp;{name}&nbsp;»</strong> sera définitivement supprimé.
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
   MODAL FORMULAIRE SUPPLÉMENT
══════════════════════════════════════════ */
interface ModalProps {
  mode: 'create' | 'edit'
  initial?: Supplement
  allItems: Item[]
  onClose: () => void
  onSaved: () => void
}

function SupplementModal({ mode, initial, allItems, onClose, onSaved }: ModalProps) {
  const [nom, setNom]                     = useState(initial?.nom ?? '')
  const [selectedItems, setSelectedItems] = useState<IdsItem[]>(
    initial?.ids_items ?? []
  )
  const [obligatoire, setObligatoire]     = useState<boolean>(initial?.obligatoire ?? false)
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!nom.trim())                { setError('Le nom est obligatoire.'); return }
    if (selectedItems.length === 0) { setError('Sélectionnez au moins un item.'); return }

    setLoading(true); setError(null)
    try {
      const payload = {
        nom: nom.trim(),
        obligatoire,
        ids_items: selectedItems,   // [{ id, nom_produit }]
      }
      console.log("🚀 ~ handleSubmit ~ payload:", payload)
      if (mode === 'create') {
        await axios.post(`${API_BASE_URL}/Supplement`, payload)
      } else {
        await axios.put(`${API_BASE_URL}/Supplement/${initial!.id}`, payload)
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
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'clamp(320px,92vw,500px)', background: '#fff', borderRadius: 18, boxShadow: '0 32px 100px rgba(0,0,0,0.28)', zIndex: 201, overflow: 'hidden', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>

        {/* ── Header ── */}
        <div style={{ background: 'linear-gradient(135deg,#1a1a2e,#2a2a4e)', padding: '1.2rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#c9a258,#a07830)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}></div>
            <div>
              <div style={{ color: '#f5f0e8', fontWeight: 700, fontSize: '0.97rem' }}>
                {mode === 'create' ? 'Nouveau supplément' : 'Modifier le supplément'}
              </div>
              <div style={{ color: 'rgba(245,240,232,0.35)', fontSize: '0.68rem', marginTop: 1 }}>
                {mode === 'create' ? 'Remplir les informations' : `ID : ${initial?.id}`}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, width: 34, height: 34, color: 'rgba(245,240,232,0.5)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '1.4rem 1.5rem', overflowY: 'auto', flex: 1 }}>

          {/* Nom */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Nom du supplément *</label>
            <input
              value={nom} onChange={e => setNom(e.target.value)}
              placeholder="Ex : Fromage, Boissons…"
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = '#c9a258')}
              onBlur={e => (e.target.style.borderColor = '#e8e4de')}
            />
          </div>

          {/* Items */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>
              Items associés *
              {selectedItems.length > 0 && (
                <span style={{ color: '#c9a258', fontWeight: 700, textTransform: 'none', letterSpacing: 0, marginLeft: 6 }}>
                  — {selectedItems.length} sélectionné{selectedItems.length > 1 ? 's' : ''}
                </span>
              )}
            </label>
            <ItemSelector
              allItems={allItems}
              selected={selectedItems}
              onChange={setSelectedItems}
            />
          </div>

          {/* Obligatoire */}
          <div style={{ marginBottom: '1.4rem' }}>
            <label style={labelStyle}>Obligatoire</label>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              {[true, false].map(val => (
                <button key={String(val)} onClick={() => setObligatoire(val)}
                  style={{
                    flex: 1, padding: '0.65rem', borderRadius: 9,
                    border: `1.5px solid ${obligatoire === val ? (val ? '#16a34a' : '#64748b') : '#e8e4de'}`,
                    background: obligatoire === val ? (val ? 'rgba(22,163,74,0.08)' : 'rgba(100,116,139,0.07)') : '#faf8f5',
                    color: obligatoire === val ? (val ? '#16a34a' : '#475569') : '#9a9590',
                    fontWeight: 700, fontSize: '0.83rem', cursor: 'pointer',
                    transition: 'all 0.15s', fontFamily: 'Plus Jakarta Sans,sans-serif',
                  }}>
                  {val ? '✅ Oui' : '⬜ Non'}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '0.6rem 0.85rem', color: '#dc2626', fontSize: '0.8rem', marginBottom: '1rem' }}>
              ⚠️ {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button onClick={onClose} style={{ flex: 1, background: 'none', border: '1.5px solid #e8e4de', borderRadius: 9, padding: '0.68rem', color: '#9a9590', fontFamily: 'Plus Jakarta Sans,sans-serif', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
            <button onClick={handleSubmit} disabled={loading}
              style={{ flex: 2, background: loading ? '#d4b87a' : 'linear-gradient(135deg,#c9a258,#a07830)', border: 'none', borderRadius: 9, padding: '0.68rem', color: '#fff', fontFamily: 'Plus Jakarta Sans,sans-serif', fontSize: '0.85rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 3px 12px rgba(201,162,88,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
              {loading ? '⏳ Enregistrement…' : mode === 'create' ? "✚ Créer le supplément" : '💾 Sauvegarder'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

/* ══════════════════════════════════════════
   MAIN SUPPLEMENT
══════════════════════════════════════════ */
export default function Supplement() {
  const [supplements, setSupplements]   = useState<Supplement[]>([])
  const [allItems, setAllItems]         = useState<Item[]>([])
  const [loading, setLoading]           = useState(true)
  const [modal, setModal]               = useState<'create' | 'edit' | null>(null)
  const [editTarget, setEditTarget]     = useState<Supplement | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Supplement | null>(null)
  const [deletingId, setDeletingId]     = useState<number | null>(null)
  const [toast, setToast]               = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type }); setTimeout(() => setToast(null), 3200)
  }

  const fetchSupplements = async () => {
    try {
      const r = await axios.get(`${API_BASE_URL}/Supplement`)
      const d = r.data
      setSupplements(Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [])
    } catch {
      showToast('Impossible de charger les suppléments.', 'error')
    } finally { setLoading(false) }
  }

  const fetchItems = async () => {
    try {
      const r = await axios.get(`${API_BASE_URL}/Produit`)
      const d = r.data
      setAllItems(Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [])
    } catch { console.error('Impossible de charger les items') }
  }

  useEffect(() => { fetchSupplements(); fetchItems() }, [])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeletingId(deleteTarget.id)
    try {
      await axios.delete(`${API_BASE_URL}/Supplement/${deleteTarget.id}`)
      showToast(`Supplément «\u00a0${deleteTarget.nom}\u00a0» supprimé.`, 'success')
      await fetchSupplements()
    } catch { showToast('Échec de la suppression.', 'error') }
    finally { setDeletingId(null); setDeleteTarget(null) }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 220, color: '#c9a258', gap: '0.6rem', fontSize: '0.9rem' }}>
      <span style={{ animation: 'spin 0.9s linear infinite', display: 'inline-block', fontSize: '1.3rem' }}>⏳</span>
      Chargement des suppléments…
    </div>
  )

  return (
    <>
      <style>{`
        @keyframes spin   { to { transform:rotate(360deg) } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
        .supplement-row { transition: background 0.15s; animation: fadeIn 0.25s ease both; }
        .supplement-row:hover { background: #faf8f5 !important; }
      `}</style>

      {modal === 'create' && (
        <SupplementModal mode="create" allItems={allItems}
          onClose={() => setModal(null)}
          onSaved={() => { fetchSupplements(); showToast("Supplément créé avec succès !", 'success') }} />
      )}
      {modal === 'edit' && editTarget && (
        <SupplementModal mode="edit" initial={editTarget} allItems={allItems}
          onClose={() => { setModal(null); setEditTarget(null) }}
          onSaved={() => { fetchSupplements(); showToast('Supplément mis à jour !', 'success') }} />
      )}
      {deleteTarget && (
        <ConfirmDelete name={deleteTarget.nom} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="card">
        {/* ── Header ── */}
        <div className="table-header">
          <div>
            <div className="section-title">Suppléments</div>
            <div className="section-sub">
              {supplements.length} supplément{supplements.length !== 1 ? 's' : ''} configuré{supplements.length !== 1 ? 's' : ''}
            </div>
          </div>
          <button className="add-btn" onClick={() => setModal('create')}>+ Ajouter un supplément</button>
        </div>

        {/* ── Empty state ── */}
        {supplements.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', border: '1.5px dashed #e8e4de', borderRadius: 12 }}>
            <div style={{ color: '#5a5550', fontWeight: 700, marginBottom: '0.4rem' }}>Aucun supplément</div>
            <div style={{ color: '#b0aba5', fontSize: '0.83rem', marginBottom: '1.25rem' }}>
              Commencez par ajouter votre premier supplément de commande.
            </div>
            <button className="add-btn" onClick={() => setModal('create')}>+ Ajouter un supplément</button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', minWidth: 620 }}>
              <thead>
                <tr>
                  {['#', "Nom du supplément", 'Items associés', 'Obligatoire', 'Actions'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: '#b0aba5', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1.5px solid #f0ede8', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {supplements.map((e, idx) => (
                  <tr key={e.id} className="supplement-row"
                    style={{ opacity: deletingId === e.id ? 0.4 : 1, animationDelay: `${idx * 0.03}s` }}>

                    {/* ID */}
                    <td style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid #faf8f5', width: 40 }}>
                      <span style={{ color: '#c0bdb8', fontSize: '0.78rem', fontWeight: 600 }}>#{e.id}</span>
                    </td>

                    {/* Nom */}
                    <td style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid #faf8f5' }}>
                      <span style={{ color: '#1a1a2e', fontWeight: 600, fontSize: '0.88rem' }}>{e.nom}</span>
                    </td>

                    {/* Items — chips from ids_items JSONB */}
                    <td style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid #faf8f5', maxWidth: 300 }}>
                      {!e.ids_items || e.ids_items.length === 0 ? (
                        <span style={{ color: '#c0bdb8', fontSize: '0.78rem' }}>—</span>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                          {e.ids_items.slice(0, 3).map(item => (
                            <span key={item.id} style={{ background: 'rgba(37,99,235,0.07)', color: '#2563eb', border: '1px solid rgba(37,99,235,0.16)', borderRadius: 20, padding: '0.15rem 0.6rem', fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                              {item.nom_produit}
                            </span>
                          ))}
                          {e.ids_items.length > 3 && (
                            <span style={{ background: 'rgba(201,162,88,0.1)', color: '#a07830', border: '1px solid rgba(201,162,88,0.22)', borderRadius: 20, padding: '0.15rem 0.6rem', fontSize: '0.7rem', fontWeight: 700 }}>
                              +{e.ids_items.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Obligatoire */}
                    <td style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid #faf8f5' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: e.obligatoire ? 'rgba(22,163,74,0.08)' : 'rgba(100,116,139,0.07)', color: e.obligatoire ? '#16a34a' : '#64748b', border: `1px solid ${e.obligatoire ? 'rgba(22,163,74,0.2)' : 'rgba(100,116,139,0.2)'}`, borderRadius: 20, padding: '0.18rem 0.65rem', fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: e.obligatoire ? '#16a34a' : '#94a3b8', display: 'inline-block' }} />
                        {e.obligatoire ? 'Obligatoire' : 'Optionnel'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid #faf8f5' }}>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          onClick={() => { setEditTarget(e); setModal('edit') }}
                          style={{ background: 'none', border: '1px solid #e8e4de', borderRadius: 7, padding: '0.3rem 0.6rem', color: '#9a9590', fontSize: '0.73rem', cursor: 'pointer', transition: 'all 0.15s', fontWeight: 500 }}
                          onMouseEnter={ev => { const b = ev.currentTarget as HTMLButtonElement; b.style.borderColor = '#c9a258'; b.style.color = '#c9a258' }}
                          onMouseLeave={ev => { const b = ev.currentTarget as HTMLButtonElement; b.style.borderColor = '#e8e4de'; b.style.color = '#9a9590' }}>
                          ✏️
                        </button>
                        <button
                          onClick={() => setDeleteTarget(e)}
                          style={{ background: 'none', border: '1px solid #fca5a5', borderRadius: 7, padding: '0.3rem 0.55rem', color: '#dc2626', fontSize: '0.73rem', cursor: 'pointer', transition: 'background 0.15s' }}
                          onMouseEnter={ev => ((ev.currentTarget as HTMLButtonElement).style.background = '#fef2f2')}
                          onMouseLeave={ev => ((ev.currentTarget as HTMLButtonElement).style.background = 'none')}>
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
