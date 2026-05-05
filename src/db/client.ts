import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

let databaseClient: ReturnType<typeof postgres> | undefined;
let database: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb() {
  if (!databaseClient) {
    const databaseUrl = process.env.DATABASE_URL ?? process.env.DIRECT_DATABASE_URL;

    if (!databaseUrl) {
      throw new Error("DATABASE_URL or DIRECT_DATABASE_URL is required.");
    }

    databaseClient = postgres(databaseUrl.trim(), {
      max: 3,
      prepare: false,
    });
  }

  if (!database) {
    database = drizzle(databaseClient, { schema });
  }

  return database;
}
