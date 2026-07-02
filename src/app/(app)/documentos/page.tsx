import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";
import { getPermissoesUsuario } from "@/lib/auth/permissions";
import { getDocumentos } from "@/lib/data/document-service";
import { getPastasComCaminho } from "@/lib/data/tree";
import { getCategorias } from "@/lib/data/catalog";
import {
  DocumentosManager,
  type DocItemView,
} from "@/components/documentos/documentos-manager";
import { formatarData, formatarTamanho } from "@/lib/format";

export default async function DocumentosPage() {
  const [docsRaw, pastas, categorias, user] = await Promise.all([
    getDocumentos(),
    getPastasComCaminho(),
    getCategorias(),
    getSession(),
  ]);
  const perms = await getPermissoesUsuario(user?.id);
  const podeEscrever = perms.has("documento.escrever");
  const podeExcluir = perms.has("documento.excluir");

  const docs: DocItemView[] = docsRaw.map((d) => ({
    id: d.id,
    nome: d.nome,
    categoria: d.categoria?.nome ?? null,
    local: `${d.pasta.processo.cliente.nome} › ${d.pasta.processo.titulo} › ${d.pasta.nome}`,
    numeroVersao: d.versoes[0]?.numero ?? 1,
    totalVersoes: d._count.versoes,
    tamanhoFmt: formatarTamanho(d.versoes[0]?.tamanho ?? 0),
    criadoPor: d.criadoPor?.nome ?? "—",
    dataFmt: formatarData(d.atualizadoEm),
    tags: d.tags.map((t) => ({ nome: t.nome })),
  }));

  return (
    <>
      <PageHeader
        title="Documentos"
        description="Upload, listagem e visualização. Versões, OCR e metadados por documento."
        actions={
          podeEscrever ? (
            <a href="/catalogo" className={buttonVariants({ variant: "outline" })}>
              Catálogo
            </a>
          ) : undefined
        }
      />
      <DocumentosManager
        docs={docs}
        pastas={pastas}
        categorias={categorias}
        podeEnviar={podeEscrever}
        podeExcluir={podeExcluir}
      />
    </>
  );
}
