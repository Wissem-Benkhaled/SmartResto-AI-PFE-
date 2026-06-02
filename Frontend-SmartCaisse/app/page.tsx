"use client";
import { Suspense, useState } from "react"; // 1. Importe Suspense
import ProductList from "@/src/components/Product/ProductList";
import Panier from "@/src/components/Panier/Panier";
import VirtualKeyboard from "@/src/components/VirtualKeyboard";
import HeaderBar from "@/src/components/Header/HeaderBar";
import { toast, ToastContainer, Zoom } from 'react-toastify';

type KeyboardHandlers = {
  appendKey: (key: string) => void;
  deleteKey: () => void;
};


const globalNotify=(message:string,type:string)=>{
  if (type === 'error'){
    toast.error(message, {
    position: "top-center",
    autoClose: 3000,
    hideProgressBar: false,
    closeButton: false,
    closeOnClick: true,
    pauseOnHover: false,
    draggable: true,
    progress: undefined,
    theme: "light",
    transition: Zoom,
  });

}else{
  toast.success(message, {
    position: "top-center",
    autoClose: 3000,
    hideProgressBar: false,
    closeButton: false,
    closeOnClick: true,
    pauseOnHover: false,
    draggable: true,
    progress: undefined,
    theme: "light",
    transition: Zoom,
  });
}}

export default function Home() {
  const [detail_cmd, setDetail_cmd] = useState([]);
  const [keyboardHandlers, setKeyboardHandlers] = useState<KeyboardHandlers | null>(null);
  const Path_API="http://localhost:5000";

  const openKeyboard = (handlers: KeyboardHandlers) => {
    setKeyboardHandlers(handlers);
  };

  const closeKeyboard = () => {
    setKeyboardHandlers(null);
  };

  const handleKeyboardKey = (key: string) => {
    if (!keyboardHandlers?.appendKey) return;
    keyboardHandlers.appendKey(key);
  };

  const handleKeyboardDelete = () => {
    if (!keyboardHandlers?.deleteKey) return;
    keyboardHandlers.deleteKey();
  };

  return (
    <div className="h-screen flex bg-gray-100 overflow-hidden">
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">

      <HeaderBar PATH_API={Path_API} />

      {/* Produits avec un chargement ciblé */}
      <div className="flex-1 min-h-0 overflow-hidden">
      <Suspense
        fallback={
          <div className="h-full flex flex-col items-center justify-center p-10 bg-gray-50">
            {/* Un spinner vert pour attirer l'oeil */}
            <div className="w-12 h-12 border-4 border-gray-200 global-border-success rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600 font-medium animate-pulse">
              Récupération des articles...
            </p>
          </div>
        }
      >
        <div className="h-full overflow-y-auto">
          <ProductList
            detail_cmd={detail_cmd}
            setDetail_cmd={setDetail_cmd}
            onKeyboardFocus={openKeyboard}
            // onKeyboardBlur={closeKeyboard}
            Path_API={Path_API}
          />
        </div>
      </Suspense>
      </div>
    </div>

      <Panier
        globalNotify={globalNotify}
        Path_API={Path_API}
        detail_cmd={detail_cmd}
        setDetail_cmd={setDetail_cmd}
        onKeyboardFocus={openKeyboard}
        // onKeyboardBlur={closeKeyboard}
      />

      <VirtualKeyboard
        visible={keyboardHandlers !== null}
        onKey={handleKeyboardKey}
        onDelete={handleKeyboardDelete}
        onConfirm={closeKeyboard}
      />
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        closeButton={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        transition={Zoom}
      />
    </div>
  );
}
