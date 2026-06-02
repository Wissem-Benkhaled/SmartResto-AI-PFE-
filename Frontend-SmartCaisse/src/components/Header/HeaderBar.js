"use client";
import { useState, useEffect } from "react";
import HistoricalDataModal from "./HistoricalDataModal2";
import axios from "axios";

{/* Fonction pour obtenir la date complète d'aujourd'hui */ }
function getTodayFullDate() {
  const today = new Date();

  return today.toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function HeaderBar({ PATH_API }) {
  const [isHistoricalOpen, setIsHistoricalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [user, setUser] = useState(null);

  // const [mounted, setMounted] = useState(false);
  // useEffect(() => {
  //   setMounted(true);
  //   const raw = sessionStorage.getItem("auth_user") || localStorage.getItem("user");
  //   if (raw) {
  //     try {
  //       setUser(JSON.parse(raw));
  //     } catch (e) {
  //       console.error("Error parsing user data:", e);
  //     }
  //   }
  // }, []);

  // useEffect(() => {
  //   const fetchData = async () => {
  //     const raw = sessionStorage.getItem("auth_user") || localStorage.getItem("user");
  //     if (!raw) return;

  //     try {
  //       const parsedUser = JSON.parse(raw);
  //       const userId = parsedUser?.user_id || parsedUser?.id;
  //       if (!userId || !PATH_API) return;

  //       const UserEndpoint = `${PATH_API}/User/${userId}`;
  //       const response = await axios.get(UserEndpoint);

  //       const userData = Array.isArray(response.data) ? response.data[0] : response.data;
  //       if (userData && userData.username) {
  //         setUser(userData);
  //         if (sessionStorage.getItem("auth_user")) {
  //           sessionStorage.setItem("auth_user", JSON.stringify(userData));
  //         }
  //         if (localStorage.getItem("user")) {
  //           localStorage.setItem("user", JSON.stringify(userData));
  //         }
  //       }
  //     } catch (error) {
  //       console.error("Erreur lors de la récupération des données de l'utilisateur:", error);
  //     }
  //   };

  //   fetchData();
  // }, [PATH_API, isDropdownOpen]);

  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleOutsideClick = (event) => {
      if (!event.target.closest(".profile-dropdown-container")) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [isDropdownOpen]);

  const openHistoricalDialog = () => {
    setIsHistoricalOpen(true);
  };
  const closeHistoricalDialog = () => {
    setIsHistoricalOpen(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("auth_token");
    sessionStorage.removeItem("auth_user");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "http://localhost:3002/sign-in";
  };

  const avatarText = user && user.username
    ? user.username.substring(0, 2).toUpperCase()
    : "SC";

  return (
    <div className="flex items-center justify-between bg-white rounded-xl shadow mt-4 ml-4 mr-4 p-3">
      <div className="flex items-center gap-3">
        <div className="relative profile-dropdown-container">
          <div
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-10 h-10 rounded-full globals-colors text-white flex items-center justify-center font-bold cursor-pointer hover:scale-105 transition-transform active:scale-95 select-none"
            title={user?.username ? `Connecté en tant que ${user.username}` : "Menu utilisateur"}
          >
            {avatarText}
          </div>

          {/* Menu Déroulant Deconnexion */}
          {isDropdownOpen && (
            <div className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-bold text-gray-800">{user?.username || "Session locale"}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role || "SmartCaisse"}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors font-semibold cursor-pointer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="w-4 h-4 text-red-500"
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
          )}
        </div>
        <div className="leading-tight">
          <div className="text-lg font-bold text-gray-700">SmartCaisse</div>
          <div className="text-xs text-gray-500">Menu du restaurant</div>
        </div>
        <div className="ml-4 ">
          <button
            onClick={openHistoricalDialog}
            className="bg-gray-100 transition-transform flex items-center gap-1  py-2 text-gray-700 rounded-lg px-3 hover:scale-110">
            <p className=" text-sm font-semibold ">Etats des commandes</p>
          </button>
        </div>
      </div>

      {/* Affichage de la date complète à droite du header */}
      <div className=" rounded-lg px-5 py-2 text-md text-bold text-gray-700 bg-gray-100">
        {getTodayFullDate()}
      </div>

      {/* Modal pour les données historiques */}
      <HistoricalDataModal
        open={isHistoricalOpen}
        onClose={closeHistoricalDialog}
        Path_API={PATH_API}
      />

    </div>
  )
}