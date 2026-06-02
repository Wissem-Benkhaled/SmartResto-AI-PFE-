import React from 'react'

export const badge = (label: string, color: string) => (
  <span style={{ display:'inline-block', padding:'0.18rem 0.6rem', borderRadius:20, fontSize:'0.71rem', fontWeight:600, color, background:`${color}18`, border:`1px solid ${color}28`, whiteSpace:'nowrap' }}>{label}</span>
)

export const Btn = ({ children, onClick, variant = 'outline' }: { children: React.ReactNode; onClick?: () => void; variant?: 'outline' | 'danger' }) => (
  <button
    onClick={onClick}
    style={{ background:'none', border:`1px solid ${variant==='danger'?'#fca5a5':'#e8e4de'}`, borderRadius:6, padding:'0.26rem 0.55rem', color: variant==='danger'?'#dc2626':'#9a9590', fontSize:'0.74rem', cursor:'pointer', transition:'all 0.15s' }}
  >{children}</button>
)

export const Actions = ({ onEdit, onDelete }: { onEdit?: () => void; onDelete?: () => void }) => (
  <div style={{ display:'flex', gap:'0.3rem' }}>
    <Btn onClick={onEdit}>✏️</Btn>
    <Btn variant="danger" onClick={onDelete}>✕</Btn>
  </div>
)

export function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <>
      <div style={{
        position:'fixed', bottom:'1.5rem', right:'1.5rem', zIndex:300,
        background: type==='success' ? '#1a1a2e' : '#fef2f2',
        border:`1.5px solid ${type==='success' ? 'rgba(201,162,88,0.4)' : '#fca5a5'}`,
        color: type==='success' ? '#c9a258' : '#dc2626',
        padding:'0.75rem 1.2rem', borderRadius:10,
        boxShadow:'0 8px 30px rgba(0,0,0,0.18)',
        fontSize:'0.84rem', fontWeight:600,
        display:'flex', alignItems:'center', gap:'0.5rem',
        animation:'toastIn 0.25s ease',
      }}>
        {type==='success' ? '✅' : '❌'} {message}
      </div>
      <style>{`@keyframes toastIn { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </>
  )
}