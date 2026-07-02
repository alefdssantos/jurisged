import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import * as metasvc from "@/lib/data/metadata-service";
import { getDocumento } from "@/lib/data/document-service";

const criados = { tags: [] as string[], categorias: [] as string[], campos: [] as string[] };

describe("F4 — metadados, campos personalizados, tags e categorias (integração)", () => {
  afterAll(async () => {
    // restaura doc-2 ao estado do seed (categoria comprovante, tag original, sem metadados)
    await metasvc.salvarClassificacao({
      documentoId: "doc-2",
      categoriaId: "cat-comprovante",
      tagIds: ["tag-original"],
      valores: [{ campoId: "campo-numdoc", valor: "" }],
    });
    for (const id of criados.campos) await prisma.campoPersonalizado.deleteMany({ where: { id } });
    for (const id of criados.tags) await prisma.tag.deleteMany({ where: { id } });
    for (const id of criados.categorias) await prisma.categoria.deleteMany({ where: { id } });
    await prisma.$disconnect();
  });

  it("salva classificação (categoria, tags e metadado) em um documento", async () => {
    await metasvc.salvarClassificacao({
      documentoId: "doc-2",
      categoriaId: "cat-comprovante",
      tagIds: ["tag-original", "tag-urgente"],
      valores: [{ campoId: "campo-numdoc", valor: "COMP-2024-9" }],
      usuarioId: "ana.silva",
    });
    const d = await getDocumento("doc-2");
    expect(d?.categoria?.id).toBe("cat-comprovante");
    expect(d?.tags.map((t) => t.id).sort()).toEqual(["tag-original", "tag-urgente"].sort());
    expect(d?.metadados.find((m) => m.campoId === "campo-numdoc")?.valor).toBe("COMP-2024-9");
  });

  it("remove metadado quando o valor enviado é vazio", async () => {
    await metasvc.salvarClassificacao({
      documentoId: "doc-2",
      categoriaId: "cat-comprovante",
      tagIds: ["tag-original"],
      valores: [{ campoId: "campo-numdoc", valor: "" }],
    });
    const d = await getDocumento("doc-2");
    expect(d?.metadados.find((m) => m.campoId === "campo-numdoc")).toBeUndefined();
    expect(d?.tags.length).toBe(1);
  });

  it("catálogo: cria categoria/tag/campo e bloqueia duplicado e tipo inválido", async () => {
    const cat = await metasvc.criarCategoria({ nome: "Categoria Teste F4" });
    criados.categorias.push(cat.id);
    const tag = await metasvc.criarTag({ nome: "Tag Teste F4" });
    criados.tags.push(tag.id);
    const campo = await metasvc.criarCampo({ nome: "Campo Teste F4", tipo: "LISTA", opcoes: ["A", "B"] });
    criados.campos.push(campo.id);
    expect(JSON.parse(campo.opcoes!)).toEqual(["A", "B"]);

    await expect(metasvc.criarCategoria({ nome: "Categoria Teste F4" })).rejects.toThrow(/já existe/i);
    await expect(metasvc.criarCampo({ nome: "Lista sem opcoes", tipo: "LISTA" })).rejects.toThrow(/opção/i);
    await expect(metasvc.criarCampo({ nome: "Tipo bad", tipo: "INVALIDO" })).rejects.toThrow(/inválido/i);
  });

  it("excluir campo remove valores associados (cascade)", async () => {
    const campo = await metasvc.criarCampo({ nome: "Campo Cascade F4", tipo: "TEXTO" });
    await metasvc.salvarClassificacao({
      documentoId: "doc-2",
      categoriaId: "cat-comprovante",
      tagIds: ["tag-original"],
      valores: [{ campoId: campo.id, valor: "x" }],
    });
    await metasvc.excluirCampo({ id: campo.id });
    const d = await getDocumento("doc-2");
    expect(d?.metadados.find((m) => m.campoId === campo.id)).toBeUndefined();
  });
});
