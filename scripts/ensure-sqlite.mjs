import { closeSync, existsSync, openSync } from "node:fs";

// Prisma's Windows schema engine may fail before creating a new SQLite file.
// Never replace an existing database.
const database = new URL("../prisma/dev.sqlite", import.meta.url);
if (!existsSync(database)) {
  closeSync(openSync(database, "wx"));
}
