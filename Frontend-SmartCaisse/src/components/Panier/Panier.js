import { useEffect, useRef, useState } from "react";
import axios from "axios";
import Client from "./Client";
import ConfirmationModal from "./ConfirmationModal";
import FinalisationModal from "../Finalisation/FinalisationModal";
import Promotion_Code from "../Promotion_Code/Promotion_Code";
import SupplementOrder from "../Product/SupplementOrder";
import { resolveImageUrl } from "../../utils/imageUrl";

function SuppTotal(supplements) {
  if (!Array.isArray(supplements)) return 0;
  const somme = supplements.reduce((total, supplement) => total + (Number(supplement.price) * Number(supplement.quantity)), 0);
  return somme;
}

function CalculerTotal(detail_cmd) {
  return detail_cmd.reduce(
    (total, item) => {
      const supplementCost = SuppTotal(item.supplement);
      return total + (((Number(item.price) || 0) + supplementCost) * (Number(item.count) || 0));
    },
    0
  );
}

function CalculerTotalPointsFidalGanier(detail_cmd) {
  return detail_cmd.reduce(
    (total, item) => total + (Number(item.point_fidelite)),
    0
  );
}

export default function Panier({ globalNotify, Path_API, detail_cmd = [], setDetail_cmd, onKeyboardFocus }) {
  const [selectedClient, setSelectedClient] = useState(null);
  const [serviceMode, setServiceMode] = useState(0);
  const [IdCommande, setIdCommande] = useState(1);
  const [clientResetSignal, setClientResetSignal] = useState(0);
  const total_Inial = CalculerTotal(detail_cmd);
  const clientId = selectedClient ? selectedClient.client_id : null;
  const [totalFinale, setTotalFinale] = useState(0);
  const [orderDetails, setOrderDetails] = useState({});
  const [paiementMethode, setPaiementMethode] = useState(0);
  const resolveBackendImage = (imagePath) => resolveImageUrl(imagePath, Path_API);

  useEffect(() => {
    const codePromo = orderDetails?.CodePromo && !Array.isArray(orderDetails.CodePromo) ? orderDetails.CodePromo : null;

    {/* Calcul des réductions de promotion */ }
    const promoDiscountPercent = Number(codePromo?.discountPercent) || 0;
    const promoDiscountValue = Number(total_Inial * (promoDiscountPercent / 100));
    const totalAfterPromo = Number(Math.max(total_Inial - promoDiscountValue, 0));

    {/* Calcul des points de fidélité */ }
    const pointsFideliteValue = Number((Number(orderDetails?.pointsConsommes) || 0) / 100);
    const appliedPointsValue = Number(Math.min(totalAfterPromo, pointsFideliteValue));
    const pointsConsommes = Math.round(appliedPointsValue * 100);

    {/*Calcul du total final */ }
    const nextTotalFinale = Number(Math.max(totalAfterPromo - appliedPointsValue, 0));
    setTotalFinale(nextTotalFinale);

    {/* Mise à jour des détails de la commande */ }
    setOrderDetails((prev) => {
      const prevCodePromo = prev?.CodePromo && !Array.isArray(prev.CodePromo)
        ? prev.CodePromo
        : null;

      const prevPromoValue = Number(prevCodePromo?.discountedValue) || 0;
      const prevPromoNextTotal = Number(prevCodePromo?.nextTotal) || 0;
      const prevPrixPoints = Number(prev?.prix_points_fids) || 0;
      const prevPointsConsommes = Number(prev?.pointsConsommes) || 0;
      const prevTotalFinale = Number(prev?.total_Finale) || 0;

      const promoUnchanged = !prevCodePromo
        ? !codePromo
        : prevPromoValue === promoDiscountValue && prevPromoNextTotal === totalAfterPromo;

      const unchanged =
        promoUnchanged &&
        prevPrixPoints === appliedPointsValue &&
        prevPointsConsommes === pointsConsommes &&
        prevTotalFinale === nextTotalFinale;

      if (unchanged) {
        return prev;
      }

      return {
        ...prev,
        ...(prevCodePromo
          ? {
            CodePromo: {
              ...prevCodePromo,
              discountedValue: promoDiscountValue,
              nextTotal: totalAfterPromo,
            },
          }
          : {}),
        pointsConsommes: pointsConsommes,
        prix_points_fids: appliedPointsValue,
        total_Finale: nextTotalFinale,
      };
    });
  }, [total_Inial, orderDetails?.CodePromo, orderDetails?.pointsConsommes]);


  {/* Gestion du scroll automatique vers le bas lorsque de nouveaux éléments sont ajoutés au panier */ }
  const previousLengthRef = useRef(detail_cmd.length);
  const scrollContainerRef = useRef(null);
  const isFinalizingRef = useRef(false);
  useEffect(() => {
    const hasNewItem = detail_cmd.length > previousLengthRef.current;
    if (hasNewItem && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
    previousLengthRef.current = detail_cmd.length;
  }, [detail_cmd.length]);


  {/* Fonctions de gestion du panier */ }
  const removeItem = (lineId) => {
    if (!setDetail_cmd) return;
    setDetail_cmd((prev) =>
      prev.filter((item, index) => {
        const currentLineId = item.cart_line_id ?? `${item.item_id}-${index}`;
        return currentLineId !== lineId;
      })
    );
  };
  const updateItemCount = (lineId, nextCount) => {
    if (!setDetail_cmd) return;
    const numericCount = Number(nextCount);
    const safeCount = Math.min(Number.isNaN(numericCount) ? 0 : numericCount, 100);

    if (safeCount < 1) {
      removeItem(lineId);
      return;
    }

    setDetail_cmd((prev) =>
      prev.map((item, index) => {
        const currentLineId = item.cart_line_id ?? `${item.item_id}-${index}`;
        return currentLineId === lineId ? { ...item, count: safeCount } : item;
      }
      )
    );
  };
  const clearAllItems = () => {
    setDetail_cmd(() => []);
    setOrderDetails({});
    setTotalFinale(0);
    setServiceMode(0);
    setPaiementMethode(0);
    setSelectedClient(null);
    setClientResetSignal((prev) => prev + 1);
    previousLengthRef.current = 0;

  };

  {/* Prompot de modification des supplements */ }
  const [isEditSupplementOpen, setIsEditSupplementOpen] = useState(false);
  const [editTargetLineId, setEditTargetLineId] = useState(null);
  const [editTargetItem, setEditTargetItem] = useState(null);
  const [editSupplementsInOrder, setEditSupplementsInOrder] = useState([]);
  const openSupplementEditDialog = (lineId, item) => {
    setEditTargetLineId(lineId);
    setEditTargetItem(item);
    setEditSupplementsInOrder(Array.isArray(item?.supplement) ? item.supplement : []);
    setIsEditSupplementOpen(true);
  };
  const closeSupplementEditDialog = () => {
    setIsEditSupplementOpen(false);
    setEditTargetLineId(null);
    setEditSupplementsInOrder([]);
    window.setTimeout(() => {
      setEditTargetItem(null);
    }, 500);
  };
  const handleSupplementEditConfirm = async () => {
    if (!editTargetLineId || !setDetail_cmd) return false;

    const selectedSupplements = Array.isArray(editSupplementsInOrder)
      ? editSupplementsInOrder.filter((supplement) => Number(supplement?.quantity) > 0)
      : [];

    setDetail_cmd((prev) =>
      prev.map((item, index) => {
        const currentLineId = item.cart_line_id ?? `${item.item_id}-${index}`;
        if (currentLineId !== editTargetLineId) return item;
        return {
          ...item,
          supplement: selectedSupplements,
        };
      })
    );

    return true;
  };

  {/* Prompot de finalisation */ }
  const [isFinalisationOpen, setIsFinalisationOpen] = useState(false);
  const openFinalisationDialog = () => {
    if (detail_cmd.length === 0) {
      notify();
      return;
    }
    const Points_Fidal_Ganier = CalculerTotalPointsFidalGanier(detail_cmd) || 0;
    setOrderDetails((prev) => {
      return {
        ...prev,
        IdCommande,
        clientId,
        serviceMode,
        paiement: paiementMethode,
        Points_Fidal_Ganier,
        detail_cmd,
        total_Inial: Number(total_Inial.toFixed(2)),
        total_Finale: Number(totalFinale.toFixed(2)),
      };
    });
    setIsFinalisationOpen(true);
  };
  const closeFinalisationDialog = () => {
    setIsFinalisationOpen(false);
  };
  const handleFinalisationClear = async () => {
    if (isFinalizingRef.current) {
      return false;
    }

    isFinalizingRef.current = true;
    try {
      const orderPayload = {
        ...orderDetails,
        paiement: paiementMethode,
      };
      {/*Insertion dans la table Order*/ }
      const res1 = await axios.post(`${Path_API}/Order`, {
        orderDetails: orderPayload,
      });
    } catch (error) {
      isFinalizingRef.current = false;
      console.error("Error during order finalization:", error);
      globalNotify("Une erreur est survenue lors de la finalisation de la commande. Veuillez réessayer.", "error");
      return false;
    }
    // closeFinalisationDialog();
    setIdCommande((prev) => {
      const nextId = Number(prev) + 1;
      return nextId;
    });
    isFinalizingRef.current = false;
    // clearAllItems();
    return true;
  };

  {/* Prompot de confirmation pour vider le panier */ }
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const openConfirmDialog = () => {
    setIsConfirmOpen(true);
  };
  const closeConfirmDialog = () => {
    window.setTimeout(() => {
      setIsConfirmOpen(false);
    }, 1000);
  };
  const handleConfirmClear = () => {
    clearAllItems();
    closeConfirmDialog();
  };

  return (
    <div className="mt-3 w-1/3 p-0.5 rounded-xl flex flex-col h-[calc(100vh-1.5rem)]">
      <Client
        globalNotify={globalNotify}
        Path_API={Path_API}
        onKeyboardFocus={onKeyboardFocus}
        setSelectedClient={setSelectedClient}
        setOrderDetails={setOrderDetails}
        resetSignal={clientResetSignal}
        totalFinale={totalFinale}

      />

      {/* Carte du panier */}
      <div className="h-full min-h-0 p-3 bg-white text-gray-800 rounded-xl shadow-lg border border-gray-200 flex flex-col">

        {/* l'entet de la carte */}
        <h2 className="font-bold mb-2 px-2.5 text-gray-800 py-1.5 border-b-2 global-border-success flex items-center justify-between ">
          <span>🛒 Commande</span>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center p-0.5 rounded-lg bg-gray-100 border border-gray-200">
              <button
                type="button"
                onClick={() => setServiceMode(0)}
                className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all uppercase ${serviceMode === 0
                  ? "globals-colors text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-200"
                  }`}
              >
                sur place
              </button>
              <button
                type="button"
                onClick={() => setServiceMode(1)}
                className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all uppercase ${serviceMode === 1
                  ? "globals-colors text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-200"
                  }`}
              >
                Emporter
              </button>
            </div>
          </div>
          <span id="idCommande" className="text-xs text-gray-500">(#{IdCommande < 10 ? "0" + IdCommande : IdCommande})</span>
        </h2>

        {/*affichage des produits dans le panier*/}
        {detail_cmd.length === 0 ? (
          <div className="text-center  text-gray-500 overflow-auto">
            <p className="text-xs">Aucun produit</p>
          </div>
        ) : (
          <div ref={scrollContainerRef} className="space-y-2 overflow-auto pr-1 scrollbar-custom flex-1 min-h-0">
            {detail_cmd.map((item, index) => {
              const lineId = item.cart_line_id ?? `${item.item_id}-${index}`;
              const hasSupplement = Array.isArray(item.supplement) && item.supplement.length > 0;
              const supplementCost = hasSupplement ? SuppTotal(item.supplement) : 0;

              return (
                <div key={lineId} className="relative flex items-center justify-between bg-gray-50 p-1.5 rounded-lg border border-gray-100 shadow-sm">
                  <button
                    onClick={() => removeItem(lineId)}
                    className="absolute top-1.5 right-1.5 w-4 h-4 text-gray-500"
                    aria-label="Supprimer l'article"
                  >
                    <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="flex items-center min-w-0">
                    <img
                      src={resolveBackendImage(item.image) || "/products/indesponibleItem.png"}
                      alt={item.name}
                      className="w-11 h-11 object-cover rounded-md"
                    />
                    <div className="ml-1.5 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate pr-6">{item.name}
                        <span className="text-xs text-gray-500">({hasSupplement ? "Supplementaire" : "Normale"})</span>
                        {/* <span className="text-xs text-gray-500">{hasSupplement ? "Modifié" : ""}</span> */}
                      </p>
                      {/* <p className="text-sm text-gray-500">{item.cat}</p> */}
                      <div className="h-4 flex items-center gap-1 mt-2">
                        <button
                          onClick={() => updateItemCount(lineId, item.count + 1)}
                          className="h-5 w-5 flex items-center justify-center rounded-md bg-gray-500 text-white text-[10px] font-semibold hover:bg-gray-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Modifier la quantité"
                        >
                          +
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={50}
                          value={item.count}
                          onChange={(e) => {
                            const raw = Number(e.target.value);
                            const safeValue = Math.min(50, Number.isNaN(raw) ? 0 : raw);
                            updateItemCount(lineId, safeValue);
                          }}
                          className="h-5 w-10 text-center rounded-md border border-gray-200 bg-gray-50 px-1 text-[10px] font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                        <button
                          onClick={() => updateItemCount(lineId, item.count - 1)}
                          className="h-5 w-5 flex items-center justify-center rounded-md bg-gray-500 text-white text-[10px] font-semibold hover:bg-gray-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Modifier la quantité"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() => openSupplementEditDialog(lineId, item)}
                          className="w-16 h-5 rounded-md global-btn text-white text-[10px] font-semibold active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                          aria-label="Modifier la quantité"
                        >
                          <img
                            src="/assets/edit2.png"
                            alt="Modifier"
                            className="w-3 h-3 object-contain"
                          />
                          <span>modifié</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-1.5 self-end">
                    <p className="text-[12px] text-red-500 mb-0.5 font-bold">{(((Number(item.price) || 0) + supplementCost) * (Number(item.count) || 0)).toFixed(2)} €</p>

                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Total Bar */}
        <div className="mt-auto pt-3 mb-1 shrink-0">
          <div className="mt-3 bg-gradient-to-r from-white to-gray-200 p-2.5 border-t-2 global-border-success">
            <div className=" flex justify-between  items-center">
              <p className="text-left text-gray-500 text-xs  font-bold tracking-wide uppercase">Montant total :</p>
              <p className=" text-right text-s global-text">{totalFinale.toFixed(2)} €</p>
            </div>
          </div>

          {/* Code Promo */}
          <Promotion_Code
            globalNotify={globalNotify}
            Path_API={Path_API}
            clientId={clientId}
            total_Finale={totalFinale}
            setOrderDetails={setOrderDetails}
            resetSignal={clientResetSignal}
            onKeyboardFocus={onKeyboardFocus}
            total_Inial={total_Inial}
          />

          <button
            // disabled={detail_cmd.length === 0}
            onClick={detail_cmd.length === 0 ?  undefined :openFinalisationDialog}
            className="mt-3 w-full global-btn text-white p-2.5 rounded-xl text-xs font-bold shadow-lg transition-all duration-200">
            Passer la commande
          </button>

          <button
            onClick={openConfirmDialog}
            disabled={detail_cmd.length === 0}
            className="mt-2 w-full bg-gray-100 hover:bg-red-700 hover:text-white text-black p-2.5 rounded-xl text-xs font-bold shadow-lg transition-all duration-200 disabled:opacity-70"
          >
            Vider le panier
          </button>

        </div>
      </div>

      <ConfirmationModal
        open={isConfirmOpen}
        onClose={closeConfirmDialog}
        onConfirm={handleConfirmClear}
      />

      <FinalisationModal
        open={isFinalisationOpen}
        onClose={closeFinalisationDialog}
        onConfirm={handleFinalisationClear}
        orderDetails={orderDetails}
        clearAllItems={clearAllItems}
        paiementMethode={paiementMethode}
        setPaiementMethode={setPaiementMethode}
        apiBaseUrl={Path_API}
      />

      <SupplementOrder
        open={isEditSupplementOpen}
        onClose={closeSupplementEditDialog}
        onConfirm={handleSupplementEditConfirm}
        item={editTargetItem || {}}
        setSupplementsInOrder={setEditSupplementsInOrder}
        activeCategoryId={Number(editTargetItem?.category_id) || 0}
        initialSupplements={Array.isArray(editTargetItem?.supplement) ? editTargetItem.supplement : []}
        apiBaseUrl={Path_API}
      />
    </div>

  );
}
