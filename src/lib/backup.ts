import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DB = "dev.db";
const STORAGE = "storage";

export interface Manifesto {
  criadoEm: string;
  db: string;
  storage: string;
}

async function copiarSeExiste(src: string, dest: string): Promise<boolean> {
  try {
    await fs.access(src);
  } catch {
    return false;
  }
  await fs.cp(src, dest, { recursive: true });
  return true;
}

/** Copia o banco SQLite e a pasta de arquivos para `destDir` + manifest.json. */
export async function criarBackup(destDir: string, criadoEm: string): Promise<Manifesto> {
  await fs.mkdir(destDir, { recursive: true });
  await copiarSeExiste(path.join(ROOT, DB), path.join(destDir, DB));
  await copiarSeExiste(path.join(ROOT, STORAGE), path.join(destDir, STORAGE));
  const manifesto: Manifesto = { criadoEm, db: DB, storage: STORAGE };
  await fs.writeFile(path.join(destDir, "manifest.json"), JSON.stringify(manifesto, null, 2));
  return manifesto;
}

/** Restaura um backup de `srcDir` para `alvoDir` (default = raiz do projeto). */
export async function restaurarBackup(srcDir: string, alvoDir: string = ROOT): Promise<void> {
  await fs.mkdir(alvoDir, { recursive: true });
  await copiarSeExiste(path.join(srcDir, DB), path.join(alvoDir, DB));
  await copiarSeExiste(path.join(srcDir, STORAGE), path.join(alvoDir, STORAGE));
}
