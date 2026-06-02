"use client";

import { Dialog, DialogContent, Box, Typography, IconButton, Divider, Button, } from "@mui/material";
import { useEffect, useState } from "react";
import axios from "axios";
import OrderDetailsModal from "./OrderDetailsModal";
// import "./globals.css";

type OrderItem = {
    id?: number | string;
    user_id?: number | string;
    client_id?: number | string;
    created_at?: string;
    prix_finale?: number | string | null;
    total_cmd?: number | string | null;
    promo_percent?: number | string | null;
    points_consommes?: number | string | null;
    status?: number | string | null;

};

type OrderDetailItem = {
    id?: number | string;
    order_id?: number | string;
    name?: string;
    point_fidelite?: number;
    price?: number;
    count?: number;
};

type HistoricalDataModalProps = {
    open: boolean;
    onClose: () => void;
    Path_API: string;
};

{/* Fonction pour formater la date */ }
function formatDate(date?: string) {
    if (!date) return "-";
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "-";

    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, "0");
    const dd = String(parsed.getDate()).padStart(2, "0");
    const hh = String(parsed.getHours()).padStart(2, "0");
    const min = String(parsed.getMinutes()).padStart(2, "0");
    const sec = String(parsed.getSeconds()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd} | ${hh}:${min}:${sec}`;
}

{/* Fonction pour vérifier si la date de la commande correspond à la date sélectionnée */ }
function matchesSelectedDate(orderDate: string | undefined, selectedDate: string) {
    if (!selectedDate) return true;
    if (!orderDate) return false;

    const parsed = new Date(orderDate);
    if (Number.isNaN(parsed.getTime())) return false;

    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, "0");
    const dd = String(parsed.getDate()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd}` === selectedDate;
}

{/* Fonction pour obtenir le label et la couleur en fonction du statut de la commande */ }
function getStatusMeta(status?: number | string | null) {
    const normalizedStatus = Number(status);

    if (normalizedStatus === 0) {
        return { label: "En cours", color: "#ef7f00" };
    }

    if (normalizedStatus === 1) {
        return { label: "Prête", color: "#2e7d32" };
    }

    if (normalizedStatus === 2) {
        return { label: "Refusée", color: "#ef0000" };
    }
    return { label: "Terminée", color: "#838383" };
}

export default function HistoricalDataModal({ open, onClose, Path_API }: HistoricalDataModalProps) {

    const API_BASE_URL = Path_API;
    const [orders, setOrders] = useState<OrderItem[]>([]);
    const [orderDetails, setOrderDetails] = useState<OrderDetailItem[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<OrderItem | undefined>(undefined);
    const [refreshTrigger, setRefreshTrigger] = useState(false);
    const todayDate = new Date().toISOString().split("T")[0];
    const [isModalOpen, setIsModalOpen] = useState(false);

    const openOrderDetails = (order: OrderItem) => {
        setSelectedOrder(order);
        setIsModalOpen(true);
    };
    const closeOrderDetails = () => {
        setIsModalOpen(false);
    };
    {/* Fetch des données à l'ouverture du modal ou lors de l'actualisation */ }
    useEffect(() => {
        const fetchData = async () => {
            try {
                const orderEndpoint = `${API_BASE_URL}/Order/date/${todayDate}`;

                const [ordersRes, detailsRes] = await Promise.all([
                    axios.get(orderEndpoint),
                    axios.get(`${API_BASE_URL}/Order_Details`),
                ]);

                const allOrders = Array.isArray(ordersRes.data) ? ordersRes.data : [];
                setOrders(allOrders);
                setOrderDetails(Array.isArray(detailsRes.data) ? detailsRes.data : []);
            } catch (error) {
                console.error("Erreur lors de la récupération de l'historique:", error);
                setOrders([]);
                setOrderDetails([]);
                setSelectedOrder(undefined);
            }
        };

        if (open) {
            fetchData();
        }
    }, [open, refreshTrigger, todayDate]);
    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
            {/* Header Modal */}
            <Box sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <img src="/assets/historical-data-icon.webp" alt="historical-data-icon" className="w-15 h-10" />
                    <p className="text-gray-700 text-lg font-bold">Etats des Commandes</p>
                </Box>
                <IconButton onClick={onClose}>
                    <Typography component="span" fontSize="1.1rem" lineHeight={1}>
                        ✕
                    </Typography>
                </IconButton>
            </Box>
            {/* Contenu Modal */}
            <DialogContent dividers sx={{ minHeight: 480, display: "flex", flexDirection: "column", gap: 3, p: 3, bgcolor: "#fdfdfd" }}>
                {/* Section de filtrage */}
                <Box sx={{ display: 'flex', alignItems: 'center' }}>

                    <Typography variant="subtitle2" fontWeight="bold">
                        Liste des commandes :
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                        <Button className="global-btn" variant="contained" onClick={() => {
                            setRefreshTrigger(prev => !prev);
                        }}>
                            Actualiser
                        </Button>
                    </Box>
                </Box>
                {/* Liste des commandes */}
                <Box sx={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
                    {orders.length === 0 ? (
                        <Typography
                            variant="caption"
                            fontSize="1.5em"
                            marginTop="100px"
                            color="text.secondary"
                            display="flex"
                            justifyContent="center"
                            alignItems="center"
                            height="100%"
                        >
                            Aucune commande disponible.
                        </Typography>
                    ) : (
                        orders.map((order, index) => {
                            const statusMeta = getStatusMeta(order.status);

                            return (
                                <Box key={String(order.id ?? index)}>
                                    <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center" }}>
                                        <Box component="img" src="/assets/order.png" sx={{ borderRadius: 2, width: 50, height: 50 }} />
                                        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 0.3 }}>
                                            <Typography variant="body2" fontWeight="bold">
                                                Commande client {order.client_id ?? "-"}
                                            </Typography>

                                            <Typography
                                                fontSize="0.78em"
                                                sx={{
                                                    color: statusMeta.color,
                                                    fontWeight: 600,
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: 0.8,
                                                    "@keyframes statusPulse": {
                                                        "0%": { opacity: 0.5 },
                                                        "50%": { opacity: 1 },
                                                        "100%": { opacity: 0.5 },
                                                    },
                                                    animation: "statusPulse 1.8s ease-in-out infinite",
                                                }}
                                            >
                                                <Box
                                                    component="span"
                                                    sx={{
                                                        width: 8,
                                                        height: 8,
                                                        borderRadius: "50%",
                                                        bgcolor: statusMeta.color,
                                                        boxShadow: `0 0 8px ${statusMeta.color}`,
                                                    }}
                                                />
                                                {statusMeta.label}


                                            </Typography>

                                            <Typography variant="caption" color="text.secondary">
                                                {formatDate(order.created_at)}
                                            </Typography>

                                        </Box>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={() => openOrderDetails(order)}
                                            className="globals-colors global-btn"
                                        >
                                            View
                                        </Button>
                                    </Box>

                                    <Divider sx={{ my: 2 }} />
                                </Box>
                            );
                        })
                    )}
                </Box>
            </DialogContent>

            {/* Footer avec Boutons d'action */}
            <Box sx={{ p: 2, display: "flex", gap: 2, justifyContent: "center" }}>
                <Button onClick={onClose} variant="contained" className="global-btn">
                    Fermer
                </Button>
            </Box>

            <OrderDetailsModal
                open={isModalOpen}
                onClose={closeOrderDetails}
                selectedOrder={selectedOrder}
                orderDetails={orderDetails}
            // orders={orders}
            />
        </Dialog>
    );
}
