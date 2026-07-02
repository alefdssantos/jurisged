import Link from "next/link";
import { Users, Gavel, FileText, Mail, History } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getResumo, getDocsPorCliente } from "@/lib/data/dashboard-service";
import { ACAO_LABEL } from "@/lib/audit";
import { formatarData, formatarDataHora } from "@/lib/format";

export default async function DashboardPage() {
  const [user, resumo, porCliente] = await Promise.all([
    getSession(),
    getResumo(),
    getDocsPorCliente(),
  ]);
  const c = resumo.contagens;
  const primeiroNome = user?.nome?.split(" ")[0] ?? "";

  const kpis = [
    { href: "/clientes", rotulo: "Clientes", valor: c.clientes, icon: Users },
    { href: "/clientes", rotulo: "Processos", valor: c.processos, icon: Gavel },
    { href: "/documentos", rotulo: "Documentos", valor: c.documentos, icon: FileText },
    { href: "/emails", rotulo: "E-mails", valor: c.emails, icon: Mail },
  ];
  const maxCliente = Math.max(1, ...porCliente.map((p) => p.documentos + p.emails));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Bem-vindo, ${primeiroNome}`}
        description="Visão geral do acervo documental e da atividade recente."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Link key={k.rotulo} href={k.href}>
            <Card className="transition-colors hover:border-brand/50">
              <CardContent className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">{k.rotulo}</div>
                  <div className="text-2xl font-semibold" data-testid={`kpi-${k.rotulo.toLowerCase()}`}>
                    {k.valor}
                  </div>
                </div>
                <div className="flex size-10 items-center justify-center rounded-md bg-brand/10 text-brand">
                  <k.icon className="size-5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Documentos recentes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {resumo.recentesDocs.map((d) => (
                <Link
                  key={d.id}
                  href={`/documentos/${d.id}`}
                  className="flex items-center justify-between gap-2 p-3 hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{d.nome}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {d.pasta.processo.cliente.nome} › {d.pasta.processo.titulo}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatarData(d.criadoEm)}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <History className="size-4" /> Atividade recente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {resumo.recentesAudit.map((e) => (
                <li key={e.id} className="text-sm">
                  <span className="font-medium">{ACAO_LABEL[e.acao] ?? e.acao}</span>{" "}
                  <span className="text-muted-foreground">{e.entidade.toLowerCase()}</span>
                  <div className="text-xs text-muted-foreground">
                    {e.usuario?.nome ?? "Sistema"} · {formatarDataHora(e.criadoEm)}
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Acervo por cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {porCliente.map((p) => (
            <div key={p.cliente} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{p.cliente}</span>
                <span className="text-muted-foreground">
                  {p.documentos} doc · {p.emails} e-mail
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${((p.documentos + p.emails) / maxCliente) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
