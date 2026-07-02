import { restaurarBackup } from "../src/lib/backup";

async function main() {
  const dir = process.argv[2];
  if (!dir) {
    console.error("Uso: npm run restore -- <pasta-de-backup>");
    process.exit(1);
  }
  await restaurarBackup(dir);
  console.log(`✔ Restaurado de ${dir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
