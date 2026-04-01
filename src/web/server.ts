import express from "express";
import cors from "cors";
import path from "path";
import sourcesRouter from "./api/sources.js";
import postsRouter from "./api/posts.js";
import notificationsRouter from "./api/notifications.js";
import crawlLogsRouter from "./api/crawl-logs.js";
import browserRouter from "./api/browser.js";

export function createServer() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // API routes
  app.use("/api/sources", sourcesRouter);
  app.use("/api/posts", postsRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/crawl-logs", crawlLogsRouter);
  app.use("/api/browser", browserRouter);

  // Serve static frontend files
  const staticPath = path.join(import.meta.dirname, "..", "..", "web-ui", "dist");
  app.use(express.static(staticPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  return app;
}
