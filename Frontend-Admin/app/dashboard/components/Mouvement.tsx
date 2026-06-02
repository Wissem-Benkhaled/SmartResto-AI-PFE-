'use client'
import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { API_BASE_URL } from './Types'

export default function Mouvement() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const [isCameraOn, setIsCameraOn] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [wsConnected, setWsConnected] = useState(false)

  const [statusText, setStatusText] = useState('OFFLINE')
  const [statusMsg, setStatusMsg] = useState('Surveillance arrêtée.')
  const [statusType, setStatusType] = useState('unknown') // 'unknown', 'safe', 'violation'
  const [motionFlash, setMotionFlash] = useState(false)
  const [logs, setLogs] = useState<{time: string, msg: string, type: string}[]>([{time: new Date().toLocaleTimeString(), msg: 'Prêt pour la détection H24.', type: 'clear'}])

  const addLog = (msg: string, type: string = 'clear') => {
    setLogs(prev => [{ time: new Date().toLocaleTimeString(), msg, type }, ...prev].slice(0, 50))
  }

  useEffect(() => {
    hiddenCanvasRef.current = document.createElement('canvas')
    connectWs()
    return () => {
      stopCamera()
      if (wsRef.current) wsRef.current.close()
    }
  }, [])

  const extractCaptureFilename = (result: any) => {
    if (typeof result.filename === 'string' && result.filename.trim()) {
      return result.filename.trim()
    }
    if (typeof result.file === 'string' && result.file.trim()) {
      return result.file.trim()
    }
    if (typeof result.image === 'string' && !result.image.startsWith('data:') && result.image.includes('/')) {
      return result.image.trim()
    }
    return null
  }

  const connectWs = () => {
    const wsUrl = `ws://localhost:8000/ws/movement`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => setWsConnected(true)
    ws.onclose = () => {
      setWsConnected(false)
      stopStreaming()
      setTimeout(connectWs, 3000)
    }
    ws.onerror = (err) => console.error("Movement WS error:", err)
    ws.onmessage = async (event) => {
      try {
        const result = JSON.parse(event.data)
        const filename = extractCaptureFilename(result)
        const theftDate = result.theft_date ?? new Date().toISOString()

        if (result.movement && filename) {
          setStatusText('MOTION DETECTED')
          setStatusType('violation')
          setStatusMsg('Mouvement capturé et sauvegardé.')
          addLog(`Mouvement détecté & sauvegardé: ${filename}`, 'alert')

          try {
            await axios.post(`${API_BASE_URL}/VolLogs`, {
              filename,
              theft_date: theftDate
            })
            window.dispatchEvent(new Event('vol-log-updated'))
          } catch (err) {
            console.error("Erreur lors de l'enregistrement en DB:", err)
            addLog('Erreur lors de l’enregistrement en DB', 'alert')
          }

          setMotionFlash(true)
          setTimeout(() => {
            setMotionFlash(false)
            if (isStreaming) {
              setStatusText('MONITORING')
              setStatusType('safe')
              setStatusMsg('Système actif. Analyse du flux...')
            }
          }, 1000)
        }
      } catch (e) {
        console.error("Movement parse error:", e)
      }
    }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          if (hiddenCanvasRef.current && videoRef.current) {
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
  }

  const startStreaming = () => {
    if (!isCameraOn || !wsConnected || !wsRef.current) return
    setIsStreaming(true)
    setStatusText('MONITORING')
    setStatusType('safe')
    setStatusMsg('Système actif. Analyse du flux...')
    addLog("Surveillance H24 démarrée.", "clear")

    streamIntervalRef.current = setInterval(() => {
      if (videoRef.current && hiddenCanvasRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
        const ctx = hiddenCanvasRef.current.getContext('2d')
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, hiddenCanvasRef.current.width, hiddenCanvasRef.current.height)
          const base64Img = hiddenCanvasRef.current.toDataURL('image/jpeg', 0.6)
          wsRef.current.send(JSON.stringify({ image: base64Img }))
        }
      }
    }, 100) // 10fps
  }

  const stopStreaming = () => {
    if (streamIntervalRef.current) clearInterval(streamIntervalRef.current)
    setIsStreaming(false)
    setStatusText('OFFLINE')
    setStatusType('unknown')
    setStatusMsg('Surveillance arrêtée.')
    addLog("Surveillance arrêtée.", "clear")
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
      
      <div className="card">
        <div className="table-header">
          <div>
            <div className="section-title">Caméra - Détection Mouvement 🏃</div>
            <div className="section-sub">
              {wsConnected 
                ? <span style={{color: '#10b981'}}>🟢 Connecté à l'IA Mouvement</span> 
                : <span style={{color: '#ef4444'}}>🔴 Déconnecté de l'IA (localhost:8000)</span>}
            </div>
          </div>
        </div>

        <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', backgroundColor: '#1a1a2e', borderRadius: 12, overflow: 'hidden', transform: 'scaleX(-1)', transition: 'box-shadow 0.2s', boxShadow: motionFlash ? 'inset 0 0 0 8px #ef4444' : 'none' }}>
          <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
            {isStreaming ? 'Stop Surveillance H24' : 'Start Surveillance H24'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div className="card" style={{ background: statusType === 'violation' ? '#fef2f2' : statusType === 'safe' ? '#ecfdf5' : '#fff', border: statusType === 'violation' ? '1.5px solid #fca5a5' : statusType === 'safe' ? '1.5px solid #6ee7b7' : '1.5px solid #ede9e3', transition: 'all 0.3s' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1a1a2e', marginBottom: '0.5rem' }}>Statut de Surveillance</h3>
          <div style={{ display: 'inline-block', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 800, color: '#fff', background: statusType === 'violation' ? '#ef4444' : statusType === 'safe' ? '#10b981' : '#9ca3af', marginBottom: '0.8rem' }}>
            {statusText}
          </div>
          <p style={{ fontSize: '0.85rem', color: '#5a5550' }}>{statusMsg}</p>
        </div>

        <div className="card" style={{ flex: 1 }}>
           <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1a1a2e', marginBottom: '0.8rem' }}>Logs d'Acitivé de Mouvements</h3>
           <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {logs.map((L, i) => (
              <div key={i} style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: L.type === 'alert' ? '#dc2626' : '#5a5550', padding: '0.3rem', background: L.type === 'alert' ? '#fef2f2' : '#f9fafb', borderRadius: 4, borderLeft: `3px solid ${L.type === 'alert' ? '#ef4444' : '#e5e7eb'}` }}>
                <span style={{ color: '#b0aba5', marginRight: 6 }}>[{L.time}]</span> {L.msg}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
