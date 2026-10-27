
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
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

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

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

// In production the API and built client share one origin.
const clientDist = path.resolve(__dirname, "../../client/dist");
if (fs.existsSync(path.join(clientDist, "index.html"))) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api/")) {
      res.sendFile(path.join(clientDist, "index.html"));
    } else {
      next();
    }
  });
}

app.use("/api", (_req, res) => {
  res.status(404).json({ message: "API endpoint not found." });
});

app.use((
  error: Error & { type?: string },
  _req: express.Request,
  res: express.Response,
  _next: express.NextFunction
) => {
  if (error.type === "entity.parse.failed") {
    res.status(400).json({ message: "Request body must be valid JSON." });
    return;
  }
  console.error("Unhandled request error:", error);
  res.status(500).json({ message: "An unexpected server error occurred." });
});

app.listen(PORT, () => {
  console.log(`DeadlineMesh API running at http://localhost:${PORT}`);
});
