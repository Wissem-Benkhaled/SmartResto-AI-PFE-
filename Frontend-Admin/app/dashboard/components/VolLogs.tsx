'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { API_BASE_URL } from './Types'

interface VolLog {
  id: number
  theft_date: string
  filename?: string
  imageUrl?: string
}

export default function VolLogs() {
  const [logs, setLogs] = useState<VolLog[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<VolLog | null>(null)
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    fetchLogs()
    const onNewLog = () => fetchLogs()
    window.addEventListener('vol-log-updated', onNewLog)
    return () => window.removeEventListener('vol-log-updated', onNewLog)
  }, [])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/VolLogs`)
      setLogs(response.data)
    } catch (error) {
      console.error('Erreur lors de la récupération des vols:', error)
    } finally {
      setLoading(false)
    }
  }

  const STATIC_IMAGE_BASE_URL = 'http://127.0.0.1:8000'

  const isAbsoluteUrl = (value: string): boolean =>
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('blob:') ||
    value.startsWith('data:')

  const extractFilename = (value: string): string => {
    if (!value) return ''

    const normalized = value.replace(/\\/g, '/')
    if (normalized.includes('/movement_logs/')) {
      return normalized.split('/movement_logs/').pop() || ''
    }

    if (normalized.includes('/logs/')) {
      return normalized.split('/logs/').pop() || ''
    }

    return normalized.split('/').pop() || normalized
  }

  /**
   * Construit l'URL de l'image exposée par FastAPI.
   * Le backend monte le dossier movement_logs sur /logs, donc
   * le navigateur doit charger: http://127.0.0.1:8000/logs/<fichier>
   */
  const getImageUrl = (filename: string): string => {
    if (!filename) return ''
    if (isAbsoluteUrl(filename)) {
      return filename
    }

    const normalized = filename.replace(/\\/g, '/')
    if (normalized.startsWith('uploads/')) {
      return `${API_BASE_URL}/${normalized}`
    }

    const imageFile = extractFilename(normalized)
    return `${STATIC_IMAGE_BASE_URL}/logs/${encodeURIComponent(imageFile)}`
  }

  const getDisplayFilename = (log: VolLog): string => {
    return extractFilename(log.filename || log.imageUrl || '')
  }

  const handleShowImage = (log: VolLog) => {
    setImgError(false)
    setSelectedLog(log)
  }

  const handleCloseModal = () => {
    setSelectedLog(null)
    setImgError(false)
  }

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return 'Date inconnue'
    const d = new Date(dateStr)
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const selectedFilename = selectedLog ? getDisplayFilename(selectedLog) : null
  const selectedImageUrl  = selectedFilename ? getImageUrl(selectedFilename) : ''

  return (
    <div className="card">
      {/* ── En-tête ── */}
      <div className="table-header">
        <div>
          <div className="section-title">Historique des Vols (Mouvements Suspects)</div>
          <div className="section-sub">
            Consultez la liste et l'heure précise des mouvements non-autorisés détectés par la caméra 24/7.
          </div>
        </div>
        <button
          onClick={fetchLogs}
          className="add-btn"
          style={{ background: '#1a1a2e', color: '#fff', boxShadow: 'none' }}
        >
          ↻ Rafraîchir
        </button>
      </div>

      {/* ── Contenu ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9a9590' }}>
          Chargement des données...
        </div>
      ) : logs.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem',
            color: '#9a9590',
            background: '#f9fafb',
            borderRadius: 8,
          }}
        >
          Aucun mouvement suspect enregistré dans la base de données. Vous êtes en sécurité !
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #ede9e3' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.85rem',
            }}
          >
            <thead>
              <tr style={{ background: '#f7f5f2', color: '#5a5550' }}>
                <th style={{ padding: '0.8rem 1rem', borderBottom: '1px solid #ede9e3', fontWeight: 600 }}>
                  ID Alerte
                </th>
                <th style={{ padding: '0.8rem 1rem', borderBottom: '1px solid #ede9e3', fontWeight: 600 }}>
                  Date &amp; Heure Infiltration
                </th>
                <th style={{ padding: '0.8rem 1rem', borderBottom: '1px solid #ede9e3', fontWeight: 600 }}>
                  Niveau de menace
                </th>
           
                <th style={{ padding: '0.8rem 1rem', borderBottom: '1px solid #ede9e3', fontWeight: 600 }}>
                 Image détectée
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const filename = getDisplayFilename(log)
                return (
                  <tr
                    key={log.id}
                    style={{ borderBottom: '1px solid #ede9e3', transition: 'background 0.15s' }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = '#fafaf9')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = 'transparent')
                    }
                  >
                    {/* ID */}
                    <td style={{ padding: '0.8rem 1rem', color: '#9a9590' }}>#{log.id}</td>

                    {/* Date */}
                    <td style={{ padding: '0.8rem 1rem', fontWeight: 600, color: '#1a1a2e' }}>
                      {formatDate(log.theft_date)}
                    </td>

                    {/* Badge menace */}
                    <td style={{ padding: '0.8rem 1rem' }}>
                      <span
                        style={{
                          padding: '0.25rem 0.6rem',
                          borderRadius: 20,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: '#fef2f2',
                          color: '#dc2626',
                        }}
                      >
                        Mouvement Suspect Détecté
                      </span>
                    </td>

  
                    {/* Bouton voir */}
                    <td style={{ padding: '0.8rem 1rem' }}>
                      {filename ? (
                        <button
                          type="button"
                          onClick={() => handleShowImage(log)}
                          style={{
                            background: '#1a1a2e',
                            color: '#fff',
                            border: 'none',
                            padding: '0.35rem 0.8rem',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            transition: 'opacity 0.15s',
                          }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '0.8')}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '1')}
                        >
                          <span style={{ fontSize: '0.95rem' }}>🖼️</span> Voir
                        </button>
                      ) : (
                        <span style={{ color: '#c0bbb5', fontSize: '0.85rem' }}>Aucune image</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal image ── */}
      {selectedLog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Aperçu de l'image détectée"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={handleCloseModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 16,
              maxWidth: '92%',
              width: 760,
              boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
              overflow: 'hidden',
            }}
          >
            {/* En-tête modal */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                padding: '1rem 1.25rem',
                borderBottom: '1px solid #e5e7eb',
              }}
            >
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>
                  Image détectée
                </div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 2 }}>
                  <span style={{ fontWeight: 600, color: '#374151' }}>Alerte #{selectedLog.id}</span>
                  &nbsp;—&nbsp;{formatDate(selectedLog.theft_date)}
                </div>
             
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, marginLeft: 12 }}>
        
                <button
                  type="button"
                  onClick={handleCloseModal}
                  style={{
                    background: '#f3f4f6',
                    border: 'none',
                    fontSize: '1.25rem',
                    lineHeight: 1,
                    color: '#6b7280',
                    cursor: 'pointer',
                    borderRadius: 8,
                    width: 36,
                    height: 36,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  aria-label="Fermer la modal"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Corps image */}
            <div
              style={{
                background: '#0f172a',
                padding: 24,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: 260,
              }}
            >
              {imgError ? (
                <div
                  style={{
                    textAlign: 'center',
                    color: '#ef4444',
                    padding: '2rem',
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>⚠️</div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Image introuvable</div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                    {selectedImageUrl}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 8 }}>
                    Vérifiez que le middleware Express sert bien le dossier movement_logs.
                  </div>
                </div>
              ) : (
                <img
                  src={selectedImageUrl}
                  alt={`Capture mouvement #${selectedLog.id}`}
                  onError={() => setImgError(true)}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '75vh',
                    borderRadius: 10,
                    objectFit: 'contain',
                  }}
                />
              )}
            </div>

            {/* Pied de modal — badge menace */}
            <div
              style={{
                padding: '0.75rem 1.25rem',
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: '#fef2f2',
              }}
            >
              <span
                style={{
                  padding: '0.2rem 0.6rem',
                  borderRadius: 20,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  background: '#fee2e2',
                  color: '#dc2626',
                }}
              >
                🔴 Mouvement Suspect Détecté
              </span>
              <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>
                Image capturée automatiquement par le système de surveillance 24/7
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}