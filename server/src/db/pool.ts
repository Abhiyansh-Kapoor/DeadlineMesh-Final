
import dotenv from "dotenv";
import { Pool, types } from "pg";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing from server/.env");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// A PostgreSQL DATE is a calendar day, not a timestamp. Keep it as YYYY-MM-DD
// so JSON serialization cannot shift it across time zones.
types.setTypeParser(1082, (value) => value);

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error.message);
});
