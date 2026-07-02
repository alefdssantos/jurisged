import path from "node:path";
import { criarBackup } from "../src/lib/backup";

async function main() {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = path.join(process.cwd(), "backups", ts);
  const m = await criarBackup(dest, new Date().toISOString());
  console.log(`✔ Backup criado em backups/${ts} (db=${m.db}, storage=${m.storage})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
