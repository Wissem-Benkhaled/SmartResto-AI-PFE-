"use client";

import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Button,
  Paper,
} from "@mui/material";
import { useEffect, useState } from "react";
import PaymentMethodSelector from "./Paiement";
import PaymentLoader from "./PaymentLoader";
import { resolveImageUrl } from "../../utils/imageUrl";
import { usePayment } from "../../hooks/usePayment";


type orderDetails = Record<string, unknown>;
type Supplement = {
  id: string;
  Categorie: number;
  name: string;
  price: number;
  quantity: number;
};
type DetailItem = {
  item_id?: string | number;
  name?: string;
  price?: number | string;
  count?: number | string;
  image?: string;
  supplement?: Supplement[] | undefined;
};
type DetailPromo = {
  code_promo?: string;
  discountedValue?: number | string;
  discountPercent?: number | string;
  nextTotal?: number;
};
type PaiementDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<boolean>;
  orderDetails: orderDetails;
  clearAllItems: () => void;
  paiementMethode: number;
  setPaiementMethode: (value: number) => void;
  apiBaseUrl?: string;
};


{/* fonctions utilitaires de conversion et formatage */ }
const toNumber = (value: unknown): number => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};
const toText = (value: unknown, fallback = ""): string => {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return fallback;
  return String(value);
};
const toCurrency = (value: unknown): string => `${toNumber(value).toFixed(2)} €`;

export default function FinalisationModal({ open, onClose, onConfirm, orderDetails, clearAllItems, paiementMethode,setPaiementMethode, apiBaseUrl }: PaiementDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessState, setShowSuccessState] = useState(false);
  const [expandedSupplements, setExpandedSupplements] = useState<number | null>(null);
  const { isProcessing, status, message, processPayment, resetStatus } = usePayment();

  const detailCmdValue = orderDetails.detail_cmd;
  const items: DetailItem[] = Array.isArray(detailCmdValue) ? (detailCmdValue as DetailItem[]) : [];
  const totalQuantity = items.reduce((sum, item) => sum + toNumber(item.count), 0);

  const codePromoValue = orderDetails.CodePromo;
  const promoDetails: DetailPromo = Array.isArray(codePromoValue) ? ((codePromoValue[0] as DetailPromo) ?? {}) : ((codePromoValue as DetailPromo) ?? {});
  const promoDiscount = toNumber(promoDetails.discountPercent);
  const promoValue = toNumber(promoDetails.discountedValue);

  const subtotal = toNumber(orderDetails.total_Inial);
  const pointFideliteDiscount = toNumber(orderDetails.pointsConsommes) / 100;

  const totalFinale = subtotal - promoValue - pointFideliteDiscount < 0 ? 0 : subtotal - promoValue - pointFideliteDiscount;
  const isFreeOrder = totalFinale <= 0;
  const totalToPay = totalFinale > 0 ? toCurrency(totalFinale) : "Gratuit 🎉 ";
  const serviceMode = toNumber(orderDetails.serviceMode);
  const serviceLabel = serviceMode === 0 ? "Sur place" : "Emporter";
  const orderId = toText(orderDetails.IdCommande ?? orderDetails.idCommande, "--");

  {/* gérer l'ouverture et la fermeture de la modale */ }
  useEffect(() => {
    if (!open) {
      setIsSubmitting(false);
      setShowSuccessState(false);
      resetStatus();
    }
  }, [open, resetStatus]);

  useEffect(() => {
    if (!isProcessing && (status === "cancelled" || status === "error")) {
      setIsSubmitting(false);
      setShowSuccessState(false);
    }
  }, [isProcessing, status]);

  {/* gérer le paiement par carte via l'appareil Adyen */ }
  const handlePaymentCard = async (): Promise<boolean> => {
    const paymentPayload = {
      originName: "192.168.2.88",
      montant: totalFinale,
      TransactionCB: "NEWREGLEMENTSOFTAVERA",
    };

    try {
      const success = await processPayment(
        paymentPayload,
        "http://localhost:3030/post"
      );

      if (success) {
        console.log("Paiement réussi!");
        return true;
      } else {
        console.log("Paiement non approuvé");
        return false;
      }
    } catch (error) {
      console.error("Erreur lors du paiement:", error);
      return false;
    }
  };
  
  {/* gérer la confirmation et l'impression de la commande */ }
  const handleConfirmAndPrint = async () => {
    if (isSubmitting || isProcessing) return;

    // Paiement carte: continuer seulement si approuvé
    if (paiementMethode === 1 && !isFreeOrder) {
      const isPaymentApproved = await handlePaymentCard();

      if (!isPaymentApproved) {
        setIsSubmitting(false);
        setShowSuccessState(false);
        return;
      }
    }

    // Paiement validé (ou espèces) -> finaliser la commande
    setIsSubmitting(true);
    const isSuccess = await onConfirm();

    if (!isSuccess) {
      setIsSubmitting(false);
      setShowSuccessState(false);
      return;
    }

    setShowSuccessState(true);
    window.setTimeout(() => {
      onClose();
      setIsSubmitting(false);
      setShowSuccessState(false);

      window.setTimeout(() => {
        clearAllItems();
      }, 70);
    }, 2000);
  };

  {/* fermer la modale */ }
  const handleDialogClose = () => {
    if (isSubmitting) return;
    setShowSuccessState(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleDialogClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, height: "80%" } }}
    >
      <Box sx={{ px: 3, py: 2.5, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider", bgcolor: "grey.50" }}>
        {/*header */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              bgcolor: "success.light",
              color: "success.dark",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: showSuccessState ? "successPop 0.55s ease-out" : "none",
              "@keyframes successPop": {
                "0%": { transform: "scale(0.7)", opacity: 0.55 },
                "60%": { transform: "scale(1.15)", opacity: 1 },
                "100%": { transform: "scale(1)", opacity: 1 },
              },
            }}
          >
            <Typography fontSize="1rem">✔</Typography>
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>Finalisé de la commande</Typography>
            <Typography variant="caption" color="text.secondary">
              Commande <Box component="span" sx={{ color: "success.main", fontWeight: 700 }}>#{orderId}</Box>
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={handleDialogClose} disabled={isSubmitting}>
          <Typography component="span" fontSize="1.1rem" lineHeight={1}>✕</Typography>
        </IconButton>
      </Box>

      {/*content */}
      <DialogContent sx={{ p: 3, overflowY: "hidden" }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.2fr 1fr" }, gap: 2.5 }}>

          {/*partie recap */}
          <Paper variant="outlined" sx={{ borderRadius: 2.5, p: 2, maxHeight: 280 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={700}>Récapitulatif</Typography>
              <Typography variant="caption" color="text.secondary">{totalQuantity} article(s)</Typography>
            </Box>

            <Box sx={{ minHeight: 200, maxHeight: 200, overflowY: "auto", pr: 0.5 }}>

              {items.map((item, index) => {
                const hasSupplement = Array.isArray(item.supplement) && item.supplement.length > 0;
                const quantity = toNumber(item.count);
                const supplementPrice = hasSupplement
                  ? (item.supplement as any[]).reduce((sum, supp) => sum + (toNumber(supp.price) * toNumber(supp.quantity)), 0)
                  : 0;
                const unitPrice = toNumber(item.price) + supplementPrice;
                const lineTotal = quantity * unitPrice;
                const itemKey = `line-${String(item.item_id ?? item.name ?? "item")}-${index}`;

                return (
                  <Box key={itemKey} sx={{ display: "flex", gap: 1.5, py: 1.1, borderBottom: 1, borderColor: "divider" }}>
                    {resolveImageUrl(item.image, apiBaseUrl) ? (
                      <Box component="img" src={resolveImageUrl(item.image, apiBaseUrl)} alt={toText(item.name, "Produit")} sx={{ width: 42, height: 42, borderRadius: 1.5, objectFit: "cover", bgcolor: "grey.100" }} />
                    ) : (
                      <Box sx={{ width: 42, height: 42, borderRadius: 1.5, bgcolor: "grey.200", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Typography variant="caption">🍽️</Typography>
                      </Box>
                    )}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>{toText(item.name, "Produit")}  <span className="text-xs text-gray-500">({hasSupplement ? "Supplementaire" : "Normale"})</span></Typography>
                      <Typography variant="caption" color="text.secondary">Qté: {quantity} × {toCurrency(unitPrice)}</Typography>

                      {/* bouton pour afficher/masquer les suppléments */}
                      {hasSupplement && (
                        <Box sx={{ mt: 0.5 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              color: "primary.main",
                              cursor: "pointer",
                              textDecoration: "underline",
                              "&:hover": { fontWeight: 600 }
                            }}
                            onClick={() => setExpandedSupplements(expandedSupplements === index ? null : index)}
                          >
                            {expandedSupplements === index ? "▼ Masquer suppléments" : "▶ Voir suppléments"}
                          </Typography>
                          {expandedSupplements === index && Array.isArray(item.supplement) && (
                            <Box sx={{ mt: 0.8, pl: 1.5, borderLeft: 2, borderColor: "primary.light" }}>
                              {(item.supplement as Supplement[]).map((supp, suppIndex) => (
                                <Box key={`${itemKey}-supp-${String(supp.id ?? supp.name ?? "supp")}-${suppIndex}`} sx={{ display: "flex", justifyContent: "space-between", mb: 0.4 }}>
                                  <Typography variant="caption" color="text.secondary">
                                    {toText(supp.name)} × {supp.quantity}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                    {toCurrency(toNumber(supp.price) * toNumber(supp.quantity))}
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          )}
                        </Box>
                      )}
                    </Box>
                    <Typography variant="body2" fontWeight={700}>{toCurrency(lineTotal)}</Typography>
                  </Box>
                );
              })
              }
            </Box>

            <Box sx={{ display: "grid", rowGap: 0.8, marginTop: 5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">Mode de vente</Typography>
                <Typography variant="body2" fontWeight={600}>{serviceLabel}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">Sous-total</Typography>
                <Typography variant="body2" fontWeight={600}>{toCurrency(subtotal)}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">Promo discount ( {promoDiscount + "%"} )</Typography>
                <Typography variant="body2" color="error.main" fontWeight={600}>- {promoValue.toFixed(2) + " €"}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">Point fidelité discount </Typography>
                <Typography variant="body2" color="error.main" fontWeight={600}>- {toCurrency(pointFideliteDiscount)}</Typography>
              </Box>
            </Box>
          </Paper>

          {/*partie paiement */}
          <Paper variant="outlined" sx={{ borderRadius: 2.5, p: 2, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 2 }}>
            <Box>
              <Typography variant="subtitle2" fontWeight={700} >Paiement</Typography>
              <Box
                sx={{
                  
                  p: 1,
                  borderRadius: 2,
                  bgcolor: isFreeOrder ? "grey.200" : "grey.50",
                  border: 1,
                  borderColor: isFreeOrder ? "success.main" : "divider",
                  // mb: 1,
                  position: "relative",
                  overflow: "hidden",
                  "&::after": isFreeOrder
                    ? {
                      content: '""',
                      position: "absolute",
                      inset: 0,
                      background: "linear-gradient(120deg, transparent 0%, rgba(255, 255, 255, 0.71) 45%, transparent 100%)",
                      animation: "freeSweep 2.2s ease-in-out infinite",
                    }
                    : undefined,
                  "@keyframes freeSweep": {
                    "0%": { transform: "translateX(-110%)" },
                    "100%": { transform: "translateX(110%)" },
                  },
                }}
              >
                <Typography variant="caption" color="text.secondary" >Montant à payer</Typography>
                <Typography
                  variant="h4"
                  fontWeight={800}
                  sx={{
                    lineHeight: 1,
                    color: isFreeOrder ? "success.dark" : "text.primary",
                    animation: isFreeOrder ? "freePulse 1.4s ease-in-out infinite" : "none",
                    position: "relative",
                    zIndex: 1,
                    "@keyframes freePulse": {
                      "0%, 100%": { transform: "scale(1)", textShadow: "0 0 0 rgba(46, 125, 50, 0)" },
                      "50%": { transform: "scale(1.02)", textShadow: "0 0 14px rgba(46, 125, 50, 0.28)" },
                    },
                  }}
                >
                  {totalToPay}
                </Typography>
              </Box>
              <Box
                sx={{
                  // minHeight: 34,
                  mb: 1,
                  display: "flex",
                  alignItems: "center",
                  opacity: showSuccessState ? 1 : 0,
                  transform: showSuccessState ? "translateY(0) scale(1)" : "translateY(8px) scale(0.98)",
                  transition: "opacity 220ms ease, transform 220ms ease",
                }}
              >
                <Typography variant="body2" fontWeight={700} color="success.main">
                  Commande finalisee avec succes.
                </Typography>
              </Box>

              {/* Méthode de paiement */}
              <PaymentMethodSelector 
              setPaiementMethode={setPaiementMethode}/>
              {/* <FinalisationModalExample /> */}
              
            </Box>
          </Paper>

        </Box>
      </DialogContent>

      {/* Payment Loader Animation */}
      <PaymentLoader
        isProcessing={isProcessing}
        status={status}
        message={message}
        montant={totalToPay}
        onClose={() => {
          setIsSubmitting(false);
          resetStatus();
        }}
      />

      {/*footer */}
      <Box sx={{ px: 3, py: 2, borderTop: 1, borderColor: "divider", display: "flex", gap: 1.5, justifyContent: "flex-end", bgcolor: "grey.50" }}>
        <Button onClick={handleDialogClose} variant="outlined" color="inherit" disabled={isSubmitting}>Annuler</Button>
        <Button
          onClick={handleConfirmAndPrint}
          variant="contained"
          disabled={isSubmitting}
          startIcon={<span>{showSuccessState ? "✔" : "🖨️"}</span>}
          sx={{
            px: 2.5,
            animation: isSubmitting ? "buttonPulse 0.8s ease-in-out infinite" : "none",
            "@keyframes buttonPulse": {
              "0%, 100%": { transform: "scale(1)", boxShadow: "0 0 0 rgba(46, 125, 50, 0)" },
              "50%": { transform: "scale(1.03)", boxShadow: "0 8px 22px rgba(46, 125, 50, 0.24)" },
            },
          }}
        >
          {showSuccessState ? "Commande envoyee" : isSubmitting ? "Finalisation..." : "Confirmer et imprimer"}
        </Button>
      </Box>
    </Dialog>
  );
}