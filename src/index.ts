import { getDb } from "./db/index.js";
import { createServer } from "./web/server.js";
import { startScheduler } from "./scheduler/index.js";

const PORT = Number(process.env.PORT) || 3847;

async function main() {
  console.log("[WebMonitor] Starting...");

  // Initialize DB
  await getDb();
  console.log("[WebMonitor] Database ready");

  // Start web server
  const app = createServer();
  app.listen(PORT, () => {
    console.log(`[WebMonitor] Web UI: http://localhost:${PORT}`);
  });

  // Start scheduler
  await startScheduler();
  console.log("[WebMonitor] Scheduler started");
}

main().catch((err) => {
  console.error("[WebMonitor] Fatal error:", err);
  process.exit(1);
});
