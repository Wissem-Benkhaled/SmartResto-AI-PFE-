'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const API_BASE_URL = 'http://localhost:5000'

type ForgotStep = 'idle' | 'email' | 'code' | 'success'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // --- Forgot password state ---
  const [forgotStep, setForgotStep] = useState<ForgotStep>('idle')
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotCode, setForgotCode] = useState('')
  const [forgotNewPassword, setForgotNewPassword] = useState('')
  const [forgotError, setForgotError] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/User/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || data.message || 'Identifiants incorrects.')
        return
      }

      // ✅ Sauvegarde du user (avec ou sans token)
      if (data.token) {
        sessionStorage.setItem('auth_token', data.token)
        localStorage.setItem('token', data.token)
      }
      if (data.user) {
        sessionStorage.setItem('auth_user', JSON.stringify(data.user))
        localStorage.setItem('user', JSON.stringify(data.user))
      }

      const role = String(data.user?.role_id ?? '').trim()

      if (role === '1') {
        router.push('http://localhost:3002/dashboard')
        return
      }

      if (role === '2') {
        router.push('http://localhost:3001')
        return
      }

      if (role === '3') {
        router.push('http://localhost:5173')
        return
      }

      setError("Votre compte n'est pas associé à un rôle valide.")
      sessionStorage.clear()
      localStorage.clear()
    } catch (err) {
      setError('Impossible de contacter le serveur. Vérifiez votre connexion.')
    } finally {
      setLoading(false)
    }
  }

  // --- Forgot password handlers ---
  const handleSendCode = async (e: any) => {
    e.preventDefault()
    setForgotError('')
    setForgotLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/User/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      })
      const data = await response.json()
      if (!response.ok) {
        setForgotError(data.error || data.message || 'Adresse introuvable.')
        return
      }
      setForgotStep('code')
    } catch {
      setForgotError('Impossible de contacter le serveur.')
    } finally {
      setForgotLoading(false)
    }
  }

  const handleVerifyCode = async (e: any) => {
    e.preventDefault()
    setForgotError('')
    setForgotLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/User/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, code: forgotCode, newPassword: forgotNewPassword }),
      })
      const data = await response.json()
      if (!response.ok) {
        setForgotError(data.error || data.message || 'Code invalide ou expiré.')
        return
      }
      setForgotStep('success')
    } catch {
      setForgotError('Impossible de contacter le serveur.')
    } finally {
      setForgotLoading(false)
    }
  }

  const closeForgot = () => {
    setForgotStep('idle')
    setForgotEmail('')
    setForgotCode('')
    setForgotNewPassword('')
    setForgotError('')
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap');

        :root {
          --bg-light: #ecf0f1;
          --primary: #3498db;
          --primary-dark: #2980b9;
          --accent: #1abc9c;
          --accent-dark: #16a085;
          --text-dark: #2c3e50;
          --muted: #7f8c8d;
          --border: #bdc3c7;
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-light);
          font-family: 'Plus Jakarta Sans', sans-serif;
          padding: 3rem;
        }

        .card { width: 100%; max-width: 390px; }

        .card-eyebrow {
          font-size: 0.72rem;
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-weight: 600;
          margin-bottom: 0.6rem;
        }

        .card-title {
          font-family: 'Playfair Display', serif;
          font-size: 2.4rem;
          font-weight: 700;
          color: var(--text-dark);
          margin-bottom: 0.4rem;
          letter-spacing: -0.02em;
        }

        .card-sub {
          font-size: 0.88rem;
          color: var(--muted);
          margin-bottom: 2.5rem;
          font-weight: 300;
        }

        .divider {
          width: 48px; height: 3px;
          background: linear-gradient(90deg, var(--primary), var(--primary-dark));
          border-radius: 2px;
          margin-bottom: 2.5rem;
        }

        .form { display: flex; flex-direction: column; gap: 1.25rem; }

        .field { display: flex; flex-direction: column; gap: 0.45rem; }

        .field label {
          font-size: 0.75rem;
          color: var(--text-dark);
          text-transform: uppercase;
          letter-spacing: 0.09em;
          font-weight: 600;
        }

        .field input {
          background: #ffffff;
          border: 1.5px solid var(--border);
          border-radius: 10px;
          padding: 0.88rem 1.1rem;
          color: var(--text-dark);
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.92rem;
          transition: border-color 0.2s, box-shadow 0.2s;
          outline: none;
          width: 100%;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }

        .field input::placeholder { color: #c8c4be; }

        .field input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(52,152,219,0.12);
        }

        /* ── Forgot link ── */
        .forgot { text-align: right; margin-top: -0.5rem; }
        .forgot button {
          background: none;
          border: none;
          padding: 0;
          font-size: 0.78rem;
          color: var(--primary);
          font-weight: 500;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .forgot button:hover { text-decoration: underline; }

        .error {
          font-size: 0.83rem;
          color: #c0392b;
          padding: 0.7rem 1rem;
          background: #fdf0ef;
          border: 1.5px solid #f5c6c2;
          border-radius: 9px;
        }

        .btn {
          width: 100%;
          padding: 0.95rem;
          border: none;
          border-radius: 10px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.9rem;
          font-weight: 600;
          letter-spacing: 0.04em;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.2s, opacity 0.2s;
          display: flex; align-items: center; justify-content: center;
          min-height: 50px;
          margin-top: 0.5rem;
          background: linear-gradient(135deg, var(--accent), var(--accent-dark));
          box-shadow: 0 4px 15px rgba(26,188,156,0.3);
          color: #fff;
        }

        .btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(26,188,156,0.4);
        }
        .btn:active:not(:disabled) { transform: translateY(0); }
        .btn:disabled { opacity: 0.55; cursor: not-allowed; }

        .btn-secondary {
          background: transparent;
          border: 1.5px solid var(--border);
          color: var(--muted);
          box-shadow: none;
          margin-top: 0;
        }
        .btn-secondary:hover:not(:disabled) {
          border-color: var(--primary);
          color: var(--primary);
          box-shadow: none;
          transform: none;
        }

        .spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ──────────────────────────────────────────
           FORGOT PASSWORD PANEL
        ────────────────────────────────────────── */
        .forgot-overlay {
          position: fixed;
          inset: 0;
          background: rgba(44,62,80,0.45);
          backdrop-filter: blur(3px);
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          animation: fadeIn 0.22s ease;
        }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

        .forgot-panel {
          background: #fff;
          border-radius: 18px;
          padding: 2.2rem 2rem;
          width: 100%;
          max-width: 380px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.18);
          animation: slideUp 0.28s cubic-bezier(0.34,1.56,0.64,1);
          position: relative;
        }
        @keyframes slideUp {
          from { transform: translateY(28px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }

        .forgot-close {
          position: absolute;
          top: 1.1rem; right: 1.2rem;
          background: none;
          border: none;
          font-size: 1.3rem;
          color: var(--muted);
          cursor: pointer;
          line-height: 1;
          padding: 0.2rem 0.4rem;
          border-radius: 6px;
          transition: background 0.15s, color 0.15s;
        }
        .forgot-close:hover { background: #f0f0f0; color: var(--text-dark); }

        .forgot-icon {
          width: 52px; height: 52px;
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.6rem;
          margin-bottom: 1.2rem;
        }
        .forgot-icon.blue  { background: #eaf4fd; }
        .forgot-icon.green { background: #eafaf6; }
        .forgot-icon.check { background: #eafaf6; }

        .forgot-title {
          font-family: 'Playfair Display', serif;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-dark);
          margin-bottom: 0.35rem;
        }

        .forgot-desc {
          font-size: 0.84rem;
          color: var(--muted);
          line-height: 1.6;
          margin-bottom: 1.6rem;
        }

        .forgot-desc strong { color: var(--text-dark); font-weight: 600; }

        .forgot-steps {
          display: flex;
          gap: 0.4rem;
          margin-bottom: 1.6rem;
        }
        .step-dot {
          height: 4px;
          border-radius: 2px;
          flex: 1;
          background: var(--border);
          transition: background 0.3s;
        }
        .step-dot.active { background: var(--primary); }
        .step-dot.done   { background: var(--accent); }

        .forgot-hint {
          font-size: 0.76rem;
          color: var(--muted);
          margin-top: 0.9rem;
          display: flex;
          align-items: flex-start;
          gap: 0.4rem;
          line-height: 1.5;
        }
        .forgot-hint span { font-size: 0.9rem; flex-shrink: 0; margin-top: 0.05rem; }

        .forgot-resend {
          text-align: center;
          margin-top: 1rem;
          font-size: 0.8rem;
          color: var(--muted);
        }
        .forgot-resend button {
          background: none; border: none;
          color: var(--primary);
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 600;
          font-family: 'Plus Jakarta Sans', sans-serif;
          padding: 0;
        }
        .forgot-resend button:hover { text-decoration: underline; }

        .success-check {
          font-size: 2.5rem;
          text-align: center;
          margin-bottom: 0.5rem;
        }

        .forgot-form { display: flex; flex-direction: column; gap: 1rem; }

        /* ── Code input special style ── */
        .code-input {
          text-align: center !important;
          font-size: 1.6rem !important;
          letter-spacing: 0.35em !important;
          font-weight: 700 !important;
          padding: 0.9rem 1rem !important;
          color: var(--text-dark) !important;
        }

        /* ── Footer ── */
        .footer {
          margin-top: 2rem;
          text-align: center;
          font-size: 0.85rem;
          color: var(--muted);
        }
        .footer a {
          color: var(--accent);
          text-decoration: none;
          font-weight: 600;
        }
        .footer a:hover { text-decoration: underline; }
      `}</style>

      <div className="page">
        <div className="card">
          <div className="card-eyebrow">Espace Admin</div>
          <h2 className="card-title">Connexion</h2>
          <p className="card-sub">Accédez à votre tableau de bord</p>
          <div className="divider" />

          <form className="form" onSubmit={handleSubmit}>
            <div className="field">
              <label>Adresse e-mail</label>
              <input
                type="email"
                placeholder="admin@restaurant.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Mot de passe</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {/* ── Forgot link → opens panel ── */}
            <div className="forgot">
              <button type="button" onClick={() => setForgotStep('email')}>
                Mot de passe oublié ?
              </button>
            </div>

            {error && <div className="error">{error}</div>}
            <button type="submit" className="btn" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Se connecter →'}
            </button>
          </form>

          <div className="footer">
            Pas encore de compte ?{' '}
            <Link href="/sign-up">Créer un compte</Link>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          FORGOT PASSWORD MODAL
      ══════════════════════════════════════════ */}
      {forgotStep !== 'idle' && (
        <div className="forgot-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeForgot() }}>
          <div className="forgot-panel">
            <button className="forgot-close" onClick={closeForgot} aria-label="Fermer">✕</button>

            {/* ── Step indicators ── */}
            {forgotStep !== 'success' && (
              <div className="forgot-steps">
                <div className={`step-dot ${forgotStep === 'email' ? 'active' : 'done'}`} />
                <div className={`step-dot ${forgotStep === 'code' ? 'active' : forgotStep === 'email' ? '' : 'done'}`} />
              </div>
            )}

            {/* ══ STEP 1 : Saisie e-mail ══ */}
            {forgotStep === 'email' && (
              <>

                <div className="forgot-title">Mot de passe oublié</div>
                <p className="forgot-desc">
                  Pas de panique ! Entrez votre adresse e-mail et nous vous enverrons un <strong>code de vérification à 6 chiffres</strong> pour réinitialiser votre mot de passe.
                </p>

                <form className="forgot-form" onSubmit={handleSendCode}>
                  <div className="field">
                    <label>Adresse e-mail</label>
                    <input
                      type="email"
                      placeholder="admin@restaurant.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>

                  {forgotError && <div className="error">{forgotError}</div>}

                  <button type="submit" className="btn" disabled={forgotLoading}>
                    {forgotLoading ? <span className="spinner" /> : 'Envoyer le code →'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={closeForgot}>
                    Annuler
                  </button>
                </form>

                <div className="forgot-hint">
                  <span>ℹ️</span>
                  Vérifiez votre dossier [Spam] si vous ne recevez pas l'e-mail dans les 2 minutes.
                </div>
              </>
            )}

            {/* ══ STEP 2 : Code + nouveau mot de passe ══ */}
            {forgotStep === 'code' && (
              <>

                <div className="forgot-title">Vérification</div>
                <p className="forgot-desc">
                  Un code à 6 chiffres a été envoyé à <strong>{forgotEmail}</strong>. Saisissez-le ci-dessous et choisissez un nouveau mot de passe.
                </p>

                <form className="forgot-form" onSubmit={handleVerifyCode}>
                  <div className="field">
                    <label>Code de confirmation</label>
                    <input
                      className="code-input"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      value={forgotCode}
                      onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, ''))}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="field">
                    <label>Nouveau mot de passe</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                  </div>

                  {forgotError && <div className="error">{forgotError}</div>}

                  <button type="submit" className="btn" disabled={forgotLoading || forgotCode.length < 6}>
                    {forgotLoading ? <span className="spinner" /> : 'Confirmer →'}
                  </button>
                </form>

                <div className="forgot-resend">
                  Code non reçu ?{' '}
                  <button type="button" onClick={() => { setForgotStep('email'); setForgotError('') }}>
                    Renvoyer
                  </button>
                </div>

                <div className="forgot-hint">

                  Le code expire dans <strong>10 minutes</strong>. Au-delà, recommencez la procédure.
                </div>
              </>
            )}

            {/* ══ STEP 3 : Succès ══ */}
            {forgotStep === 'success' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                <div className="forgot-title" style={{ textAlign: 'center' }}>Mot de passe réinitialisé !</div>
                <p className="forgot-desc" style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                  Votre mot de passe a été mis à jour avec succès. Vous pouvez maintenant vous connecter avec vos nouveaux identifiants.
                </p>
                <button
                  className="btn"
                  style={{ marginTop: '0.5rem' }}
                  onClick={closeForgot}
                >
                  Retour à la connexion →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}