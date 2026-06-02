'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import axios from 'axios'
import { API_BASE_URL } from './Types'
import '../styles/face-ui.css'

interface User {
  user_id: number
  username: string
  email: string
  role: string
}

export default function Pointage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isVideoReady, setIsVideoReady] = useState(false)

  const [isCameraOn, setIsCameraOn] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastScanTime, setLastScanTime] = useState(0)

  // Time Configuration State (Default fallback bounds)
  const [timeConfig, setTimeConfig] = useState({
    inStart: '07:30',
    inEnd: '08:00',
    outStart: '17:00',
    outEnd: '17:32'
  })

  // Pointing mode — 'auto' | 'in' | 'out' (From Current Component)
  const [pointingMode, setPointingMode] = useState<'auto' | 'in' | 'out'>('auto')

  const [statusText, setStatusText] = useState('DÉCONNECTÉ')
  const [statusMsg, setStatusMsg] = useState('Initialisation du système de reconnaissance...')
  const [statusType, setStatusType] = useState('unknown')

  const [activeFace, setActiveFace] = useState<{name: string, box: number[], type: string} | null>(null)
  const [logs, setLogs] = useState<{time: string, msg: string, type: string}[]>([])
  const [absents, setAbsents] = useState<string[]>([])

  // Pause & Countdown Logic
  const [isPaused, setIsPaused] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [zoomStyle, setZoomStyle] = useState({ transform: 'scaleX(-1)' }) // Mirrored zoom

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
      // Biometric Python server is likely offline; ignore gracefully.
    }
  }, [])

  // --- SCHEDULE FETCHING (From 'but final' component) ---
  const fetchSchedule = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/Parametre`)
      if (res.data && res.data.horaire) {
        const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
        const todayStr = days[new Date().getDay()]
        const todaySchedule = res.data.horaire.find((h: any) => h.jour === todayStr)
        
        if (todaySchedule && todaySchedule.isActive) {
          const addMins = (timeStr: string, mins: number) => {
            const [h, m] = timeStr.split(':').map(Number)
            const d = new Date()
            d.setHours(h, m + mins, 0, 0)
            return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
          }
          
          setTimeConfig({
            inStart: addMins(todaySchedule.ouverture, -30), // 30 mins before opening
            inEnd: todaySchedule.ouverture,                // up to opening time
            outStart: todaySchedule.fermeture,             // from closing time
            outEnd: addMins(todaySchedule.fermeture, 30)   // up to 30 mins after
          })
          addLog(`Horaires du jour synchronisés (${todaySchedule.jour})`, 'clear')
        }
      }
    } catch (err) {
      console.error("Failed to fetch schedule from backend:", err)
      addLog("Erreur de synchro des horaires. Configuration par défaut appliquée.", "alert")
    }
  }, [])

  useEffect(() => {
    hiddenCanvasRef.current = document.createElement('canvas')
    addLog('Système prêt. Walk-through activé.', 'clear')
    
    // Fetch settings and absents
    fetchSchedule()
    fetchAbsents()
    
    const absentTimer = setInterval(fetchAbsents, 60000) // Every min
    return () => {
      clearInterval(absentTimer)
      stopCamera()
    }
  }, [fetchAbsents, fetchSchedule])

  // --- TIME & DATE DISPLAY ---
  const [currentDate, setCurrentDate] = useState('')
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
      setCurrentDate(now.toLocaleDateString('fr-FR', options))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Action Mode Selector
  const getActionForCurrentTime = useCallback(() => {
    if (pointingMode === 'in') return 'in'
    if (pointingMode === 'out') return 'out'

    const now = new Date()
    const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

    if (currentTimeStr >= timeConfig.inStart && currentTimeStr <= timeConfig.inEnd) return 'in'
    if (currentTimeStr >= timeConfig.outStart && currentTimeStr <= timeConfig.outEnd) return 'out'
    return 'none'
  }, [timeConfig, pointingMode])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      })
      if (!videoRef.current) return
      const video = videoRef.current
      video.srcObject = stream
      setIsVideoReady(false)

      const onLoaded = () => {
        if (canvasRef.current && hiddenCanvasRef.current) {
          canvasRef.current.width = video.videoWidth || 640
          canvasRef.current.height = video.videoHeight || 480
          hiddenCanvasRef.current.width = video.videoWidth || 640
          hiddenCanvasRef.current.height = video.videoHeight || 480
        }
        setIsCameraOn(true)
        setIsVideoReady(true)
        setStatusText('EN ATTENTE')
        setStatusMsg('Prêt pour la détection automatique.')
        video.removeEventListener('loadeddata', onLoaded)
      }
      video.addEventListener('loadeddata', onLoaded)
      video.play().catch(err => addLog("Erreur lecture vidéo: " + err, 'alert'))
    } catch (err) {
      addLog("Erreur caméra: " + err, 'alert')
      setStatusText('ERREUR CAMÉRA')
      setStatusType('violation')
      setStatusMsg('Impossible d\'accéder à la caméra. Vérifiez les permissions du navigateur.')
    }
  }

  const stopCamera = () => {
    setIsVideoReady(false)
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(t => t.stop())
      videoRef.current.srcObject = null
    }
    setIsCameraOn(false)
    setActiveFace(null)
    setStatusText('HORS LIGNE')
  }

  const startPauseCountdown = (seconds: number) => {
    setIsPaused(true)
    setCountdown(seconds)
    const countTimer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countTimer)
          setIsPaused(false)
          setActiveFace(null)
          setZoomStyle({ transform: 'scaleX(-1)' })
          setStatusText('EN ATTENTE')
          setStatusType('unknown')
          setStatusMsg('Prêt pour la détection.')
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const isFrameBlack = (canvas: HTMLCanvasElement): boolean => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return true
    const sample = ctx.getImageData(canvas.width / 2 - 50, canvas.height / 2 - 50, 100, 100)
    let total = 0
    for (let i = 0; i < sample.data.length; i += 4) {
      total += sample.data[i] + sample.data[i + 1] + sample.data[i + 2]
    }
    const avg = total / (sample.data.length / 4 * 3)
    return avg < 10
  }

  // --- SUBMIT ATTENDANCE LOGS WITH LOCALSTORAGE CACHING ---
  const submitAttendance = async (actionType: 'in' | 'out') => {
    if (!isCameraOn || !isVideoReady || isProcessing || isPaused || !hiddenCanvasRef.current || !videoRef.current) return
    if (Date.now() - lastScanTime < 4000) return
    if (videoRef.current.readyState < 2) {
      setStatusMsg('⏳ Caméra en cours d\'initialisation...')
      return
    }

    setIsProcessing(true)
    try {
      const ctx = hiddenCanvasRef.current.getContext('2d')
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, hiddenCanvasRef.current.width, hiddenCanvasRef.current.height)

        if (isFrameBlack(hiddenCanvasRef.current)) {
          setStatusMsg('📷 Flux caméra en initialisation... Veuillez patienter.')
          setIsProcessing(false)
          return
        }

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
          let text = 'PRÉSENCE'

          if (data.box && data.box.length === 4 && videoRef.current) {
            const [x, y, w, h] = data.box
            const vW = videoRef.current.videoWidth
            const vH = videoRef.current.videoHeight
            const scale = 2.0
            const centerX = x + w / 2
            const centerY = y + h / 2
            const moveX = (vW / 2 - centerX) * scale
            const moveY = (vH / 2 - centerY) * scale
            setZoomStyle({ transform: `scaleX(-1) scale(${scale}) translate(${moveX / scale}px, ${moveY / scale}px)` })
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

          if (data.status !== 'ALREADY_DONE') {
            addLog(msg, type === 'violation' ? 'alert' : 'clear')
          }
          fetchAbsents()
          startPauseCountdown(5)
        } else {
          setLastScanTime(Date.now())
          const errMsg = data.error || 'Visage non reconnu. Réessayez.'
          const isUnregistered = errMsg.toLowerCase().includes('not recognized') || errMsg.toLowerCase().includes('no workers')
          const isCacheRegen = errMsg.toLowerCase().includes('cache')
          
          setStatusText(isCacheRegen ? 'CACHE RÉGÉNÉRÉ' : 'ÉCHEC')
          setStatusType('violation')
          
          let displayMsg = isUnregistered 
            ? '❌ Visage inconnu — pas enregistré dans la base.'
            : isCacheRegen 
              ? '⏳ Cache DeepFace régénéré. Patientez 10 secondes puis réessayez.'
              : `❌ ${errMsg}`
          
          setStatusMsg(displayMsg)
          addLog(errMsg, 'alert')
          startPauseCountdown(isCacheRegen ? 10 : 3)
        }
      }
    } catch (err) {
      // BIOMETRIC SERVER OFFLINE -> Buffer scans locally (From 'but final' component)
      console.warn("Biometric server offline, buffering offline scan in localStorage...")
      if (typeof window !== 'undefined' && hiddenCanvasRef.current && videoRef.current) {
        try {
          const ctx = hiddenCanvasRef.current.getContext('2d')
          if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, hiddenCanvasRef.current.width, hiddenCanvasRef.current.height)
            const base64Img = hiddenCanvasRef.current.toDataURL('image/jpeg', 0.6) // Reduced quality for space limit

            const offlineQueue = JSON.parse(localStorage.getItem('offline_attendance') || '[]')
            const lastOffline = offlineQueue[offlineQueue.length - 1]

            // Prevent spamming requests in quick succession (throttle offline scans)
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

              startPauseCountdown(5)
            }
          }
        } catch (storageErr) {
          console.error("Failed to save to localStorage:", storageErr)
          setStatusText('ERREUR STOCKAGE')
          setStatusMsg('Espace LocalStorage saturé. Impossible de sauvegarder hors-ligne.')
        }
      }
    } finally {
      setIsProcessing(false)
    }
  }

  // --- AUTOMATED OFFLINE SYNC LOOP (From 'but final' component) ---
  useEffect(() => {
    if (typeof window === 'undefined') return
    let isSyncing = false

    const syncInterval = setInterval(async () => {
      if (isSyncing) return
      const queue = JSON.parse(localStorage.getItem('offline_attendance') || '[]')
      if (queue.length === 0) return

      isSyncing = true
      const item = queue[0] // Process FIFO item
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
          currentQueue.shift() // Remove synced log
          localStorage.setItem('offline_attendance', JSON.stringify(currentQueue))
          
          let logMsg = data.status === 'ALREADY_DONE'
            ? `Pointage de ${data.name} (déjà synchronisé)`
            : `Pointage de ${data.name} synchronisé`
          
          addLog(`✨ Synchronisation: ${logMsg}`, 'clear')
          fetchAbsents()
        } else {
          // Sync failed (e.g. face unrecognized) -> discard to avoid blocking queue
          const currentQueue = JSON.parse(localStorage.getItem('offline_attendance') || '[]')
          currentQueue.shift()
          localStorage.setItem('offline_attendance', JSON.stringify(currentQueue))
          addLog(`⚠️ Synchro rejetée: ${data.error || 'Visage inconnu'}`, 'alert')
        }
      } catch (err) {
        // Biometric server is still offline, wait for next heartbeat interval
      } finally {
        isSyncing = false
      }
    }, 10000) // Heartbeat check every 10 seconds

    return () => clearInterval(syncInterval)
  }, [fetchAbsents])

  // --- AUTOMATED CAMERA STREAM SCANNER LOOP ---
  useEffect(() => {
    if (!isCameraOn || !isVideoReady) return
    const timer = setInterval(() => {
      const action = getActionForCurrentTime()
      if (action !== 'none') {
        submitAttendance(action)
      } else {
        setStatusText('HORS PLAGE')
        setStatusMsg('Aucune fenêtre de pointage active. Utilisez le mode manuel ci-dessous.')
      }
    }, 2500) // Balanced scan frequency to avoid bottlenecking python
    return () => clearInterval(timer)
  }, [isCameraOn, isVideoReady, getActionForCurrentTime])

  // --- CANVAS CORNER TRACKER RENDERER ---
  useEffect(() => {
    if (!canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return
    let animationId: number
    const render = () => {
      ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height)
      if (activeFace && activeFace.box && activeFace.box.length === 4) {
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

  // Face-pill positioning coordinates
  const facePillStyle: React.CSSProperties =
    activeFace && activeFace.box && activeFace.box.length === 4
      ? {
          top: activeFace.box[1],
          right: (canvasRef.current?.width || 640) - activeFace.box[0] - activeFace.box[2] - 130
        }
      : { top: '20px', left: '50%', transform: 'translateX(-50%)' }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(640px, 1.2fr) 1fr', gap: '2rem', background: '#f8fafd' }}>

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

           {/* Manual overriding actions panel */}
           <div style={{ marginTop: '1.25rem', borderTop: '1px solid #f0f0f0', paddingTop: '1rem' }}>
             <span className="premium-label" style={{ display: 'block', marginBottom: '0.6rem' }}>Mode de Pointage Forcé</span>
             <div style={{ display: 'flex', gap: '8px' }}>
               {(['auto', 'in', 'out'] as const).map(mode => (
                 <button
                   key={mode}
                   onClick={() => setPointingMode(mode)}
                   style={{
                     flex: 1,
                     padding: '0.5rem',
                     borderRadius: '10px',
                     border: '2px solid',
                     borderColor: pointingMode === mode
                       ? (mode === 'in' ? '#10b981' : mode === 'out' ? '#3b82f6' : '#6366f1')
                       : '#e5e7eb',
                     background: pointingMode === mode
                       ? (mode === 'in' ? '#d1fae5' : mode === 'out' ? '#dbeafe' : '#ede9fe')
                       : '#f9fafb',
                     color: pointingMode === mode
                       ? (mode === 'in' ? '#065f46' : mode === 'out' ? '#1e3a8a' : '#3730a3')
                       : '#9ca3af',
                     fontWeight: 700,
                     fontSize: '0.75rem',
                     cursor: 'pointer',
                     transition: 'all 0.2s',
                   }}
                 >
                   {mode === 'auto' ? '🔄 AUTO' : mode === 'in' ? '✅ Forcer ENTRÉE' : '🚪 Forcer SORTIE'}
                 </button>
               ))}
             </div>
             {pointingMode !== 'auto' && (
               <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: pointingMode === 'in' ? '#059669' : '#2563eb', fontWeight: 600 }}>
                 ⚡ Mode manuel activé : chaque scan sera enregistré comme {pointingMode === 'in' ? 'une ENTRÉE' : 'une SORTIE'}, indépendamment des plages horaires.
               </p>
             )}
           </div>
        </div>

        {/* CAMERA FEED AREA */}
        <div className={`camera-container ${isCameraOn ? 'active' : ''}`} style={{ position: 'relative', flex: 1, minHeight: '480px', background: '#000', overflow: 'hidden' }}>
          <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', ...zoomStyle }} />
          <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10, ...zoomStyle }} />
          {activeFace && (
            <div className="face-pill" style={facePillStyle}>
              <div className="check-circle">✓</div>
              <span>{activeFace.name} • {activeFace.type === 'in' ? 'Entrée' : 'Sortie'}</span>
            </div>
          )}
          {!isCameraOn && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', background: 'rgba(0,0,0,0.8)', zIndex: 20 }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📷</div>
              <p style={{ marginBottom: '1rem', opacity: 0.7, fontSize: '0.9rem' }}>La caméra est inactive</p>
              <button onClick={startCamera} style={{ padding: '0.8rem 2rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}>Activer le Walk-through</button>
            </div>
          )}
          {isCameraOn && !isVideoReady && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', zIndex: 15 }}>
              <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Initialisation de la caméra...
              </div>
            </div>
          )}
          {isProcessing && (
            <div style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, zIndex: 30 }}>
              🔍 Analyse en cours...
            </div>
          )}
        </div>
        {isCameraOn && <button onClick={stopCamera} className="glass-card" style={{ padding: '0.8rem', color: '#ef4444', fontWeight: 700, cursor: 'pointer', background: 'rgba(254, 242, 242, 0.5)' }}>Arrêter la caméra</button>}
      </div>

      {/* RIGHT COLUMN */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem', background: isPaused ? (statusType === 'violation' ? 'rgba(254, 242, 242, 0.8)' : 'rgba(254, 242, 242, 0.8)') : statusType === 'safe' ? 'rgba(236, 253, 245, 0.8)' : statusType === 'violation' ? 'rgba(254, 242, 242, 0.8)' : '#fff' }}>
          <h3 className="premium-label" style={{ marginBottom: '1rem' }}>État Actuel</h3>
          <div style={{ display: 'inline-block', padding: '0.4rem 1rem', borderRadius: '30px', fontSize: '0.75rem', fontWeight: 900, color: '#fff', background: statusType === 'violation' ? '#ef4444' : statusType === 'safe' ? '#10b981' : statusType === 'waiting' ? '#eab308' : '#6b7280' }}>
            {isPaused ? `PAUSE (${countdown}s)` : statusText}
          </div>
          <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#4b5563', fontWeight: 600 }}>
            {isPaused ? `Veuillez patienter... Prochain scan dans ${countdown}s` : statusMsg}
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

        {/* BACKEND CONNECTION FEEDBACK */}
        <div className="glass-card" style={{ padding: '1rem 1.25rem', background: 'rgba(239,246,255,0.6)', border: '1px solid #bfdbfe' }}>
          <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>ℹ️ Serveur de Reconnaissance</h3>
          <p style={{ fontSize: '0.75rem', color: '#374151' }}>
            Ce module communique avec le service Python biometrique sur le <strong>port 8000</strong>.
          </p>
          <p style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.4rem' }}>
            Si le service biometrique est déconnecté, les scans d'attendance seront mis en cache et synchronisés automatiquement dès qu'il est en ligne.
          </p>
        </div>

        {/* HISTORICAL LOGS */}
        <div className="glass-card" style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <h3 className="premium-label" style={{ marginBottom: '1rem' }}>Historique Real-time</h3>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {logs.length === 0 && (
              <p style={{ fontSize: '0.78rem', color: '#9ca3af', fontStyle: 'italic' }}>Aucun événement pour le moment...</p>
            )}
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
