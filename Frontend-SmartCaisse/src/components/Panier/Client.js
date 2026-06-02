import { useEffect, useState } from "react";
import axios from "axios";

function Client({ globalNotify, Path_API, onKeyboardFocus, setSelectedClient, totalFinale, setOrderDetails, resetSignal = 0 }) {
  const [numero, setNumero] = useState("");
  const [client, setClient] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [Prix_points_fids, setPrix_points_fids] = useState(0);
  const [hasUsedPoints, setHasUsedPoints] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(true);
  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    email: "",
  });
  const digitsCount = numero.length;
  const isReady = digitsCount === 8;


  {/* Activer le clavier de numéro de téléphone */ }
  const activatePhoneKeyboard = () => {
    if (!onKeyboardFocus) return;
    onKeyboardFocus({
      appendKey: (key) => {
        if (!/\d/.test(key)) return;
        setNumero((prev) => (prev.length < 8 ? prev + key : prev));
      },
      deleteKey: () => setNumero((prev) => prev.slice(0, -1)),
    });
  };
  {/* Gérer les changements dans le champ de numéro de téléphone */ }
  const handleInputChange = (e) => {
    const onlyDigits = e.target.value.replace(/\D/g, "").slice(0, 8);
    setNumero(onlyDigits);
  };


  {/* Activer le clavier du formulaire */ }
  const activateFormKeyboard = (field) => {
    if (!onKeyboardFocus) return;
    onKeyboardFocus({
      appendKey: (key) => {
        setForm((prev) => ({
          ...prev,
          [field]: prev[field] + key,
        }));
      },
      deleteKey: () => {
        setForm((prev) => ({
          ...prev,
          [field]: prev[field].slice(0, -1),
        }));
      },
    });
  };
  {/* Gérer les changements dans le formulaire */ }
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  {/* Rechercher le client à chaque fois que le numéro change et est prêt */ }
  useEffect(() => {
    if (isReady) {
      searchClient(numero);
      setShowCreateForm(true);
      setHasUsedPoints(false);
    } else {
      setClient(null);
      setNotFound(false);
      setShowCreateForm(true);
      setPrix_points_fids(0);
      setHasUsedPoints(false);
    }
  }, [numero, isReady]);

  {/* Réinitialiser l'état du client lorsque le signal de réinitialisation change */ }
  useEffect(() => {
    setNumero("");
    setClient(null);
    setNotFound(false);
    setShowCreateForm(true);
    setPrix_points_fids(0);
    setHasUsedPoints(false);
    setForm({
      nom: "",
      prenom: "",
      email: "",
    });
    setSelectedClient(null);
  }, [resetSignal, setSelectedClient, setOrderDetails]);

  {/* Rechercher le client dans la base de données */ }
  const searchClient = async (phoneNumber) => {
    try {
      const res = await axios.get(`${Path_API}/Client/numero/${phoneNumber}`);
      setClient(res.data);
      setNotFound(false);
    } catch (error) {
      setClient(null);
      setNotFound(true);
    }
  };

  {/* Mettre à jour le client sélectionné dans le contexte global lorsque le client change */ }
  useEffect(() => {
    if (client) {
      setSelectedClient(client);
    }
  }, [client, setSelectedClient]);

  {/* Créer un nouveau client dans la base de données */ }
  const createClient = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${Path_API}/Client`, {
        nom: form.nom,
        prenom: form.prenom,
        numero,
        email: form.email,
      });
      setClient(res.data);
      setNotFound(false);
      setShowCreateForm(true);
    } catch (error) {
      console.error("Erreur création client", error);
    }
  };

  {/* Calculer les points de fidélité */ }
  const calculePoints_fids = async (points) => {
    if (hasUsedPoints) return;

    if (!totalFinale || Number(totalFinale) <= 0) {
      globalNotify('Veuillez entrer un montant total de commande valide avant d\'utiliser les points de fidélité.', 'error');
      return;
    }

    const pointsClient = Number(points) || 0;
    if (pointsClient <= 0) {
      globalNotify('Ce client n\'a pas de points de fidélité.', 'error');
      return;
    }

    const totalCommande = Number(totalFinale) || 0;
    const valeurPoints = pointsClient / 100;
    const montantUtilise = Math.min(totalCommande, valeurPoints);

    const pointsConsommes = Math.round(montantUtilise * 100);
    const pointsRestants = Math.max(pointsClient - pointsConsommes, 0);
    setHasUsedPoints(true);
    setPrix_points_fids(Number(montantUtilise.toFixed(2)));

    setOrderDetails((prev) => ({
      ...prev,
      pointsConsommes,
      pointsRestants,
      prix_points_fids: Number(montantUtilise.toFixed(2)),
    }));
  };

  return (
    <div className="mb-4 p-3 bg-white text-gray-800 rounded-xl shadow-lg border border-gray-200">

      {/* l'entête du composant */ }
      <div className="flex items-center gap-1.5 mb-2">
        <span className="w-1.5 h-6 rounded-full globals-colors" />
        <svg
          viewBox="0 0 24 24"
          className="w-4 h-4 text-slate-700"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
        </svg>
        <h2 className="text-lg font-bold text-slate-900">Client Fidélité</h2>
        {(client || notFound) && isReady && (
          <div className="ml-auto">
            <button
              type="button"
              onClick={() => setShowCreateForm((prev) => !prev)}
              className="px-3 py-1 rounded-full text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
            >
              {showCreateForm ? "Masquer" : "Afficher"}
            </button>
          </div>
        )}
      </div>

      {/* Champ de saisie du numéro de téléphone */ }
      <div
        className={`rounded-xl px-3 py-2 border-2 bg-gray-50 transition-all ${client
          ? "global-border-success"
          : notFound && isReady
            ? "border-red-300"
            : "border-gray-200"
          }`}
      >
        <div className="flex items-center justify-between gap-2">
          <input
            type="tel"
            maxLength={8}
            placeholder="Entrez 8 chiffres..."
            value={numero}
            onFocus={activatePhoneKeyboard}
            onChange={handleInputChange}
            className={`w-full bg-transparent outline-none text-sm tracking-[0.12em] placeholder:text-slate-400 `}
          />
          <div className="flex items-center gap-1.5 text-slate-500">
            <span className="text-xs font-medium">{digitsCount}/8</span>
            {client && (
              <span className="w-5 h-5 rounded-full globals-colors text-white flex items-center justify-center text-[10px] font-bold">
                ✓
              </span>
            )}
            {!client && (
              <span className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-bold">
                ✗
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Formulaire de création de client */}
      {notFound && isReady && showCreateForm && (
        <form
          onSubmit={createClient}
          className="space-y-2 mt-2 bg-gray-50 p-3 rounded-xl border border-dashed border-gray-300">
          <p className="text-slate-600 text-xs">Client non trouvé — Créer un nouveau :</p>

          <div className="grid grid-cols-2 gap-2 w-full">
            <input
              name="nom"
              id="nom"
              type="text"
              placeholder="Nom"
              value={form.nom}
              onChange={handleFormChange}
              onFocus={() => activateFormKeyboard("nom")}
              className="border border-gray-300 rounded-xl px-2.5 py-2 text-xs w-full focus:outline-none focus:ring-1"
              required
            />
            <input
              name="prenom"
              id="prenom"
              type="text"
              placeholder="Prénom"
              value={form.prenom}
              onChange={handleFormChange}
              onFocus={() => activateFormKeyboard("prenom")}
              className="border border-gray-300 rounded-xl px-2.5 py-2 text-xs w-full focus:outline-none focus:ring-1"
              required
            />
            <input
              name="email"
              id="email"
              type="email"
              placeholder="Email (optionnel)"
              value={form.email}
              onChange={handleFormChange}
              onFocus={() => activateFormKeyboard("email")}
              className="border border-gray-300 rounded-xl px-2.5 py-2 text-xs w-full col-span-2 focus:outline-none focus:ring-1"
            />
          </div>
          <button
            type="submit"
            className="w-full global-btn text-white p-2 rounded-xl text-xs font-bold transition-all duration-200"
          >
            Créer le client
          </button>
        </form>
      )}

      {/* Affichage des informations du client */}
      {client && showCreateForm && (
        <div className="mt-2 bg-gradient-to-r from-gray-100 to-amber-50 p-3 rounded-xl border border-gray-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-9 w-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold uppercase shrink-0">
              {`${client.prenom?.[0] || ""}${client.nom?.[0] || ""}`}
            </div>

            <div className="min-w-0">
              <p className="font-bold text-sm text-slate-900 truncate">{client.prenom} {client.nom}</p>
              <p className="text-xs text-slate-500 truncate">{client.email || "—"}</p>
            </div>
          </div>
          <div className="flex flex-col gap gap-1">
            <div className="shrink-0 px-2.5 text-center py-1 rounded-full bg-amber-200 text-amber-800 font-bold text-sm">
              {Prix_points_fids ? `${Prix_points_fids} €` : `⭐ ${client.point_fid ? client.point_fid : 0} pts`}
            </div>

            <div className="shrink-0 font-bold text-sm ">
              <button
                disabled={client.point_fid === 0 || client.point_fid === null || hasUsedPoints}
                className={`px-5 mt-1 py-1 rounded-full ${client.point_fid === 0 || client.point_fid === null || hasUsedPoints ? "bg-gray-300 text-gray-500  cursor-not-allowed cursor-default" : "bg-gray-600 global-btn cursor-pointer"} transition-colors`}
                onClick={() => calculePoints_fids(client.point_fid)}

              > Utilisé </button>
            </div>

          </div>
        </div>
      )}

    </div>

  );
};

export default Client;