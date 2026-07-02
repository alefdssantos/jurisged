import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Download } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDocumento } from "@/lib/data/document-service";
import { getCategorias, getTags, getCamposPersonalizados } from "@/lib/data/catalog";
import { getSession } from "@/lib/auth/session";
import { getPermissoesUsuario } from "@/lib/auth/permissions";
import { ClassificacaoEditor } from "@/components/documentos/classificacao-editor";
import { VersoesPanel } from "@/components/documentos/versoes-panel";
import { OcrButton } from "@/components/documentos/ocr-button";
import { HistoricoCard } from "@/components/historico-card";
import { formatarDataHora, formatarTamanho } from "@/lib/format";
import { cn } from "@/lib/utils";

function Preview({
  versaoId,
  mimeType,
  nome,
}: {
  versaoId: string;
  mimeType: string;
  nome: string;
}) {
  const url = `/api/arquivo/${versaoId}`;
  if (mimeType.startsWith("image/")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={nome}
        className="max-h-[75vh] w-full rounded-lg border bg-muted object-contain"
      />
    );
  }
  if (mimeType === "application/pdf" || mimeType.startsWith("text/")) {
    return (
      <iframe
        src={url}
        title={nome}
        className="h-[75vh] w-full rounded-lg border bg-white"
      />
    );
  }
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
      <FileText className="size-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        Pré-visualização indisponível para este tipo ({mimeType || "desconhecido"}).
      </p>
      <a href={url} download={nome} className={buttonVariants({ variant: "outline", size: "sm" })}>
        <Download className="size-4" /> Baixar arquivo
      </a>
    </div>
  );
}

export default async function DocumentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const doc = await getDocumento(id);
  if (!doc) notFound();

  const [categorias, tags, campos, user] = await Promise.all([
    getCategorias(),
    getTags(),
    getCamposPersonalizados(),
    getSession(),
  ]);
  const podeEscrever = (await getPermissoesUsuario(user?.id)).has("documento.escrever");

  const atual = doc.versoes.find((v) => v.atual) ?? doc.versoes[0];
  const url = atual ? `/api/arquivo/${atual.id}` : null;

  return (
    <div className="space-y-4">
      <Link
        href="/documentos"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Voltar para documentos
      </Link>

      <PageHeader
        title={doc.nome}
        description={`${doc.pasta.processo.cliente.nome} › ${doc.pasta.processo.titulo} › ${doc.pasta.nome}`}
        actions={
          url && atual ? (
            <a
              href={url}
              download={atual.nomeArquivo}
              className={cn(buttonVariants({ variant: "outline" }))}
              data-testid="baixar"
            >
              <Download className="size-4" /> Baixar
            </a>
          ) : undefined
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {atual ? (
            <Preview versaoId={atual.id} mimeType={atual.mimeType} nome={atual.nomeArquivo} />
          ) : (
            <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              Sem arquivo associado.
            </p>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-sm">Informações</CardTitle>
              {podeEscrever ? (
                <ClassificacaoEditor
                  documentoId={doc.id}
                  categoriaIdAtual={doc.categoriaId}
                  tagIdsAtuais={doc.tags.map((t) => t.id)}
                  metadadosAtuais={doc.metadados.map((m) => ({ campoId: m.campoId, valor: m.valor }))}
                  categorias={categorias.map((c) => ({ id: c.id, nome: c.nome }))}
                  tags={tags.map((t) => ({ id: t.id, nome: t.nome }))}
                  campos={campos.map((c) => ({ id: c.id, nome: c.nome, tipo: c.tipo, opcoes: c.opcoes }))}
                />
              ) : null}
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Info rotulo="Categoria" valor={doc.categoria?.nome ?? "—"} />
              <Info rotulo="Criado por" valor={doc.criadoPor?.nome ?? "—"} />
              <Info rotulo="Atualizado" valor={formatarDataHora(doc.atualizadoEm)} />
              {atual ? (
                <>
                  <Info rotulo="Arquivo" valor={atual.nomeArquivo} />
                  <Info rotulo="Tamanho" valor={formatarTamanho(atual.tamanho)} />
                  <Info rotulo="Tipo" valor={atual.mimeType} />
                </>
              ) : null}
              {doc.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1 pt-1">
                  {doc.tags.map((t) => (
                    <Badge key={t.id} variant="outline">
                      {t.nome}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-sm">Texto reconhecido (OCR)</CardTitle>
              {atual && podeEscrever ? <OcrButton documentoId={doc.id} versaoId={atual.id} /> : null}
            </CardHeader>
            <CardContent>
              {atual?.ocrText ? (
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-2 text-xs text-muted-foreground">
                  {atual.ocrText}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sem texto extraído. Clique em “Executar OCR”.
                </p>
              )}
            </CardContent>
          </Card>

          <VersoesPanel
            documentoId={doc.id}
            podeEscrever={podeEscrever}
            versoes={doc.versoes.map((v) => ({
              id: v.id,
              numero: v.numero,
              tamanhoFmt: formatarTamanho(v.tamanho),
              criadoPor: v.criadoPor?.nome ?? "—",
              dataFmt: formatarDataHora(v.criadoEm),
              atual: v.atual,
              nomeArquivo: v.nomeArquivo,
              comentario: v.comentario,
            }))}
          />

          <HistoricoCard entidade="Documento" entidadeId={doc.id} />

          {doc.metadados.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Metadados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {doc.metadados.map((m) => (
                  <Info key={m.id} rotulo={m.campo.nome} valor={m.valor} />
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Info({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{rotulo}</span>
      <span className="truncate text-right font-medium">{valor}</span>
    </div>
  );
}
