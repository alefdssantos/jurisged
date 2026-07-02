import { describe, it, expect, afterAll } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import { criarBackup, restaurarBackup } from "@/lib/backup";

const tmp = path.join(process.cwd(), ".tmp-test-backup");

async function existe(p: string) {
  return fs.access(p).then(() => true).catch(() => false);
}

describe("F13 — backup / restore (integração, roundtrip)", () => {
  afterAll(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it("cria backup com banco, storage e manifest", async () => {
    const dest = path.join(tmp, "bkp");
    const m = await criarBackup(dest, "2026-06-23T00:00:00Z");
    expect(m.db).toBe("dev.db");
    expect(await existe(path.join(dest, "dev.db"))).toBe(true);
    const manifest = JSON.parse(await fs.readFile(path.join(dest, "manifest.json"), "utf8"));
    expect(manifest.criadoEm).toBe("2026-06-23T00:00:00Z");
    const arquivos = await fs.readdir(path.join(dest, "storage"));
    expect(arquivos.length).toBeGreaterThan(0);
  });

  it("restaura o backup para um alvo (sem tocar no ambiente real)", async () => {
    const dest = path.join(tmp, "bkp");
    const alvo = path.join(tmp, "restore");
    await restaurarBackup(dest, alvo);
    expect(await existe(path.join(alvo, "dev.db"))).toBe(true);
    expect(await existe(path.join(alvo, "storage"))).toBe(true);
  });
});
