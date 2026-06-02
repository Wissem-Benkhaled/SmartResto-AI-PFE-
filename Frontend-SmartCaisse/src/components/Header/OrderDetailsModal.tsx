"use client";

import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Button,
  Stack,
  Paper,
} from "@mui/material";
import { useMemo } from "react";
import axios from "axios";
type OrderDetailItem = {
  id?: number | string;
  order_id?: number | string;
  name?: string;
  point_fidelite?: number;
  price?: number;
  count?: number;
};

// type OrderValue = {
//   prix_finale?: number | string | null;
//   total_cmd?: number | string | null;
//   promo_percent?: number | string | null;
//   points_consommes?: number | string | null;
// };

type OrderItem = {
    id?: number | string;
    user_id?: number | string;
    client_id?: number | string;
    created_at?: string;
    prix_finale?: number | string | null;
    total_cmd?: number | string | null;
    promo_percent?: number | string | null;
    points_consommes?: number | string | null;

};

type OrderDetailsProps = {
  open: boolean;
  onClose: () => void;
  selectedOrder?: OrderItem | undefined;
  orderDetails: OrderDetailItem[];
  // selectedOrder: OrderValue | OrderValue[];
};

export default function OrderDetailsModal({ open, onClose, selectedOrder, orderDetails }: OrderDetailsProps) {
  const toCurracy = (value: number) => `${value.toFixed(2)}`;
  const currentOrder = Array.isArray(selectedOrder) ? (selectedOrder[0] ?? {}) : (selectedOrder ?? {});

  const detailsForOrder = useMemo(
    () => orderDetails.filter((detail) => String(detail.order_id) === String(currentOrder.id)),
    [orderDetails, currentOrder.id]
  );
  
  const sous_total: number = Number(currentOrder.total_cmd ?? 0);
  const Total_Payer: number = Number(currentOrder.prix_finale ?? 0);
  const promo_percent: number = Number((currentOrder.promo_percent) ?? 0);
  const pointsConsommes: number = Number(currentOrder.points_consommes ?? 0);
  const promoValue: number = (sous_total * promo_percent) / 100;
  const points_Fid: number = pointsConsommes / 100;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md"  fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
      {/* Header */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <p className="text-gray-700 text-lg font-bold ">Détails de la Commande</p>
          <Box>
          </Box>

        </Box>
        <IconButton onClick={onClose}>
          <Typography component="span" fontSize="1.1rem" lineHeight={1}>✕</Typography>
        </IconButton>
      </Box>

      <DialogContent dividers sx={{  bgcolor: '#f8f9fa' }}>
        <Box 
         sx={{ p: 3, maxHeight: '40vh' }} 
         className="grid grid-cols- gap-4 overflow-y-auto pr-1 pb-5 scrollbar-custom"
         >
          {detailsForOrder.length > 0 ? (
            <Stack spacing={2}>
              {detailsForOrder.map((detail, index) => {
                const totalLine = Number(detail.price ?? 0) * Number(detail.count ?? 0);
                const totalPoints = Number(detail.point_fidelite ?? 0);
                const detailKey = `${String(currentOrder.id ?? "order")}-${String(detail.id ?? detail.name ?? "detail")}-${index}`;

                return (
                  <Paper
                    key={detailKey}
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      pt: 1.5,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      backgroundColor: '#ffffff',
                      width: '95%',
                    }}
                    className="global-left-border " 
                  >
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
                          {detail.name ?? 'Produit sans nom'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {detail.count ?? 0} x {Number(detail.price ?? 0).toFixed(2)} €
                        </Typography>
                      </Box>

                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="subtitle1" fontWeight="700" color="primary.dark">
                          {totalLine.toFixed(2)} €
                        </Typography>
                        {totalPoints > 0 && (
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', color: 'orange' }}>
                            <Typography variant="caption" fontWeight="bold">
                              +{totalPoints} pts
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Paper>
                );
              })}
            </Stack>
          ) : (
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <Typography sx={{ fontSize: 30, color: 'text.disabled', mb: 1 }}>
                []
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Aucun détail disponible pour cette commande.
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ width: '95%', py: 2, px: 5 }}>

          <div className="border-t border-gray-300 pt-2">
            <div className="flex justify-between items-center ">
              <p className="text-left text-gray-500 text-xs font-bold tracking-wide uppercase">Sous-total :</p>
              <p className="text-right text-s font-bold text-slate-700">{toCurracy(sous_total)} €</p>
            </div>
            <div className="mt-1.5 flex justify-between items-center">
              <p className="text-left text-gray-500 text-xs font-bold tracking-wide uppercase">Points fidélité :</p>
              <p className="text-right text-xs font-bold text-amber-600">- {toCurracy(points_Fid)} €</p>
            </div>
            <div className="mt-1.5 flex justify-between items-center">
              <p className="text-left text-gray-500 text-xs font-bold tracking-wide uppercase">Code promo ({promo_percent}%):</p>
              <p className="text-right text-xs font-bold text-blue-600">- {toCurracy(promoValue)} €</p>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-300 flex justify-between items-center">
              <p className="text-left text-gray-700 text-xs font-extrabold tracking-wide uppercase">Total à payer :</p>
              <p className="text-right text-sm font-extrabold text-green-600">{toCurracy(Total_Payer)} €</p>
            </div>
          </div>
        </Box>
      </DialogContent>

      {/* Footer avec Boutons d'action */}
      <Box sx={{ p: 2, display: "flex", gap: 2, justifyContent: "center" }}>
        <Button onClick={onClose} variant="contained" className="global-btn">
          Fermer
        </Button>
      </Box>
    </Dialog>
  );
}