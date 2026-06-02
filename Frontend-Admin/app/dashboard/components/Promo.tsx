'use client'
import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { API_BASE_URL } from './Types'
import { Toast } from './UI'

/* ══════════════════════════════════════════
   TYPES
══════════════════════════════════════════ */
interface Promo {
  promo_id: number
  code_promo: string
  nb_utilisation: number
  nb_utilisation_max: number
  date_expiration: string
  type_promo: 1 | 2
  discount: number
}

const TYPE_LABELS: Record<number, { label: string; color: string; bg: string; border: string; icon: string; desc: string }> = {
  1: { label: 'Mono',  color: '#9333ea', bg: 'rgba(147,51,234,0.08)', border: 'rgba(147,51,234,0.2)', icon: '1️⃣', desc: 'Usage unique' },
  2: { label: 'Multi', color: '#0891b2', bg: 'rgba(8,145,178,0.08)',  border: 'rgba(8,145,178,0.2)',  icon: '🔢', desc: 'Utilisations limitées' },
}

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const DAYS_FR   = ['Lu','Ma','Me','Je','Ve','Sa','Di']

/* ── date helpers ── */
const fmtDate = (d: string) => {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
const toDisplayDate = (iso: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const dd = String(d.getUTCDate()).padStart(2,'0')
  const mm = String(d.getUTCMonth()+1).padStart(2,'0')
  return `${dd}/${mm}/${d.getUTCFullYear()}`
}
const formatDateInput = (raw: string) => {
  const digits = raw.replace(/\D/g,'').substring(0,8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0,2)}/${digits.slice(2)}`
  return `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4)}`
}
const toISODate = (display: string): string | null => {
  const parts = display.split('/')
  if (parts.length !== 3 || parts[2].length !== 4) return null
  const [dd, mm, yyyy] = parts
  if (isNaN(Date.parse(`${yyyy}-${mm}-${dd}`))) return null
  return `${yyyy}-${mm}-${dd}`
}
const isExpired = (iso: string) => iso && new Date(iso) < new Date()

/* ══════════════════════════════════════════
   MINI CALENDRIER
══════════════════════════════════════════ */
interface MiniCalProps {
  selectedIso?: string
  onPick: (iso: string) => void
  onClose: () => void
}
function MiniCal({ selectedIso, onPick, onClose }: MiniCalProps) {
  const today = new Date()
  const initDate = selectedIso ? new Date(selectedIso) : today
  const [viewYear,  setViewYear]  = useState(initDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(initDate.getMonth()) // 0-11
  const ref = useRef<HTMLDivElement>(null)

  /* Ferme si clic en dehors */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  /* Génère les jours du mois (grille lundi→dimanche) */
  const firstDay = new Date(viewYear, viewMonth, 1)
  const lastDay  = new Date(viewYear, viewMonth + 1, 0)
  // firstDay.getDay() : 0=dim → convertit en lundi=0
  const startOffset = (firstDay.getDay() + 6) % 7
  const totalCells  = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7
  const cells: (number | null)[] = Array.from({ length: totalCells }, (_, i) => {
    const day = i - startOffset + 1
    return day >= 1 && day <= lastDay.getDate() ? day : null
  })

  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`

  const isoOf = (day: number) =>
    `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`

  const isPast = (day: number) => isoOf(day) < todayStr

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 999,
        background: '#fff', borderRadius: 14,
        boxShadow: '0 12px 40px rgba(0,0,0,0.18)', border: '1.5px solid #f0ede8',
        padding: '0.75rem', width: 270, userSelect: 'none',
        animation: 'calFadeIn 0.15s ease',
      }}>
      <style>{`@keyframes calFadeIn { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:translateY(0) } }`}</style>

      {/* Navigation mois */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
        <button onClick={prevMonth} style={{ background: 'none', border: '1px solid #e8e4de', borderRadius: 7, width: 28, height: 28, cursor: 'pointer', color: '#9a9590', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
        <span style={{ fontWeight: 700, color: '#1a1a2e', fontSize: '0.85rem' }}>
          {MONTHS_FR[viewMonth]} {viewYear}
        </span>
        <button onClick={nextMonth} style={{ background: 'none', border: '1px solid #e8e4de', borderRadius: 7, width: 28, height: 28, cursor: 'pointer', color: '#9a9590', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
      </div>

      {/* En-têtes jours */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: '0.3rem' }}>
        {DAYS_FR.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '0.62rem', color: '#b0aba5', fontWeight: 700, textTransform: 'uppercase', padding: '0.15rem 0' }}>{d}</div>
        ))}
      </div>

      {/* Grille jours */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const iso     = isoOf(day)
          const past    = isPast(day)
          const isToday = iso === todayStr
          const isSel   = iso === selectedIso
          return (
            <button key={i}
              disabled={past}
              onClick={() => !past && onPick(iso)}
              style={{
                borderRadius: 7, border: 'none', padding: '0.28rem 0',
                fontSize: '0.78rem', fontWeight: isSel || isToday ? 700 : 400,
                cursor: past ? 'not-allowed' : 'pointer',
                background: isSel
                  ? 'linear-gradient(135deg,#c9a258,#a07830)'
                  : isToday ? 'rgba(201,162,88,0.12)' : 'none',
                color: isSel ? '#fff' : past ? '#d4cfc8' : isToday ? '#c9a258' : '#1a1a2e',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => { if (!past && !isSel) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(201,162,88,0.1)' }}
              onMouseLeave={e => { if (!past && !isSel) (e.currentTarget as HTMLButtonElement).style.background = isToday ? 'rgba(201,162,88,0.12)' : 'none' }}>
              {day}
            </button>
          )
        })}
      </div>

      {/* Bouton Aujourd'hui */}
      <div style={{ marginTop: '0.55rem', borderTop: '1px solid #f0ede8', paddingTop: '0.45rem', textAlign: 'center' }}>
        <button
          onClick={() => onPick(todayStr)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c9a258', fontWeight: 600, fontSize: '0.75rem', fontFamily: 'Plus Jakarta Sans,sans-serif' }}>
          Aujourd'hui
        </button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════
   CONFIRM DELETE
══════════════════════════════════════════ */
function ConfirmDelete({ code, onConfirm, onCancel }: { code: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <>
      <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,20,0.6)', backdropFilter: 'blur(6px)', zIndex: 200 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'clamp(280px,88vw,380px)', background: '#fff', borderRadius: 16, boxShadow: '0 24px 70px rgba(0,0,0,0.22)', zIndex: 201, padding: '1.75rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🗑️</div>
        <div style={{ fontWeight: 700, color: '#1a1a2e', fontSize: '1rem', marginBottom: '0.4rem' }}>Supprimer le code promo ?</div>
        <div style={{ color: '#9a9590', fontSize: '0.83rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          Le code <strong style={{ color: '#1a1a2e', fontFamily: 'monospace' }}>«&nbsp;{code}&nbsp;»</strong> sera définitivement supprimé.
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
   MODAL FORMULAIRE PROMO
══════════════════════════════════════════ */
interface ModalProps {
  mode: 'create' | 'edit'
  initial?: Promo
  onClose: () => void
  onSaved: () => void
}

function PromoModal({ mode, initial, onClose, onSaved }: ModalProps) {
  const [codePromo, setCodePromo] = useState(initial?.code_promo ?? '')
  const [dateExp,   setDateExp]   = useState(initial?.date_expiration ? toDisplayDate(initial.date_expiration) : '')
  const [dateError, setDateError] = useState(false)
  const [showCal,   setShowCal]   = useState(false)
  const [typePromo, setTypePromo] = useState<1 | 2>(initial?.type_promo ?? 1)
  const [discount,  setDiscount]  = useState(initial?.discount?.toString() ?? '')
  const [nbrMax,    setNbrMax]    = useState(initial?.nb_utilisation_max?.toString() ?? '1')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDateInput(e.target.value)
    setDateExp(formatted)
    setDateError(formatted.length === 10 ? !toISODate(formatted) : false)
    setShowCal(false)
  }

  const handleSubmit = async () => {
    if (!codePromo.trim()) { setError('Le code promo est obligatoire.'); return }
    const isoDate = toISODate(dateExp)
    if (!isoDate || dateError) { setError('Date invalide. Format : JJ/MM/AAAA'); return }
    if (new Date(isoDate) < new Date()) { setError("La date d'expiration ne peut pas être dans le passé."); return }
    if (!discount || isNaN(Number(discount)) || Number(discount) <= 0 || Number(discount) > 100) {
      setError('Le pourcentage doit être entre 1 et 100.'); return
    }
    const nbrMaxNum = Number(nbrMax)
    if (!nbrMax || isNaN(nbrMaxNum) || nbrMaxNum < 1) {
      setError("Le nombre d'utilisations doit être au moins 1."); return
    }
    setLoading(true); setError(null)
    try {
      const payload = {
        code_promo:         codePromo.trim().toUpperCase(),
        date_expiration:    isoDate,
        type_promo:         typePromo,
        discount:           Number(discount),
        nb_utilisation_max: nbrMaxNum,
      }
  
      if (mode === 'create') await axios.post(`${API_BASE_URL}/Promo`, payload)
      else                   await axios.put(`${API_BASE_URL}/Promo/${initial!.promo_id}`, payload)
      onSaved(); onClose()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Une erreur est survenue.')
    } finally { setLoading(false) }
  }

  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.72rem', color: '#9a9590', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '0.4rem' }
  const inputStyle: React.CSSProperties = { width: '100%', background: '#faf8f5', border: '1.5px solid #e8e4de', borderRadius: 9, padding: '0.68rem 0.9rem', color: '#1a1a2e', fontFamily: 'Plus Jakarta Sans,sans-serif', fontSize: '0.87rem', outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box' }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,20,0.6)', backdropFilter: 'blur(6px)', zIndex: 200 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'clamp(320px,92vw,500px)', background: '#fff', borderRadius: 18, boxShadow: '0 32px 100px rgba(0,0,0,0.28)', zIndex: 201, overflow: 'hidden', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#1a1a2e,#2a2a4e)', padding: '1.2rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#c9a258,#a07830)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>🎟️</div>
            <div>
              <div style={{ color: '#f5f0e8', fontWeight: 700, fontSize: '0.97rem' }}>{mode === 'create' ? 'Nouveau code promo' : 'Modifier le code promo'}</div>
              <div style={{ color: 'rgba(245,240,232,0.35)', fontSize: '0.68rem', marginTop: 1 }}>{mode === 'create' ? 'Remplir les informations' : `ID : ${initial?.promo_id}`}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, width: 34, height: 34, color: 'rgba(245,240,232,0.5)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.4rem 1.5rem', overflowY: 'auto', flex: 1 }}>

          {/* Code promo */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Code promo *</label>
            <input value={codePromo} onChange={e => setCodePromo(e.target.value.toUpperCase())}
              placeholder="Ex: RAMADAN26, VIP10…"
              style={{ ...inputStyle, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.08em' }}
              onFocus={e => (e.target.style.borderColor = '#c9a258')}
              onBlur={e => (e.target.style.borderColor = '#e8e4de')} />
          </div>

          {/* Date + Discount */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1rem' }}>

            {/* Date avec calendrier custom */}
            <div style={{ position: 'relative' }}>
              <label style={labelStyle}>Date d'expiration *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text" inputMode="numeric"
                  value={dateExp} onChange={handleDateChange}
                  placeholder="JJ/MM/AAAA" maxLength={10}
                  style={{ ...inputStyle, borderColor: dateError ? '#fca5a5' : showCal ? '#c9a258' : '#e8e4de', paddingRight: '2.8rem', letterSpacing: '0.04em' }}
                  onFocus={e => (e.target.style.borderColor = dateError ? '#fca5a5' : '#c9a258')}
                  onBlur={e => (e.target.style.borderColor = dateError ? '#fca5a5' : showCal ? '#c9a258' : '#e8e4de')}
                />
                {/* 📅 bouton agenda */}
                <button
                  type="button"
                  onClick={() => setShowCal(v => !v)}
                  title="Choisir une date"
                  style={{
                    position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)',
                    background: showCal ? 'rgba(201,162,88,0.15)' : 'none',
                    border: 'none', borderRadius: 5,
                    cursor: 'pointer', fontSize: '1rem',
                    opacity: showCal ? 1 : 0.5,
                    transition: 'opacity 0.15s, background 0.15s',
                    padding: '2px 3px', lineHeight: 1,
                  }}>
                  📅
                </button>
              </div>
              {dateError && <div style={{ fontSize: '0.68rem', color: '#dc2626', marginTop: '0.3rem' }}>⚠️ Format invalide (JJ/MM/AAAA)</div>}

              {/* Mini calendrier */}
              {showCal && (
                <MiniCal
                  selectedIso={toISODate(dateExp) ?? undefined}
                  onPick={(iso) => {
                    const [y, m, d] = iso.split('-')
                    setDateExp(`${d}/${m}/${y}`)
                    setDateError(false)
                    setShowCal(false)
                  }}
                  onClose={() => setShowCal(false)}
                />
              )}
            </div>

            {/* Réduction */}
            <div>
              <label style={labelStyle}>Réduction (%) *</label>
              <div style={{ position: 'relative' }}>
                <input type="number" min="1" max="100" step="1" value={discount}
                  onChange={e => setDiscount(e.target.value)} placeholder="Ex: 15"
                  style={{ ...inputStyle, paddingRight: '2.5rem' }}
                  onFocus={e => (e.target.style.borderColor = '#c9a258')}
                  onBlur={e => (e.target.style.borderColor = '#e8e4de')} />
                <span style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#c9a258', fontWeight: 700, pointerEvents: 'none' }}>%</span>
              </div>
            </div>
          </div>

          {/* Aperçu discount */}
          {discount && !isNaN(Number(discount)) && Number(discount) > 0 && (
            <div style={{ background: 'rgba(201,162,88,0.07)', border: '1.5px dashed rgba(201,162,88,0.35)', borderRadius: 9, padding: '0.55rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>💰</span>
              <span style={{ fontSize: '0.8rem', color: '#a07830', fontWeight: 600 }}>
                Réduction <strong>{discount}%</strong> — sur 100 € → économie de <strong>{Math.round(Number(discount))} €</strong>
              </span>
            </div>
          )}

          {/* Type — Mono / Multi */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Type de code *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              {([1, 2] as const).map(t => {
                const info   = TYPE_LABELS[t]
                const active = typePromo === t
                return (
                  <button key={t} onClick={() => { setTypePromo(t); if (t === 1) setNbrMax('1') }}
                    style={{ padding: '0.85rem 0.5rem', borderRadius: 10, border: `1.5px solid ${active ? info.border : '#e8e4de'}`, background: active ? info.bg : '#faf8f5', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', fontFamily: 'Plus Jakarta Sans,sans-serif' }}>
                    <span style={{ fontSize: '1.4rem' }}>{info.icon}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: active ? info.color : '#9a9590' }}>{info.label}</span>
                    <span style={{ fontSize: '0.67rem', color: active ? info.color : '#c0bdb8' }}>{info.desc}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Nombre utilisations max */}
          <div style={{ marginBottom: '1.2rem' }}>
            <label style={labelStyle}>Nombre d'utilisations *</label>
            {/* {typePromo === 1 ? (
              <div style={{ ...inputStyle, background: 'rgba(147,51,234,0.05)', border: '1.5px solid rgba(147,51,234,0.2)', color: '#9333ea', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'default' }}>
                <span>🔒</span><span>1 utilisation (Mono fixé)</span>
              </div>
            ) : ( */}
              <input type="number" min="2" value={nbrMax} onChange={e => setNbrMax(e.target.value)}
                placeholder="Ex: 50, 100…" style={inputStyle}
                onFocus={e => (e.target.style.borderColor = '#c9a258')}
                onBlur={e => (e.target.style.borderColor = '#e8e4de')} />
            {/* )} */}
            <div style={{ fontSize: '0.7rem', color: '#9a9590', marginTop: '0.35rem' }}>
              {typePromo === 1 ? "une seule personne peut l'utiliser." : "Le code Multi peut être utilisé plusieurs clients "}
            </div>
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '0.6rem 0.85rem', color: '#dc2626', fontSize: '0.8rem', marginBottom: '1rem' }}>⚠️ {error}</div>
          )}

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button onClick={onClose} style={{ flex: 1, background: 'none', border: '1.5px solid #e8e4de', borderRadius: 9, padding: '0.68rem', color: '#9a9590', fontFamily: 'Plus Jakarta Sans,sans-serif', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
            <button onClick={handleSubmit} disabled={loading}
              style={{ flex: 2, background: loading ? '#d4b87a' : 'linear-gradient(135deg,#c9a258,#a07830)', border: 'none', borderRadius: 9, padding: '0.68rem', color: '#fff', fontFamily: 'Plus Jakarta Sans,sans-serif', fontSize: '0.85rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 3px 12px rgba(201,162,88,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
              {loading ? '⏳ Enregistrement…' : mode === 'create' ? '✚ Créer le code' : '💾 Sauvegarder'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

/* ══════════════════════════════════════════
   MAIN PROMO
══════════════════════════════════════════ */
export default function Promo() {
  const [promos, setPromos]             = useState<Promo[]>([])
  const [loading, setLoading]           = useState(true)
  const [modal, setModal]               = useState<'create' | 'edit' | null>(null)
  const [editTarget, setEditTarget]     = useState<Promo | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Promo | null>(null)
  const [deletingId, setDeletingId]     = useState<number | null>(null)
  const [toast, setToast]               = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [search, setSearch]             = useState('')

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ message: msg, type }); setTimeout(() => setToast(null), 3200)
  }

  const fetchPromos = async () => {
    try {
      const r = await axios.get(`${API_BASE_URL}/Promo`)
      const d = r.data
      setPromos(Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [])
    } catch { showToast('Impossible de charger les codes promo.', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchPromos() }, [])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeletingId(deleteTarget.promo_id)
    try {
      await axios.delete(`${API_BASE_URL}/Promo/${deleteTarget.promo_id}`)
      showToast(`Code «\u00a0${deleteTarget.code_promo}\u00a0» supprimé.`, 'success')
      await fetchPromos()
    } catch { showToast('Échec de la suppression.', 'error') }
    finally { setDeletingId(null); setDeleteTarget(null) }
  }

  const filtered = promos.filter(p =>
    p.code_promo?.toLowerCase().includes(search.toLowerCase()) ||
    TYPE_LABELS[p.type_promo]?.label.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 220, color: '#c9a258', gap: '0.6rem', fontSize: '0.9rem' }}>
      <span style={{ animation: 'spin 0.9s linear infinite', display: 'inline-block', fontSize: '1.3rem' }}>⏳</span>
      Chargement des codes promo…
      <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <>
      <style>{`
        @keyframes spin   { to { transform:rotate(360deg) } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
        .promo-row { transition:background 0.15s; animation:fadeIn 0.25s ease both; }
        .promo-row:hover { background:#faf8f5 !important; }
      `}</style>

      {modal === 'create' && (
        <PromoModal mode="create" onClose={() => setModal(null)}
          onSaved={() => { fetchPromos(); showToast('Code promo créé !', 'success') }} />
      )}
      {modal === 'edit' && editTarget && (
        <PromoModal mode="edit" initial={editTarget}
          onClose={() => { setModal(null); setEditTarget(null) }}
          onSaved={() => { fetchPromos(); showToast('Code promo mis à jour !', 'success') }} />
      )}
      {deleteTarget && (
        <ConfirmDelete code={deleteTarget.code_promo} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="card">
        <div className="table-header">
          <div>
            <div className="section-title">Codes Promo</div>
            <div className="section-sub">{promos.length} code{promos.length !== 1 ? 's' : ''} configuré{promos.length !== 1 ? 's' : ''}</div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Rechercher…"
              style={{ background: '#faf8f5', border: '1.5px solid #e8e4de', borderRadius: 8, padding: '0.5rem 0.9rem', fontSize: '0.82rem', color: '#1a1a2e', outline: 'none', width: 180, transition: 'border-color 0.15s' }}
              onFocus={e => (e.target.style.borderColor = '#c9a258')}
              onBlur={e => (e.target.style.borderColor = '#e8e4de')} />
            <button className="add-btn" onClick={() => setModal('create')}>+ Nouveau code</button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', border: '1.5px dashed #e8e4de', borderRadius: 12 }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎟️</div>
            <div style={{ color: '#5a5550', fontWeight: 700, marginBottom: '0.4rem' }}>{search ? 'Aucun résultat' : 'Aucun code promo'}</div>
            <div style={{ color: '#b0aba5', fontSize: '0.83rem', marginBottom: '1.25rem' }}>{search ? 'Essayez un autre terme.' : 'Créez votre premier code promo.'}</div>
            {!search && <button className="add-btn" onClick={() => setModal('create')}>+ Nouveau code</button>}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', minWidth: 750 }}>
              <thead>
                <tr>
                  {['Code', 'Type', 'Réduction', 'Utilisations', 'Expiration', 'Statut', 'Actions'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: '#b0aba5', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1.5px solid #f0ede8', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, idx) => {
                  const expired  = isExpired(p.date_expiration)
                  const typeInfo = TYPE_LABELS[p.type_promo] ?? TYPE_LABELS[1]
                  const used     = p.nb_utilisation ?? 0
                  const max      = p.nb_utilisation_max ?? 1
                  const pct      = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0
                  const isFull   = used >= max
                  const isActive = !expired && !isFull

                  return (
                    <tr key={p.promo_id} className="promo-row"
                      style={{ opacity: deletingId === p.promo_id ? 0.4 : 1, animationDelay: `${idx * 0.03}s` }}>

                      <td style={{ padding: '0.7rem 0.75rem', borderBottom: '1px solid #faf8f5' }}>
                        <div style={{ fontFamily: 'monospace', fontWeight: 800, color: '#1a1a2e', fontSize: '0.9rem', letterSpacing: '0.05em' }}>{p.code_promo}</div>
                        <div style={{ color: '#b0aba5', fontSize: '0.67rem', marginTop: 1 }}>ID #{p.promo_id}</div>
                      </td>

                      <td style={{ padding: '0.7rem 0.75rem', borderBottom: '1px solid #faf8f5' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: typeInfo.bg, color: typeInfo.color, border: `1px solid ${typeInfo.border}`, borderRadius: 20, padding: '0.2rem 0.7rem', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {typeInfo.icon} {typeInfo.label}
                        </span>
                      </td>

                      <td style={{ padding: '0.7rem 0.75rem', borderBottom: '1px solid #faf8f5' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.1rem', background: 'rgba(201,162,88,0.1)', border: '1px solid rgba(201,162,88,0.25)', borderRadius: 8, padding: '0.22rem 0.7rem' }}>
                          <span style={{ fontWeight: 800, color: '#c9a258', fontSize: '1rem' }}>{p.discount}</span>
                          <span style={{ fontWeight: 700, color: '#a07830', fontSize: '0.73rem' }}>%</span>
                        </div>
                      </td>

                      {/* <td style={{ padding: '0.7rem 0.75rem', borderBottom: '1px solid #faf8f5' }}>
                        <span style={{ color: '#5a5550', fontWeight: 600 }}>{used}</span>
                        <span style={{ color: '#c0bdb8', fontSize: '0.72rem', marginLeft: 3 }}>fois</span>
                      </td> */}

                      <td style={{ padding: '0.7rem 0.75rem', borderBottom: '1px solid #faf8f5', minWidth: 110 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ flex: 1, height: 5, background: '#f0ede8', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: isFull ? '#dc2626' : '#c9a258', borderRadius: 4, transition: 'width 0.4s ease' }} />
                          </div>
                          <span style={{ fontSize: '0.72rem', color: isFull ? '#dc2626' : '#9a9590', fontWeight: isFull ? 700 : 400, whiteSpace: 'nowrap' }}>{used}/{max}</span>
                        </div>
                      </td>

                      <td style={{ padding: '0.7rem 0.75rem', borderBottom: '1px solid #faf8f5', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <span>{expired ? '⚠️' : '📅'}</span>
                          <span style={{ color: expired ? '#dc2626' : '#5a5550', fontSize: '0.82rem', fontWeight: expired ? 700 : 400 }}>{fmtDate(p.date_expiration)}</span>
                        </div>
                      </td>

                      <td style={{ padding: '0.7rem 0.75rem', borderBottom: '1px solid #faf8f5' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: isActive ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.07)', color: isActive ? '#16a34a' : '#dc2626', border: `1px solid ${isActive ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)'}`, borderRadius: 20, padding: '0.2rem 0.7rem', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: isActive ? '#16a34a' : '#dc2626', display: 'inline-block' }} />
                          {isFull ? 'Épuisé' : expired ? 'Expiré' : 'Actif'}
                        </span>
                      </td>

                      <td style={{ padding: '0.7rem 0.75rem', borderBottom: '1px solid #faf8f5' }}>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button onClick={() => { setEditTarget(p); setModal('edit') }}
                            style={{ background: 'none', border: '1px solid #e8e4de', borderRadius: 7, padding: '0.3rem 0.6rem', color: '#9a9590', fontSize: '0.73rem', cursor: 'pointer', transition: 'all 0.15s' }}
                            onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = '#c9a258'; b.style.color = '#c9a258' }}
                            onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = '#e8e4de'; b.style.color = '#9a9590' }}>✏️</button>
                          <button onClick={() => setDeleteTarget(p)}
                            style={{ background: 'none', border: '1px solid #fca5a5', borderRadius: 7, padding: '0.3rem 0.55rem', color: '#dc2626', fontSize: '0.73rem', cursor: 'pointer', transition: 'background 0.15s' }}
                            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = '#fef2f2')}
                            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'none')}>🗑️</button>
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