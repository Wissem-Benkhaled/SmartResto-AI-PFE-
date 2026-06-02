'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { API_BASE_URL } from './Types'
import { BiBorderRight } from 'react-icons/bi'


interface Order {
  id:                   number
  client_id:            number
  user_id?:             number
  user_name?:           string   // LEFT JOIN users
  client_nom?:          string   // LEFT JOIN clients (si le backend le retourne)
  total_cmd:            number
  Prix_finale?:         number
  paiement:             number   // 0 | 1
  service_mode:         number   // 0 | 1
  code_promo?:          string
  points_merci_gagner:  number
  created_at:           string
}

interface OrderDetail {
  id:             number
  order_id:       number
  name:           string   // nom du produit (texte libre)
  price:          number
  count:          number
  point_fidelite: number
}

interface Client {
  client_id: number
  nom:       string
  numero?:   string
  email?:    string
  num_fid?:  string
  point_fid: number
  created_at: string
}

interface Produit {
  item_id:        number
  name:           string   // colonne items.name (ProduitRoute retourne name)
  price:          number   // colonne items.price
  is_available:   boolean
  category_id?:   number
  category_name?: string   // LEFT JOIN categories (ProduitRoute)
  point_fidelite?: number
}

/* ══════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════ */
const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `${(n / 1_000).toFixed(1)}k`
  : String(Math.round(n))

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' €'

// Extrait un tableau depuis la réponse (gère { message } et tableau vide)
const toArr = (r: PromiseSettledResult<any>): any[] =>
  r.status === 'fulfilled' && Array.isArray(r.value.data) ? r.value.data : []

/* ══════════════════════════════════════════════════════
   SPARKLINE SVG
══════════════════════════════════════════════════════ */
function Sparkline({ values, color = '#c9a258' }: { values: number[]; color?: string }) {
  if (values.length < 2) return null
  const max = Math.max(...values, 1), w = 100, h = 36
  const coords = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - (v / max) * (h - 4) - 2}`)
  const area   = [...coords, `${w},${h}`, `0,${h}`].join(' ')
  const gId    = `sp${color.replace('#', '')}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: h, display: 'block' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon  points={area}           fill={`url(#${gId})`} />
      <polyline points={coords.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ══════════════════════════════════════════════════════
   BAR CHART
══════════════════════════════════════════════════════ */
function BarChart({ data, color = '#c9a258' }: { data: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 110 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, height: '100%', justifyContent: 'flex-end' }}>
          {d.value > 0 && <span style={{ fontSize: '0.58rem', color, fontWeight: 700 }}>{fmt(d.value)}</span>}
          <div style={{
            width: '100%',
            height: `${Math.max((d.value / max) * 82, d.value > 0 ? 3 : 0)}%`,
            background: `linear-gradient(to top,${color},${color}44)`,
            borderRadius: '4px 4px 0 0',
            transition: 'height 0.6s cubic-bezier(.4,0,.2,1)',
            minHeight: d.value > 0 ? 3 : 0,
          }} />
          <span style={{ fontSize: '0.6rem', color: '#9a9590', whiteSpace: 'nowrap' }}>{d.label}</span>
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   DONUT SVG
══════════════════════════════════════════════════════ */
function Donut({ slices }: { slices: { label: string; value: number; color: string }[] }) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1
  const r = 38, cx = 50, cy = 50, sw = 16
  let cum = -90
  const arcs = slices.map(s => {
    const deg = (s.value / total) * 360, start = cum; cum += deg
    const toRad = (d: number) => (d * Math.PI) / 180
    const x1 = cx + r * Math.cos(toRad(start)), y1 = cy + r * Math.sin(toRad(start))
    const x2 = cx + r * Math.cos(toRad(start + deg)), y2 = cy + r * Math.sin(toRad(start + deg))
    return { ...s, pct: Math.round((s.value / total) * 100), d: `M${x1} ${y1}A${r} ${r} 0 ${deg > 180 ? 1 : 0} 1 ${x2} ${y2}` }
  })
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
      <svg width={100} height={100} viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0ede8" strokeWidth={sw} />
        {arcs.filter(a => a.value > 0).map((a, i) => (
          <path key={i} d={a.d} fill="none" stroke={a.color} strokeWidth={sw} strokeLinecap="round" />
        ))}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
        {arcs.map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.color, flexShrink: 0 }} />
            <span style={{ fontSize: '0.78rem', color: '#5a5550', flex: 1 }}>{a.label}</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: a.color }}>{a.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   KPI CARD
══════════════════════════════════════════════════════ */
function KpiCard({ icon, label, value, sub, subUp, sparkline, color = '#c9a258' }: {
  icon: string; label: string; value: string
  sub?: string; subUp?: boolean; sparkline?: number[]; color?: string
}) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -28, right: -28, width: 80, height: 80, borderRadius: '50%', background: `radial-gradient(circle,${color}1a,transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '0.63rem', color: '#9a9590', textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 600 }}>{label}</span>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: `${color}1a`, border: `1.5px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem', flexShrink: 0 }}>{icon}</div>
      </div>
      <div style={{ fontFamily: 'Georgia,serif', fontSize: 'clamp(1.2rem,2.5vw,1.65rem)', fontWeight: 700, color: '#1a1a2e', lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.7rem', fontWeight: 600, color: subUp ? '#16a34a' : '#dc2626' }}>{subUp ? '↑' : '↓'} {sub}</div>}
      {sparkline && sparkline.length > 1 && (
        <div style={{ marginTop: '0.35rem' }}><Sparkline values={sparkline} color={color} /></div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   MAIN STATISTICS
══════════════════════════════════════════════════════ */
type Period = 'today' | '7d' | '30d'

export default function Statistics() {
  const [orders,   setOrders]   = useState<Order[]>([])
  const [clients,  setClients]  = useState<Client[]>([])
  const [produits, setProduits] = useState<Produit[]>([])
  const [details,  setDetails]  = useState<OrderDetail[]>([])
  const [loading,  setLoading]  = useState(true)
  const [period,   setPeriod]   = useState<Period>('7d')

  /* ── Chargement initial ── */
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [oR, cR, pR, dR] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/order`),
        axios.get(`${API_BASE_URL}/Client`),
        axios.get(`${API_BASE_URL}/Produit`),
        axios.get(`${API_BASE_URL}/Order_Details`),
      ])
      setOrders(toArr(oR))
      setClients(toArr(cR))
      setProduits(toArr(pR))
      setDetails(toArr(dR))
      setLoading(false)
    }
    load()
  }, [])

  /* ── Filtre période ── */
  const now = new Date()
  const filtered = orders.filter(o => {
    if (!o.created_at) return false
    const d = new Date(o.created_at)
    if (isNaN(d.getTime())) return false
    const diffMs = now.getTime() - d.getTime()
    if (period === 'today') return d.toDateString() === now.toDateString()
    if (period === '7d')    return diffMs >= 0 && diffMs <= 7  * 86400000
    return                         diffMs >= 0 && diffMs <= 30 * 86400000
  })

  /* ── Filtre période (clients) ── */
  const filteredClients = clients.filter(c => {
    if (!c.created_at) return false
    const d = new Date(c.created_at)
    if (isNaN(d.getTime())) return false
    const diffMs = now.getTime() - d.getTime()
    if (period === 'today') return d.toDateString() === now.toDateString()
    if (period === '7d')    return diffMs >= 0 && diffMs <= 7  * 86400000
    return                         diffMs >= 0 && diffMs <= 30 * 86400000
  })

  /* ── KPIs ── */
  const totalRevenue = filtered.reduce((s, o) => s + Number(o.Prix_finale ?? o.total_cmd ?? 0), 0)
  const paidOrders   = filtered.filter(o => Number(o.paiement) == 1)
  const totalPaid    = paidOrders.reduce((s, o) => s + Number(o.Prix_finale ?? o.total_cmd ?? 0), 0)
  const promoOrders  = filtered.filter(o => o.code_promo && String(o.code_promo).trim() !== '')
  const totalPoints  = filtered.reduce((s, o) => s + Number(o.points_merci_gagner ?? 0), 0)
  const surPlace     = filtered.filter(o => Number(o.service_mode) == 0).length
  const aEmporter    = filtered.filter(o => Number(o.service_mode) == 1).length
  const availProd    = produits.filter(p => p.is_available).length

  /* ── Graphiques 7 jours ── */
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const ds = d.toDateString()
    const dayO = orders.filter(o => o.created_at && !isNaN(new Date(o.created_at).getTime()) && new Date(o.created_at).toDateString() === ds)
    return {
      label: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][d.getDay()],
      rev:   dayO.reduce((s, o) => s + Number(o.Prix_finale ?? o.total_cmd ?? 0), 0),
      cnt:   dayO.length,
    }
  })

  /* ── Sparklines 14 jours ── */
  const spark14 = (fn: (o: Order) => number) =>
    Array.from({ length: 14 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (13 - i))
      return orders
        .filter(o => o.created_at && !isNaN(new Date(o.created_at).getTime()) && new Date(o.created_at).toDateString() === d.toDateString())
        .reduce((s, o) => s + fn(o), 0)
    })
  const sparkRev = spark14(o => Number(o.Prix_finale ?? o.total_cmd ?? 0))
  const sparkCnt = spark14(() => 1)

  /* ── Top produits (depuis order_details.name) ── */
  const prodSales: { [k: string]: { name: string; count: number; revenue: number } } = {}
  details.forEach(d => {
    const key = d.name
    if (!prodSales[key]) prodSales[key] = { name: key, count: 0, revenue: 0 }
    prodSales[key].count   += Number(d.count)
    prodSales[key].revenue += Number(d.count) * Number(d.price)
  })
  const topProd = Object.values(prodSales).sort((a, b) => b.count - a.count).slice(0, 6)
  const maxCnt  = Math.max(...topProd.map(p => p.count), 1)

  /* ── Top clients fidélité (sur la période filtrée) ── */
  const topClients = [...filteredClients].sort((a, b) => b.point_fid - a.point_fid).slice(0, 5)

  /* ── LOADING ── */
  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', height: 260 }}>
      <div style={{ display: 'flex', gap: 7 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: '#c9a258', animation: `bounce 1s ${i * 0.16}s infinite` }} />
        ))}
      </div>
      <span style={{ fontSize: '0.82rem', color: '#9a9590' }}>Chargement des statistiques…</span>
      <style>{`@keyframes bounce{0%,80%,100%{transform:scale(0.65);opacity:.35}40%{transform:scale(1);opacity:1}}`}</style>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        .ss { animation: fadeUp 0.38s ease both }
        .pbtn { border:1.5px solid #e8e4de; border-radius:8px; padding:.38rem .85rem; font-size:.78rem;
                font-family:'Plus Jakarta Sans,sans-serif'; cursor:pointer; font-weight:600;
                transition:all .15s; background:#faf8f5; color:#5a5550 }
        .pbtn.on { background:linear-gradient(135deg,#c9a258,#a07830); color:#fff;
                   border-color:transparent; box-shadow:0 2px 8px rgba(201,162,88,.3) }
      `}</style>

      {/* ══ HEADER + PÉRIODE ══ */}
      <div className="ss" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.75rem' }}>
        <div>
          <h2 style={{ fontFamily: 'Georgia,serif', fontSize: '1.3rem', color: '#1a1a2e', fontWeight: 700, margin: 0 }}>Tableau de bord</h2>
          <p style={{ fontSize: '.75rem', color: '#9a9590', margin: '.18rem 0 0' }}>
            {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '.4rem' }}>
          {([['today', "Aujourd'hui"], ['7d', '7 jours'], ['30d', '30 jours']] as [Period, string][]).map(([k, l]) => (
            <button key={k} className={`pbtn${period === k ? ' on' : ''}`} onClick={() => setPeriod(k)}>{l}</button>
          ))}
        </div>
      </div>

      {/* ══ KPI GRID ══ */}
      <div className="kpi-grid ss" style={{ animationDelay: '.05s' }}>
        <KpiCard icon="💰" label="Chiffre d'affaires"
          value={fmtMoney(totalRevenue)}
          sub={`${filtered.length} commande${filtered.length !== 1 ? 's' : ''}`}
          subUp={true} sparkline={sparkRev} color="#c9a258" />

        <KpiCard icon="✅" label="Montant encaissé"
          value={fmtMoney(totalPaid)}
          sub={`${paidOrders.length} payée${paidOrders.length !== 1 ? 's' : ''}`}
          subUp={true} sparkline={sparkCnt} color="#16a34a" />

        <KpiCard icon="👥" label="Clients enregistrés"
          value={fmt(filteredClients.length)}
          sub={`${filteredClients.length} inscription${filteredClients.length !== 1 ? 's' : ''} `}
          subUp={true} color="#2563eb" /> 

        <KpiCard icon="⭐" label="Points distribués"
          value={fmt(totalPoints)}
          sub={`${promoOrders.length} promo${promoOrders.length !== 1 ? 's' : ''} utilisée${promoOrders.length !== 1 ? 's' : ''}`}
          subUp={totalPoints > 0} color="#9333ea" />
      </div>

      {/* ══ MINI BADGES ══ */}
      <div className="ss" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(145px,1fr))', gap: '.7rem', animationDelay: '.1s' }}>
        {[
          { label: 'Sur place',      value: surPlace,           icon: '🪑', color: '#c9a258' },
          { label: 'À emporter',     value: aEmporter,          icon: '🥡', color: '#2563eb' },
          { label: 'Avec promo',     value: promoOrders.length, icon: '🏷️', color: '#16a34a' },
          { label: 'Produits dispo', value: availProd,          icon: '🍽️', color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '.85rem 1rem', display: 'flex', alignItems: 'center', gap: '.75rem' }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.05rem', flexShrink: 0 }}>{s.icon}</div>
            <div>
              <div style={{ fontFamily: 'Georgia,serif', fontSize: '1.3rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '.67rem', color: '#9a9590', marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ══ BAR CHARTS ══ */}
      <div className="chart-grid ss" style={{ animationDelay: '.14s' }}>
        <div className="card">
          <div className="section-title" style={{ fontSize: '.92rem', marginBottom: '.3rem' }}>Revenus — 7 derniers jours</div>
          <div className="section-sub" style={{ marginBottom: '.75rem' }}>Montant total par jour</div>
          <BarChart data={last7.map(d => ({ label: d.label, value: d.rev }))} color="#c9a258" />
        </div>
        <div className="card">
          <div className="section-title" style={{ fontSize: '.92rem', marginBottom: '.3rem' }}>Volume commandes — 7 jours</div>
          <div className="section-sub" style={{ marginBottom: '.75rem' }}>Nombre de commandes par jour</div>
          <BarChart data={last7.map(d => ({ label: d.label, value: d.cnt }))} color="#2563eb" />
        </div>
      </div>

      {/* ══ TOP PRODUITS + DONUTS ══ */}
      <div className="chart-grid ss" style={{ animationDelay: '.18s' }}>

        {/* Top produits */}
        <div className="card">
          <div className="section-title" style={{ fontSize: '.92rem', marginBottom: '.3rem' }}>🏆 Top produits vendus</div>
          <div className="section-sub" style={{ marginBottom: '.85rem' }}>{Object.keys(prodSales).length} article{Object.keys(prodSales).length !== 1 ? 's' : ''} commandés</div>
          {topProd.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#b0aba5', fontSize: '.82rem', padding: '1.5rem 0' }}>Aucune donnée</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.7rem' }}>
              {topProd.map((p, i) => (
                <div key={p.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.28rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.45rem' }}>
                      <span style={{ fontSize: '.62rem', fontWeight: 700, color: i < 3 ? '#c9a258' : '#c0bdb8', minWidth: 16 }}>#{i + 1}</span>
                      <span style={{ fontSize: '.82rem', color: '#1a1a2e', fontWeight: 600 }}>{p.name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '.65rem' }}>
                      <span style={{ fontSize: '.72rem', color: '#9a9590' }}>{p.count}×</span>
                      <span style={{ fontSize: '.72rem', fontWeight: 700, color: '#c9a258' }}>{fmtMoney(p.revenue)}</span>
                    </div>
                  </div>
                  <div style={{ height: 5, background: '#f0ede8', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(p.count / maxCnt) * 100}%`, background: i === 0 ? 'linear-gradient(90deg,#c9a258,#f0d898)' : i === 1 ? 'linear-gradient(90deg,#a07830,#c9a258)' : 'linear-gradient(90deg,#d4b87a,#e8d5a8)', borderRadius: 3, transition: 'width .7s cubic-bezier(.4,0,.2,1)' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Donuts */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <div className="section-title" style={{ fontSize: '.92rem', marginBottom: '.3rem' }}>Mode de service</div>
            <div className="section-sub" style={{ marginBottom: '.7rem' }}>{filtered.length} commandes sur la période</div>
            <Donut slices={[
              { label: 'Sur place',  value: surPlace,  color: '#c9a258' },
              { label: 'À emporter', value: aEmporter, color: '#2563eb' },
            ]} />
          </div>
          <div style={{ borderTop: '1.5px solid #f0ede8', paddingTop: '1rem' }}>
            <div className="section-title" style={{ fontSize: '.92rem', marginBottom: '.3rem' }}>Statut paiement</div>
            <div className="section-sub" style={{ marginBottom: '.7rem' }}>Payé vs en attente</div>
            <Donut slices={[
              { label: 'Encaissé',   value: paidOrders.length,                   color: '#16a34a' },
              { label: 'En attente', value: filtered.length - paidOrders.length, color: '#f59e0b' },
            ]} />
          </div>
        </div>
      </div>

      {/* ══ TOP CLIENTS + DERNIÈRES COMMANDES ══ */}
      <div className="chart-grid ss" style={{ animationDelay: '.22s' }}>

        {/* Top clients fidélité */}
        <div className="card">
          <div className="section-title" style={{ fontSize: '.92rem', marginBottom: '.3rem' }}>⭐ Top clients fidélité</div>
          <div className="section-sub" style={{ marginBottom: '.85rem', letterSpacing: '0.05em' }}>Classement par points accumulés</div>
          {topClients.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#b0aba5', fontSize: '.82rem', padding: '1.5rem 0' }}>Aucun client enregistré</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.65rem' }}>
              {topClients.map((c, i) => {
                const palette = ['#c9a258', '#a07830', '#2563eb', '#16a34a', '#9333ea']
                const col     = palette[i]
                const initials = (c.nom || '?').split(' ').map((w: string) => w[0] || '').join('').substring(0, 2).toUpperCase()
                const maxPts  = topClients[0]?.point_fid || 1
                return (
                  <div key={c.client_id} style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: `${col}18`, border: `2px solid ${col}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.72rem', fontWeight: 700, color: col, flexShrink: 0 }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '.82rem', fontWeight: 600, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nom}</span>
                        <span style={{ fontSize: '.72rem', fontWeight: 700, color: col, marginLeft: '.5rem', flexShrink: 0 }}>{fmt(c.point_fid)} pts</span>
                      </div>
                      <div style={{ height: 4, background: '#f0ede8', borderRadius: 3, marginTop: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(c.point_fid / maxPts) * 100}%`, background: col, borderRadius: 3, transition: 'width .7s cubic-bezier(.4,0,.2,1)' }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Dernières commandes */}
        <div className="card">
          <div className="section-title" style={{ fontSize: '.92rem', marginBottom: '.3rem' }}>🕐 Dernières commandes</div>
          <div className="section-sub" style={{ marginBottom: '.85rem' }}>{Math.min(filtered.length, 6)} affichées</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.8rem' }}>
              <thead>
                <tr>
                  {['#', 'Client', 'Montant', 'Mode', 'Statut'].map(h => (
                    <th key={h} className="table-header" style={{ padding: '.4rem .5rem', textAlign: 'left',display: 'table-cell' ,color: '#8e8e8e',borderBottom: '1px solid #e0e0e0',borderRight: '1px solid #e0e0e0'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 6).map((o, idx) => {
                  const montant    = Number(o.Prix_finale ?? o.total_cmd ?? 0)
                  const clientNom  = o.client_nom
                    ?? clients.find(c => c.client_id === o.client_id)?.nom
                    ?? `Client #${o.client_id}`
                  return (
                    <tr key={o.id} style={{  background: idx % 2 === 0 ? 'transparent' : 'rgba(250,248,245,.5)' }}>
                      <td style={{ borderRight: '1px solid #e0e0e0',padding: '.5rem', color: '#9a9590', fontSize: '.7rem' }}>#{o.id}</td>
                      <td style={{ borderRight: '1px solid #e0e0e0',padding: '.5rem', fontWeight: 600, color: '#1a1a2e', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clientNom}</td>
                      <td style={{ borderRight: '1px solid #e0e0e0',padding: '.5rem', color: '#c9a258', fontWeight: 700 }}>{fmtMoney(montant)}</td>
                      <td style={{ borderRight: '1px solid #e0e0e0',padding: '.5rem' }}>
                        <span style={{ fontSize: '.65rem', padding: '.14rem .48rem', borderRadius: 20, background: Number(o.service_mode) === 0 ? 'rgba(201,162,88,.12)' : 'rgba(37,99,235,.1)', color: Number(o.service_mode) === 0 ? '#a07830' : '#2563eb', fontWeight: 600 }}>
                          {Number(o.service_mode) === 0 ? '🪑 Salle' : '🥡 Emport.'}
                        </span>
                      </td>
                      <td style={{ padding: '.5rem',borderRight: '1px solid #e0e0e0' }}>
                        <span style={{ fontSize: '.65rem', padding: '.14rem .48rem', borderRadius: 20, background: Number(o.paiement) === 1 ? 'rgba(22,163,74,.1)' : 'rgba(245,158,11,.1)', color: Number(o.paiement) === 1 ? '#16a34a' : '#d97706', fontWeight: 600 }}>
                          {Number(o.paiement) === 1 ? '✅ Payé' : '⏳ Attente'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: '#b0aba5', padding: '1.5rem', fontSize: '.82rem' }}>Aucune commande sur cette période</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ══ INVENTAIRE PRODUITS ══ */}
      <div className="card ss" style={{ animationDelay: '.26s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.5rem', marginBottom: '1rem' }}>
          <div>
            <div className="section-title" style={{ fontSize: '.92rem' }}>📦 Inventaire produits</div>
            <div className="section-sub">{produits.length} produit{produits.length !== 1 ? 's' : ''} au catalogue</div>
          </div>
          <div style={{ display: 'flex', gap: '.65rem' }}>
            <span style={{ fontSize: '.72rem', background: 'rgba(22,163,74,.1)', color: '#16a34a', borderRadius: 20, padding: '.18rem .7rem', fontWeight: 700 }}>✅ {availProd} dispo</span>
            <span style={{ fontSize: '.72rem', background: 'rgba(220,38,38,.08)', color: '#dc2626', borderRadius: 20, padding: '.18rem .7rem', fontWeight: 700 }}>❌ {produits.length - availProd} indispo</span>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.8rem' }}>
            <thead>
              <tr>
                {['Produit', 'Catégorie', 'Prix', 'Ventes totales', 'Revenu généré', 'Statut'].map(h => (
                  <th key={h} style={{ padding: '.45rem .5rem', textAlign: 'left', fontSize: '0.66rem', color: '#b0aba5', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1.5px solid #f0ede8', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {produits.slice(0, 8).map((p, idx) => {
                // order_details.name = items.name → même clé pour le lookup
                const s = prodSales[p.name]
                return (
                  <tr key={p.item_id} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(250,248,245,.5)' }}>
                    <td style={{ padding: '.52rem', fontWeight: 600, color: '#1a1a2e' }}>{p.name}</td>
                    <td style={{ padding: '.52rem', color: '#9a9590', fontSize: '.75rem' }}>{p.category_name ?? '—'}</td>
                    <td style={{ padding: '.52rem', color: '#c9a258', fontWeight: 700 }}>{fmtMoney(Number(p.price))}</td>
                    <td style={{ padding: '.52rem', color: '#5a5550' }}>{s ? `${s.count}×` : <span style={{ color: '#d4cfc9' }}>—</span>}</td>
                    <td style={{ padding: '.52rem', color: '#c9a258', fontWeight: 600 }}>{s ? fmtMoney(s.revenue) : <span style={{ color: '#d4cfc9' }}>—</span>}</td>
                    <td style={{ padding: '.52rem' }}>
                      <span style={{ fontSize: '.65rem', padding: '.14rem .48rem', borderRadius: 20, background: p.is_available ? 'rgba(22,163,74,.1)' : 'rgba(220,38,38,.08)', color: p.is_available ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                        {p.is_available ? '● Dispo' : '● Indispo'}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {produits.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#b0aba5', padding: '1.5rem', fontSize: '.82rem' }}>Aucun produit trouvé</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}