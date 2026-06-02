'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

import { type Section, allNavItems, API_BASE_URL } from './components/Types'
import Statistics  from './components/Statistics'
import Categorie   from './components/Categorie'
import Produit     from './components/Produit'
import Utilisateur from './components/Utilisateur'
import Client      from './components/Client'
import Promo       from './components/Promo'
import Parametre   from './components/Parametre'
import Supplement  from './components/Supplement'
import DetectSante from './components/DetectSante'
import Mouvement   from './components/Mouvement'
import Pointage    from './components/Pointage'
import IssueSante  from './components/IssueSante'
import VolLogs     from './components/VolLogs'
import PointeuseLogs from './components/PointeuseLogs'


export default function Dashboard() {
  const router = useRouter()
  const [active, setActive]           = useState<Section | null>(null)
  const [menuOpen, setMenuOpen]       = useState(false)
  const [currentUser, setCurrentUser] = useState<{ username: string; role: string } | null>(null)
  const [restaurantData, setRestaurantData] = useState<{ nom: string; logo: string | null } | null>(null)
  const [expandedNav, setExpandedNav] = useState<string | null>(null)
  useEffect(() => {
    const raw = sessionStorage.getItem('auth_user') || localStorage.getItem('user')
    if (!raw) { router.push('/sign-in'); return }
    try {
      const u = JSON.parse(raw)
      setCurrentUser(u)
      setActive(u.role === 'Admin' ? 'statistics' : 'categorie')
    } catch { router.push('/sign-in') }

    // Fetch restaurant parameters
    const fetchRestaurantData = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/Parametre`)
        const data = response.data
        setRestaurantData({ nom: data.nom || 'RestAdmin', logo: data.logo ? `${API_BASE_URL}/${data.logo}` : null })
      } catch (error) {
        console.error('Error fetching restaurant data:', error)
        setRestaurantData({ nom: 'RestAdmin', logo: null })
      }
    }
    fetchRestaurantData()
  }, [])

  if (!currentUser || !active) return null

  const role     = currentUser.role
  const navItems = allNavItems.filter((item: { roles: string | string[] }) => item.roles.includes(role))

  const renderSection = () => {
    switch (active) {
      case 'statistics':  return <Statistics />
      case 'categorie':   return <Categorie />
      case 'produit':     return <Produit />
      case 'supplement':  return  <Supplement />
      case 'utilisateur': return <Utilisateur />
      case 'client':      return <Client />
      case 'promo':       return <Promo />
      case 'parametre':   return <Parametre />
       case 'detect_sante':return <DetectSante />
      case 'health_issue':return <IssueSante />
      case 'mouvement':   return <Mouvement />
      case 'vol_logs':    return <VolLogs />
      case 'pointage':    return <Pointage />
      case 'pointeuse_logs': return <PointeuseLogs />
      
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('auth_token')
    sessionStorage.removeItem('auth_user')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/sign-in')
  }

return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #f7f5f2; }
        
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }

        .shell { display: flex; height: 100vh; overflow: hidden; position: relative; }

        .nav { width: 245px; flex-shrink: 0; background: #1a1a2e; display: flex; flex-direction: column; height: 100vh; overflow-y: auto; transition: transform 0.3s ease; z-index: 100; scrollbar-width: none; -ms-overflow-style: none; }
        .nav::-webkit-scrollbar { display: none; }
        .nav-brand { display: flex; align-items: center; gap: 0.75rem; padding: 1.5rem 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .nav-logo { width: 38px; height: 38px; background: linear-gradient(135deg,#c9a258,#a07830); border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 1.05rem; flex-shrink: 0; box-shadow: 0 3px 10px rgba(201,162,88,0.25); }
        .nav-brand-name { font-size: 1.05rem; font-weight: 700; color: #f5f0e8; }
        .nav-brand-sub { font-size: 0.62rem; color: rgba(245,240,232,0.28); text-transform: uppercase; letter-spacing: 0.12em; margin-top: 1px; }
        .nav-section { padding: 1rem 0.75rem 0.25rem; }
        .nav-section-label { font-size: 0.6rem; color: rgba(245,240,232,0.2); text-transform: uppercase; letter-spacing: 0.14em; font-weight: 600; padding: 0 0.85rem; margin-bottom: 0.35rem; }
        .nav-list { padding: 0 0.75rem; display: flex; flex-direction: column; gap: 2px; flex: 1; }
        .nav-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.65rem 0.85rem; border-radius: 8px; border: none; background: none; color: rgba(245,240,232,0.38); font-family: 'Plus Jakarta Sans',sans-serif; font-size: 0.85rem; font-weight: 500; cursor: pointer; transition: all 0.15s; text-align: left; width: 100%; }
        .nav-item:hover { background: rgba(255,255,255,0.05); color: rgba(245,240,232,0.72); }
        .nav-item.active { background: rgba(201,162,88,0.13); color: #c9a258; border: 1px solid rgba(201,162,88,0.18); }
        .nav-icon { font-size: 1rem; flex-shrink: 0; }
        
        .nav-sub-item { display: flex; align-items: center; padding: 0.5rem 0.85rem 0.5rem 2.8rem; border-radius: 8px; border: none; background: none; color: rgba(245,240,232,0.38); font-family: 'Plus Jakarta Sans',sans-serif; font-size: 0.8rem; font-weight: 500; cursor: pointer; transition: all 0.15s; text-align: left; width: 100%; }
        .nav-sub-item:hover { color: rgba(245,240,232,0.72); }
        .nav-sub-item.active { color: #c9a258; position: relative; }
        .nav-sub-item.active::before { content: ''; position: absolute; left: 1.8rem; top: 50%; transform: translateY(-50%); width: 4px; height: 4px; border-radius: 50%; background: #c9a258; box-shadow: 0 0 6px #c9a258; }
        
        .nav-footer { padding: 0.75rem; border-top: 1px solid rgba(255,255,255,0.06); margin-top: auto; }
        .admin-row { display: flex; align-items: center; gap: 0.7rem; padding: 0.5rem 0.85rem; margin-bottom: 0.5rem; }
        .avatar { width: 33px; height: 33px; background: linear-gradient(135deg,#c9a258,#a07830); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; color: #1a1a2e; flex-shrink: 0; }
        .admin-name { font-size: 0.82rem; color: rgba(245,240,232,0.65); font-weight: 600; }
        .role-badge { display: inline-block; font-size: 0.6rem; font-weight: 700; padding: 0.1rem 0.45rem; border-radius: 10px; margin-top: 3px; background: rgba(201,162,88,0.15); color: #c9a258; border: 1px solid rgba(201,162,88,0.25); text-transform: uppercase; letter-spacing: 0.08em; }
        .logout-btn { width: 100%; background: none; border: 1px solid rgba(255,255,255,0.07); border-radius: 7px; padding: 0.5rem 0.85rem; color: rgba(245,240,232,0.28); font-family: 'Plus Jakarta Sans',sans-serif; font-size: 0.78rem; cursor: pointer; transition: all 0.15s; text-align: left; }
        .logout-btn:hover { border-color: rgba(220,38,38,0.4); color: #f87171; background: rgba(220,38,38,0.05); }
        .overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 99; backdrop-filter: blur(2px); }

        .main { flex: 1; overflow-y: auto; display: flex; flex-direction: column; min-width: 0; }
        .topbar { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.75rem; background: #fff; border-bottom: 1.5px solid #ede9e3; position: sticky; top: 0; z-index: 10; box-shadow: 0 1px 6px rgba(0,0,0,0.04); }
        .menu-btn { display: none; background: none; border: 1.5px solid #e8e4de; border-radius: 7px; padding: 0.38rem 0.6rem; cursor: pointer; color: #5a5550; font-size: 1rem; flex-shrink: 0; }
        .topbar-left { display: flex; align-items: center; gap: 0.75rem; flex: 1; }
        .topbar-icon { font-size: 1.3rem; }
        .topbar-title { font-size: clamp(1rem,2.5vw,1.35rem); font-weight: 700; color: #1a1a2e; }
        .topbar-date { font-size: 0.76rem; color: #b0aba5; white-space: nowrap; }
        .content { padding: clamp(1rem,2.5vw,1.75rem) clamp(1rem,2.5vw,2rem); flex: 1; }

        .card { background: #fff; border: 1.5px solid #ede9e3; border-radius: 12px; padding: clamp(1rem,2vw,1.4rem); box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
        .kpi-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 0.85rem; }
        .chart-grid { display: grid; grid-template-columns: 1.7fr 1fr; gap: 0.85rem; }
        .card-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 0.85rem; }
        .item-card { transition: border-color 0.2s; }
        .item-card:hover { border-color: rgba(201,162,88,0.3); }
        .param-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 1rem; }
        .table-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
        .section-title { font-size: clamp(1rem,2.5vw,1.2rem); font-weight: 700; color: #1a1a2e; }
        .section-sub { font-size: 0.8rem; color: #9a9590; margin-top: 2px; }
        .add-btn { background: linear-gradient(135deg,#c9a258,#a07830); border: none; border-radius: 8px; padding: 0.55rem 1rem; color: #fff; font-weight: 600; font-size: 0.82rem; cursor: pointer; white-space: nowrap; flex-shrink: 0; box-shadow: 0 2px 8px rgba(201,162,88,0.25); transition: opacity 0.15s, transform 0.15s; }
        .add-btn:hover { opacity: 0.88; transform: translateY(-1px); }

        @media (max-width: 900px) {
          .nav { position: fixed; left: 0; top: 0; transform: translateX(-100%); box-shadow: 4px 0 25px rgba(0,0,0,0.35); }
          .nav.open { transform: translateX(0); }
          .overlay.open { display: block; }
          .menu-btn { display: flex; align-items: center; }
          .kpi-grid { grid-template-columns: repeat(2,1fr); }
          .chart-grid { grid-template-columns: 1fr; }
          .card-grid { grid-template-columns: repeat(2,1fr); }
          .param-grid { grid-template-columns: 1fr; }
          .topbar-date { display: none; }
          .topbar { padding: 0.9rem 1.25rem; }
          .content { padding: 1rem; }
        }
        @media (max-width: 540px) {
          .kpi-grid { grid-template-columns: 1fr 1fr; gap: 0.6rem; }
          .card-grid { grid-template-columns: 1fr; }
          .content { padding: 0.75rem; }
        }
        @media (max-width: 360px) {
          .kpi-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="shell">
        <div className={`overlay ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)} />

        {/* SIDEBAR */}
        <aside className={`nav ${menuOpen ? 'open' : ''}`}>
          <div className="nav-brand">
            <div className="nav-logo">
              {restaurantData?.logo ? (
                <img src={restaurantData.logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '9px' }} />
              ) : (
                '🍽'
              )}
            </div>
            <div>
              <div className="nav-brand-name">{restaurantData?.nom || 'RestAdmin'}</div>
              <div className="nav-brand-sub">Gestion Restaurant</div>
            </div>
          </div>
          <div className="hide-scroll" style={{ flex:1, overflowY:'auto', paddingBottom:'0.5rem' }}>
            <div className="nav-section">
              <div className="nav-section-label">Menu principal</div>
            </div>
            <div className="nav-list">
              {navItems.map((item :any) => (
                <div key={item.id}>
                  <button
                    className={`nav-item ${active === item.id || (item.subItems && item.subItems.some((s:any)=>s.id===active)) ? 'active' : ''}`}
                    onClick={() => { 
                      if (item.subItems) {
                        setExpandedNav(expandedNav === item.id ? null : item.id)
                      } else {
                        setActive(item.id); setMenuOpen(false) 
                      }
                    }}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span style={{flex: 1}}>{item.label}</span>
                    {item.subItems && (
                      <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>
                         {expandedNav === item.id ? '▲' : '▼'}
                      </span>
                    )}
                  </button>
                  
                  {item.subItems && expandedNav === item.id && (
                    <div style={{ marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {item.subItems.map((sub: any) => (
                        <button
                          key={sub.id}
                          className={`nav-sub-item ${active === sub.id ? 'active' : ''}`}
                          onClick={() => { setActive(sub.id); setMenuOpen(false) }}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="nav-footer">
            <div className="admin-row">
              <div className="avatar">{currentUser.username?.charAt(0).toUpperCase()}</div>
              <div>
                <div className="admin-name">{currentUser.username}</div>
                <div className="role-badge">{role}</div>
              </div>
            </div>
            <button className="logout-btn" onClick={handleLogout}>⎋ &nbsp;Déconnexion</button>
          </div>
        </aside>

        {/* MAIN */}
        <main className="main">
          <div className="topbar">
            <button className="menu-btn" onClick={() => setMenuOpen(true)}>☰</button>
            <div className="topbar-left">
              <span className="topbar-icon">{navItems.find((n: { id: any }) => n.id === active)?.icon}</span>
              <span className="topbar-title">{navItems.find((n: { id: any }) => n.id === active)?.label}</span>
            </div>
            <div className="topbar-date">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
          <div className="content" style={active === 'pointage' ? { padding: 0 } : undefined}>
            {renderSection()}
          </div>
        </main>
      </div>
    </>
  )
}