"use client";

import { Box, Typography, CircularProgress, Paper, Backdrop } from "@mui/material";
import { useState, useEffect } from "react";

type PaymentStatus = "loading" | "success" | "cancelled" | "error" | "message" | null;

type PaymentLoaderProps = {
  isProcessing: boolean;
  status: PaymentStatus;
  message?: string;
  montant?: string;
  onClose?: () => void;
};

export default function PaymentLoader({
  isProcessing,
  status,
  message = "",
  montant = "",
  onClose,
}: PaymentLoaderProps) {
  const [displayMessage, setDisplayMessage] = useState(message);

  useEffect(() => {
    setDisplayMessage(message);
  }, [message]);

  // Auto-close after 4 seconds if not loading
  useEffect(() => {
    if (isProcessing || status === null) return;

    // Don't auto-close for loading state
    if (status === "loading") return;

    const timer = setTimeout(() => {
      if (onClose) {
        onClose();
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [isProcessing, status, onClose]);

  if (!isProcessing && status === null) return null;

  return (
    <Backdrop
      open={isProcessing || status !== null}
      sx={{
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        zIndex: (theme) => theme.zIndex.modal + 1,
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Paper
        elevation={8}
        sx={{
          borderRadius: 3,
          overflow: "hidden",
          maxWidth: 420,
          width: "90%",
          position: "relative",
          animation:
            status === "success"
              ? "successSlideIn 0.5s ease-out"
              : status === "error" || status === "cancelled"
              ? "errorShake 0.5s ease-out"
              : "none",
          "@keyframes successSlideIn": {
            "0%": { transform: "translateY(-20px)", opacity: 0 },
            "100%": { transform: "translateY(0)", opacity: 1 },
          },
          "@keyframes errorShake": {
            "0%, 100%": { transform: "translateX(0)" },
            "25%": { transform: "translateX(-10px)" },
            "75%": { transform: "translateX(10px)" },
          },
          "@keyframes spin": {
            "0%": { transform: "rotate(0deg)" },
            "100%": { transform: "rotate(360deg)" },
          },
        }}
      >
        {/* Close Button */}
        {status !== "loading" && onClose && (
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              zIndex: 1,
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
            }}
          >
            <span className="cursor-pointer absolute top-2 right-6 rounded-full text-gray-600 flex items-center justify-center text-[30px] font-bold">
              X
            </span>
          </button>
        )}
        {/* Loading State */}
        {status === "loading" && (
          <Box
            sx={{
              textAlign: "center",
              p: 4,
              background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
            }}
          >
            <Box sx={{ position: "relative", display: "inline-block", mb: 2 }}>
              <CircularProgress
                size={80}
                thickness={3}
                sx={{
                  color: "primary.main",
                  animation: "spin 1s linear infinite",
                }}
              />
              <Box
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  fontSize: "2rem",
                  animation: "pulse 1.5s ease-in-out infinite",
                  "@keyframes pulse": {
                    "0%, 100%": { transform: "translate(-50%, -50%) scale(1)" },
                    "50%": { transform: "translate(-50%, -50%) scale(1.1)" },
                  },
                }}
              >
                💳
              </Box>
            </Box>
            <Typography
              variant="h6"
              fontWeight={700}
              sx={{ mb: 1, color: "text.primary" }}
            >
              Traitement du paiement
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 1 }}
            >
              {montant && <span>Montant: <strong>{montant}</strong></span>}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Veuillez patientez...
            </Typography>
          </Box>
        )}

        {/* Success State */}
        {status === "success" && (
          <Box
            sx={{
              textAlign: "center",
              p: 4,
              background: "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)",
            }}
          >
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 100,
                height: 100,
                borderRadius: "50%",
                bgcolor: "rgba(255, 255, 255, 0.9)",
                mb: 2,
                animation: "successBounce 0.6s ease-out",
                "@keyframes successBounce": {
                  "0%": {
                    transform: "scale(0.3)",
                    opacity: 0,
                  },
                  "50%": {
                    transform: "scale(1.1)",
                  },
                  "100%": {
                    transform: "scale(1)",
                    opacity: 1,
                  },
                },
              }}
            >
              <Typography sx={{ fontSize: "3rem" }}>✓</Typography>
            </Box>
            <Typography
              variant="h6"
              fontWeight={700}
              sx={{ mb: 1, color: "#1a5f3f" }}
            >
              Paiement réussi !
            </Typography>
            {displayMessage && (
              <Typography variant="body2" color="text.secondary">
                {displayMessage}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              Transaction approuvée
            </Typography>
          </Box>
        )}

        {/* Error State */}
        {status === "error" && (
          <Box
            sx={{
              textAlign: "center",
              p: 4,
              background: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
            }}
          >
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 100,
                height: 100,
                borderRadius: "50%",
                bgcolor: "rgba(255, 255, 255, 0.9)",
                mb: 2,
                animation: "errorBounce 0.6s ease-out",
                "@keyframes errorBounce": {
                  "0%": {
                    transform: "scale(0.3) rotate(-180deg)",
                    opacity: 0,
                  },
                  "50%": {
                    transform: "scale(1.1) rotate(10deg)",
                  },
                  "100%": {
                    transform: "scale(1) rotate(0deg)",
                    opacity: 1,
                  },
                },
              }}
            >
              <Typography sx={{ fontSize: "3rem" }}>✕</Typography>
            </Box>
            <Typography
              variant="h6"
              fontWeight={700}
              sx={{ mb: 1, color: "#a62f2f" }}
            >
              Erreur de paiement
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {displayMessage || "Une erreur s'est produite lors du paiement."}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Veuillez réessayer ou contactez le support
            </Typography>
          </Box>
        )}

        {/* Cancelled State */}
        {status === "cancelled" && (
          <Box
            sx={{
              textAlign: "center",
              p: 4,
              background: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
            }}
          >
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 100,
                height: 100,
                borderRadius: "50%",
                bgcolor: "rgba(255, 255, 255, 0.9)",
                mb: 2,
                animation: "cancelledBounce 0.6s ease-out",
                "@keyframes cancelledBounce": {
                  "0%": {
                    transform: "scale(0.3) rotate(90deg)",
                    opacity: 0,
                  },
                  "100%": {
                    transform: "scale(1) rotate(0deg)",
                    opacity: 1,
                  },
                },
              }}
            >
              <Typography sx={{ fontSize: "3rem" }}>⊘</Typography>
            </Box>
            <Typography
              variant="h6"
              fontWeight={700}
              sx={{ mb: 1, color: "#cc7a00" }}
            >
              Paiement annulé
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {displayMessage ||
                "Le client a annulé la transaction sur le terminal."}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Vous pouvez réessayer une nouvelle transaction
            </Typography>
          </Box>
        )}

        {/* Message State */}
        {status === "message" && (
          <Box
            sx={{
              textAlign: "center",
              p: 3,
              background: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
            }}
          >
            <Box sx={{ mb: 2, fontSize: "2.5rem" }}>ℹ️</Box>
            <Typography variant="body2" sx={{ color: "text.primary" }}>
              {displayMessage}
            </Typography>
          </Box>
        )}
      </Paper>
    </Backdrop>
  );
}
