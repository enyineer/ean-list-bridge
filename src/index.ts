import { migrateDatabase } from "./migrate";

// Always migrate the database to the latest schema before starting services
migrateDatabase();
