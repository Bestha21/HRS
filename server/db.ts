import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

const databaseUrl = process.env.AWS_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "AWS_DATABASE_URL or DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: databaseUrl,
  // This ensures SSL is ALWAYS on when deploying to Render/Production
  ssl: process.env.NODE_ENV === "production" 
    ? { rejectUnauthorized: false } 
    : undefined
});
export const db = drizzle(pool, { schema });
