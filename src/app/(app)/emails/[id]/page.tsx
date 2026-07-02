import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Paperclip } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEmail } from "@/lib/data/email-service";
import { HistoricoCard } from "@/components/historico-card";
import { formatarDataHora, formatarTamanho } from "@/lib/format";

export default async function EmailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const email = await getEmail(id);
  if (!email) notFound();

  const destinatarios = (JSON.parse(email.destinatarios) as string[]) ?? [];
  const cc = email.cc ? (JSON.parse(email.cc) as string[]) : [];
  const local = email.pasta
    ? `${email.pasta.processo.cliente.nome} › ${email.pasta.processo.titulo} › ${email.pasta.nome}`
    : "— sem pasta —";

  return (
    <div className="space-y-4">
      <Link
        href="/emails"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Voltar para e-mails
      </Link>

      <PageHeader
        title={email.assunto}
        description={local}
        actions={
          <a
            href={`/api/eml/${email.id}`}
            className={buttonVariants({ variant: "outline" })}
            data-testid="baixar-eml"
          >
            <Download className="size-4" /> Baixar .eml
          </a>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Mensagem</CardTitle>
            </CardHeader>
            <CardContent>
              {email.corpoHtml ? (
                <iframe
                  sandbox=""
                  srcDoc={email.corpoHtml}
                  title="Corpo do e-mail"
                  className="h-[55vh] w-full rounded-md border bg-white"
                />
              ) : (
                <pre className="max-h-[55vh] overflow-auto whitespace-pre-wrap text-sm">
                  {email.corpoTexto || "(sem corpo)"}
                </pre>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Metadados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Info rotulo="De" valor={email.remetente} />
              <Info rotulo="Para" valor={destinatarios.join(", ") || "—"} />
              {cc.length > 0 ? <Info rotulo="Cc" valor={cc.join(", ")} /> : null}
              <Info rotulo="Data" valor={formatarDataHora(email.dataEnvio)} />
              {email.messageId ? <Info rotulo="Message-ID" valor={email.messageId} /> : null}
              {email.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1 pt-1">
                  {email.tags.map((t) => (
                    <Badge key={t.id} variant="outline">{t.nome}</Badge>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Anexos ({email.anexos.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {email.anexos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem anexos.</p>
              ) : (
                email.anexos.map((a) => (
                  <a
                    key={a.id}
                    href={`/api/anexo/${a.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-sm hover:bg-muted/50"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Paperclip className="size-4 shrink-0" />
                      <span className="truncate">{a.nome}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatarTamanho(a.tamanho)}
                    </span>
                  </a>
                ))
              )}
            </CardContent>
          </Card>

          <HistoricoCard entidade="Email" entidadeId={email.id} />
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
