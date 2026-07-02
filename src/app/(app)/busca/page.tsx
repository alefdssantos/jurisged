import Link from "next/link";
import { FileText, Mail, Search, Paperclip } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { getClientes, getProcessosComCliente } from "@/lib/data/tree";
import { getCategorias, getTags } from "@/lib/data/catalog";
import { buscar } from "@/lib/data/search-service";
import { formatarData } from "@/lib/format";

const selectClass =
  "h-9 w-full rounded-md border bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const filtros = {
    q: sp.q,
    clienteId: sp.clienteId,
    processoId: sp.processoId,
    categoriaId: sp.categoriaId,
    tagId: sp.tagId,
    de: sp.de,
    ate: sp.ate,
    tipo: sp.tipo,
  };

  const [clientes, processos, categorias, tags, resultados] = await Promise.all([
    getClientes(),
    getProcessosComCliente(),
    getCategorias(),
    getTags(),
    buscar(filtros),
  ]);

  const temFiltro = Object.values(filtros).some((v) => v && v !== "todos");

  return (
    <>
      <PageHeader
        title="Busca"
        description="Busca textual (FTS5, sem acento) em documentos e e-mails, com filtros combináveis."
      />

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-sm">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <form method="get" data-testid="busca-form" className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="q">Texto</Label>
                <Input id="q" name="q" defaultValue={sp.q ?? ""} placeholder="palavra-chave…" />
              </div>
              <Campo label="Tipo" htmlFor="tipo">
                <select id="tipo" name="tipo" className={selectClass} defaultValue={sp.tipo ?? "todos"}>
                  <option value="todos">Documentos e e-mails</option>
                  <option value="documentos">Só documentos</option>
                  <option value="emails">Só e-mails</option>
                </select>
              </Campo>
              <Campo label="Cliente" htmlFor="clienteId">
                <select id="clienteId" name="clienteId" className={selectClass} defaultValue={sp.clienteId ?? ""}>
                  <option value="">Todos</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </Campo>
              <Campo label="Processo" htmlFor="processoId">
                <select id="processoId" name="processoId" className={selectClass} defaultValue={sp.processoId ?? ""}>
                  <option value="">Todos</option>
                  {processos.map((p) => (
                    <option key={p.id} value={p.id}>{p.rotulo}</option>
                  ))}
                </select>
              </Campo>
              <Campo label="Categoria (documentos)" htmlFor="categoriaId">
                <select id="categoriaId" name="categoriaId" className={selectClass} defaultValue={sp.categoriaId ?? ""}>
                  <option value="">Todas</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </Campo>
              <Campo label="Tag" htmlFor="tagId">
                <select id="tagId" name="tagId" className={selectClass} defaultValue={sp.tagId ?? ""}>
                  <option value="">Todas</option>
                  {tags.map((t) => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </Campo>
              <div className="grid grid-cols-2 gap-2">
                <Campo label="De" htmlFor="de">
                  <Input id="de" name="de" type="date" defaultValue={sp.de ?? ""} />
                </Campo>
                <Campo label="Até" htmlFor="ate">
                  <Input id="ate" name="ate" type="date" defaultValue={sp.ate ?? ""} />
                </Campo>
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" className="flex-1" data-testid="aplicar-filtros">
                  <Search className="size-4" /> Buscar
                </Button>
                <Link href="/busca" className={buttonVariants({ variant: "outline" })}>
                  Limpar
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6" data-testid="resultados">
          <p className="text-sm text-muted-foreground">
            {resultados.documentos.length} documento(s) · {resultados.emails.length} e-mail(s)
            {temFiltro ? " para os filtros aplicados" : ""}
          </p>

          {resultados.documentos.length === 0 && resultados.emails.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Nenhum resultado"
              description="Ajuste os filtros ou o termo de busca."
            />
          ) : null}

          {resultados.documentos.length > 0 ? (
            <section className="space-y-2">
              <h2 className="flex items-center gap-2 text-sm font-medium">
                <FileText className="size-4" /> Documentos ({resultados.documentos.length})
              </h2>
              <div className="divide-y rounded-lg border">
                {resultados.documentos.map((d) => (
                  <Link
                    key={d.id}
                    href={`/documentos/${d.id}`}
                    className="flex flex-col gap-1 p-3 hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{d.nome}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {d.pasta.processo.cliente.nome} › {d.pasta.processo.titulo} › {d.pasta.nome}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {d.categoria ? <Badge variant="secondary">{d.categoria.nome}</Badge> : null}
                      <span className="text-xs text-muted-foreground">{formatarData(d.criadoEm)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {resultados.emails.length > 0 ? (
            <section className="space-y-2">
              <h2 className="flex items-center gap-2 text-sm font-medium">
                <Mail className="size-4" /> E-mails ({resultados.emails.length})
              </h2>
              <div className="divide-y rounded-lg border">
                {resultados.emails.map((e) => (
                  <Link
                    key={e.id}
                    href={`/emails/${e.id}`}
                    className="flex flex-col gap-1 p-3 hover:bg-muted/50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">{e.assunto}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatarData(e.dataEnvio)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate">De: {e.remetente}</span>
                      {e.anexos.length > 0 ? (
                        <span className="flex items-center gap-1">
                          <Paperclip className="size-3" /> {e.anexos.length}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}

function Campo({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
