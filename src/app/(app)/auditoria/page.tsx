import Link from "next/link";
import { ShieldAlert, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { getSession } from "@/lib/auth/session";
import { getPermissoesUsuario } from "@/lib/auth/permissions";
import { getAuditoriaGlobal, ACOES, ENTIDADES } from "@/lib/data/audit-service";
import { ACAO_LABEL } from "@/lib/audit";
import { formatarDataHora } from "@/lib/format";

const selectClass =
  "h-9 rounded-md border bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getSession();
  const perms = await getPermissoesUsuario(user?.id);

  if (!perms.has("admin.gerenciar")) {
    return (
      <>
        <PageHeader title="Auditoria" description="Trilha de auditoria do sistema." />
        <EmptyState
          icon={ShieldAlert}
          title="Sem permissão"
          description="Apenas administradores podem ver a trilha de auditoria completa."
        />
      </>
    );
  }

  const sp = await searchParams;
  const eventos = await getAuditoriaGlobal({ acao: sp.acao, entidade: sp.entidade });

  return (
    <>
      <PageHeader
        title="Auditoria"
        description="Trilha completa de ações do sistema — rastreabilidade (quem, o quê, quando)."
      />

      <form method="get" data-testid="auditoria-form" className="mb-4 flex flex-wrap items-end gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="acao">Ação</Label>
          <select id="acao" name="acao" defaultValue={sp.acao ?? ""} className={selectClass}>
            <option value="">Todas</option>
            {ACOES.map((a) => (
              <option key={a} value={a}>{ACAO_LABEL[a] ?? a}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="entidade">Entidade</Label>
          <select id="entidade" name="entidade" defaultValue={sp.entidade ?? ""} className={selectClass}>
            <option value="">Todas</option>
            {ENTIDADES.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
        <Button type="submit" data-testid="filtrar-auditoria">
          <Search className="size-4" /> Filtrar
        </Button>
        <Link href="/auditoria" className={buttonVariants({ variant: "outline" })}>
          Limpar
        </Link>
      </form>

      <div className="rounded-lg border" data-testid="auditoria">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quando</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead className="hidden sm:table-cell">Entidade</TableHead>
              <TableHead className="hidden lg:table-cell">Detalhe</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {eventos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  Nenhum evento para os filtros.
                </TableCell>
              </TableRow>
            ) : (
              eventos.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatarDataHora(e.criadoEm)}
                  </TableCell>
                  <TableCell className="text-sm">{e.usuario?.nome ?? "Sistema"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{ACAO_LABEL[e.acao] ?? e.acao}</Badge>
                  </TableCell>
                  <TableCell className="hidden text-sm sm:table-cell">{e.entidade}</TableCell>
                  <TableCell className="hidden max-w-xs truncate text-xs text-muted-foreground lg:table-cell">
                    {e.detalhe ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
