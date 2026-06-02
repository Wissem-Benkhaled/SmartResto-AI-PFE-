import { useState } from 'react'
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

type CompletedOrderCardProps = {
  order: Order

}
function serviceModeLabel(mode?: number | string) {
  if (mode === 0 || mode === '0') return 'Sur Place'
  if (mode === 1 || mode === '1') return 'À Emporter'
  return 'Unknown'
}

function CompletedOrderCard({ order }: CompletedOrderCardProps) {
  const [expandedSupplements, setExpandedSupplements] = useState<Record<string, boolean>>({})

  function getItemKey(item: Item, index: number) {
    return String(item.id ?? `${order.id}-${item.name ?? 'item'}-${index}`)
  }
  function toggleSupplement(itemKey: string) {
    setExpandedSupplements((prev) => ({
      ...prev,
      [itemKey]: !prev[itemKey]
    }))
  }

  return (
    <article className={`order-card  ${order.status ===2 ? 'refused' :order.status ===3 ? 'terminated' : ''}`}>
          <header className={`order-head ${order.status ===2 ? 'urgent' :order.status ===3 ? 'normal' : ''}`}>
            <div className="order-info">
              <span className="order-id"><img src={order.service_mode === 0 || order.service_mode === '0' ? '/sur place3.png' : order.service_mode === 1 || order.service_mode === '1' ? '/Emporter3.png' : ''} alt="" className="srcImg" /></span>
              <span className="order-mode">{serviceModeLabel(order.service_mode)}</span>
            </div>
            <span className="order-id">Client {order.client_id}_#{order.id}</span>
            <span className={`order-badge ${order.status ===2 ? 'badge-warn' :order.status ===3 ? 'badge-terminated' : 'badge-ok'}`}>
              { order.status ===2 ? 'Refusé' : order.status ===3 ? 'Terminé' : 'Passé' }
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
                    <ul className="supplements ">
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
    </article>
  )
}

export default CompletedOrderCard