"use client";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import SupplementOrder from "./SupplementOrder";
import { resolveImageUrl } from "../../utils/imageUrl";


{/* Règles de correspondance des icônes pour les catégories */ }
const CATEGORY_ICON_RULES = [
  { keywords: ["pizza", "pizz"], icon: "🍕" },
  { keywords: ["boisson", "drink", "soda", "jus", "juice", "water", "eau"], icon: "🥤" },
  { keywords: ["sandwich", "burger", "tacos", "wrap", "panini", "makloub", "shawarma", "chawarma"], icon: "🥪" },
  { keywords: ["salade", "salad"], icon: "🥗" },
  { keywords: ["dessert", "gateau", "cake", "sweet", "glace"], icon: "🍰" },
  { keywords: ["pate", "pasta", "spaghetti"], icon: "🍝" },
  { keywords: ["cafe", "coffee", "espresso", "the", "tea"], icon: "☕" },
];

const normalizeCategoryName = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const getCategoryIconByName = (categoryName) => {
  const normalized = normalizeCategoryName(categoryName);
  if (!normalized) return "";

  const match = CATEGORY_ICON_RULES.find((rule) =>
    rule.keywords.some((keyword) => normalized.includes(keyword))
  );

  return match?.icon || "";
};

export default function ProductList({ detail_cmd = [], setDetail_cmd, onKeyboardFocus, Path_API }) {
  const [categories, setCategories] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [CATEGORIES_API, setCATEGORIES_API] = useState([]);
  const [supplementsInOrder, setSupplementsInOrder] = useState([]);
  const [etapesDetails, setEtapesDetails] = useState([]);

  useEffect(() => {
    axios.get(`${Path_API}/Categorie`)
      .then((response) => {
        setCATEGORIES_API(response.data);
      })
      .catch((error) => {
        console.error(error);
      });
  }, []);

  useEffect(() => {
    axios.get(`${Path_API}/Supplement`)
      .then((response) => {
        setEtapesDetails(response.data);
      })
      .catch((error) => {
        console.error(error);
      });
  }, []);

  const activateSearchKeyboard = () => {
    if (!onKeyboardFocus) return;
    onKeyboardFocus({
      appendKey: (key) => setSearchQuery((prev) => prev + key),
      deleteKey: () => setSearchQuery((prev) => prev.slice(0, -1)),
    });
  };

  const [Item_API, setItem_API] = useState([]);
  // console.log("🚀 ~ ProductList ~ Item_API:", Item_API)
  useEffect(() => {
    axios.get(`${Path_API}/Item`)
      .then((response) => {
        setItem_API(response.data);
      })
      .catch((error) => {
        console.error(error);
      });
  }, []);

  useEffect(() => {
    if (!Array.isArray(CATEGORIES_API) || !Array.isArray(Item_API)) return;

    const itemsByCategory = Item_API.reduce((acc, item) => {
      const categoryId = item.category_id;
      if (!acc[categoryId]) acc[categoryId] = [];
      acc[categoryId].push({
        ...item,
        count: 0,
      });
      return acc;
    }, {});

    const nextCategories = CATEGORIES_API.map((category) => ({
      ...category,
      items: itemsByCategory[category.category_id] || [],
    }));

    setCategories(nextCategories);
  }, [CATEGORIES_API, Item_API]);

  useEffect(() => {
    if (!activeCategoryId && categories.length > 0) {
      setActiveCategoryId(categories[0].category_id);
    }
  }, [categories, activeCategoryId]);

  useEffect(() => {
    setCategories((prev) =>
      prev.map((category) => ({
        ...category,
        items: category.items.map((item) => {
          const nextCount = detail_cmd
            .filter((cmd) => cmd.item_id === item.item_id)
            .reduce((sum, cmd) => sum + (Number(cmd.count) || 0), 0);
          return item.count === nextCount ? item : { ...item, count: nextCount };
        }),
      }))
    );
  }, [detail_cmd]);

  const createCartLineId = (itemId) => `${itemId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const hasSupplements = (line) => Array.isArray(line?.supplement) && line.supplement.length > 0;

  const activeCategory = useMemo(() => {
    if (!categories.length) return null;
    return (
      categories.find((cat) => cat.category_id === activeCategoryId) ||
      categories[0]
    );
  }, [activeCategoryId, categories]);

  const filteredItems = useMemo(() => {
    if (!activeCategory) return [];
    if (!searchQuery.trim()) return activeCategory.items;
    return activeCategory.items.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [activeCategory, searchQuery]);

  const resolveBackendImage = (imagePath) => resolveImageUrl(imagePath, Path_API);

  {/* Gestion de l'ouverture du dialog de supplements */ }
  const [openSupplementDialog, setOpenSupplementDialog] = useState(false);
  const [item, setItem] = useState(null);
  const OpenSupplementsForItem = (itemData) => {
    setItem(itemData);
    console.log("🚀 ~ OpenSupplementsForItem ~ itemData:", itemData)
    setOpenSupplementDialog(true);
  };
  const closeSupplementDialog = () => {
    setOpenSupplementDialog(false);
  };
  const handleSupplementConfirm = async () => {
    if (!item) return false;

    const selectedSupplements = Array.isArray(supplementsInOrder)
      ? supplementsInOrder.filter((supplement) => Number(supplement?.quantity) > 0)
      : [];
    setDetail_cmd((prev) => {
      if (selectedSupplements.length > 0) {
        return [
          ...prev,
          {
            ...item,
            item_id: item.item_id,
            count: 1,
            supplement: selectedSupplements,
            cart_line_id: createCartLineId(item.item_id),
          },
        ];
      }

      const existingIndex = prev.findIndex((cmd) => cmd.item_id === item.item_id && !hasSupplements(cmd));
      if (existingIndex !== -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          count: Math.min((Number(updated[existingIndex].count) || 0) + 1, 100),
        };
        return updated;
      }

      return [
        ...prev,
        {
          ...item,
          item_id: item.item_id,
          count: 1,
          cart_line_id: createCartLineId(item.item_id),
        },
      ];
    });

    return true;
  };

return (
  <div className="h-full flex flex-col p-4 gap-3 overflow-hidden">
    <div className="bg-white rounded-xl shadow p-3">
      <div className="mb-3">
        <input
          type="text"
          placeholder="🔍 Chercher un produit..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={activateSearchKeyboard}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 global-border-success text-sm text-gray-700"
        />
      </div>

      <div className="flex mb-2 items-center gap-2 overflow-x-auto ">
        {categories.map((category, index) => {
          const isActive = category.category_id === activeCategoryId;
          const categoryKey = `cat-${String(category.category_id ?? "unknown")}-${index}`;
          const categoryImage = resolveBackendImage(category.image);
          const categoryIcon = getCategoryIconByName(category.name);
          return (
            <button
              key={categoryKey}
              onClick={() => setActiveCategoryId(category.category_id)}
              className={
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition " +
                (isActive
                  ? "global-btn"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200")
              }
            >
              {categoryIcon ? (
                <span className="w-5 h-5 flex items-center justify-center text-sm leading-none">
                  {categoryIcon}
                </span>
              ) : categoryImage ? (
                <img
                  src={categoryImage}
                  alt={category.name}
                  className=""
                />
              ) : (
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white text-sm leading-none">
                  🏷️
                </span>
              )}
              <span>{category.name}</span>
            </button>
          );
        })}
      </div>
    </div>

    <div className="bg-white rounded-xl shadow p-4 flex-1 min-h-0 flex flex-col overflow-hidden scrollbar-custom">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-600">
          {activeCategory?.name || ""}
        </h2>
        <span className="text-xs text-gray-500">
          {activeCategory?.items?.length || 0} items
        </span>
      </div>

      {/*Carte de Liste des produits */}
      <div className="grid grid-cols-4 gap-4 overflow-y-auto pr-1 pb-4 scrollbar-custom">
        {filteredItems.map((item, index) => {
          const itemImage = resolveBackendImage(item.image) || "/products/indesponibleItem.png";
          const itemKey = `item-${String(item.item_id ?? "unknown")}-${index}`;
          return (
            <div
              key={itemKey}
              className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group"
            >
              {/* Nom du produit */}
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-base font-bold text-slate-800 truncate flex-1">
                  {item.name}
                </h3>
                {item.is_available !== undefined && (
                  <span className={`text-xs px-2 py-1 rounded-full ${item.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {item.is_available ? '✓' : '✗'}
                  </span>
                )}
              </div>
              <div className="w-full h-32 rounded-lg mb-3 overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center">
                <img
                  src={itemImage}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Informations du produit */}
              <div className="space-y-1 mb-3">
                {item.price !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Prix:</span>
                    <span className="global-text">{item.price} €</span>
                  </div>
                )}
                {item.point_fidelite !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Points:</span>
                    <span className="text-xs font-semibold text-blue-600">+{item.point_fidelite} pts</span>
                  </div>
                )}
              </div>
              <button
                disabled={item.is_available === false}
                onClick={() => {
                  if (item.is_available === false) return;
                  OpenSupplementsForItem(item);
                }}
                className={`w-full h-10 flex items-center justify-center rounded-xl shadow-sm text-sm font-bold transition-all duration-200 ${
                  item.is_available === false
                    ? "global-btn-disabled"
                    : "global-btn hover:shadow-md active:scale-[0.98]"
                }`}
              >+Ajouter
              </button>
            </div>
          );
        })}
        <SupplementOrder
          open={openSupplementDialog}
          onClose={closeSupplementDialog}
          onConfirm={handleSupplementConfirm}
          item={item}
          setSupplementsInOrder={setSupplementsInOrder}
          activeCategoryId={activeCategoryId}
          apiBaseUrl={Path_API}
          etapesDetails={etapesDetails}
          allItems={Item_API}
        />
      </div>
    </div>

  </div>
);
}
