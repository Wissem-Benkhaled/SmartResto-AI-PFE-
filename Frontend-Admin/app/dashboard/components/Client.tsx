'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { API_BASE_URL } from './Types'
import { Toast } from './UI'

/* ══════════════════════════════════════════
   TYPES
══════════════════════════════════════════ */
interface Client {
  client_id: number
  nom: string
  prenom :string
  numero: string
  num_fid: string
  point_fid: number
  email: string
}

/* ══════════════════════════════════════════
   CONFIRM DELETE
══════════════════════════════════════════ */
function ConfirmDelete({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <>
      <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,20,0.6)', backdropFilter: 'blur(6px)', zIndex: 200 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'clamp(280px,88vw,380px)', background: '#fff', borderRadius: 16, boxShadow: '0 24px 70px rgba(0,0,0,0.22)', zIndex: 201, padding: '1.75rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🗑️</div>
        <div style={{ fontWeight: 700, color: '#1a1a2e', fontSize: '1rem', marginBottom: '0.4rem' }}>Supprimer le client ?</div>
        <div style={{ color: '#9a9590', fontSize: '0.83rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          Le client <strong style={{ color: '#1a1a2e' }}>«&nbsp;{name}&nbsp;»</strong> sera définitivement supprimé.
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
   MODAL FORMULAIRE CLIENT
══════════════════════════════════════════ */
interface ModalProps {
  mode: 'create' | 'edit'
  initial?: Client
  onClose: () => void
  onSaved: () => void
}

function ClientModal({ mode, initial, onClose, onSaved }: ModalProps) {
  const [nom,      setNom]      = useState(initial?.nom     ?? '')
  const [prenom,      setprenom]      = useState(initial?.prenom     ?? '')

  const [numero,   setNumero]   = useState(initial?.numero  ?? '')
  const [email,    setEmail]    = useState(initial?.email   ?? '')
  const [pointFid, setPointFid] = useState(initial?.point_fid?.toString() ?? '0')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!nom.trim())    { setError('Le nom est obligatoire.');    return }
    if (!prenom.trim())    { setError('Le prenom est obligatoire.');    return }
    if (!numero.trim()) { setError('Le numéro est obligatoire.'); return }
    if (!email.trim())  { setError("L'email est obligatoire.");   return }

    setLoading(true); setError(null)
    try {
      if (mode === 'create') {
        // ✅ num_fid généré côté backend (13 chiffres uniques)
        await axios.post(`${API_BASE_URL}/Client`, {
          nom: nom.trim(),
          prenom :prenom.trim(),
          numero: numero.trim(),
          email: email.trim(),
          point_fid: Number(pointFid) || 0,
        })
      } else {
        // num_fid non modifié lors d'un edit
        await axios.put(`${API_BASE_URL}/Client/${initial!.client_id}`, {
          nom: nom.trim(),
           prenom :prenom.trim(),

          numero: numero.trim(),
          email: email.trim(),
          point_fid: Number(pointFid) || 0,
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
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => (e.target.style.borderColor = '#c9a258')
  const onBlur  = (e: React.FocusEvent<HTMLInputElement>) => (e.target.style.borderColor = '#e8e4de')

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,20,0.6)', backdropFilter: 'blur(6px)', zIndex: 200 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'clamp(320px,92vw,480px)', background: '#fff', borderRadius: 18, boxShadow: '0 32px 100px rgba(0,0,0,0.28)', zIndex: 201, overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#1a1a2e,#2a2a4e)', padding: '1.2rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#c9a258,#a07830)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>🧑‍💼</div>
            <div>
              <div style={{ color: '#f5f0e8', fontWeight: 700, fontSize: '0.97rem' }}>
                {mode === 'create' ? 'Nouveau client' : 'Modifier le client'}
              </div>
              <div style={{ color: 'rgba(245,240,232,0.35)', fontSize: '0.68rem', marginTop: 1 }}>
                {mode === 'create' ? 'N° fidélité auto-généré (13 chiffres)' : `ID : ${initial?.client_id} — N° fid : ${initial?.num_fid}`}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, width: 34, height: 34, color: 'rgba(245,240,232,0.5)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.4rem 1.5rem' }}>

          {/* Nom */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Nom </label>
            <input value={nom} onChange={e => setNom(e.target.value)} placeholder="votre Nom"
              style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
          </div>
           <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Prenom </label>
            <input value={prenom} onChange={e => setprenom(e.target.value)} placeholder="votre Prenom"
              style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
          </div>


          {/* Numéro téléphone */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Numéro de téléphone *</label>
            <input value={numero} onChange={e => setNumero(e.target.value)} placeholder="Ex: 0555123456"
              style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
          </div>

          {/* Email */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Email *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Ex: ali@email.com"
              style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
          </div>

          {/* Points fidélité + info num_fid */}
          {mode != 'create' && ( 
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1.2rem' }}>
            <div>
              <label style={labelStyle}>Points fidélité</label>
              <input type="number" min="0" value={pointFid} onChange={e => setPointFid(e.target.value)}
               placeholder="0" style={inputStyle} onFocus={onFocus} onBlur={onBlur} /> 
            </div>
         
          </div>
          )}

        

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '0.6rem 0.85rem', color: '#dc2626', fontSize: '0.8rem', marginBottom: '1rem' }}>⚠️ {error}</div>
          )}

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button onClick={onClose} style={{ flex: 1, background: 'none', border: '1.5px solid #e8e4de', borderRadius: 9, padding: '0.68rem', color: '#9a9590', fontFamily: 'Plus Jakarta Sans,sans-serif', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
            <button onClick={handleSubmit} disabled={loading}
              style={{ flex: 2, background: loading ? '#d4b87a' : 'linear-gradient(135deg,#c9a258,#a07830)', border: 'none', borderRadius: 9, padding: '0.68rem', color: '#fff', fontFamily: 'Plus Jakarta Sans,sans-serif', fontSize: '0.85rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 3px 12px rgba(201,162,88,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
              {loading ? '⏳ Enregistrement…' : mode === 'create' ? '✚ Créer le client' : '💾 Sauvegarder'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

/* ══════════════════════════════════════════
   MAIN CLIENT
══════════════════════════════════════════ */
export default function Client() {
  const [clients, setClients]           = useState<Client[]>([])
  const [loading, setLoading]           = useState(true)
  const [modal, setModal]               = useState<'create' | 'edit' | null>(null)
  const [editTarget, setEditTarget]     = useState<Client | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null)
  const [deletingId, setDeletingId]     = useState<number | null>(null)
  const [toast, setToast]               = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [search, setSearch]             = useState('')

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type }); setTimeout(() => setToast(null), 3200)
  }

  const fetchClients = async () => {
    try {
      const r = await axios.get(`${API_BASE_URL}/Client`)
      const d = r.data
      setClients(Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [])
    } catch { showToast('Impossible de charger les clients.', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchClients() }, [])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeletingId(deleteTarget.client_id)
    try {
      await axios.delete(`${API_BASE_URL}/Client/${deleteTarget.client_id}`)
      showToast(`Client «\u00a0${deleteTarget.nom}\u00a0» supprimé.`, 'success')
      await fetchClients()
    } catch { showToast('Échec de la suppression.', 'error') }
    finally { setDeletingId(null); setDeleteTarget(null) }
  }

  const avatar = (nom: string) => nom?.trim().substring(0, 2).toUpperCase() || 'CL'

  const filtered = clients.filter(c =>
    c.nom?.toLowerCase().includes(search.toLowerCase()) ||
    c.prenom?.toLowerCase().includes(search.toLowerCase()) ||
    c.numero?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.num_fid?.includes(search)
  )

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 220, color: '#c9a258', gap: '0.6rem', fontSize: '0.9rem' }}>
      <span style={{ animation: 'spin 0.9s linear infinite', display: 'inline-block', fontSize: '1.3rem' }}>⏳</span>
      Chargement des clients…
      <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <>
      <style>{`
        @keyframes spin   { to { transform:rotate(360deg) } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
        .cli-row { transition:background 0.15s; animation:fadeIn 0.25s ease both; }
        .cli-row:hover { background:#faf8f5 !important; }
      `}</style>

      {modal === 'create' && (
        <ClientModal mode="create" onClose={() => setModal(null)}
          onSaved={() => { fetchClients(); showToast('Client créé avec succès !', 'success') }} />
      )}
      {modal === 'edit' && editTarget && (
        <ClientModal mode="edit" initial={editTarget}
          onClose={() => { setModal(null); setEditTarget(null) }}
          onSaved={() => { fetchClients(); showToast('Client mis à jour !', 'success') }} />
      )}
      {deleteTarget && (
        <ConfirmDelete name={deleteTarget.nom} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="card">
        <div className="table-header">
          <div>
            <div className="section-title">Clients</div>
            <div className="section-sub">{clients.length} client{clients.length !== 1 ? 's' : ''} enregistré{clients.length !== 1 ? 's' : ''}</div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Rechercher…"
              style={{ background: '#faf8f5', border: '1.5px solid #e8e4de', borderRadius: 8, padding: '0.5rem 0.9rem', fontSize: '0.82rem', color: '#1a1a2e', outline: 'none', width: 200, transition: 'border-color 0.15s' }}
              onFocus={e => (e.target.style.borderColor = '#c9a258')}
              onBlur={e => (e.target.style.borderColor = '#e8e4de')}
            />
            <button className="add-btn" onClick={() => setModal('create')}>+ Ajouter un client</button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', border: '1.5px dashed #e8e4de', borderRadius: 12 }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🧑‍💼</div>
            <div style={{ color: '#5a5550', fontWeight: 700, marginBottom: '0.4rem' }}>{search ? 'Aucun résultat' : 'Aucun client'}</div>
            <div style={{ color: '#b0aba5', fontSize: '0.83rem', marginBottom: '1.25rem' }}>{search ? 'Essayez un autre terme.' : 'Commencez par ajouter votre premier client.'}</div>
            {!search && <button className="add-btn" onClick={() => setModal('create')}>+ Ajouter un client</button>}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', minWidth: 680 }}>
              <thead>
                <tr>
                  {['Client', 'Téléphone', 'Email', 'N° Fidélité', 'Points', 'Actions'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: '#b0aba5', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1.5px solid #f0ede8', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, idx) => (
                  <tr key={c.client_id} className="cli-row"
                    style={{ opacity: deletingId === c.client_id ? 0.4 : 1, animationDelay: `${idx * 0.03}s` }}>

                    <td style={{ padding: '0.7rem 0.75rem', borderBottom: '1px solid #faf8f5', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#c9a258,#a07830)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a1a2e', fontWeight: 700, fontSize: '0.78rem', flexShrink: 0 }}>
                          {avatar(c.nom)}
                        </div>
                        <div>
                          <div style={{ color: '#1a1a2e', fontWeight: 600, fontSize: '0.88rem' }}>{c.prenom || 'Client inconnu'} {c.nom || 'Client inconnu'} </div>
                        
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '0.7rem 0.75rem', borderBottom: '1px solid #faf8f5', color: '#5a5550', fontSize: '0.84rem' }}>
                      {c.numero || '—'}
                    </td>

                    <td style={{ padding: '0.7rem 0.75rem', borderBottom: '1px solid #faf8f5', color: '#9a9590', fontSize: '0.78rem' }}>
                      {c.email || '—'}
                    </td>

                    <td style={{ padding: '0.7rem 0.75rem', borderBottom: '1px solid #faf8f5' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#a07830', background: 'rgba(201,162,88,0.1)', border: '1.5px dashed rgba(201,162,88,0.35)', borderRadius: 7, padding: '0.22rem 0.65rem', fontSize: '0.8rem', letterSpacing: '0.05em' }}>
                        {c.num_fid || '—'}
                      </span>
                    </td>

                    <td style={{ padding: '0.7rem 0.75rem', borderBottom: '1px solid #faf8f5' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(201,162,88,0.08)', color: '#a07830', border: '1px solid rgba(201,162,88,0.2)', borderRadius: 20, padding: '0.18rem 0.65rem', fontSize: '0.72rem', fontWeight: 700 }}>
                        ⭐ {c.point_fid ?? 0} pts
                      </span>
                    </td>

                    <td style={{ padding: '0.7rem 0.75rem', borderBottom: '1px solid #faf8f5' }}>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          onClick={() => { setEditTarget(c); setModal('edit') }}
                          style={{ background: 'none', border: '1px solid #e8e4de', borderRadius: 7, padding: '0.3rem 0.6rem', color: '#9a9590', fontSize: '0.73rem', cursor: 'pointer', transition: 'all 0.15s' }}
                          onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = '#c9a258'; b.style.color = '#c9a258' }}
                          onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = '#e8e4de'; b.style.color = '#9a9590' }}>
                          ✏️
                        </button>
                        <button
                          onClick={() => setDeleteTarget(c)}
                          style={{ background: 'none', border: '1px solid #fca5a5', borderRadius: 7, padding: '0.3rem 0.55rem', color: '#dc2626', fontSize: '0.73rem', cursor: 'pointer', transition: 'background 0.15s' }}
                          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = '#fef2f2')}
                          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'none')}>
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