'use client'
import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { API_BASE_URL } from './Types'
import { Toast } from './UI'

/* ══════════════════════════════════════════
   TOGGLE SWITCH
══════════════════════════════════════════ */
function Toggle({ active, onChange, size = 'md' }: { active: boolean; onChange: (v: boolean) => void; size?: 'sm' | 'md' }) {
  const w   = size === 'sm' ? 36 : 44
  const h   = size === 'sm' ? 20 : 24
  const dot = size === 'sm' ? 14 : 18
  const off = 3
  const on  = size === 'sm' ? 19 : 23
  return (
    <div onClick={() => onChange(!active)} style={{ position: 'relative', width: w, height: h, borderRadius: h / 2, flexShrink: 0, background: active ? 'linear-gradient(135deg,#c9a258,#a07830)' : '#e2ddd8', cursor: 'pointer', transition: 'background 0.2s', boxShadow: active ? '0 2px 8px rgba(201,162,88,0.35)' : 'none' }}>
      <div style={{ position: 'absolute', top: (h - dot) / 2, left: active ? on - dot : off, width: dot, height: dot, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.18)', transition: 'left 0.2s' }} />
    </div>
  )
}

/* ══════════════════════════════════════════
   LOGO UPLOAD
══════════════════════════════════════════ */
interface LogoUploadProps {
  logo: string | null          // URL d'affichage (blob ou http)
  onFileChange: (file: File) => void
  onDelete: () => void
  uploading: boolean
}
function LogoUpload({ logo, onFileChange, onDelete, uploading }: LogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    onFileChange(file)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <label style={{ fontSize: '0.72rem', color: '#9a9590', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Logo du restaurant</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Aperçu */}
        <div
          onClick={() => inputRef.current?.click()}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#c9a258')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = '#e8e4de')}
          style={{ width: 72, height: 72, borderRadius: 14, background: logo ? 'transparent' : 'linear-gradient(135deg,#f5f0e8,#ede8df)', border: '2px dashed #e8e4de', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, cursor: 'pointer', transition: 'border-color 0.15s', position: 'relative' }}>
          {uploading
            ? <span style={{ fontSize: '1.2rem', animation: 'spin 0.9s linear infinite' }}>⏳</span>
            : logo
              ? <img src={logo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: '1.6rem', opacity: 0.5 }}>🍽️</span>
          }
        </div>
        {/* Boutons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          <button onClick={() => inputRef.current?.click()} disabled={uploading}
            style={{ background: 'linear-gradient(135deg,#c9a258,#a07830)', border: 'none', borderRadius: 8, padding: '0.45rem 1rem', color: '#fff', fontFamily: 'Plus Jakarta Sans,sans-serif', fontSize: '0.78rem', fontWeight: 700, cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.7 : 1 }}>
            📁 Choisir un logo
          </button>
          {logo && !uploading && (
            <button onClick={onDelete}
              style={{ background: 'none', border: '1.5px solid #fca5a5', borderRadius: 8, padding: '0.4rem 1rem', color: '#dc2626', fontFamily: 'Plus Jakarta Sans,sans-serif', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
              🗑️ Supprimer
            </button>
          )}
          <span style={{ fontSize: '0.68rem', color: '#b0aba5' }}>PNG, JPG — max 2 Mo</span>
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
    </div>
  )
}

/* ══════════════════════════════════════════
   TYPES
══════════════════════════════════════════ */
interface DaySchedule {
  jour:     string
  ouverture: string
  fermeture: string
  isActive:  boolean
}

interface BoutiqueData {
  id:            number
  nom:           string
  adresse:       string
  telephone:     string
  email:         string
  logo:          string | null
  horaire:       DaySchedule[]
  mode_paiement: { especes: boolean; carte: boolean; mobile: boolean }
  fidelite:      { dinar: number; point: number }
}

const DAYS_META = [
  { key: 'lundi',    label: 'Lundi'    },
  { key: 'mardi',    label: 'Mardi'    },
  { key: 'mercredi', label: 'Mercredi' },
  { key: 'jeudi',    label: 'Jeudi'    },
  { key: 'vendredi', label: 'Vendredi' },
  { key: 'samedi',   label: 'Samedi'   },
  { key: 'dimanche', label: 'Dimanche' },
]

const DEFAULT_HORAIRE: DaySchedule[] = DAYS_META.map(d => ({
  jour:      d.key,
  ouverture: '08:00',
  fermeture: '23:00',
  isActive:  d.key !== 'dimanche',
}))

const PAYMENT_META = [
  { id: 'especes',   label: 'Espèces',   icon: '💵', desc: 'Paiement en liquide à la caisse' },
  { id: 'carte',     label: 'Carte CIB', icon: '💳', desc: 'Carte interbancaire algérienne' },
  { id: 'mobile',    label: 'BaridiMob', icon: '📱', desc: 'Virement mobile Algérie Poste' },
]

/* ══════════════════════════════════════════
   SECTION CARD WRAPPER
══════════════════════════════════════════ */
function SectionCard({ icon, title, children, onSave, saving }: {
  icon: string; title: string; children: React.ReactNode
  onSave: () => void; saving?: boolean
}) {
  const [flash, setFlash] = useState(false)

  const handleSave = async () => {
    await onSave()
    setFlash(true)
    setTimeout(() => setFlash(false), 2200)
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem', paddingBottom: '0.85rem', borderBottom: '1.5px solid #f0ede8' }}>
        <span style={{ fontSize: '1.2rem' }}>{icon}</span>
        <div className="section-title" style={{ fontSize: '1rem', flex: 1 }}>{title}</div>
      </div>
      {children}
      <button onClick={handleSave} disabled={saving}
        style={{ marginTop: '1.25rem', background: flash ? 'linear-gradient(135deg,#16a34a,#15803d)' : saving ? '#d4b87a' : 'linear-gradient(135deg,#c9a258,#a07830)', border: 'none', borderRadius: 9, padding: '0.65rem 1.4rem', color: '#fff', fontFamily: 'Plus Jakarta Sans,sans-serif', fontSize: '0.85rem', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', transition: 'background 0.3s', boxShadow: '0 3px 12px rgba(201,162,88,0.25)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
        {saving ? '⏳ Enregistrement…' : flash ? '✅ Sauvegardé !' : '💾 Sauvegarder'}
      </button>
    </div>
  )
}

/* ══════════════════════════════════════════
   MAIN PARAMETRE
══════════════════════════════════════════ */
export default function Parametre() {
  const [pageLoading, setPageLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  /* ── Infos restaurant ── */
  const [nom,       setNom]       = useState('')
  const [adresse,   setAdresse]   = useState('')
  const [telephone, setTelephone] = useState('')
  const [email,     setEmail]     = useState('')
  const [logoUrl,   setLogoUrl]   = useState<string | null>(null)   // URL http serveur
  const [logoBlob,  setLogoBlob]  = useState<string | null>(null)   // blob local preview
  const [logoFile,  setLogoFile]  = useState<File | null>(null)     // fichier à envoyer
  const [savingInfo,   setSavingInfo]   = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  /* ── Horaires ── */
  const [horaire,      setHoraire]      = useState<DaySchedule[]>(DEFAULT_HORAIRE)
  const [savingHoraire, setSavingHoraire] = useState(false)

  /* ── Paiements ── */
  const [modePaiement,  setModePaiement]  = useState({ especes: true, carte: false, mobile: false })
  const [savingPaiment, setSavingPaiment] = useState(false)

  /* ── Fidélité ── */
  const [fidelite,      setFidelite]      = useState({ dinar: 1, point: 100 })
  const [savingFidelite, setSavingFidelite] = useState(false)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type }); setTimeout(() => setToast(null), 3200)
  }

  /* ══ Chargement initial ══ */
  useEffect(() => {
    const load = async () => {
      try {
        const r = await axios.get<BoutiqueData>(`${API_BASE_URL}/Parametre`)
        const d = r.data
        setNom(d.nom       ?? '')
        setAdresse(d.adresse   ?? '')
        setTelephone(d.telephone ?? '')
        setEmail(d.email     ?? '')
        setLogoUrl(d.logo ? `${API_BASE_URL}/${d.logo}` : null)
        if (d.horaire && d.horaire.length > 0) setHoraire(d.horaire)
        if (d.mode_paiement) setModePaiement(d.mode_paiement)
        if (d.fidelite)      setFidelite(d.fidelite)
      } catch {
        showToast('Impossible de charger la configuration.', 'error')
      } finally {
        setPageLoading(false)
      }
    }
    load()
  }, [])

  /* ══ SAUVEGARDE INFOS (sans logo) ══ */
  const saveInfos = async () => {
    setSavingInfo(true)
    try {
      await axios.put(`${API_BASE_URL}/Parametre`, { nom, adresse, telephone, email })
      showToast('Informations sauvegardées !', 'success')
    } catch (err: any) {
      showToast(err?.response?.data?.error ?? 'Erreur lors de la sauvegarde.', 'error')
    } finally { setSavingInfo(false) }
  }

  /* ══ UPLOAD LOGO ══ */
  const handleLogoFile = (file: File) => {
    setLogoFile(file)
    setLogoBlob(URL.createObjectURL(file))
    // Upload immédiat
    uploadLogo(file)
  }

  const uploadLogo = async (file: File) => {
    setUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append('logo', file)
      const r = await axios.put<BoutiqueData>(`${API_BASE_URL}/Parametre/logo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setLogoUrl(r.data.logo ? `${API_BASE_URL}/${r.data.logo}` : null)
      setLogoBlob(null)
      setLogoFile(null)
      showToast('Logo mis à jour !', 'success')
    } catch (err: any) {
      setLogoBlob(null); setLogoFile(null)
      showToast(err?.response?.data?.error ?? "Erreur lors de l'upload du logo.", 'error')
    } finally { setUploadingLogo(false) }
  }

  const deleteLogo = async () => {
    setUploadingLogo(true)
    try {
      await axios.delete(`${API_BASE_URL}/Parametre/logo`)
      setLogoUrl(null); setLogoBlob(null); setLogoFile(null)
      showToast('Logo supprimé.', 'success')
    } catch (err: any) {
      showToast(err?.response?.data?.error ?? 'Erreur lors de la suppression.', 'error')
    } finally { setUploadingLogo(false) }
  }

  /* ══ SAUVEGARDE HORAIRES ══ */
  const saveHoraire = async () => {
    setSavingHoraire(true)
    try {
      await axios.patch(`${API_BASE_URL}/Parametre/horaire`, { horaire })
      showToast('Horaires sauvegardés !', 'success')
    } catch (err: any) {
      showToast(err?.response?.data?.error ?? 'Erreur lors de la sauvegarde.', 'error')
    } finally { setSavingHoraire(false) }
  }

  const updateDay = (jour: string, field: 'ouverture' | 'fermeture' | 'isActive', value: string | boolean) => {
    setHoraire(prev => prev.map(d => d.jour === jour ? { ...d, [field]: value } : d))
  }

  /* ══ SAUVEGARDE PAIEMENT ══ */
  const savePaiement = async () => {
    setSavingPaiment(true)
    try {
      await axios.patch(`${API_BASE_URL}/Parametre/paiement`, { mode_paiement: modePaiement })
      showToast('Modes de paiement sauvegardés !', 'success')
    } catch (err: any) {
      showToast(err?.response?.data?.error ?? 'Erreur lors de la sauvegarde.', 'error')
    } finally { setSavingPaiment(false) }
  }

  /* ══ SAUVEGARDE FIDÉLITÉ ══ */
  const saveFidelite = async () => {
    setSavingFidelite(true)
    try {
      await axios.patch(`${API_BASE_URL}/Parametre/fidelite`, { fidelite })
      showToast('Fidélité sauvegardée !', 'success')
    } catch (err: any) {
      showToast(err?.response?.data?.error ?? 'Erreur lors de la sauvegarde.', 'error')
    } finally { setSavingFidelite(false) }
  }

  const inputStyle: React.CSSProperties = {
    background: '#faf8f5', border: '1.5px solid #e8e4de', borderRadius: 8,
    padding: '0.65rem 0.85rem', color: '#1a1a2e',
    fontFamily: 'Plus Jakarta Sans,sans-serif', fontSize: '0.88rem',
    outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box', width: '100%',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: '0.72rem', color: '#9a9590', textTransform: 'uppercase',
    letterSpacing: '0.08em', fontWeight: 600,
  }

  if (pageLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 220, color: '#c9a258', gap: '0.6rem', fontSize: '0.9rem' }}>
      <span style={{ animation: 'spin 0.9s linear infinite', display: 'inline-block', fontSize: '1.3rem' }}>⏳</span>
      Chargement de la configuration…
      <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
    </div>
  )

  /* Logo affiché : blob local en priorité (upload en cours), sinon URL serveur */
  const displayLogo = logoBlob ?? logoUrl

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <style>{`
        @keyframes spin { to { transform:rotate(360deg) } }
        .param-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:1rem; }
        .day-row:hover { background:#faf8f5 !important; }
        input[type="time"]::-webkit-calendar-picker-indicator { opacity:0.4; cursor:pointer; }
      `}</style>

      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* ══ 1. INFOS RESTAURANT ══ */}
      <SectionCard icon="🍽️" title="Informations du restaurant" onSave={saveInfos} saving={savingInfo}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Logo — upload séparé, indépendant du bouton Sauvegarder */}
          <LogoUpload
            logo={displayLogo}
            onFileChange={handleLogoFile}
            onDelete={deleteLogo}
            uploading={uploadingLogo}
          />

          {/* Grille champs texte */}
          <div className="param-grid">
            {[
              { label: 'Nom du restaurant', value: nom,       setter: setNom,       type: 'text',  placeholder: 'Ex: Le Gourmet' },
              { label: 'Adresse',           value: adresse,   setter: setAdresse,   type: 'text',  placeholder: 'Ex: Rue Didouche, Alger' },
              { label: 'Téléphone',         value: telephone, setter: setTelephone, type: 'tel',   placeholder: 'Ex: 0555 123 456' },
              { label: 'Email',             value: email,     setter: setEmail,     type: 'email', placeholder: 'Ex: contact@restaurant.dz' },
            ].map(f => (
              <div key={f.label} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={labelStyle}>{f.label}</label>
                <input type={f.type} value={f.value} placeholder={f.placeholder}
                  onChange={e => f.setter(e.target.value)}
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = '#c9a258')}
                  onBlur={e => (e.target.style.borderColor = '#e8e4de')} />
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* ══ 2. HORAIRES ══ */}
      <SectionCard icon="🕐" title="Horaires d'ouverture" onSave={saveHoraire} saving={savingHoraire}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>

          {/* En-têtes */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 1fr', gap: '0.75rem', alignItems: 'center', padding: '0 0.5rem 0.5rem', borderBottom: '1.5px solid #f0ede8', marginBottom: '0.25rem' }}>
            {['Jour', 'Ouverture', 'Fermeture', 'Statut'].map((h, i) => (
              <span key={h} style={{ ...labelStyle, fontSize: '0.65rem', textAlign: i > 0 ? 'center' : 'left' }}>{h}</span>
            ))}
          </div>

          {horaire.map((day, idx) => {
            const meta = DAYS_META.find(d => d.key === day.jour)
            return (
              <div key={day.jour} className="day-row"
                style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 1fr', gap: '0.75rem', alignItems: 'center', padding: '0.55rem 0.5rem', borderRadius: 10, transition: 'background 0.12s', background: idx % 2 === 0 ? 'transparent' : 'rgba(250,248,245,0.5)', opacity: day.isActive ? 1 : 0.55 }}>

                <span style={{ fontWeight: 700, color: day.isActive ? '#1a1a2e' : '#b0aba5', fontSize: '0.87rem' }}>
                  {meta?.label ?? day.jour}
                </span>

                <input type="time" value={day.ouverture} disabled={!day.isActive}
                  onChange={e => updateDay(day.jour, 'ouverture', e.target.value)}
                  style={{ ...inputStyle, textAlign: 'center', padding: '0.55rem 0.4rem', cursor: day.isActive ? 'default' : 'not-allowed', opacity: day.isActive ? 1 : 0.4 }}
                  onFocus={e => { if (day.isActive) e.target.style.borderColor = '#c9a258' }}
                  onBlur={e => (e.target.style.borderColor = '#e8e4de')} />

                <input type="time" value={day.fermeture} disabled={!day.isActive}
                  onChange={e => updateDay(day.jour, 'fermeture', e.target.value)}
                  style={{ ...inputStyle, textAlign: 'center', padding: '0.55rem 0.4rem', cursor: day.isActive ? 'default' : 'not-allowed', opacity: day.isActive ? 1 : 0.4 }}
                  onFocus={e => { if (day.isActive) e.target.style.borderColor = '#c9a258' }}
                  onBlur={e => (e.target.style.borderColor = '#e8e4de')} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                  <Toggle active={day.isActive} onChange={v => updateDay(day.jour, 'isActive', v)} size="sm" />
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: day.isActive ? '#16a34a' : '#dc2626', background: day.isActive ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.07)', border: `1px solid ${day.isActive ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.18)'}`, borderRadius: 20, padding: '0.15rem 0.6rem' }}>
                    {day.isActive ? 'Ouvert' : 'Fermé'}
                  </span>
                </div>
              </div>
            )
          })}

          {/* Résumé jours ouverts */}
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1.5px solid #f0ede8', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', color: '#9a9590', fontWeight: 600 }}>Jours ouverts :</span>
            {horaire.filter(d => d.isActive).map(d => {
              const meta = DAYS_META.find(m => m.key === d.jour)
              return (
                <span key={d.jour} style={{ background: 'rgba(201,162,88,0.1)', color: '#a07830', border: '1px solid rgba(201,162,88,0.25)', borderRadius: 20, padding: '0.15rem 0.6rem', fontSize: '0.72rem', fontWeight: 700 }}>
                  {meta?.label ?? d.jour}
                </span>
              )
            })}
            {horaire.filter(d => d.isActive).length === 0 && (
              <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>⚠️ Aucun jour ouvert</span>
            )}
          </div>
        </div>
      </SectionCard>

      {/* ══ 3. MODES DE PAIEMENT ══ */}
      <SectionCard icon="💳" title="Modes de paiement" onSave={savePaiement} saving={savingPaiment}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {PAYMENT_META.map(p => {
            const active = modePaiement[p.id as keyof typeof modePaiement]
            return (
              <div key={p.id}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.9rem 1.1rem', background: active ? 'rgba(201,162,88,0.04)' : '#faf8f5', border: `1.5px solid ${active ? 'rgba(201,162,88,0.25)' : '#e8e4de'}`, borderRadius: 12, transition: 'all 0.2s', gap: '1rem' }}>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: active ? 'linear-gradient(135deg,rgba(201,162,88,0.18),rgba(201,162,88,0.06))' : 'rgba(0,0,0,0.04)', border: `1.5px solid ${active ? 'rgba(201,162,88,0.3)' : '#e8e4de'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', transition: 'all 0.2s' }}>
                    {p.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: active ? '#1a1a2e' : '#9a9590', fontSize: '0.9rem', transition: 'color 0.2s' }}>{p.label}</div>
                    <div style={{ fontSize: '0.72rem', color: '#b0aba5', marginTop: 2 }}>{p.desc}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: active ? '#16a34a' : '#dc2626', background: active ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.07)', border: `1px solid ${active ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.18)'}`, borderRadius: 20, padding: '0.18rem 0.65rem', transition: 'all 0.2s' }}>
                    {active ? '✅ Activé' : '❌ Désactivé'}
                  </span>
                  <Toggle active={active} onChange={v => setModePaiement(prev => ({ ...prev, [p.id]: v }))} />
                </div>
              </div>
            )
          })}
          <div style={{ marginTop: '0.4rem', fontSize: '0.76rem', color: '#9a9590', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>ℹ️</span>
            <span><strong style={{ color: '#c9a258' }}>{Object.values(modePaiement).filter(Boolean).length}</strong> mode{Object.values(modePaiement).filter(Boolean).length !== 1 ? 's' : ''} de paiement actif{Object.values(modePaiement).filter(Boolean).length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </SectionCard>

      {/* ══ 4. FIDÉLITÉ ══ */}
      <SectionCard icon="⭐" title="Programme de fidélité" onSave={saveFidelite} saving={savingFidelite}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Explication */}
          <div style={{ background: 'rgba(201,162,88,0.07)', border: '1.5px dashed rgba(201,162,88,0.35)', borderRadius: 10, padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
            <span style={{ fontSize: '1.4rem' }}>🏆</span>
            <div style={{ fontSize: '0.82rem', color: '#a07830', fontWeight: 600 }}>
              Pour chaque <strong>{fidelite.dinar}€</strong> dépensé, le client gagne <strong>{fidelite.point} point{fidelite.point > 1 ? 's' : ''}</strong>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={labelStyle}>Montant dépensé (€)</label>
              <div style={{ position: 'relative' }}>
                <input type="number" min="1" value={fidelite.dinar}
                  onChange={e => setFidelite(prev => ({ ...prev, dinar: Number(e.target.value) }))}
                  style={{ ...inputStyle, paddingRight: '3.2rem' }}
                  onFocus={e => (e.target.style.borderColor = '#c9a258')}
                  onBlur={e => (e.target.style.borderColor = '#e8e4de')} />
                <span style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#c9a258', fontWeight: 700, fontSize: '0.8rem', pointerEvents: 'none' }}>€</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={labelStyle}>Points gagnés</label>
              <div style={{ position: 'relative' }}>
                <input type="number" min="1" value={fidelite.point}
                  onChange={e => setFidelite(prev => ({ ...prev, point: Number(e.target.value) }))}
                  style={{ ...inputStyle, paddingRight: '3.5rem' }}
                  onFocus={e => (e.target.style.borderColor = '#c9a258')}
                  onBlur={e => (e.target.style.borderColor = '#e8e4de')} />
                <span style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#c9a258', fontWeight: 700, fontSize: '0.8rem', pointerEvents: 'none' }}>pts</span>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}