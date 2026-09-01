import path from "node:path";
import { describe, expect, it } from "vitest";
import { caminhoAbsoluto } from "./storage";

describe("caminhoAbsoluto", () => {
  it("resolve caminhos dentro do diretório storage", () => {
    expect(caminhoAbsoluto("storage/documentos/doc-1/arquivo.pdf")).toBe(
      path.join(process.cwd(), "storage", "documentos", "doc-1", "arquivo.pdf"),
    );
  });

  it.each([
    "../.env",
    "storage/../../.env",
    "storage\\..\\..\\.env",
    "/etc/passwd",
    "storage-malicioso/arquivo.pdf",
  ])("rejeita caminho fora de storage: %s", (unsafePath) => {
    expect(() => caminhoAbsoluto(unsafePath)).toThrow("Caminho de armazenamento inválido.");
  });
});
