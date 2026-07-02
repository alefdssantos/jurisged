import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Armazenamento local de arquivos (mock de produção — sem S3/credenciais).
 * `storagePath` é relativo à raiz do projeto e inclui o prefixo "storage/".
 */
const ROOT = process.cwd();

export function caminhoAbsoluto(rel: string): string {
  return path.join(ROOT, rel);
}

export async function salvarArquivo(
  rel: string,
  dados: Buffer | Uint8Array,
): Promise<string> {
  const abs = caminhoAbsoluto(rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, dados);
  return rel;
}

export async function lerArquivo(rel: string): Promise<Buffer> {
  return fs.readFile(caminhoAbsoluto(rel));
}

export async function existeArquivo(rel: string): Promise<boolean> {
  try {
    await fs.access(caminhoAbsoluto(rel));
    return true;
  } catch {
    return false;
  }
}

export async function removerArquivo(rel: string): Promise<void> {
  try {
    await fs.rm(caminhoAbsoluto(rel));
  } catch {
    // arquivo inexistente — ignora
  }
}

export async function removerPrefixo(rel: string): Promise<void> {
  try {
    await fs.rm(caminhoAbsoluto(rel), { recursive: true, force: true });
  } catch {
    // ignora
  }
}

/** Caminho de storage padrão para uma versão de documento. */
export function caminhoVersao(documentoId: string, versaoId: string, nomeArquivo: string): string {
  const seguro = nomeArquivo.replace(/[^\w.\-]+/g, "_");
  return `storage/documentos/${documentoId}/${versaoId}_${seguro}`;
}
