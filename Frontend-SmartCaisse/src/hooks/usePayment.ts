"use client";

import { useState, useCallback } from "react";

export type PaymentStatus = "loading" | "success" | "cancelled" | "error" | "message" | null;

interface PaymentResult {
  code: string | number;
  message?: string;
  response?: string;
}

interface PaymentPayload {
  originName: string;
  montant: number;
  TransactionCB: string;
}

interface PaymentHookResult {
  isProcessing: boolean;
  status: PaymentStatus;
  message: string;
  processPayment: (payload: PaymentPayload, paymentUrl: string) => Promise<boolean>;
  resetStatus: () => void;
}

export function usePayment(): PaymentHookResult {
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<PaymentStatus>(null);
  const [message, setMessage] = useState("");

  const handlePaymentEvent = useCallback((eventData: any): boolean => {
    try {
      // Vérifier si c'est une chaîne JSON
      let data = typeof eventData === "string" ? JSON.parse(eventData) : eventData;
      
      // Si c'est un objet avec une propriété 'data', extraire la donnée
      if (data.data && typeof data.data === "string") {
        data = JSON.parse(data.data);
      }

      const code = data.code || data.Code || data.code;
      
      // Traiter les codes de réponse du serveur
      if (code === "M999") {
        // Message utilisateur du terminal
        setStatus("message");
        setMessage(data.message || data.Message || "Information du terminal");
        setTimeout(() => {
          setIsProcessing(false);
          setStatus(null);
        }, 3000);
        return false; // Paiement non finalisé
      } else if (code === 1 || code === "1") {
        // Transaction annulée par le client
        setStatus("cancelled");
        setMessage(
          data.message || 
          data.Message || 
          "Le client a annulé la transaction sur le terminal"
        );
        setIsProcessing(false);
        setTimeout(() => {
          setStatus(null);
        }, 3000);
        return false;
      } else if (code === "P999") {
        // Paiement réussi
        setStatus("success");
        setMessage("Transaction approuvée");
        setIsProcessing(false);
        setTimeout(() => {
          setStatus(null);
        }, 3000);
        return true;
      } else if (code === 1002 || code === "1002") {
        // Code spécial, probablement une réponse intermédiaire
        setStatus("message");
        setMessage(data.message || data.Message || "Veuillez patienter...");
        return false;
      } else {
        // Erreur de paiement ou code inconnu
        setStatus("error");
        setMessage(data.message || data.Message || data.response || "Erreur lors du paiement");
        setIsProcessing(false);
        setTimeout(() => {
          setStatus(null);
        }, 3000);
        return false;
      }
    } catch (error) {
      console.error("Erreur traitement événement paiement:", error);
      setStatus("error");
      setMessage("Erreur lors du traitement du paiement");
      setIsProcessing(false);
      return false;
    }
  }, []);

  const processPayment = useCallback(
    async (payload: PaymentPayload, paymentUrl: string): Promise<boolean> => {
      return new Promise((resolve) => {
        try {
          setIsProcessing(true);
          setStatus("loading");
          setMessage("");

          // Envoyer la requête de paiement
          fetch(paymentUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          })
            .then((response) => {
              if (!response.ok) {
                setStatus("error");
                setMessage("Erreur de connexion au serveur de paiement");
                setIsProcessing(false);
                resolve(false);
                return;
              }

              // Utiliser SSE pour écouter les mises à jour
              const reader = response.body?.getReader();
              const decoder = new TextDecoder();
              let paymentSuccessful = false;

              const readStream = async () => {
                try {
                  let buffer = "";

                  while (true) {
                    const { done, value } = await reader!.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    buffer += chunk;

                    const lines = buffer.split("\n");
                    buffer = lines[lines.length - 1];

                    for (let i = 0; i < lines.length - 1; i++) {
                      const line = lines[i].trim();

                      if (line.startsWith("data:")) {
                        const data = line.substring(5).trim();
                        if (data) {
                          try {
                            paymentSuccessful = handlePaymentEvent(data);
                            if (paymentSuccessful) {
                              // Paiement réussi, on peut résoudre
                              resolve(true);
                              return;
                            }
                          } catch (e) {
                            console.error("Erreur parsing SSE data:", e);
                          }
                        }
                      }
                    }
                  }

                  // Finir la lecture du buffer
                  if (buffer.trim().startsWith("data:")) {
                    const data = buffer.trim().substring(5).trim();
                    if (data) {
                      try {
                        paymentSuccessful = handlePaymentEvent(data);
                      } catch (e) {
                        console.error("Erreur parsing SSE data:", e);
                      }
                    }
                  }

                  setIsProcessing(false);
                  resolve(paymentSuccessful);
                } catch (error) {
                  console.error("Erreur lecture stream:", error);
                  setStatus("error");
                  setMessage("Erreur de connexion au serveur");
                  setIsProcessing(false);
                  resolve(false);
                }
              };

              readStream();
            })
            .catch((error) => {
              console.error("Erreur requête paiement:", error);
              setStatus("error");
              setMessage("Erreur de connexion");
              setIsProcessing(false);
              resolve(false);
            });
        } catch (error) {
          console.error("Erreur paiement:", error);
          setStatus("error");
          setMessage("Erreur lors du paiement");
          setIsProcessing(false);
          resolve(false);
        }
      });
    },
    [handlePaymentEvent]
  );

  const resetStatus = useCallback(() => {
    setIsProcessing(false);
    setStatus(null);
    setMessage("");
  }, []);

  return {
    isProcessing,
    status,
    message,
    processPayment,
    resetStatus,
  };
}
