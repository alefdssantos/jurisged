import { PageHeader } from "@/components/page-header";
import { getSession } from "@/lib/auth/session";
import { getPermissoesUsuario } from "@/lib/auth/permissions";
import { getEmails } from "@/lib/data/email-service";
import { getPastasComCaminho } from "@/lib/data/tree";
import { getTags } from "@/lib/data/catalog";
import { EmailsManager, type EmailItemView } from "@/components/emails/emails-manager";
import { formatarDataHora } from "@/lib/format";

export default async function EmailsPage() {
  const [emailsRaw, pastas, tags, user] = await Promise.all([
    getEmails(),
    getPastasComCaminho(),
    getTags(),
    getSession(),
  ]);
  const podeArquivar = (await getPermissoesUsuario(user?.id)).has("email.arquivar");

  const emails: EmailItemView[] = emailsRaw.map((e) => ({
    id: e.id,
    assunto: e.assunto,
    remetente: e.remetente,
    dataFmt: formatarDataHora(e.dataEnvio),
    local: e.pasta
      ? `${e.pasta.processo.cliente.nome} › ${e.pasta.processo.titulo} › ${e.pasta.nome}`
      : "— sem pasta —",
    anexos: e.anexos.length,
  }));

  return (
    <>
      <PageHeader
        title="E-mails"
        description="Arquivamento de e-mails (.eml): corpo, remetente, destinatários, data, assunto e anexos, classificados por cliente/processo/pasta."
      />
      <EmailsManager
        emails={emails}
        pastas={pastas}
        tags={tags.map((t) => ({ id: t.id, nome: t.nome }))}
        podeArquivar={podeArquivar}
      />
    </>
  );
}
