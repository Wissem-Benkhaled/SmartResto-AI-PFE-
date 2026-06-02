"use client"; // Obligatoire pour les fichiers d'erreur

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // On peut loguer l'erreur ici (Sentry, Console, etc.)
    console.error(error);
  }, [error]);

  return (
    <div className="p-10 text-center border-2 border-red-200 bg-red-50 rounded-lg">
      <h2 className="text-2xl font-bold text-red-600">Oups ! Quelque chose a mal tourné.</h2>
      <button
        onClick={() => reset()} // Tente de re-rendre la page
        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
      >
        Réessayer
      </button>
    </div>
  );
}