'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import axios from 'axios'
import { API_BASE_URL } from './Types'
import '../styles/face-ui.css'

export default function Pointage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const [isCameraOn, setIsCameraOn] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastScanTime, setLastScanTime] = useState(0)
  
  // Time Configuration State
  const [timeConfig, setTimeConfig] = useState({
    inStart: '07:30',
    inEnd: '08:00',
    outStart: '17:00',
    outEnd: '17:32'
  })

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/Parametre`)
        if (res.data && res.data.horaire) {
          const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
          const todayStr = days[new Date().getDay()]
          const todaySchedule = res.data.horaire.find((h: any) => h.jour === todayStr)
          
          if (todaySchedule && todaySchedule.isActive) {
            const addMins = (time: string, mins: number) => {
              const [h, m] = time.split(':').map(Number)
              const d = new Date()
              d.setHours(h, m + mins, 0, 0)
              return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
            }
            
            setTimeConfig({
              inStart: addMins(todaySchedule.ouverture, -30),
              inEnd: todaySchedule.ouverture,
              outStart: todaySchedule.fermeture,
              outEnd: addMins(todaySchedule.fermeture, 30)
            })
          }
        }
      } catch (err) {
        console.error("Failed to fetch schedule:", err)
      }
    }
    fetchSchedule()
  }, [])

  const [statusText, setStatusText] = useState('DÉCONNECTÉ')
  const [statusMsg, setStatusMsg] = useState('Initialisation du système de reconnaissance...')
  const [statusType, setStatusType] = useState('unknown')

  const [activeFace, setActiveFace] = useState<{name: string, box: number[], type: string} | null>(null)
  const [logs, setLogs] = useState<{time: string, msg: string, type: string}[]>([])
  const [absents, setAbsents] = useState<string[]>([])
  
  // Pause & Countdown Logic
  const [isPaused, setIsPaused] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const addLog = (msg: string, type: string = 'clear') => {
    setLogs(prev => [{ time: new Date().toLocaleTimeString(), msg, type }, ...prev].slice(0, 50))
  }

  // --- RECAP / ABSENTS LOGIC ---
  const fetchAbsents = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8000/absents')
      const data = await response.json()
      if (data.absents) setAbsents(data.absents)
    } catch (err) {
      // Server is likely offline, ignore gracefully.
    }
  }, [])

  useEffect(() => {
    hiddenCanvasRef.current = document.createElement('canvas')
    addLog('Système prêt. Walk-through activé.', 'clear')
    fetchAbsents()
    const absentTimer = setInterval(fetchAbsents, 60000) // Every min
    return () => {
      clearInterval(absentTimer)
      stopCamera()
    }
  }, [fetchAbsents])

  // --- TIME & ACTION LOGIC ---
  const [currentDate, setCurrentDate] = useState('')
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
      setCurrentDate(now.toLocaleDateString('fr-FR', options))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const getActionForCurrentTime = useCallback(() => {
    const now = new Date()
    const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    
    if (currentTimeStr >= timeConfig.inStart && currentTimeStr <= timeConfig.inEnd) return 'in'
    if (currentTimeStr >= timeConfig.outStart && currentTimeStr <= timeConfig.outEnd) return 'out'
    return 'none'
  }, [timeConfig])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          if (canvasRef.current && hiddenCanvasRef.current && videoRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth
            canvasRef.current.height = videoRef.current.videoHeight
            hiddenCanvasRef.current.width = videoRef.current.videoWidth
            hiddenCanvasRef.current.height = videoRef.current.videoHeight
          }
          setIsCameraOn(true)
          setStatusText('EN ATTENTE')
          setStatusMsg('Prêt pour la détection automatique.')
        }
      }
    } catch (err) {
      addLog("Erreur caméra: " + err, 'alert')
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(t => t.stop())
      videoRef.current.srcObject = null
    }
    setIsCameraOn(false)
    setActiveFace(null)
    setStatusText('HORS LIGNE')
  }

  const [zoomStyle, setZoomStyle] = useState({ transform: 'scaleX(-1)' }) // Default mirrored

  const submitAttendance = async (actionType: 'in' | 'out') => {
    if (!isCameraOn || isProcessing || isPaused || !hiddenCanvasRef.current || !videoRef.current) return
    if (Date.now() - lastScanTime < 4000) return 

    setIsProcessing(true)
    try {
      const ctx = hiddenCanvasRef.current.getContext('2d')
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, hiddenCanvasRef.current.width, hiddenCanvasRef.current.height)
        const base64Img = hiddenCanvasRef.current.toDataURL('image/jpeg', 0.8)

        const response = await fetch('http://localhost:8000/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: actionType, image: base64Img })
        })
        const data = await response.json()

        if (data.success) {
          setLastScanTime(Date.now())
          setActiveFace({ name: data.name, box: data.box || [], type: actionType })
          
          let msg = `Reconnu: ${data.name} (${actionType.toUpperCase()})`
          let type = 'safe'
          let text = 'ABCENCE'

          // Handle Zoom if box exists
          if (data.box && data.box.length === 4 && videoRef.current) {
            const [x, y, w, h] = data.box
            const vW = videoRef.current.videoWidth
            const vH = videoRef.current.videoHeight
            const scale = 2.0
            const centerX = x + w / 2
            const centerY = y + h / 2
            const moveX = (vW / 2 - centerX) * scale
            const moveY = (vH / 2 - centerY) * scale
            setZoomStyle({ transform: `scaleX(-1) scale(${scale}) translate(${moveX/scale}px, ${moveY/scale}px)` })
          }

          if (data.status === 'ALREADY_DONE') {
            msg = `✨ ${data.name} : Déjà pointé !`
            type = 'safe'; text = 'DÉJÀ FAIT'
          } else if (data.status === 'LATE') {
            msg = `⚠️ ${data.name} est ARRIVÉ EN RETARD (30m+)`
            type = 'waiting'; text = 'RETARD'
          } else if (data.status === 'EARLY_LEAVE') {
            msg = `⚠️ ${data.name} est PARTI TROP TÔT`
            type = 'waiting'; text = 'DÉPART ANTICIPÉ'
          } else if (data.status === 'EARLY_ARRIVAL') {
            msg = `🛑 ARRIVÉE TROP ANTICIPÉE (>1h). JOURNÉE NON RÉMUNÉRÉE.`
            type = 'violation'; text = 'SALAIRE RÉDUIT'
          }

          setStatusText(text)
          setStatusType(type)
          setStatusMsg(msg)
          
          // Always add to logs
          addLog(msg, type === 'violation' ? 'alert' : 'clear')
          
          fetchAbsents()

          // --- MANDATORY 5s PAUSE ---
          setIsPaused(true)
          setCountdown(5)
          const countTimer = setInterval(() => {
            setCountdown(prev => {
              if (prev <= 1) { 
                clearInterval(countTimer)
                setIsPaused(false)
                setActiveFace(null)
                setZoomStyle({ transform: 'scaleX(-1)' })
                setStatusText('EN ATTENTE')
                setStatusType('unknown')
                return 0 
              }
              return prev - 1
            })
          }, 1000)
        } else {
          setLastScanTime(Date.now())
          setStatusText('ÉCHEC')
          setStatusType('violation')
          setStatusMsg(`Reconnaissance échouée : ${data.error || 'Non reconnu'}`)
          addLog(`Échec scan : ${data.error || 'Non reconnu'}`, 'alert')

          // --- 4s PAUSE ON FAILURE ---
          setIsPaused(true)
          setCountdown(4)
          const countTimer = setInterval(() => {
            setCountdown(prev => {
              if (prev <= 1) { 
                clearInterval(countTimer)
                setIsPaused(false)
                setActiveFace(null)
                setStatusText('EN ATTENTE')
                setStatusType('unknown')
                setStatusMsg('Prêt pour la détection automatique.')
                return 0 
              }
              return prev - 1
            })
          }, 1000)
        }
      }
    } catch (err) {
      // Server is likely offline, save to localStorage
      if (typeof window !== 'undefined' && hiddenCanvasRef.current && videoRef.current) {
        try {
          const ctx = hiddenCanvasRef.current.getContext('2d')
          if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, hiddenCanvasRef.current.width, hiddenCanvasRef.current.height)
            const base64Img = hiddenCanvasRef.current.toDataURL('image/jpeg', 0.6) // Lower quality to save space

            const offlineQueue = JSON.parse(localStorage.getItem('offline_attendance') || '[]')
            
            // Check if we already have a very recent offline scan (prevent duplicates in the same scan session)
            const lastOffline = offlineQueue[offlineQueue.length - 1]
            if (!lastOffline || (Date.now() / 1000 - lastOffline.timestamp > 4)) {
              offlineQueue.push({
                timestamp: Date.now() / 1000,
                action: actionType,
                image: base64Img
              })
              localStorage.setItem('offline_attendance', JSON.stringify(offlineQueue))
              
              setLastScanTime(Date.now())
              setStatusText('HORS-LIGNE')
              setStatusType('waiting')
              setStatusMsg('Serveur biométrique hors-ligne. Enregistré localement.')
              addLog(`Pointage hors-ligne enregistré (${actionType.toUpperCase()})`, 'alert')

              // --- MANDATORY 5s PAUSE ---
              setIsPaused(true)
              setCountdown(5)
              const countTimer = setInterval(() => {
                setCountdown(prev => {
                  if (prev <= 1) { 
                    clearInterval(countTimer)
                    setIsPaused(false)
                    setActiveFace(null)
                    setZoomStyle({ transform: 'scaleX(-1)' })
                    setStatusText('EN ATTENTE')
                    setStatusType('unknown')
                    return 0 
                  }
                  return prev - 1
                })
              }, 1000)
            }
          }
        } catch (storageErr) {
          console.error("Failed to save to localStorage:", storageErr)
        }
      }
    } finally {
      setIsProcessing(false)
    }
  }

  // --- AUTOMATED OFFLINE SYNC LOOP ---
  useEffect(() => {
    if (typeof window === 'undefined') return
    let isSyncing = false
    const syncInterval = setInterval(async () => {
      if (isSyncing) return
      const queue = JSON.parse(localStorage.getItem('offline_attendance') || '[]')
      if (queue.length === 0) return

      isSyncing = true
      const item = queue[0] // process first item
      try {
        const response = await fetch('http://localhost:8000/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: item.action, 
            image: item.image,
            timestamp: item.timestamp 
          })
        })
        const data = await response.json()
        if (data.success) {
          const currentQueue = JSON.parse(localStorage.getItem('offline_attendance') || '[]')
          currentQueue.shift() // remove the synced item
          localStorage.setItem('offline_attendance', JSON.stringify(currentQueue))
          
          let logMsg = `Pointage de ${data.name} synchronisé`
          if (data.status === 'ALREADY_DONE') {
            logMsg = `Pointage de ${data.name} (déjà enregistré)`
          }
          addLog(`✨ Synchronisation: ${logMsg}`, 'clear')
          fetchAbsents()
        } else {
          // Failed to process this offline scan (e.g. face not recognized)
          // Remove from queue so we don't get stuck forever, but log an alert
          const currentQueue = JSON.parse(localStorage.getItem('offline_attendance') || '[]')
          currentQueue.shift()
          localStorage.setItem('offline_attendance', JSON.stringify(currentQueue))
          addLog(`⚠️ Synchro rejetée: ${data.error || 'Non reconnu'}`, 'alert')
        }
      } catch (err) {
        // Server is still offline, wait for next attempt
      } finally {
        isSyncing = false
      }
    }, 10000) // check every 10 seconds

    return () => clearInterval(syncInterval)
  }, [fetchAbsents])

  // --- AUTOMATED SCANNING LOOP ---
  useEffect(() => {
    if (!isCameraOn) return
    const timer = setInterval(() => {
      const action = getActionForCurrentTime()
      if (action !== 'none') {
        submitAttendance(action)
      } else {
        setStatusText('HORS WINDOW')
        setStatusMsg('Aucune fenêtre de pointage active.')
      }
    }, 1500)
    return () => clearInterval(timer)
  }, [isCameraOn, getActionForCurrentTime])

  // --- CANVAS RENDERING ---
  useEffect(() => {
    if (!canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return
    let animationId: number
    const render = () => {
      ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height)
      if (activeFace && activeFace.box) {
        const [x, y, w, h] = activeFace.box
        ctx.strokeStyle = '#10b981'; ctx.lineWidth = 4; ctx.lineCap = 'round'
        const cs = 25
        ctx.beginPath(); ctx.moveTo(x, y + cs); ctx.lineTo(x, y); ctx.lineTo(x + cs, y); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(x + w - cs, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + cs); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(x, y + h - cs); ctx.lineTo(x, y + h); ctx.lineTo(x + cs, y + h); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(x + w - cs, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - cs); ctx.stroke()
      } else if (isCameraOn && !isProcessing) {
        const cx = canvasRef.current!.width / 2, cy = canvasRef.current!.height / 2
        const sw = 200, sh = 250, x = cx - sw / 2, y = cy - sh / 2, cs = 30
        const pulse = Math.sin(Date.now() / 200) * 0.5 + 0.5
        ctx.strokeStyle = `rgba(163, 163, 163, ${0.2 + pulse * 0.3})`; ctx.lineWidth = 2
        ctx.beginPath(); ctx.moveTo(x, y + cs); ctx.lineTo(x, y); ctx.lineTo(x + cs, y); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(x + sw - cs, y); ctx.lineTo(x + sw, y); ctx.lineTo(x + sw, y + cs); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(x, y + sh - cs); ctx.lineTo(x, y + sh); ctx.lineTo(x + cs, y + sh); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(x + sw - cs, y + sh); ctx.lineTo(x + sw, y + sh); ctx.lineTo(x + sw, y + sh - cs); ctx.stroke()
      }
      animationId = requestAnimationFrame(render)
    }
    render()
    return () => cancelAnimationFrame(animationId)
  }, [activeFace, isCameraOn, isProcessing])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(640px, 1.2fr) 1fr', gap: '2rem', padding: '1rem', background: '#f8fafd', minHeight: '100vh' }}>
      
      {/* LEFT COLUMN */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* HEADER */}
        <div className="glass-card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(240,249,255,0.7) 100%)' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '2rem' }}>📅</div>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1a1a2e', textTransform: 'capitalize' }}>{currentDate}</h1>
                <p style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 600 }}>Kitchen Display System • Pointage des Équipes</p>
              </div>
           </div>
        </div>

        {/* TIME CONFIG */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Configuration Temporelle ⏱️</h2>
              <div style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', background: isCameraOn ? '#d1fae5' : '#f3f4f6', color: isCameraOn ? '#059669' : '#9ca3af', fontSize: '0.7rem', fontWeight: 700 }}>
                {isCameraOn ? 'SYSTÈME ACTIF' : 'SYSTÈME EN PAUSE'}
              </div>
           </div>
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="time-input-group">
                <span className="premium-label">ENTRÉE (CHECK IN)</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input type="time" value={timeConfig.inStart} onChange={(e) => setTimeConfig({...timeConfig, inStart: e.target.value})} className="time-input" />
                  <span style={{ color: '#9ca3af' }}>à</span>
                  <input type="time" value={timeConfig.inEnd} onChange={(e) => setTimeConfig({...timeConfig, inEnd: e.target.value})} className="time-input" />
                </div>
              </div>
              <div className="time-input-group">
                <span className="premium-label">SORTIE (CHECK OUT)</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input type="time" value={timeConfig.outStart} onChange={(e) => setTimeConfig({...timeConfig, outStart: e.target.value})} className="time-input" />
                  <span style={{ color: '#9ca3af' }}>à</span>
                  <input type="time" value={timeConfig.outEnd} onChange={(e) => setTimeConfig({...timeConfig, outEnd: e.target.value})} className="time-input" />
                </div>
              </div>
           </div>
        </div>

        {/* CAMERA FEED AREA */}
        <div className={`camera-container ${isCameraOn ? 'active' : ''}`} style={{ position: 'relative', flex: 1, minHeight: '480px', background: '#000', overflow: 'hidden' }}>
          <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', ...zoomStyle }} />
          <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10, ...zoomStyle }} />
          {activeFace && (
            <div className="face-pill" style={{ top: activeFace.box[1], right: (canvasRef.current?.width || 640) - activeFace.box[0] - activeFace.box[2] - 130 }}>
              <div className="check-circle">✓</div>
              <span>{activeFace.name} • {activeFace.type === 'in' ? 'Entrée' : 'Sortie'}</span>
            </div>
          )}
          {!isCameraOn && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', background: 'rgba(0,0,0,0.8)', zIndex: 20 }}>
              <button onClick={startCamera} style={{ padding: '0.8rem 2rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>Activer le Walk-through</button>
            </div>
          )}
        </div>
        {isCameraOn && <button onClick={stopCamera} className="glass-card" style={{ padding: '0.8rem', color: '#ef4444', fontWeight: 700, cursor: 'pointer', background: 'rgba(254, 242, 242, 0.5)' }}>Arrêter la caméra</button>}
      </div>

      {/* RIGHT COLUMN */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem', background: isPaused ? 'rgba(254, 242, 242, 0.8)' : statusType === 'safe' ? 'rgba(236, 253, 245, 0.8)' : statusType === 'violation' ? 'rgba(254, 242, 242, 0.8)' : '#fff' }}>
          <h3 className="premium-label" style={{ marginBottom: '1rem' }}>État Actuel</h3>
          <div style={{ display: 'inline-block', padding: '0.4rem 1rem', borderRadius: '30px', fontSize: '0.75rem', fontWeight: 900, color: '#fff', background: isPaused ? '#ef4444' : statusType === 'violation' ? '#ef4444' : statusType === 'safe' ? '#10b981' : '#eab308' }}>
            {isPaused ? `PAUSE ATTENTE (${countdown}s)` : statusText}
          </div>
          <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#4b5563', fontWeight: 600 }}>
            {isPaused ? `Veuillez patienter 5 secondes pour le prochain passage. Prochain scan dans ${countdown}s...` : statusMsg}
          </p>
        </div>

        {/* ABSENTS SECTION */}
        {absents.length > 0 && (
          <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(254, 242, 242, 0.4)', border: '1px solid #fecaca' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase', marginBottom: '1rem' }}>Personnel Manquant (Non Pointé) 🚨</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {absents.map((name, i) => (
                <div key={i} style={{ padding: '0.3rem 0.8rem', borderRadius: '20px', background: 'white', color: '#dc2626', fontSize: '0.7rem', fontWeight: 700, border: '1px solid #fca5a5' }}>{name}</div>
              ))}
            </div>
          </div>
        )}

        {/* LOGS SECTION */}
        <div className="glass-card" style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <h3 className="premium-label" style={{ marginBottom: '1rem' }}>Historique Real-time</h3>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {logs.map((L, i) => (
              <div key={i} style={{ fontSize: '0.75rem', padding: '0.8rem', background: L.type === 'alert' ? 'rgba(254, 242, 242, 0.6)' : 'rgba(249, 250, 251, 0.6)', borderRadius: '10px', borderLeft: `4px solid ${L.type === 'alert' ? '#ef4444' : '#10b981'}`, animation: 'pill-pop 0.3s ease-out' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span style={{ fontWeight: 800 }}>{L.type === 'alert' ? 'ALERTE' : 'INFO'}</span><span>{L.time}</span></div>
                <div style={{ color: '#4b5563' }}>{L.msg}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}