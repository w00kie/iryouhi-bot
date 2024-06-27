import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "sqlite", // 'postgresql' | 'mysql' | 'sqlite'
  dbCredentials: {
    url: "./sqlite.db",
  },
});
