
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./db/pool";
import authRoutes from "./routes/auth";
import projectRoutes from "./routes/projects";
import taskRoutes from "./routes/tasks";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
  })
);

app.use(express.json());

app.use("/api/auth", authRoutes);

app.use("/api/projects", projectRoutes);

app.use("/api/tasks", taskRoutes);

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    message: "DeadlineMesh API is running",
  });
});

app.get("/api/health/db", async (_req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS database_time");

    res.status(200).json({
      status: "ok",
      message: "PostgreSQL connection successful",
      databaseTime: result.rows[0].database_time,
    });
  } catch (error) {
    console.error(
      "Database health check failed:",
      error instanceof Error ? error.message : error
    );

    res.status(500).json({
      status: "error",
      message: "Could not connect to PostgreSQL",
    });
  }
});

app.listen(PORT, () => {
  console.log(`DeadlineMesh API running at http://localhost:${PORT}`);
});
