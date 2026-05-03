import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let sqlClient: postgres.Sql | null = null;
let db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (db) return db;

  const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is required. Connect Supabase to Vercel or set it in .env.local.",
    );
  }

  sqlClient =
    sqlClient ??
    postgres(connectionString, {
      prepare: false,
    });
  db = drizzle(sqlClient, { schema });

  return db;
}
