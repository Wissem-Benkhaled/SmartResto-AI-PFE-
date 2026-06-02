import './KdsInterface.css'
import WaitingOrderCard, { type Order } from './Components/WaitingOrderCard'
import CompletedOrderCard from './Components/CompletedOrderCard'
import { useEffect, useState } from 'react'
import axios from 'axios'


function KdsInterface() {
  const API_BASE_URL = 'http://localhost:5000'
  const [orders, setOrders] = useState<Order[]>([])
  const [completeOrders, setCompleteOrders] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const now = new Date()
  const [currentTime, setCurrentTime] = useState(now);

  const handleLogout = () => {
    sessionStorage.removeItem("auth_token");
    sessionStorage.removeItem("auth_user");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "http://localhost:3002/sign-in";
  };

  {/*fonction de mise à jour de l'heure */ }
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);
  const formattedTime = currentTime.toLocaleTimeString('tn-TN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    // hour12: false
  });

  const filterDate = now.toISOString().split('T')[0];

  const visibleOrders = orders.filter((order) =>
    completeOrders ? order.status !== 0 && order.status !== '0' : order.status === 0 || order.status === '0'
  )
  {/*fonction de rafraîchissement de la liste des commandes après une mise à jour du statut d'une commande */ }
  function handleStatusUpdated() {
    setReloadKey((prev) => prev + 1)
  }

  {/*fonction de récupération des commandes du jour et auto-refresh toutes les 5s pour afficher les nouvelles commandes sans recharger la page manuellement */ }
  useEffect(() => {
    const fetchData = async () => {
      try {
        const orderEndpoint = `${API_BASE_URL}/Order/date2/${filterDate}`
        const ordersRes = await axios.get(orderEndpoint)
        const allOrders = Array.isArray(ordersRes.data) ? ordersRes.data : []
        setOrders(allOrders)
      } catch (error) {
        console.error("Erreur lors de la récupération de l'historique:", error)
      }
    }

    fetchData()
    // Auto-refresh every 5s to show new orders without manual page reload.
    const poller = setInterval(fetchData, 5000)

    return () => clearInterval(poller)
  }, [filterDate, completeOrders, reloadKey]);

  return (
    <div className="kds-scene">
      <main className="kds-monitor">
        {/*header de l'interface avec affichage de l'heure et des onglets pour basculer entre les commandes en cours et les commandes terminées */}
        <header className="kds-header">
          <div className="kds-brand">
            <span className="kds-time">{formattedTime}</span>
            <strong>SmartResto KDS</strong>
          </div>

          <div className="kds-tabs ">
            <button className={`tab ${!completeOrders ? ' tab-active' : ''}`} onClick={() => setCompleteOrders(!completeOrders)}>
              Incompletes Orders
            </button>
            <button className={`tab ${completeOrders ? 'tab-active' : ''}`} onClick={() => setCompleteOrders(!completeOrders)}>
              Completes Orders
            </button>
          </div>
          <div className="kds-right">
            <button className="kds-logout-btn" onClick={handleLogout}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className="w-4 h-4"
                style={{ width: '16px', height: '16px' }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
                />
              </svg>
              Déconnexion
            </button>
          </div>
        </header>
        {/*affichage de la liste des commandes selon l'onglet sélectionné */}
        {visibleOrders.length === 0 ? (
          <p className="no-order">
            {completeOrders
              ? 'Il n\'y a pas de commandes terminées pour aujourd\'hui !!'
              : 'Il n\'y a pas de commandes en cours pour aujourd\'hui !!'}
          </p>
        ) : (
          <section className="kds-grid scrollbar-custom">
            {visibleOrders.map((order) =>
              completeOrders ? (
                <CompletedOrderCard key={order.id} order={order} />
              ) : (
                <WaitingOrderCard
                  key={order.id}
                  order={order}
                  API_BASE_URL={API_BASE_URL}
                  onStatusUpdated={handleStatusUpdated}
                />
              )
            )}
          </section>
        )}
      </main>
    </div>
  )
}

export default KdsInterface
