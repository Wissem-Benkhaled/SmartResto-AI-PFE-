'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { API_BASE_URL } from './Types'

interface HealthIssue {
  id: number
  name: string
  violation_type: string
  violation_date: string
}

export default function IssueSante() {
  const [issues, setIssues] = useState<HealthIssue[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchIssues()
  }, [])

  const fetchIssues = async () => {
    setLoading(true)
    try {
      // API_BASE_URL is usually 'http://localhost:5000'
      const response = await axios.get(`${API_BASE_URL}/Health`)
      setIssues(response.data)
    } catch (error) {
      console.error("Erreur lors de la récupération des logs de santé:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleString('fr-FR', { 
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
  }

  return (
    <div className="card">
      <div className="table-header">
        <div>
          <div className="section-title">Historique des Infractions (Santé & Sécurité)</div>
          <div className="section-sub">Consultez la liste des manquements aux règles de sécurité détectés par l'IA.</div>
        </div>
        <button onClick={fetchIssues} className="add-btn" style={{ background: '#1a1a2e', color: '#fff', boxShadow: 'none' }}>
          ↻ Rafraîchir
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9a9590' }}>Chargement des données...</div>
      ) : issues.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9a9590', background: '#f9fafb', borderRadius: 8 }}>
           Aucune infraction enregistrée dans la base de données.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #ede9e3' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f7f5f2', color: '#5a5550' }}>
                <th style={{ padding: '0.8rem 1rem', borderBottom: '1px solid #ede9e3', fontWeight: 600 }}>ID</th>
                <th style={{ padding: '0.8rem 1rem', borderBottom: '1px solid #ede9e3', fontWeight: 600 }}>Employé</th>
                <th style={{ padding: '0.8rem 1rem', borderBottom: '1px solid #ede9e3', fontWeight: 600 }}>Type d'Infraction</th>
                <th style={{ padding: '0.8rem 1rem', borderBottom: '1px solid #ede9e3', fontWeight: 600 }}>Date & Heure</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((issue) => (
                <tr key={issue.id} style={{ borderBottom: '1px solid #ede9e3', transition: 'background 0.15s' }}>
                  <td style={{ padding: '0.8rem 1rem', color: '#9a9590' }}>#{issue.id}</td>
                  <td style={{ padding: '0.8rem 1rem', fontWeight: 600, color: '#1a1a2e' }}>{issue.name}</td>
                  <td style={{ padding: '0.8rem 1rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.6rem', 
                      borderRadius: 20, 
                      fontSize: '0.75rem', 
                      fontWeight: 700,
                      background: issue.violation_type.toLowerCase().includes('mask') ? '#fef2f2' : '#fff7ed',
                      color: issue.violation_type.toLowerCase().includes('mask') ? '#dc2626' : '#ea580c'
                    }}>
                      {issue.violation_type}
                    </span>
                  </td>
                  <td style={{ padding: '0.8rem 1rem', color: '#5a5550' }}>{formatDate(issue.violation_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}