import { logger } from "./logger";
import { migrateDatabase } from "./migrate";
import { setup } from "./orchestrator";

const serverPort = 3000;

const start = Date.now();

// Always migrate the database to the latest schema before starting services
migrateDatabase();

await setup(serverPort);

const finish = Date.now();

logger.info(
  `Application started after ${
    finish - start
  }ms! API Server is listening on port ${serverPort}`
);
