import { migrateDatabase } from "./migrate";
import { setup } from "./orchestrator";

// Always migrate the database to the latest schema before starting services
migrateDatabase();

await setup();
