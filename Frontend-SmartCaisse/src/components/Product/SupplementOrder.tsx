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
import { useEffect, useRef, useState } from "react";
import { resolveImageUrl } from "../../utils/imageUrl";

type ItemDetails = {
  item_id?: number | string;
  name?: string;
  image?: string;
  count?: number | string;
  price?: number | string;
  id_etape?: (string | { id_etape?: number | string; name?: string; nom_etape?: string })[];
};

type Supplement = {
  id: string;
  Categorie: number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
};

type SupplementDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<boolean>;
  item: ItemDetails;
  setSupplementsInOrder: (supplements: Supplement[]) => void;
  activeCategoryId: number;
  initialSupplements?: Supplement[];
  apiBaseUrl?: string;
  etapesDetails: Record<string, unknown>[];
  allItems?: any[];
};


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

const DEFAULT_SUPPLEMENTS: Supplement[] = [
  // --- Catégorie : Pizzas ---
  { id: "sup-piz-fromage", Categorie: 1, name: "Fromage", price: 1.5, quantity: 0 },
  { id: "sup-piz-thon", Categorie: 1, name: "Thon", price: 2, quantity: 0 },
  { id: "sup-piz-olives", Categorie: 1, name: "Olives", price: 1, quantity: 0 },
  { id: "sup-piz-champignons", Categorie: 1, name: "Champignons", price: 1.5, quantity: 0 },
  { id: "sup-piz-escalope", Categorie: 1, name: "Escalope", price: 2.5, quantity: 0 },
  { id: "sup-piz-jambon", Categorie: 1, name: "Jambon", price: 2, quantity: 0 },

  // --- Catégorie : Boissons ---
  { id: "sup-boi-glace", Categorie: 2, name: "Glaçons", price: 0, quantity: 0 },
  { id: "sup-boi-citron", Categorie: 2, name: "Tranche de Citron", price: 0.5, quantity: 0 },
  { id: "sup-boi-sirop", Categorie: 2, name: "Sirop (Menthe/Grenadine)", price: 0.8, quantity: 0 },

  // --- Catégorie : Sandwiches ---
  { id: "sup-san-oeuf", Categorie: 3, name: "Œuf", price: 1, quantity: 0 },
  { id: "sup-san-frites", Categorie: 3, name: "Portion de Frites", price: 2, quantity: 0 },
  { id: "sup-san-cheddar", Categorie: 3, name: "Cheddar Fondu", price: 1.2, quantity: 0 },
  { id: "sup-san-piment", Categorie: 3, name: "Piment Fort", price: 0.5, quantity: 0 },
];

export default function SupplementOrder({ open, onClose, onConfirm, item, etapesDetails, setSupplementsInOrder, activeCategoryId, initialSupplements, apiBaseUrl, allItems }: SupplementDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const listScrollRef = useRef<HTMLDivElement | null>(null);
  const etapes = item?.id_etape ? (Array.isArray(item.id_etape) ? item.id_etape : [item.id_etape]) : [];
  const imageUrl = resolveImageUrl(toText(item?.image), apiBaseUrl);
  const itemName = toText(item?.name, "Produit");
  const quantity = 1;
  const unitPrice = toNumber(item?.price);
  const lineTotal = quantity * unitPrice;
  const supplementsTotal = supplements.reduce(
    (total, supplement) => total + supplement.price * supplement.quantity,
    0
  );
  const grandTotal = lineTotal + supplementsTotal;

  const getDynamicSupplements = (): Supplement[] => {
    if (!item || !Array.isArray(etapesDetails)) return [];
    
    const list: Supplement[] = [];
    const etapesList = item?.id_etape ? (Array.isArray(item.id_etape) ? item.id_etape : [item.id_etape]) : [];

    for (const etape of etapesList) {
      const etapeId = typeof etape === "string" ? etape : etape.id_etape;
      const matchedGroup = etapesDetails.find(g => Number(g?.id) === Number(etapeId));
      if (matchedGroup && Array.isArray(matchedGroup.ids_items)) {
        for (const entry of matchedGroup.ids_items) {
          const prod = allItems?.find(p => Number(p?.item_id) === Number(entry?.id));
          const price = prod ? Number(prod.price) : 0;
          
          list.push({
            id: `sup-${matchedGroup.id}-${entry.id}`,
            Categorie: Number(matchedGroup.id),
            name: entry.nom_produit,
            price: price,
            quantity: 0,
            image: prod?.image
          });
        }
      }
    }
    return list;
  };

  const mergeSupplementsWithInitial = (dynamicBase: Supplement[], selectedSupplements?: Supplement[]) => {
    if (!Array.isArray(selectedSupplements) || selectedSupplements.length === 0) {
      return dynamicBase;
    }

    return dynamicBase.map((baseSupplement) => {
      const matchedSupplement = selectedSupplements.find((supplement) => {
        if (supplement?.id && supplement.id === baseSupplement.id) return true;
        return toText(supplement?.name) === baseSupplement.name;
      });

      if (!matchedSupplement) return baseSupplement;

      return {
        ...baseSupplement,
        quantity: Math.max(0, Math.min(1, toNumber(matchedSupplement.quantity))),
      };
    });
  };

  useEffect(() => {
    if (open) {
      setIsSubmitting(false);
      const dynamicBase = getDynamicSupplements();
      setSupplements(mergeSupplementsWithInitial(dynamicBase, initialSupplements));
      window.requestAnimationFrame(() => {
        listScrollRef.current?.scrollTo({ top: 0 });
      });
      return;
    }
    setIsSubmitting(false);
    setSupplements([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const changeSupplementQty = (supplementId: string, delta: number) => {
    setSupplements((prev) =>
      prev.map((supplement) => {
        if (supplement.id !== supplementId) return supplement;
        const nextQty = Math.max(0, Math.min(1, supplement.quantity + delta));
        return { ...supplement, quantity: nextQty };
      })
    );
  };

  const OnloadSepplementInOrder = () => {
    const selectedSupplements = supplements.filter(supplement => supplement.quantity > 0);
    setSupplementsInOrder(selectedSupplements);
  };
  useEffect(() => {
    OnloadSepplementInOrder();
  }, [supplements]);

  const handleDialogClose = () => {
    if (isSubmitting) return;
    onClose();
  };
  const handleConfirm = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    const isSuccess = await onConfirm();

    if (isSuccess === false) {
      setIsSubmitting(false);
      return;
    }

    window.setTimeout(() => {
      onClose();
      setIsSubmitting(false);
    }, 500);
  };


  return (
    <Dialog
      open={open}
      onClose={handleDialogClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, height: "80%" } }}
    >
   
      {/*content */}
      <DialogContent
        sx={{
          overflowY: "hidden",
          p: 0,
        }}
      >
        <Box sx={{ height: "100%", display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.2fr 1fr" } }}>
          {/*partie produit */}
          <Paper>
            <Box sx={{
              height: "100%",
              backgroundImage: imageUrl ? `linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.2)), url(${imageUrl})` : `linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.2)), url("./assets/unavailableIcon.webp")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              bgcolor: imageUrl ? "transparent" : "grey.100",
              borderRadius: 1,
              display: "flex",
              alignItems: "flex-end",
              p: 1.5
            }}>
              <Typography variant="subtitle2" fontWeight={700} color="white" fontSize={"h3.fontSize"} >{itemName}</Typography>
            </Box>
          </Paper>

          {/*partie choix suppléments */}
          <Paper sx={{ px: 3, py: 5, display: "flex", flexDirection: "column", position: "relative", minHeight: 0, overflow: "hidden" }}>
            <IconButton onClick={handleDialogClose} disabled={isSubmitting} sx={{ position: "absolute", right: 20, top: 15, zIndex: 10 }}>
              <Typography component="span" fontSize="1.4rem" fontWeight={700} lineHeight={1}>✕</Typography>
            </IconButton>
{/* 
              <Typography
                  // key={`${etapeLabel}-${index}`}
                  variant="subtitle2"
                  fontWeight={700}
                  className="global-border-supplements"
                >
                  Supplement
                </Typography> */}
            <Box ref={listScrollRef} className="scrollbar-custom" sx={{ flex: 1, minHeight: 0, overflowY: "auto", pr: 0.5 }}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2, height: "100%", justifyContent: supplements.length === 0 ? "center" : "flex-start" }}>
                {supplements.length === 0 ? (
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      py: 4,
                      px: 2,
                    }}
                  >
                    <Typography variant="body1" fontWeight={700} color="text.primary" mb={1}>
                      Aucun supplément disponible
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Ce produit ne contient aucun supplément à configurer.
                    </Typography>
                  </Box>
                ) : (
                  etapes.map((etape, index) => {
                    const etapeId = typeof etape === "string" ? etape : etape.id_etape;
                    const etapeLabel =
                      typeof etape === "string"
                        ? etape
                        : etape.nom_etape ?? etape.name ?? "Étape";

                    return (
                      <Box key={`${etapeLabel}-${index}`} sx={{ display: "flex", flexDirection: "column" }}>
                        <Typography
                          variant="subtitle2"
                          fontWeight={700}
                          className="global-border-supplements"
                          sx={{ pt: 0.5 }}
                        >
                          {etapeLabel}
                        </Typography>

                        {supplements.filter((supplement) => {
                          return Number(supplement.Categorie) === Number(etapeId);
                        }).map((supplement) => {
                          return (
                            <Box
                              key={`${etapeLabel}-${supplement.id}`}
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                py: 1,
                                borderBottom: 1,
                                borderColor: "divider",
                                gap: 1.5,
                              }}
                            >
                              <Box
                                component="img"
                                src={resolveImageUrl(supplement.image, apiBaseUrl) || "/products/indesponibleItem.png"}
                                alt={supplement.name}
                                sx={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 1.5,
                                  objectFit: "cover",
                                  bgcolor: "grey.100",
                                  flexShrink: 0,
                                }}
                              />
                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography variant="body2" fontWeight={600} noWrap>
                                  {supplement.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {toCurrency(supplement.price)} / unité
                                </Typography>
                              </Box>

                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                    overflow: "hidden",
                                    width: supplement.quantity > 0 ? 64 : 10,
                                    opacity: supplement.quantity > 0 ? 1 : 0,
                                    transform: supplement.quantity > 0 ? "translateX(0)" : "translateX(6px)",
                                    transition: "width 220ms ease, opacity 180ms ease, transform 220ms ease",
                                  }}
                                >
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => changeSupplementQty(supplement.id, -1)}
                                    disabled={isSubmitting}
                                    className="global-btn "
                                    sx={{
                                      minWidth: 35,
                                      minHeight: 35,
                                      px: 0,
                                      fontSize: "1.05rem",
                                    }}
                                  >
                                    -
                                  </Button>
                                  <Typography variant="body2" sx={{ minWidth: 20, textAlign: "center" }}>
                                    {supplement.quantity}
                                  </Typography>
                                </Box>

                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => changeSupplementQty(supplement.id, 1)}
                                  disabled={isSubmitting || supplement.quantity >= 1}
                                  className={` ${supplement.quantity >= 1 ? "bg-transparent" : "global-btn"}`}
                                  sx={{
                                    minWidth: 35,
                                    minHeight: 35,
                                    px: 0,
                                    fontSize: "1.05rem",
                                  }}
                                >
                                  +
                                </Button>
                              </Box>
                            </Box>
                          );
                        })}
                      </Box>
                    );
                  })
                )}
              </Box>
            </Box>

            {/*Totale et la Button de Confirmation d'ajouter au panier  */}
            <Box sx={{ mt: "auto", pt: 2, display: "flex", gap: 3, alignItems: "center", justifyContent: "flex-end" }}>
              {/* <Button onClick={handleDialogClose} variant="outlined" color="inherit" disabled={isSubmitting}>Annuler</Button> */}
              <Typography variant="subtitle2" fontSize={20} fontWeight={500}  >{toCurrency(grandTotal)}</Typography>

              <Button
                onClick={handleConfirm}
                variant="contained"
                disabled={isSubmitting}
                className="global-btn "

                sx={{
                  width: "70%",
                  height: "50px",
                  fontSize: "1.1rem",
                  fontWeight: 700,
                }}
              >
                Confirmer ✔
              </Button>

            </Box>
          </Paper>
        </Box>
      </DialogContent>
    </Dialog>

  );
}