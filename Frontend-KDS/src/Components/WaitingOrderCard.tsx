import { useEffect, useState } from 'react'
import axios from 'axios'
export type Supplement = {
  id?: number | string
  category?: number | string
  name?: string
  quantity?: number | string
}

export type Item = {
  id?: number | string
  name?: string
  quantity?: number | string
  supplement?: Supplement[]
}

export type Order = {
  id?: number | string
  user_id?: number | string
  client_id?: number | string
  created_at?: string
  items?: Item[]
  service_mode?: number | string
  status?: number | string
}

type WaitingOrderCardProps = {
  order: Order
  API_BASE_URL: string
  onStatusUpdated: () => void
}

{/*fonction pour calculer les minutes écoulées depuis la création d'une commande */}
function elapsedMinutes(createdAt?: string) {
  if (!createdAt) return 0
  const created = new Date(createdAt)
  if (Number.isNaN(created.getTime())) return 0
  return Math.max(0, Math.floor((Date.now() - created.getTime()) / 60000))
}

{/*fonction pour calculer le libellé du mode de service */}
function serviceModeLabel(mode?: number | string) {
  if (mode === 0 || mode === '0') return 'Sur Place'
  if (mode === 1 || mode === '1') return 'À Emporter'
  return 'Unknown'
}

function WaitingOrderCard({ order, API_BASE_URL, onStatusUpdated }: WaitingOrderCardProps) {
  const minutes = elapsedMinutes(order.created_at)
  const isUrgent = minutes >= 15
  const [expandedSupplements, setExpandedSupplements] = useState<Record<string, boolean>>({})
  const [actionBtn, setActionBtn] = useState<number | null>(null)

  {/*fonction pour générer une clé unique pour chaque item d'une commande, utilisée pour gérer l'état d'expansion des suppléments */}
  function getItemKey(item: Item, index: number) {
    return String(item.id ?? `${order.id}-${item.name ?? 'item'}-${index}`)
  }
  {/*fonction pour gérer l'état d'expansion des suppléments */}
  function toggleSupplement(itemKey: string) {
    setExpandedSupplements((prev) => ({
      ...prev,
      [itemKey]: !prev[itemKey]
    }))
  }
    {/*fonction pour mettre à jour le statut d'une commande lorsque l'utilisateur clique sur les boutons "Terminé" ou "Refusé" */}
  useEffect(() => {
    if (actionBtn !== 1 && actionBtn !== 2) {
      return
    }

    const updateStatus = async () => {
      try {
        const statusEndpoint = `${API_BASE_URL}/Order/updateStatus/${order.id}`
        await axios.patch(statusEndpoint, {
          newStatus: actionBtn
        })
        onStatusUpdated()
      } catch (error) {
        console.error("Erreur lors de la mise à jour du statut:", error)
      } finally {
        setActionBtn(null)
      }
    }

    updateStatus()
  }, [actionBtn, API_BASE_URL, order.id, onStatusUpdated])


  return (
    <article className={`order-card ${isUrgent ? 'urgent' : ''}`}>
      <header className={`order-head ${isUrgent ? 'urgent' : ''}`}>
        <div className="order-info">
          <span className="order-id"><img src={order.service_mode === 0 || order.service_mode === '0' ? '/sur place3.png' : order.service_mode === 1 || order.service_mode === '1' ? '/Emporter3.png' : ''} alt="" className="srcImg" /></span>
          <span className="order-mode">{serviceModeLabel(order.service_mode)}</span>
        </div>
        <span className="order-id">Client {order.client_id}_#{order.id}</span>
        <span className={`order-badge ${isUrgent ? 'badge-warn' : 'badge-ok'}`}>
          {isUrgent ? 'Urgent' : 'New'}
        </span>
      </header>

      <ul className="item-list">
        {(order?.items ?? []).map((item: Item, index) => {
          const itemKey = getItemKey(item, index)
          const hasSupplements = Boolean(item.supplement && item.supplement.length > 0)
          const showSupplement = Boolean(expandedSupplements[itemKey])

          return (
            <li key={item.id ?? `${order.id}-${item.name}`} className="item-line">
              <div className='info-item'>
                <span className="qty">{item.quantity}x</span>
                <span className="name">{item.name}</span>
                <span className="right-arrow" onClick={() => hasSupplements && toggleSupplement(itemKey)}>
                  {hasSupplements ? (showSupplement ? '▲' : '▼') : ''}
                </span>
              </div>
              {showSupplement && hasSupplements && (
                <ul className="supplements">
                  {(item.supplement ?? [])
                    .map((supp) => supp.name)
                    .filter(Boolean)
                    .map((suppName, index) => (
                      <li key={`${item.id ?? item.name ?? 'item'}-supp-${index}`}>+ {suppName}</li>
                    ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
      {<footer className="order-foot">
        <span>{minutes} min</span>
        <div className="order-actions">
          <button className={`cardBtn done-btn ${isUrgent ? 'urgent' : ''}`} onClick={() => setActionBtn(1)}>
            Terminé<img src="/order_done1.png" alt="Done" className='ActionImg' />
          </button>
          {/* <button className="cardBtn reject-btn" onClick={() => setActionBtn(2)}>
            <img src="/refuse2.png" alt="Reject" className='ActionImg' />
          </button> */}
        </div>
      </footer>
      }
    </article>
  )
}

export default WaitingOrderCard
