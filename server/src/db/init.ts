import fs from "node:fs";
import path from "node:path";
import { pool } from "./pool";

async function main() {
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(schema);
  console.log("Database schema is ready.");
}

main()
  .catch((error) => {
    console.error("Database setup failed:", error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
