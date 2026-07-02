import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuditoriaEntidade } from "@/lib/data/audit-service";
import { ACAO_LABEL } from "@/lib/audit";
import { formatarDataHora } from "@/lib/format";

/** Timeline de auditoria de uma entidade (documento, e-mail…). Server component. */
export async function HistoricoCard({
  entidade,
  entidadeId,
}: {
  entidade: string;
  entidadeId: string;
}) {
  const eventos = await getAuditoriaEntidade(entidade, entidadeId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Histórico ({eventos.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {eventos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem eventos registrados.</p>
        ) : (
          <ol className="relative space-y-3 border-l pl-4">
            {eventos.map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute top-1.5 -left-[21px] size-2 rounded-full bg-brand" />
                <div className="text-sm">
                  <span className="font-medium">{ACAO_LABEL[e.acao] ?? e.acao}</span>
                  {" · "}
                  <span className="text-muted-foreground">{e.usuario?.nome ?? "Sistema"}</span>
                </div>
                <div className="text-xs text-muted-foreground">{formatarDataHora(e.criadoEm)}</div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
