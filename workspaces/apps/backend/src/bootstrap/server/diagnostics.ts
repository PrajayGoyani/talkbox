import { ENABLE_DIAGNOSTICS, ENABLE_PERIODIC_HEAP_SNAPSHOTS } from "@config/env";
import { logger } from "@utils/logger";

/**
 * Helper to write a clean V8 heap snapshot directly as an ArrayBuffer.
 * Bypasses TextDecoder decoding to avoid massive JS heap allocations.
 */
export function writeHeapSnapshot() {
  try {
    const snapshotBuffer = Bun.generateHeapSnapshot("v8", "arraybuffer");
    Bun.write(`heap-${process.pid}.snapshot`, snapshotBuffer);
  } catch (err) {
    logger.error(`[Memory] Failed to write heap snapshot for PID ${process.pid}:`, {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Initializes server diagnostics:
 * 1. Sets up periodic memory usage logging to a process-isolated file (every 30s).
 * 2. Registers a SIGUSR2 signal handler to trigger on-demand heap snapshots.
 */
export function initializeDiagnostics() {
  if (!ENABLE_DIAGNOSTICS) {
    return;
  }

  // 1. Process-isolated periodic memory usage logging (Every 30s)
  const memTimer = setInterval(() => {
    try {
      Bun.write(`mem-${process.pid}.usage`, JSON.stringify(process.memoryUsage()));
    } catch (err) {
      logger.error(`[Memory] Error logging memory usage for PID ${process.pid}:`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, 30000);
  memTimer.unref();

  // 2. Process-isolated periodic heap snapshots (Every 5 minutes, if enabled)
  if (ENABLE_PERIODIC_HEAP_SNAPSHOTS) {
    const heapTimer = setInterval(() => {
      writeHeapSnapshot();
    }, 300000); // 5 minutes
    heapTimer.unref();
  }

  // 3. On-demand Heap Snapshot via SIGUSR2 signal
  process.on("SIGUSR2", () => {
    logger.info(`[Memory] Received SIGUSR2. Triggering on-demand heap snapshot for PID ${process.pid}...`);
    writeHeapSnapshot();
  });

  logger.info(`[Diagnostics] Process diagnostics initialized for PID ${process.pid}`);
}
