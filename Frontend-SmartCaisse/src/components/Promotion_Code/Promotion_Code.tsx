import { useEffect, useState } from "react";
import axios from "axios";

type OrderListePromoEntry = {
    code_promo: string;
    discountPercent: number;
    discountedValue: number;
    nextTotal: number;
};

type PromoApiResponse = {
    promo_id?: number | string | null;
    client_id?: number | string | null;
    date_expiration?: string | null;
    nb_utilisation?: number | string | null;
    nb_utilisation_max?: number | string | null;
    discount?: number | string | null;
    type_promo?: number | string | null;
};

// type UsedPromoApiResponse = {
//     client_id?: number | string | null;
//     nb_utilisation?: number | string | null;
//     nb_utilisation_max?: number | string | null;
//     discount?: number | string | null;
// };

type PromotionCodeProps = {
    globalNotify: (message: string, type: string) => void;
    Path_API: string;
    clientId: number;
    total_Finale: number;
    setOrderDetails: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
    resetSignal?: number;
    onKeyboardFocus?: (handlers: { appendKey: (key: string) => void; deleteKey: () => void }) => void;
    total_Inial: number;
};

function Promotion_Code({ globalNotify, Path_API, clientId, total_Finale, setOrderDetails, resetSignal = 0, onKeyboardFocus, total_Inial }: PromotionCodeProps) {
    const [code_promo, setCode_promo] = useState("");
    const [disableBtn, setDisableBtn] = useState(false);
    const [appliedPromo, setAppliedPromo] = useState<{ code_promo: string; discountPercent: number } | null>(null);

    const parsePromoExpiration = (dateValue?: string | null) => {
        if (!dateValue) return null;

        const normalized = dateValue.trim();
        const frMatch = normalized.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);

        if (frMatch) {
            const day = Number(frMatch[1]);
            const month = Number(frMatch[2]);
            const year = Number(frMatch[3]);
            return new Date(year, month - 1, day, 23, 59, 59, 999);
        }

        const parsed = new Date(normalized);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    {/* activer le clavier virtuel pour le code promo */ }
    const activateFormKeyboard = () => {
        if (!onKeyboardFocus) return;
        onKeyboardFocus({
            appendKey: (key) => setCode_promo((prev) => prev + key),
            deleteKey: () => setCode_promo((prev) => prev.slice(0, -1)),
        });
    };

    {/* vider le code promo */ }
    useEffect(() => {
        setCode_promo("");
        setDisableBtn(false);
        setAppliedPromo(null);
    }, [resetSignal]);


    {/* recalculer le total après application du code promo */ }
    useEffect(() => {
        if (!appliedPromo) {
            return;
        }

        const promoDiscount = Number(appliedPromo.discountPercent) || 0;
        const discountedValue = Number((total_Inial * (promoDiscount / 100)).toFixed(2));
        const nextTotal = Number(Math.max(total_Inial - discountedValue, 0).toFixed(2));

        const CodePromo: OrderListePromoEntry = {
            code_promo: appliedPromo.code_promo,
            discountPercent: promoDiscount,
            discountedValue,
            nextTotal,
        };
        setOrderDetails((prev) => ({
            ...prev,
            CodePromo,
        }));
    }, [appliedPromo, total_Inial, setOrderDetails]);

    {/* vérifier le code promo */ }
    const verifierCodePromo = async () => {
        const promoCode = code_promo.trim().toUpperCase();
        const currentClientId = Number(clientId ?? null);

        if (!promoCode) {
            globalNotify('Veuillez saisir un code promo !!!', 'error');
            setCode_promo("");

            return;
        }
        if (total_Finale <= 0) {
            setCode_promo("");
            setDisableBtn(false);
            globalNotify('Le total est déjà à zéro. Impossible d\'appliquer un code promo.', 'error');
            return;
        }

        // if (clientId === null) {
        //     setCode_promo("");
        //     setDisableBtn(false);
        //     globalNotify('Veuillez sélectionner un client avant d\'utiliser un code promo.', 'error');
        //     return;
        // }

        try {
            const promoRes = await axios.get<PromoApiResponse>(`${Path_API}/Promo/Code/${encodeURIComponent(promoCode)}`);
            const promo = promoRes.data;
            if (!promo) {
                setCode_promo("");
                setDisableBtn(false);
                globalNotify('Code promo invalide ou inexistant.', 'error');
                return;
            }

            const promoType = Number(promo.type_promo ?? 2);
            const promoId = Number(promo.promo_id);
            const promoOwnerClientId = Number(promo.client_id ?? null);
            const expirationDate = parsePromoExpiration(promo.date_expiration);
            const usedCount = Number(promo.nb_utilisation ?? 0);
            const maxUseCount = Number(promo.nb_utilisation_max);

            if (!Number.isFinite(promoId) || promoId <= 0) {
                setCode_promo("");
                setDisableBtn(false);
                globalNotify("Code promo invalide: identifiant manquant.", "error");
                return;
            }

            if (expirationDate && expirationDate < new Date()) {
                setCode_promo("");
                setDisableBtn(false);
                globalNotify('Ce code promo a expiré.', 'error');
                return;
            }

            if (Number.isFinite(maxUseCount) && maxUseCount > 0 && usedCount >= maxUseCount) {
                setCode_promo("");
                setDisableBtn(false);
                globalNotify('Ce code promo a atteint sa limite d\'utilisations.', 'error');
                return;
            }


            if (promoType === 1 && (!Number.isFinite(currentClientId) || currentClientId <= 0)) {
                setCode_promo("");
                setDisableBtn(false);
                globalNotify('Veuillez sélectionner un client pour ce code promo mono-utilisateur.', 'error');
                return;
            }

            if (promoType === 1 && promoOwnerClientId > 0 && currentClientId !== promoOwnerClientId) {
                setCode_promo("");
                setDisableBtn(false);
                globalNotify('Ce code promo est déjà utilisé par un autre client.', 'error');
                return;
            }

            const promoDiscount = Number(promo.discount) || 0;
            setAppliedPromo({
                code_promo: promoCode,
                discountPercent: promoDiscount,
            });
                
            globalNotify(`Code promo appliqué ! Réduction de ${promoDiscount}%`, 'success');
            await axios.patch(`${Path_API}/Promo/useCode`, {
                id: promoId,
                clientId: promoType === 1 ? currentClientId : null,
            });
            setCode_promo(promoCode);
            setDisableBtn(true);
        } catch (error) {
            setCode_promo("");
            setDisableBtn(false);
            if (axios.isAxiosError(error)) {
                const apiErrorMessage = error.response?.data?.error;
                globalNotify(apiErrorMessage || "Impossible de vérifier le code promo.", "error");

                return;
            }

            globalNotify("Impossible de vérifier le code promo.", "error");
        }
    };

    return (
        <div className="mt-3 p-2 border-t border-dashed border-gray-300">
            <div className="bg-white p-4 rounded-2xl shadow-lg">
                <p className="text-gray-500 text-m mb-4 font-medium tracking-wide">
                    Code Promo
                </p>

                <div className="flex gap-4">
                    <input
                        type="text"
                        placeholder="Entrez le code promo"
                        value={code_promo}
                        onFocus={activateFormKeyboard}
                        onChange={(event) => setCode_promo(event.target.value)}
                        className="flex-1 border border-gray-300 rounded-xl px-2.5 py-2 text-xs focus:outline-none global-border-success"
                    />
                    <button
                        type="button"
                        onClick={verifierCodePromo}
                        disabled={disableBtn}
                        className={`px-4 py-2 rounded-xl ${disableBtn ? "bg-gray-400 text-gray-500 cursor-not-allowed cursor-default" : "global-btn cursor-pointer"} text-white text-xs font-bold transition-all duration-200`}
                    >
                        Appliquer
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Promotion_Code;