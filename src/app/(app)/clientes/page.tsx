import { PageHeader } from "@/components/page-header";
import { getSession } from "@/lib/auth/session";
import { getPermissoesUsuario } from "@/lib/auth/permissions";
import { getArvoreCompleta } from "@/lib/data/tree";
import { ClientesManager } from "@/components/clientes/clientes-manager";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; id?: string }>;
}) {
  const { id } = await searchParams;
  const [clientes, user] = await Promise.all([getArvoreCompleta(), getSession()]);
  const podeGerenciar = (await getPermissoesUsuario(user?.id)).has("pasta.gerenciar");

  return (
    <>
      <PageHeader
        title="Clientes & Processos"
        description="Estrutura documental Cliente → Processo → Pasta. Crie, renomeie, mova e exclua."
      />
      <ClientesManager clientes={clientes} selecionadoId={id} podeGerenciar={podeGerenciar} />
    </>
  );
}
