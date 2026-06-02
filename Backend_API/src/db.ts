import { data } from "./constant";
import { Pool } from "pg";

// Connexion PostgreSQL
export const pool = new Pool({
  host: data.PGHOST,
  user: data.PGUSER,
  password: data.PGPASSWORD,
  database: data.PGDATABASE,
  port: Number(data.PGPORT),
});