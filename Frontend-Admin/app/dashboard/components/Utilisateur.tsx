'use client'
import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { API_BASE_URL } from './Types'
import { Toast } from './UI'

/* ══════════════════════════════════════════
   TYPES
══════════════════════════════════════════ */
interface User {
  user_id: number
  username: string
  email: string
  role: string
  role_id?: number
  created_at?: string
}

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  Admin:    { label: 'Admin',    color: '#c9a258', bg: 'rgba(201,162,88,0.1)',  border: 'rgba(201,162,88,0.3)',  icon: '👑' },
  Caissier: { label: 'Caissier', color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)',   icon: '💵' },
  Chef:     { label: 'Chef',     color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)',    icon: '👨‍🍳' },
}

const getRoleInfo = (role: string) => ROLE_CONFIG[role] ?? ROLE_CONFIG['Caissier']

/* ══════════════════════════════════════════
   CONFIRM DELETE
══════════════════════════════════════════ */
function ConfirmDelete({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <>
      <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,20,0.6)', backdropFilter: 'blur(6px)', zIndex: 200 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'clamp(280px,88vw,380px)', background: '#fff', borderRadius: 16, boxShadow: '0 24px 70px rgba(0,0,0,0.22)', zIndex: 201, padding: '1.75rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🗑️</div>
        <div style={{ fontWeight: 700, color: '#1a1a2e', fontSize: '1rem', marginBottom: '0.4rem' }}>Supprimer l'utilisateur ?</div>
        <div style={{ color: '#9a9590', fontSize: '0.83rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          L'utilisateur <strong style={{ color: '#1a1a2e' }}>«&nbsp;{name}&nbsp;»</strong> sera définitivement supprimé.
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
   MODAL FORMULAIRE UTILISATEUR
   - Rôle par défaut : Utilisateur (caché dans le formulaire)
   - Seul Admin peut créer des Admins via le toggle visible
══════════════════════════════════════════ */
interface ModalProps {
  mode: 'create' | 'edit'
  initial?: User
  onClose: () => void
  onSaved: () => void
}

/* ══════════════════════════════════════════
   POPUP ENREGISTREMENT VISAGE (PRO - THEME GOLD)
   ══════════════════════════════════════════ */
function FaceRegistrationPopup({ onCapture, onClose }: { onCapture: (img: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [guideMsg, setGuideMsg] = useState("Positionnez votre visage dans le cadre")
  const [status, setStatus] = useState<'waiting' | 'detected' | 'captured'>('waiting')

  useEffect(() => {
    startCamera()
    connectWs()
    return () => {
      stopCamera()
      if (wsRef.current) wsRef.current.close()
    }
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsCameraOn(true)
      }
    } catch (err) {
      setGuideMsg("Erreur caméra : Vérifiez les permissions.")
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  const connectWs = () => {
    const ws = new WebSocket('ws://localhost:8000/ws/detect')
    wsRef.current = ws
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.faces && data.faces.length > 0) {
          const face = data.faces[0]
          const [x, y, w, h] = face.box
          const centerX = x + w / 2
          
          if (centerX < 250) setGuideMsg("⬅️ Bougez vers la droite")
          else if (centerX > 390) setGuideMsg("➡️ Bougez vers la gauche")
          else if (w < 150) setGuideMsg("🔍 Approchez-vous de la caméra")
          else {
            setGuideMsg("✅ Parfait ! Ne bougez plus")
            setStatus('detected')
          }
        } else {
          setGuideMsg("👤 Aucun visage détecté")
          setStatus('waiting')
        }
      } catch (err) {}
    }
  }

  // Envoi des frames au serveur IA pour guidage
  useEffect(() => {
    if (!isCameraOn) return
    const interval = setInterval(() => {
      if (videoRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
        const canvas = document.createElement('canvas')
        canvas.width = 640; canvas.height = 480
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0)
          wsRef.current.send(JSON.stringify({ image: canvas.toDataURL('image/jpeg', 0.6) }))
        }
      }
    }, 200)
    return () => clearInterval(interval)
  }, [isCameraOn])

  const handleCapture = () => {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = 640; canvas.height = 480
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.translate(canvas.width, 0); ctx.scale(-1, 1)
      ctx.drawImage(videoRef.current, 0, 0)
      onCapture(canvas.toDataURL('image/jpeg', 0.9))
      setStatus('captured')
      setTimeout(onClose, 1200)
    }
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.3s ease' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'clamp(320px,95vw,600px)', zIndex: 301, textAlign: 'center' }}>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Enregistrement Biométrique</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Suivez les instructions pour une capture optimale</p>
        </div>

        <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', background: '#000', borderRadius: 24, overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', border: '2px solid rgba(255,255,255,0.1)' }}>
          <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
          
          {/* Oval Guide */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ width: '50%', height: '70%', borderRadius: '50%', border: status === 'detected' ? '4px solid #c9a258' : '2px dashed rgba(255,255,255,0.4)', boxShadow: '0 0 0 1000px rgba(0,0,0,0.4)', transition: 'all 0.3s ease' }} />
          </div>

          {/* Guidance Message */}
          <div style={{ position: 'absolute', bottom: '2rem', left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
            <div style={{ background: status === 'detected' ? '#c9a258' : 'rgba(0,0,0,0.7)', color: '#fff', padding: '0.6rem 1.2rem', borderRadius: 50, fontSize: '0.9rem', fontWeight: 600, backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', animation: 'slideUp 0.3s ease' }}>
              {guideMsg}
            </div>
          </div>

          {status === 'captured' && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(201,162,88,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '4rem', animation: 'zoomIn 0.3s ease' }}>
              ✅
            </div>
          )}
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <button type="button" onClick={onClose} style={{ padding: '0.8rem 2rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
          <button type="button" onClick={handleCapture} disabled={status === 'captured'} style={{ padding: '0.8rem 3rem', borderRadius: 12, border: 'none', background: status === 'detected' ? 'linear-gradient(135deg,#c9a258,#a07830)' : '#fff', color: status === 'detected' ? '#fff' : '#1a1a2e', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', transform: status === 'detected' ? 'scale(1.05)' : 'scale(1)' }}>
            {status === 'detected' ? '📸 Capturer' : 'Attente détection...'}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes slideUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes zoomIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </>
  )
}

function UserModal({ mode, initial, onClose, onSaved }: ModalProps) {
  const [username, setUsername] = useState(initial?.username ?? '')
  const [email,    setEmail]    = useState(initial?.email    ?? '')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [roles,    setRoles]    = useState<{ id: number; nom_role: string }[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState<string | number>(initial?.role_id ?? '')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
 
  // AI Face Registration States
  const [showFacePopup, setShowFacePopup] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
 
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const r = await axios.get(`${API_BASE_URL}/User/roles`)
        setRoles(r.data)
        if (mode === 'create' && r.data.length > 0 && !selectedRoleId) {
          setSelectedRoleId(r.data[0].id)
        }
      } catch (err) {
        console.error("Erreur de chargement des rôles:", err)
      }
    }
    fetchRoles()
  }, [mode, selectedRoleId])
 
  const handleSubmit = async () => {
    if (!username.trim()) { setError("Le nom d'utilisateur est obligatoire."); return }
    if (!email.trim())    { setError("L'email est obligatoire.");               return }
    if (mode === 'create' && !password.trim()) { setError('Le mot de passe est obligatoire.'); return }
    if (password && password.length < 6) { setError('Le mot de passe doit faire au moins 6 caractères.'); return }
    if (!selectedRoleId) { setError("Veuillez sélectionner un rôle."); return }
 
    setLoading(true); setError(null)
    try {
      if (mode === 'create') {
        await axios.post(`${API_BASE_URL}/User`, {
          username: username.trim(),
          email: email.trim(),
          password,
          role_id: Number(selectedRoleId),
        })
 
        // Register face in AI database if captured
        if (capturedImage) {
          try {
            await fetch('http://localhost:8000/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: username.trim(), image: capturedImage })
            })
          } catch (aiErr) {
            console.warn("Échec de l'enregistrement du visage. Assurez-vous que le serveur IA (port 8000) est actif.")
          }
        }
      } else {
        const payload: any = {
          username: username.trim(),
          email: email.trim(),
          role_id: Number(selectedRoleId),
        }
        if (password.trim()) payload.password = password
        await axios.put(`${API_BASE_URL}/User/${initial!.user_id}`, payload)
      }
      onSaved(); onClose()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Une erreur est survenue.')
    } finally { setLoading(false) }
  }
 
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.72rem', color: '#9a9590', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '0.4rem' }
  const inputStyle: React.CSSProperties = { width: '100%', background: '#faf8f5', border: '1.5px solid #e8e4de', borderRadius: 9, padding: '0.68rem 0.9rem', color: '#1a1a2e', fontFamily: 'Plus Jakarta Sans,sans-serif', fontSize: '0.87rem', outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box' }
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => (e.target.style.borderColor = '#c9a258')
  const onBlur  = (e: React.FocusEvent<HTMLInputElement>) => (e.target.style.borderColor = '#e8e4de')
 
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,20,0.6)', backdropFilter: 'blur(6px)', zIndex: 200 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'clamp(320px,92vw,480px)', background: '#fff', borderRadius: 18, boxShadow: '0 32px 100px rgba(0,0,0,0.28)', zIndex: 201, overflow: 'hidden' }}>
 
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#1a1a2e,#2a2a4e)', padding: '1.2rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#c9a258,#a07830)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>👤</div>
            <div>
              <div style={{ color: '#f5f0e8', fontWeight: 700, fontSize: '0.97rem' }}>
                {mode === 'create' ? 'Nouvel utilisateur' : 'Modifier l\'utilisateur'}
              </div>
              <div style={{ color: 'rgba(245,240,232,0.35)', fontSize: '0.68rem', marginTop: 1 }}>
                {mode === 'create' ? 'Sélectionnez les détails du compte' : `ID : ${initial?.user_id}`}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, width: 34, height: 34, color: 'rgba(245,240,232,0.5)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
 
        {/* Body */}
        <div style={{ padding: '1.4rem 1.5rem' }}>
 
          {/* Username */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Nom d'utilisateur *</label>
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Ex: ahmed_admin"
              style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
          </div>
 
          {/* Email */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Email *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Ex: ahmed@restaurant.dz"
              style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
          </div>
 
          {/* Mot de passe */}
          <div style={{ marginBottom: '1.1rem' }}>
            <label style={labelStyle}>{mode === 'create' ? 'Mot de passe *' : 'Nouveau mot de passe (laisser vide pour ne pas changer)'}</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'create' ? 'Min. 6 caractères' : '••••••••'}
                style={{ ...inputStyle, paddingRight: '2.8rem' }}
                onFocus={onFocus} onBlur={onBlur}
              />
              <button
                onClick={() => setShowPwd(v => !v)}
                style={{ position: 'absolute', right: '0.7rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#9a9590' }}>
                {showPwd ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
 
          {/* Rôle — Liste déroulante */}
          <div style={{ marginBottom: '1.2rem' }}>
            <label style={labelStyle}>Rôle *</label>
            <select
              value={selectedRoleId}
              onChange={e => setSelectedRoleId(e.target.value)}
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = '#c9a258')}
              onBlur={e => (e.currentTarget.style.borderColor = '#e8e4de')}
            >
              <option value="" disabled hidden>Sélectionnez un rôle</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>
                  {r.nom_role === 'Admin' ? '👑 Admin' : r.nom_role === 'Caissier' ? '💵 Caissier' : r.nom_role === 'Chef' ? '👨‍🍳 Chef' : `👤 ${r.nom_role}`}
                </option>
              ))}
            </select>
          </div>
 
          {/* AI Face Capture (Only for creation) */}
          {mode === 'create' && (
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#faf8f5', borderRadius: 12, border: '1.5px solid #e8e4de', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <label style={labelStyle}>Visage biométrique</label>
                <div style={{ fontSize: '0.75rem', color: capturedImage ? '#c9a258' : '#9a9590', fontWeight: 600 }}>
                  {capturedImage ? '✅ Visage enregistré' : '❌ Non enregistré'}
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowFacePopup(true)}
                style={{ background: 'linear-gradient(135deg,#c9a258,#a07830)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s', boxShadow: '0 2px 8px rgba(201,162,88,0.2)' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#a07830')}
                onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#c9a258,#a07830)')}
              >
                {capturedImage ? '🔄 Reprendre' : '📸 Enregistrer'}
              </button>
            </div>
          )}
 
          {showFacePopup && (
            <FaceRegistrationPopup 
              onCapture={(img) => setCapturedImage(img)} 
              onClose={() => setShowFacePopup(false)} 
            />
          )}
 
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '0.6rem 0.85rem', color: '#dc2626', fontSize: '0.8rem', marginBottom: '1rem' }}>⚠️ {error}</div>
          )}
 
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button onClick={onClose} style={{ flex: 1, background: 'none', border: '1.5px solid #e8e4de', borderRadius: 9, padding: '0.68rem', color: '#9a9590', fontFamily: 'Plus Jakarta Sans,sans-serif', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
            <button onClick={handleSubmit} disabled={loading}
              style={{ flex: 2, background: loading ? '#d4b87a' : 'linear-gradient(135deg,#c9a258,#a07830)', border: 'none', borderRadius: 9, padding: '0.68rem', color: '#fff', fontFamily: 'Plus Jakarta Sans,sans-serif', fontSize: '0.85rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 3px 12px rgba(201,162,88,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
              {loading ? '⏳ Enregistrement…' : mode === 'create' ? '✚ Créer l\'utilisateur' : '💾 Sauvegarder'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

/* ══════════════════════════════════════════
   MAIN UTILISATEUR
══════════════════════════════════════════ */
export default function Utilisateur() {
  const [users, setUsers]               = useState<User[]>([])
  const [loading, setLoading]           = useState(true)
  const [modal, setModal]               = useState<'create' | 'edit' | null>(null)
  const [editTarget, setEditTarget]     = useState<User | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [deletingId, setDeletingId]     = useState<number | null>(null)
  const [toast, setToast]               = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [search, setSearch]             = useState('')

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type }); setTimeout(() => setToast(null), 3200)
  }

  const fetchUsers = async () => {
    try {
      const r = await axios.get(`${API_BASE_URL}/User`)
      const d = r.data
      setUsers(Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [])
    } catch { showToast('Impossible de charger les utilisateurs.', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchUsers() }, [])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeletingId(deleteTarget.user_id)
    try {
      await axios.delete(`${API_BASE_URL}/User/${deleteTarget.user_id}`)
      showToast(`Utilisateur «\u00a0${deleteTarget.username}\u00a0» supprimé.`, 'success')
      await fetchUsers()
    } catch { showToast('Échec de la suppression.', 'error') }
    finally { setDeletingId(null); setDeleteTarget(null) }
  }

  const filtered = users.filter(u =>
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase())
  )

  const fmtDate = (d?: string) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 220, color: '#c9a258', gap: '0.6rem', fontSize: '0.9rem' }}>
      <span style={{ animation: 'spin 0.9s linear infinite', display: 'inline-block', fontSize: '1.3rem' }}>⏳</span>
      Chargement des utilisateurs…
      <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <>
      <style>{`
        @keyframes spin   { to { transform:rotate(360deg) } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
        .usr-row { transition:background 0.15s; animation:fadeIn 0.25s ease both; }
        .usr-row:hover { background:#faf8f5 !important; }
      `}</style>

      {modal === 'create' && (
        <UserModal mode="create" onClose={() => setModal(null)}
          onSaved={() => { fetchUsers(); showToast('Utilisateur créé avec succès !', 'success') }} />
      )}
      {modal === 'edit' && editTarget && (
        <UserModal mode="edit" initial={editTarget}
          onClose={() => { setModal(null); setEditTarget(null) }}
          onSaved={() => { fetchUsers(); showToast('Utilisateur mis à jour !', 'success') }} />
      )}
      {deleteTarget && (
        <ConfirmDelete name={deleteTarget.username} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="card">
        {/* Header */}
        <div className="table-header">
          <div>
            <div className="section-title">Utilisateurs</div>
            <div className="section-sub">{users.length} membre{users.length !== 1 ? 's' : ''} dans l'équipe</div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Rechercher…"
              style={{ background: '#faf8f5', border: '1.5px solid #e8e4de', borderRadius: 8, padding: '0.5rem 0.9rem', fontSize: '0.82rem', color: '#1a1a2e', outline: 'none', width: 190, transition: 'border-color 0.15s' }}
              onFocus={e => (e.target.style.borderColor = '#c9a258')}
              onBlur={e => (e.target.style.borderColor = '#e8e4de')}
            />
            <button className="add-btn" onClick={() => setModal('create')}>+ Ajouter un utilisateur</button>
          </div>
        </div>

        {/* Empty state */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', border: '1.5px dashed #e8e4de', borderRadius: 12 }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>👤</div>
            <div style={{ color: '#5a5550', fontWeight: 700, marginBottom: '0.4rem' }}>{search ? 'Aucun résultat' : 'Aucun utilisateur'}</div>
            <div style={{ color: '#b0aba5', fontSize: '0.83rem', marginBottom: '1.25rem' }}>{search ? 'Essayez un autre terme.' : 'Ajoutez votre premier membre.'}</div>
            {!search && <button className="add-btn" onClick={() => setModal('create')}>+ Ajouter un utilisateur</button>}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', minWidth: 620 }}>
              <thead>
                <tr>
                  {['Utilisateur', 'Rôle', 'Email', 'Créé le', 'Actions'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: '#b0aba5', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1.5px solid #f0ede8', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, idx) => {
                  const roleInfo = getRoleInfo(u.role)
                  const isAdmin  = u.role === 'Admin'

                  return (
                    <tr key={u.user_id} className="usr-row"
                      style={{ opacity: deletingId === u.user_id ? 0.4 : 1, animationDelay: `${idx * 0.03}s` }}>

                      {/* Utilisateur */}
                      <td style={{ padding: '0.7rem 0.75rem', borderBottom: '1px solid #faf8f5', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: isAdmin ? 'linear-gradient(135deg,#c9a258,#a07830)' : 'linear-gradient(135deg,#e8e4de,#d4cfc8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isAdmin ? '#1a1a2e' : '#9a9590', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
                            {u.username?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ color: '#1a1a2e', fontWeight: 600, fontSize: '0.88rem' }}>{u.username}</div>
                            <div style={{ color: '#b0aba5', fontSize: '0.7rem', marginTop: 1 }}>ID #{u.user_id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Rôle */}
                      <td style={{ padding: '0.7rem 0.75rem', borderBottom: '1px solid #faf8f5' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: roleInfo.bg, color: roleInfo.color, border: `1px solid ${roleInfo.border}`, borderRadius: 20, padding: '0.2rem 0.7rem', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {roleInfo.icon} {roleInfo.label}
                        </span>
                      </td>

                      {/* Email */}
                      <td style={{ padding: '0.7rem 0.75rem', borderBottom: '1px solid #faf8f5', color: '#9a9590', fontSize: '0.82rem' }}>
                        {u.email || '—'}
                      </td>

                      {/* Date création */}
                      <td style={{ padding: '0.7rem 0.75rem', borderBottom: '1px solid #faf8f5', color: '#9a9590', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                        📅 {fmtDate(u.created_at)}
                      </td>

                      {/* Actions — Admin : boutons désactivés */}
                      <td style={{ padding: '0.7rem 0.75rem', borderBottom: '1px solid #faf8f5' }}>
                        {isAdmin ? (
                          /* Admin protégé — aucune action possible */
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(201,162,88,0.06)', color: '#c9a258', border: '1px solid rgba(201,162,88,0.2)', borderRadius: 20, padding: '0.2rem 0.75rem', fontSize: '0.68rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            🔒 Protégé
                          </span>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            <button
                              onClick={() => { setEditTarget(u); setModal('edit') }}
                              style={{ background: 'none', border: '1px solid #e8e4de', borderRadius: 7, padding: '0.3rem 0.6rem', color: '#9a9590', fontSize: '0.73rem', cursor: 'pointer', transition: 'all 0.15s' }}
                              onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = '#c9a258'; b.style.color = '#c9a258' }}
                              onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = '#e8e4de'; b.style.color = '#9a9590' }}>
                              ✏️
                            </button>
                            <button
                              onClick={() => setDeleteTarget(u)}
                              style={{ background: 'none', border: '1px solid #fca5a5', borderRadius: 7, padding: '0.3rem 0.55rem', color: '#dc2626', fontSize: '0.73rem', cursor: 'pointer', transition: 'background 0.15s' }}
                              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = '#fef2f2')}
                              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'none')}>
                              🗑️
                            </button>
                          </div>
                        )}
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