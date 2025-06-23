import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  unique,
  int,
} from "drizzle-orm/sqlite-core";

export const eanCache = sqliteTable(
  "ean_cache",
  {
    ean: text("ean").primaryKey(),
    service: text("service"),
    name: text("name").notNull(),
    brand: text("brand"),
    extra: text("extra"),
    manual: integer({ mode: "boolean" }).notNull(),
    created_at: integer({ mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updated_at: integer({ mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  // ean and service together must be unique
  (t) => [unique().on(t.ean, t.service)]
);
