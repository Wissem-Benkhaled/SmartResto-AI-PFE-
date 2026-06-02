import express, { Application } from "express";
import { pool } from "./db";
import path from "path";
import cors from "cors";

import CategorieRoute from "./Routes/CategorieRoute";
import ItemRoute from "./Routes/ItemRoute";
import OrderRoute from "./Routes/OrdersRoute";
import Order_DetailsRoute from "./Routes/Order_DetailsRoute";
import PaymentsRoute from "./Routes/PaymentsRoute";
import PromoRoute from "./Routes/promoRoute";
import ProduitRoute from "./Routes/ProduitRoute";
import UserRoute from "./Routes/UserRoute";
import ClientRoute from "./Routes/ClientRoute";
import ParametreRoute from "./Routes/ParametreRoute";
import VolLogsRoute from "./Routes/VolLogsRoute";
import HealthRoute from "./Routes/HealthRoute";
import PointeuseLogsRoute from "./Routes/PointeuseLogsRoute";
import SupplementRoute from "./Routes/SupplementRoute";

// Test connexion DB
pool.connect()
  .then(() => console.log("✅ Connected to PostgreSQL"))
  .catch((err: any) => console.error("❌ PostgreSQL connection error:", err));

const app: Application = express();

app.use(express.json());
app.use(cors());

// ✅ Servir les images uploadées en statique
// __dirname = src/  →  ../uploads = racine/uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use("/Categorie", CategorieRoute);
app.use("/Item", ItemRoute);
app.use("/Order_Details", Order_DetailsRoute);
app.use("/User", UserRoute);
app.use("/Order", OrderRoute);
app.use("/Payment", PaymentsRoute);
app.use("/Promo", PromoRoute);
app.use("/Produit", ProduitRoute);
app.use("/Client", ClientRoute);
app.use("/Parametre", ParametreRoute);
app.use("/Health", HealthRoute);
app.use("/VolLogs", VolLogsRoute);
app.use("/PointeuseLogs", PointeuseLogsRoute);
app.use("/Supplement", SupplementRoute);

// ✅ Lancer serveur
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});