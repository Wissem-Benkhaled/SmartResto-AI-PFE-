'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { API_BASE_URL } from './Types'

interface User {
  user_id: number
  username: string
  email: string
  role: string
}

interface PointeuseLog {
  id: number
  name: string
  action: string
  action_date: string
  status?: string
  is_paid?: boolean
}

export default function PointeuseLogs() {
  const [logs, setLogs] = useState<PointeuseLog[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDateStr, setSelectedDateStr] = useState('')

  // Cache helper for local timezone string extraction YYYY-MM-DD
  const getLocalDateStr = (date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // Parse action_date timestamp string from db to local YYYY-MM-DD
  const parseDbDateStr = (dbDateStr: string) => {
    const d = new Date(dbDateStr)
    if (isNaN(d.getTime())) return ''
    return getLocalDateStr(d)
  }

  // Format date for details header (e.g. "Jeudi 21 Mai 2026")
  const formatLongDate = (dateStr: string) => {
    if (!dateStr) return ''
    const parts = dateStr.split('-')
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  useEffect(() => {
    setSelectedDateStr(getLocalDateStr(new Date()))
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [logsRes, usersRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/PointeuseLogs`),
        axios.get(`${API_BASE_URL}/User`)
      ])
      
      setLogs(logsRes.data)
      
      const usersData = usersRes.data
      const usersList = Array.isArray(usersData)
        ? usersData
        : (Array.isArray(usersData?.data) ? usersData.data : [])
      setUsers(usersList)
    } catch (error) {
      console.error("Erreur de récupération des données:", error)
    } finally {
      setLoading(false)
    }
  }

  // Calendar calculations
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const MONTH_NAMES = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ]

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  // Monday-start grid math
  let firstDayIndex = new Date(year, month, 1).getDay()
  firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1 // Sunday=0, convert Monday to 0
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Generate days array
  const dayCells: (number | null)[] = []
  for (let i = 0; i < firstDayIndex; i++) {
    dayCells.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    dayCells.push(i)
  }

  // Filter logs for selected day
  const selectedLogs = logs.filter(log => parseDbDateStr(log.action_date) === selectedDateStr)

  // Group logs by worker username for selected day
  interface GroupedLogs {
    [username: string]: PointeuseLog[]
  }
  const logsByEmployee: GroupedLogs = {}
  selectedLogs.forEach(log => {
    // Standardize key name comparison
    const key = log.name.trim()
    if (!logsByEmployee[key]) {
      logsByEmployee[key] = []
    }
    logsByEmployee[key].push(log)
  })

  // Sort logs of each worker chronologically
  Object.keys(logsByEmployee).forEach(key => {
    logsByEmployee[key].sort((a, b) => new Date(a.action_date).getTime() - new Date(b.action_date).getTime())
  })

  // Identify who didn't check in on selected day
  const presentKeys = Object.keys(logsByEmployee).map(k => k.toLowerCase())
  const absents = users.filter(user => {
    const normUser = user.username.trim().toLowerCase()
    return !presentKeys.includes(normUser)
  })

  // Avatar generation helper
  const avatarColors = ['#e0e7ff', '#fce7f3', '#dcfce7', '#fef3c7', '#ffedd5', '#f3e8ff']
  const textColors = ['#3730a3', '#9d174d', '#166534', '#92400e', '#9a3412', '#6b21a8']
  const getAvatarStyle = (name: string) => {
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    const index = Math.abs(hash) % avatarColors.length
    return { bg: avatarColors[index], text: textColors[index] }
  }

  // Translate status key to French
  const getStatusBadge = (status?: string) => {
    const s = status?.toUpperCase() || 'REGULAR'
    switch (s) {
      case 'REGULAR':
        return <span style={{ padding: '0.25rem 0.6rem', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700, background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }}>À l'heure</span>
      case 'LATE':
        return <span style={{ padding: '0.25rem 0.6rem', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700, background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}>En retard</span>
      case 'EARLY_ARRIVAL':
        return <span style={{ padding: '0.25rem 0.6rem', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700, background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' }}>Arrivée Anticipée</span>
      case 'EARLY_LEAVE':
        return <span style={{ padding: '0.25rem 0.6rem', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700, background: '#ffedd5', color: '#c2410c', border: '1px solid #fed7aa' }}>Départ Anticipé</span>
      case 'ALREADY_DONE':
        return <span style={{ padding: '0.25rem 0.6rem', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700, background: '#f3f4f6', color: '#4b5563', border: '1px solid #e5e7eb' }}>Déjà enregistré</span>
      default:
        return <span style={{ padding: '0.25rem 0.6rem', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700, background: '#f3f4f6', color: '#4b5563', border: '1px solid #e5e7eb' }}>{s}</span>
    }
  }

  const getPaidBadge = (isPaid?: boolean) => {
    if (isPaid === false) {
      return <span style={{ padding: '0.25rem 0.6rem', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700, background: '#fef3c7', color: '#b45309', border: '1px dashed #fcd34d' }}>Non Payé</span>
    }
    return <span style={{ padding: '0.25rem 0.6rem', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700, background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>Payé</span>
  }

  const todayStr = getLocalDateStr(new Date())

  // Earliest date we have any log — nothing before this can be audited
  const firstLogDateStr = logs.length > 0
    ? logs.reduce((min, log) => {
        const d = parseDbDateStr(log.action_date)
        return d && d < min ? d : min
      }, parseDbDateStr(logs[0].action_date))
    : todayStr

  return (
    <div className="card" style={{ borderTop: '4px solid #c9a258', padding: '2rem' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #ede9e3', paddingBottom: '1.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div className="section-title">Calendrier des Présences</div>
          <div className="section-sub">Vue mensuelle interactive. Sélectionnez un jour pour auditer les présents et les absents.</div>
        </div>
        <button onClick={fetchData} className="add-btn" style={{ background: '#1a1a2e', color: '#fff', boxShadow: '0 4px 6px rgba(26,26,46,0.15)', cursor: 'pointer' }}>
          ↻ Actualiser
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: '#9a9590' }}>
          <div style={{ animation: 'spin 1s linear infinite', display: 'inline-block', fontSize: '1.8rem', marginBottom: '1rem' }}>⏳</div>
          <div>Chargement du registre et de l'équipe...</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
          
          {/* LEFT COLUMN: Calendar Grid */}
          <div style={{ flex: '1.3', minWidth: '320px' }}>
            
            {/* Calendar Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: '#faf8f5', padding: '0.8rem 1.2rem', borderRadius: 12, border: '1px solid #e8e4de' }}>
              <button onClick={handlePrevMonth} style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#1a1a2e', fontWeight: 'bold', padding: '0.2rem 0.5rem' }}>◀</button>
              <div style={{ fontWeight: 800, color: '#1a1a2e', fontSize: '1.1rem', textTransform: 'capitalize' }}>
                {MONTH_NAMES[month]} {year}
              </div>
              <button onClick={handleNextMonth} style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#1a1a2e', fontWeight: 'bold', padding: '0.2rem 0.5rem' }}>▶</button>
            </div>

            {/* Weekdays Header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', textAlign: 'center', fontWeight: 700, fontSize: '0.78rem', color: '#88827a', marginBottom: '0.5rem' }}>
              <div>LUN</div>
              <div>MAR</div>
              <div>MER</div>
              <div>JEU</div>
              <div>VEN</div>
              <div>SAM</div>
              <div>DIM</div>
            </div>

            {/* Days Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
              {dayCells.map((dayNum, idx) => {
                if (dayNum === null) {
                  return <div key={`empty-${idx}`} style={{ aspectRatio: '1.1/1', background: 'transparent' }} />
                }

                const dayDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                const isSelected = dayDateStr === selectedDateStr
                const isToday = dayDateStr === todayStr

                // Disable future days and days before first log
                const isFuture = dayDateStr > todayStr
                const isBeforeStart = firstLogDateStr ? dayDateStr < firstLogDateStr : false
                const isDisabled = isFuture || isBeforeStart

                // Calculate logs statistics for this day (only for non-disabled days)
                const dayLogs = !isDisabled ? logs.filter(log => parseDbDateStr(log.action_date) === dayDateStr) : []
                const uniqueWorkers = new Set(dayLogs.map(l => l.name.trim().toLowerCase())).size

                return (
                  <div
                    key={`day-${dayNum}`}
                    onClick={() => !isDisabled && setSelectedDateStr(dayDateStr)}
                    title={isFuture ? 'Jour futur' : isBeforeStart ? 'Avant le début du suivi' : undefined}
                    style={{
                      aspectRatio: '1.1/1',
                      borderRadius: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      padding: '0.5rem',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      border: isDisabled
                        ? '1px solid #f0ede8'
                        : isSelected
                          ? '2px solid #c9a258'
                          : (isToday ? '2px dashed #c9a258' : '1px solid #e8e4de'),
                      background: isDisabled
                        ? (isFuture ? 'repeating-linear-gradient(135deg, #fafafa 0px, #fafafa 4px, #f5f5f5 4px, #f5f5f5 8px)' : '#f7f5f2')
                        : isSelected
                          ? '#c9a258'
                          : (isToday ? 'rgba(201,162,88,0.06)' : '#fff'),
                      color: isDisabled ? '#d1ccc7' : (isSelected ? '#fff' : '#1a1a2e'),
                      opacity: isDisabled ? 0.55 : 1,
                      transition: 'all 0.2s ease',
                      boxShadow: isSelected ? '0 8px 16px rgba(201,162,88,0.2)' : 'none',
                      userSelect: 'none'
                    }}
                    onMouseOver={(e) => {
                      if (!isDisabled && !isSelected) e.currentTarget.style.backgroundColor = '#faf8f5'
                    }}
                    onMouseOut={(e) => {
                      if (!isDisabled && !isSelected) {
                        e.currentTarget.style.backgroundColor = isToday ? 'rgba(201,162,88,0.06)' : '#fff'
                      }
                    }}
                  >
                    {/* Day number */}
                    <div style={{ fontWeight: isDisabled ? 500 : 800, fontSize: '0.95rem', alignSelf: 'flex-start' }}>
                      {dayNum}
                    </div>

                    {/* Future icon */}
                    {isFuture && (
                      <div style={{ fontSize: '0.6rem', color: '#d1ccc7', alignSelf: 'flex-end' }}>🔒</div>
                    )}

                    {/* Check-ins tag — only for valid past days */}
                    {!isDisabled && uniqueWorkers > 0 && (
                      <div style={{ 
                         fontSize: '0.65rem', 
                         fontWeight: 800, 
                         background: isSelected ? 'rgba(255,255,255,0.25)' : '#ecfccb', 
                         color: isSelected ? '#fff' : '#3f6212',
                         borderRadius: 6,
                         padding: '0.1rem 0.3rem',
                         textAlign: 'center',
                         alignSelf: 'stretch',
                         whiteSpace: 'nowrap',
                         overflow: 'hidden',
                         textOverflow: 'ellipsis'
                      }}>
                        {uniqueWorkers} pointé{uniqueWorkers > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: Selected Day Details */}
          <div style={{ flex: '1', minWidth: '320px', background: '#faf9f6', borderRadius: 16, border: '1px solid #ede9e3', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Header / Date text */}
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#c9a258', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>
                JOURNÉE DU AUDITÉE
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1a1a2e', textTransform: 'capitalize' }}>
                {formatLongDate(selectedDateStr)}
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.6rem', fontSize: '0.8rem', fontWeight: 700 }}>
                <span style={{ color: '#16a34a' }}>● {Object.keys(logsByEmployee).length} Présent(s)</span>
                <span style={{ color: '#dc2626' }}>● {absents.length} Absent(s)</span>
              </div>
            </div>

            {/* PRESENTS LIST */}
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#88827a', borderBottom: '1px solid #e8e4de', paddingBottom: '0.4rem', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Présents ({Object.keys(logsByEmployee).length})
              </div>
              
              {Object.keys(logsByEmployee).length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: '#9a9590', padding: '1rem 0', fontStyle: 'italic' }}>
                  Aucun mouvement enregistré pour cette journée.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '280px', overflowY: 'auto', paddingRight: '5px' }}>
                  {Object.entries(logsByEmployee).map(([name, empLogs]) => {
                    const avatar = getAvatarStyle(name)
                    return (
                      <div key={name} style={{ display: 'flex', background: '#fff', border: '1px solid #e8e4de', borderRadius: 12, padding: '0.8rem', gap: '0.8rem', alignItems: 'flex-start' }}>
                        
                        {/* Circular Avatar */}
                        <div style={{ 
                          width: '38px', height: '38px', borderRadius: '50%', 
                          background: avatar.bg, color: avatar.text, 
                          display: 'flex', alignItems: 'center', justifyContent: 'center', 
                          fontWeight: 'bold', fontSize: '0.95rem', flexShrink: 0
                        }}>
                          {name.charAt(0).toUpperCase()}
                        </div>
                        
                        {/* Details */}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 800, color: '#1a1a2e', fontSize: '0.9rem', marginBottom: '0.4rem' }}>{name}</div>
                          
                          {/* Timelines of check-ins */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {empLogs.map((log) => {
                              const isEntry = log.action.toUpperCase() === 'IN' || log.action.toLowerCase() === 'entrée'
                              return (
                                <div key={log.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
                                  <span style={{ 
                                    padding: '0.15rem 0.4rem', borderRadius: 4, fontWeight: 800,
                                    background: isEntry ? '#ecfccb' : '#f3e8ff', 
                                    color: isEntry ? '#4d7c0f' : '#7e22ce'
                                  }}>
                                    {isEntry ? 'ARRIVÉE' : 'DÉPART'}
                                  </span>
                                  <span style={{ fontWeight: 700, color: '#5a5550' }}>{formatTime(log.action_date)}</span>
                                  {getStatusBadge(log.status)}
                                  {getPaidBadge(log.is_paid)}
                                </div>
                              )
                            })}
                          </div>
                        </div>

                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* ABSENTS LIST */}
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#88827a', borderBottom: '1px solid #e8e4de', paddingBottom: '0.4rem', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Absents ({absents.length})
              </div>

              {absents.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: '#16a34a', padding: '1rem 0', fontWeight: 'bold' }}>
                  ✓ Tout le monde s'est présenté aujourd'hui !
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '200px', overflowY: 'auto', paddingRight: '5px' }}>
                  {absents.map((user) => {
                    const avatar = getAvatarStyle(user.username)
                    return (
                      <div key={user.user_id} style={{ display: 'flex', alignItems: 'center', justifySelf: 'stretch', gap: '0.8rem', padding: '0.5rem 0.8rem', background: 'rgba(239, 68, 68, 0.03)', border: '1px dashed #fca5a5', borderRadius: 12 }}>
                        
                        {/* Muted Avatar */}
                        <div style={{ 
                          width: '32px', height: '32px', borderRadius: '50%', 
                          background: '#f3f4f6', color: '#9ca3af', 
                          display: 'flex', alignItems: 'center', justifyContent: 'center', 
                          fontWeight: 'bold', fontSize: '0.85rem', flexShrink: 0
                        }}>
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, color: '#4b5563', fontSize: '0.85rem' }}>{user.username}</div>
                          <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{user.role}</div>
                        </div>

                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#b91c1c', background: '#fee2e2', padding: '0.2rem 0.5rem', borderRadius: 20 }}>
                          Absent
                        </span>

                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>

        </div>
      )}
    </div>
  )
}
