/**
 * Server Entry Point
 * Starts the Express server with proper error handling and graceful shutdown
 */

import { initializeApp } from "./app.js";
import config from "./config/environment.js";
import databaseService from "./services/databaseService.js";
import logger from "./utils/logger.js";

/**
 * Start the server
 */
async function startServer() {
  try {
    // Initialize application
    const app = await initializeApp();

    // Start server
    const server = app.listen(config.port, () => {
      logger.logStartup(config.port);
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal) => {
      logger.info(`🛑 ${signal} received: Starting graceful shutdown`);

      // Close server
      server.close(async () => {
        logger.info("🔌 HTTP server closed");

        try {
          // Close database connection
          await databaseService.close();
          logger.info("🗄️ Database connection closed");

          logger.logShutdown();
          process.exit(0);
        } catch (error) {
          logger.error("❌ Error during graceful shutdown", {
            error: error.message,
          });
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error("⏰ Graceful shutdown timed out, forcing exit");
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      logger.error("💥 Uncaught Exception", {
        error: error.message,
        stack: error.stack,
      });
      gracefulShutdown("UNCAUGHT_EXCEPTION");
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      logger.error("💥 Unhandled Rejection", {
        reason: reason instanceof Error ? reason.message : reason,
        stack: reason instanceof Error ? reason.stack : undefined,
        promise: promise,
      });
      gracefulShutdown("UNHANDLED_REJECTION");
    });

    return server;
  } catch (error) {
    logger.error("❌ Failed to start server", { error: error.message });
    process.exit(1);
  }
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export { startServer };
export default startServer;
