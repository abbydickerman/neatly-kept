import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function createDb() {
  if (!process.env.DATABASE_URL) {
    // Return a proxy that throws a helpful error at runtime if db is used without DATABASE_URL
    return new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
      get(_target, prop) {
        if (prop === "then" || prop === Symbol.toPrimitive || prop === Symbol.toStringTag) {
          return undefined;
        }
        throw new Error(
          "Database connection not available. Set DATABASE_URL environment variable."
        );
      },
    });
  }
  const sql = neon(process.env.DATABASE_URL);
  return drizzle(sql, { schema });
}

export const db = createDb();

export type Database = typeof db;
