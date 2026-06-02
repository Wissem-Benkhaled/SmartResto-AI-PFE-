'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

const API_BASE_URL = 'http://localhost:5000'

export default function SignUp() {
  const router = useRouter()
  const [form, setForm] = useState({ nom: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    if (form.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }

    setLoading(true)
    try {
      await axios.post(`${API_BASE_URL}/User`, {
        username: form.nom,
        email: form.email,
        password: form.password,
        role: form.nom.toLowerCase().includes('caissier') ? 'Caissier' :form.nom.toLowerCase().includes('chef') ? 'Chef' : 'Utilisateur',
      })

      setSuccess(true)
      setTimeout(() => router.push('/sign-in'), 1500)
    } catch (err: any) {
      const resp = err?.response?.data
      if (resp?.detail) setError(String(resp.detail))
      if (resp?.error) setError(String(resp.error))
      else if (resp?.message) setError(String(resp.message))
      else setError('Erreur lors de l\'inscription.')
      // catch (err: any) {
      // const resp = err?.response?.data
      // if (resp?.detail) setError(String(resp.detail))
      // else if (resp?.message && resp.message !== 'Database error') setError(String(resp.message))
      // else if (resp?.error && resp.error !== 'Database error') setError(String(resp.error))
      // else if (resp?.message) setError(String(resp.message))
      // else if (resp?.error) setError(String(resp.error))
      // else setError('Erreur lors de l\'inscription.')
    } finally {
      setLoading(false)
    }
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

        .card { width: 100%; max-width: 410px; }

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
          font-size: 2.3rem;
          font-weight: 700;
          color: var(--text-dark);
          margin-bottom: 0.4rem;
          letter-spacing: -0.02em;
        }

        .card-sub {
          font-size: 0.88rem;
          color: var(--muted);
          margin-bottom: 2rem;
          font-weight: 300;
        }

        .divider {
          width: 48px; height: 3px;
          background: linear-gradient(90deg, var(--primary), var(--primary-dark));
          border-radius: 2px;
          margin-bottom: 2rem;
        }

        .form { display: flex; flex-direction: column; gap: 1.1rem; }

        .field { display: flex; flex-direction: column; gap: 0.4rem; }

        .field label {
          font-size: 0.74rem;
          color: var(--text-dark);
          text-transform: uppercase;
          letter-spacing: 0.09em;
          font-weight: 600;
        }

        .field input {
          background: #ffffff;
          border: 1.5px solid var(--border);
          border-radius: 10px;
          padding: 0.82rem 1rem;
          color: var(--text-dark);
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.9rem;
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

        .error {
          font-size: 0.83rem;
          color: #c0392b;
          padding: 0.7rem 1rem;
          background: #fdf0ef;
          border: 1.5px solid #f5c6c2;
          border-radius: 9px;
        }

        .success {
          font-size: 0.83rem;
          color: #1a7a4a;
          padding: 0.7rem 1rem;
          background: #eafaf1;
          border: 1.5px solid #a9dfbf;
          border-radius: 9px;
          text-align: center;
          font-weight: 500;
        }

        .btn {
          width: 100%;
          padding: 0.95rem;
          background: linear-gradient(135deg, var(--primary), var(--primary-dark));
          border: none;
          border-radius: 10px;
          color: #ffffff;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.9rem;
          font-weight: 600;
          letter-spacing: 0.04em;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.2s, opacity 0.2s;
          display: flex; align-items: center; justify-content: center;
          min-height: 50px;
          margin-top: 0.5rem;
          box-shadow: 0 4px 15px rgba(52,152,219,0.25);
        }

        .btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(52,152,219,0.35);
        }
        .btn:disabled { opacity: 0.55; cursor: not-allowed; }

        .spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .footer {
          margin-top: 1.75rem;
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
          <h2 className="card-title">Créer un compte</h2>
          <p className="card-sub">Remplissez les informations pour commencer</p>
          <div className="divider" />

          <form className="form" onSubmit={handleSubmit}>
            <div className="field">
              <label>Nom d'utilisateur</label>
              <input
                type="text"
                placeholder="Saisir votre nom d'utilisateur"
                value={form.nom}
                onChange={e => update('nom', e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Adresse e-mail</label>
              <input
                type="email"
                placeholder="admin@restaurant.com"
                value={form.email}
                onChange={e => update('email', e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Mot de passe</label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => update('password', e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Confirmer le mot de passe</label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.confirm}
                onChange={e => update('confirm', e.target.value)}
                required
              />
            </div>

            {error && <div className="error">{error}</div>}
            {success && <div className="success">✓ Compte créé ! Redirection en cours...</div>}

            <button type="submit" className="btn" disabled={loading || success}>
              {loading ? <span className="spinner" /> : 'Créer mon compte →'}
            </button>
          </form>

          <div className="footer">
            Déjà un compte ?{' '}
            <Link href="/sign-in">Se connecter</Link>
          </div>
        </div>
      </div>
    </>
  )
}