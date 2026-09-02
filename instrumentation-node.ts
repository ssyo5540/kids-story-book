import { logger } from "@/lib/logger";
import { ensureRuntimeReady } from "@/lib/runtime";

// Warm storage index, ledger and voices before the first request.
ensureRuntimeReady().catch((e) => logger.error({ err: (e as Error).message }, "runtime failed to start"));

let shuttingDown = false;
const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "shutting down: draining running audio jobs");
  try {
    const rt = await ensureRuntimeReady();
    const drained = await rt.queue.drain(50_000);
    await rt.ledger.persist();
    logger.info({ drained }, "drained");
  } catch (e) {
    logger.error({ err: (e as Error).message }, "drain failed");
  }
  process.exit(0);
};

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => logger.error({ err: String(reason) }, "unhandledRejection"));
process.on("uncaughtException", (err) => {
  logger.fatal({ err: err.message, stack: err.stack }, "uncaughtException");
  process.exit(1);
});
