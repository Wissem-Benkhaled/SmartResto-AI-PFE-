'use client'
import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { API_BASE_URL } from './Types'

export default function DetectSante() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const loggedViolationsRef = useRef<Set<string>>(new Set<string>())

  const [isCameraOn, setIsCameraOn] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [wsConnected, setWsConnected] = useState(false)
  
  // Status state
  const [overallStatus, setOverallStatus] = useState('UNKNOWN')
  const [overallMsg, setOverallMsg] = useState('Waiting for detection...')
  const [maskStatus, setMaskStatus] = useState('Scanning...')
  const [glovesStatus, setGlovesStatus] = useState('Scanning...')
  const [logs, setLogs] = useState<{time: string, msg: string, type: string}[]>([{time: new Date().toLocaleTimeString(), msg: 'System initialized. Waiting for stream...', type: 'clear'}])



  const addLog = (msg: string, type: string = 'clear') => {
    setLogs(prev => [{ time: new Date().toLocaleTimeString(), msg, type }, ...prev].slice(0, 50))
  }

  // Connect WebSocket on mount
  useEffect(() => {
    hiddenCanvasRef.current = document.createElement('canvas')
    connectWs()
    return () => {
      stopCamera()
      if (wsRef.current) wsRef.current.close()
    }
  }, [])

  const connectWs = () => {
    const wsUrl = `ws://localhost:8000/ws/detect`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => setWsConnected(true)
    ws.onclose = () => {
      setWsConnected(false)
      stopStreaming()
      setTimeout(connectWs, 3000)
    }
    ws.onerror = (err) => console.error("WS error:", err)
    ws.onmessage = (event) => {
      try {
        const results = JSON.parse(event.data)
        processResults(results)
      } catch (e) {
        console.error("Parse error:", e)
      }
    }
  }

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
        }
      }
    } catch (err) {
      console.error("Camera error:", err)
      alert("Impossible d'accéder à la caméra.")
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(t => t.stop())
      videoRef.current.srcObject = null
    }
    setIsCameraOn(false)
    stopStreaming()
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }
    updateStatus('UNKNOWN', 'UNKNOWN')
  }

  const startStreaming = () => {
    if (!isCameraOn || !wsConnected || !wsRef.current) return
    setIsStreaming(true)
    addLog("Inference tracking started.", "clear")

    streamIntervalRef.current = setInterval(() => {
      if (videoRef.current && hiddenCanvasRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
        const ctx = hiddenCanvasRef.current.getContext('2d')
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, hiddenCanvasRef.current.width, hiddenCanvasRef.current.height)
          const base64Img = hiddenCanvasRef.current.toDataURL('image/jpeg', 0.8)
          wsRef.current.send(JSON.stringify({ image: base64Img }))
        }
      }
    }, 150)
  }

  const stopStreaming = () => {
    if (streamIntervalRef.current) clearInterval(streamIntervalRef.current)
    setIsStreaming(false)
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }
    updateStatus('UNKNOWN', 'UNKNOWN')
    addLog("Inference stopped.", "clear")
  }

  const drawFaceBox = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, label: string, name: string, duration: number, color: string) => {
    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.strokeRect(x, y, w, h)

    const infoMsg = duration > 0 ? `${name} - VIOLATION: ${duration.toFixed(1)}s` : name
    const mainMsg = `${label}`

    ctx.font = "bold 16px Inter"
    const wInfo = ctx.measureText(infoMsg).width
    const wMain = ctx.measureText(mainMsg).width
    const boxWidth = Math.max(wInfo, wMain) + 20

    ctx.fillStyle = color
    ctx.fillRect(x, y - 55, boxWidth, 55)

    ctx.translate(x + boxWidth / 2, y - 27.5)
    ctx.scale(-1, 1)

    ctx.fillStyle = "white"
    ctx.textAlign = "center"
    ctx.textBaseline = "bottom"
    ctx.font = "16px Inter"
    ctx.fillText(mainMsg, 0, 10)

    ctx.textBaseline = "top"
    ctx.font = "bold 15px Inter"
    if (duration >= 10.0) ctx.fillStyle = "#fef08a"
    ctx.fillText(infoMsg, 0, -22)

    ctx.restore()
  }

  const drawHandBox = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, label: string, color: string) => {
    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.strokeRect(x, y, w, h)

    ctx.fillStyle = color
    ctx.font = "14px Inter"
    const textWidth = ctx.measureText(label).width
    ctx.fillRect(x, y - 25, textWidth + 10, 25)

    ctx.translate(x + 5 + textWidth / 2, y - 7)
    ctx.scale(-1, 1)

    ctx.fillStyle = "white"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(label, 0, 0)
    ctx.restore()
  }

  const processResults = (results: any) => {
    if (!canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)

    let hasMask = false, hasNoMask = false, hasGloves = false, hasNoGloves = false
    let foundViolatorName = null, foundViolatorTime = 0

    if (results.faces) {
      results.faces.forEach((face: any) => {
        const [x, y, w, h] = face.box
        let color = "#f59e0b"
        if (face.label === "Mask") { color = "#10b981"; hasMask = true; }
        else if (face.label === "No Mask") { color = "#ef4444"; hasNoMask = true; }
        else hasNoMask = true

        if (face.violation_duration > 0 && face.violation_duration > foundViolatorTime) {
          foundViolatorName = face.name
          foundViolatorTime = face.violation_duration
        }
        drawFaceBox(ctx, x, y, w, h, face.label, face.name, face.violation_duration, color)
      })
    }

    if (results.hands) {
      results.hands.forEach((hand: any) => {
        const [x, y, w, h] = hand.box
        let color = hand.label === "Gloves" ? "#10b981" : "#ef4444"
        if (hand.label === "Gloves") hasGloves = true; else hasNoGloves = true
        drawHandBox(ctx, x, y, w, h, `${hand.label} (${Math.round(hand.confidence * 100)}%)`, color)
      })
    }

    const curMaskStatus = hasMask && !hasNoMask ? "GOOD" : hasNoMask ? "BAD" : "UNKNOWN"
    const curGlovesStatus = hasGloves && !hasNoGloves ? "GOOD" : hasNoGloves ? "BAD" : "UNKNOWN"
    updateStatus(curMaskStatus, curGlovesStatus, foundViolatorName, foundViolatorTime)
  }

  const updateStatus = (mask: string, gloves: string, violatorName?: string | null, violatorTime?: number) => {
    setMaskStatus(mask === "GOOD" ? "Compliant" : mask === "BAD" ? "Violation" : "Scanning...")
    setGlovesStatus(gloves === "GOOD" ? "Compliant" : gloves === "BAD" ? "Violation" : "Scanning...")

    let status = "SAFE", msg = "Le personnel respecte les règles."
    if (mask === "BAD" || gloves === "BAD") {
      status = "VIOLATION"
      if (violatorName && violatorName !== "Detecting...") {
         msg = `${violatorName} n'a pas son équipement. (${violatorTime?.toFixed(1)}s)`
         
         // Verification 30 secondes
         if (violatorTime && violatorTime >= 30.0) {
           const logKey = `${violatorName}_${mask === "BAD" ? "NoMask" : "NoGloves"}`
           if (!loggedViolationsRef.current.has(logKey)) {
             loggedViolationsRef.current.add(logKey)
             
             // Effectuer la requête POST avec axios en arrière-plan
             axios.post(`${API_BASE_URL}/Health`, {
               name: violatorName,
               violation_type: mask === "BAD" ? "No Mask (Automated)" : "No Gloves (Automated)"
             }).then(() => {
               addLog(`[ALERTE] Infraction majeure enregistrée en base pour: ${violatorName}`, 'alert')
             }).catch((err) => {
               console.error("Erreur enregistrement automatique:", err)
             })
           }
         }
      } else { msg = "Équipement de sécurité manquant détecté !" }
    } else if (mask === "UNKNOWN" && gloves === "UNKNOWN") {
      status = "WAITING"
      msg = "Aucune personne détectée."
    }

    setOverallStatus(status)
    setOverallMsg(msg)
  }



  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
      {/* Colonne WebCam */}
      <div className="card">
        <div className="table-header">
          <div>
            <div className="section-title">Caméra - Contrôle Santé 🛡️</div>
            <div className="section-sub">
              {wsConnected 
                ? <span style={{color: '#10b981'}}>🟢 Connecté à l'IA</span> 
                : <span style={{color: '#ef4444'}}>🔴 Déconnecté de l'IA (localhost:8000)</span>}
            </div>
          </div>
        </div>

        <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', backgroundColor: '#1a1a2e', borderRadius: 12, overflow: 'hidden', transform: 'scaleX(-1)' }}>
          <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
          {!isCameraOn && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', transform: 'scaleX(-1)' }}>
              Caméra éteinte
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          <button onClick={isCameraOn ? stopCamera : startCamera} style={{ flex: 1, padding: '0.8rem', borderRadius: 8, border: 'none', background: isCameraOn ? '#e5e7eb' : '#1a1a2e', color: isCameraOn ? '#374151' : '#fff', fontWeight: 600, cursor: 'pointer' }}>
            {isCameraOn ? 'Arrêter la Caméra' : 'Allumer la Caméra'}
          </button>
          <button onClick={isStreaming ? stopStreaming : startStreaming} disabled={!isCameraOn || !wsConnected} style={{ flex: 1, padding: '0.8rem', borderRadius: 8, border: 'none', background: isStreaming ? '#ef4444' : '#10b981', color: '#fff', fontWeight: 600, cursor: (!isCameraOn || !wsConnected) ? 'not-allowed' : 'pointer', opacity: (!isCameraOn || !wsConnected) ? 0.5 : 1 }}>
            {isStreaming ? 'Arrêter Détection' : 'Démarrer Détection'}
          </button>
        </div>
      </div>

      {/* Colonne Statut et Enregistrement */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="card" style={{ background: overallStatus === 'VIOLATION' ? '#fef2f2' : overallStatus === 'SAFE' ? '#ecfdf5' : '#fff', border: overallStatus === 'VIOLATION' ? '1.5px solid #fca5a5' : overallStatus === 'SAFE' ? '1.5px solid #6ee7b7' : '1.5px solid #ede9e3' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1a1a2e', marginBottom: '0.5rem' }}>Statut Global</h3>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: overallStatus === 'VIOLATION' ? '#dc2626' : overallStatus === 'SAFE' ? '#059669' : '#9a9590', marginBottom: '0.3rem' }}>
            {overallStatus}
          </div>
          <p style={{ fontSize: '0.85rem', color: '#5a5550' }}>{overallMsg}</p>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <div style={{ flex: 1, background: '#fff', padding: '1rem', borderRadius: 8, border: '1px solid #ede9e3', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
               <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>😷</div>
               <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9a9590', textTransform: 'uppercase' }}>Masque</div>
               <div style={{ fontSize: '0.9rem', fontWeight: 600, color: maskStatus === 'Compliant' ? '#10b981' : maskStatus === 'Violation' ? '#ef4444' : '#1a1a2e' }}>{maskStatus}</div>
            </div>
            <div style={{ flex: 1, background: '#fff', padding: '1rem', borderRadius: 8, border: '1px solid #ede9e3', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
               <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>🧤</div>
               <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9a9590', textTransform: 'uppercase' }}>Gants</div>
               <div style={{ fontSize: '0.9rem', fontWeight: 600, color: glovesStatus === 'Compliant' ? '#10b981' : glovesStatus === 'Violation' ? '#ef4444' : '#1a1a2e' }}>{glovesStatus}</div>
            </div>
          </div>
        </div>



        <div className="card" style={{ flex: 1 }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1a1a2e', marginBottom: '0.8rem' }}>Logs Récents</h3>
          <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {logs.map((L, i) => (
              <div key={i} style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: L.type === 'alert' ? '#dc2626' : '#5a5550' }}>
                <span style={{ color: '#b0aba5' }}>[{L.time}]</span> {L.msg}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}