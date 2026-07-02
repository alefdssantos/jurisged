import { ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { getSession } from "@/lib/auth/session";
import { getPermissoesUsuario } from "@/lib/auth/permissions";
import { getUsuarios, getGrupos, getPermissoes } from "@/lib/data/admin-service";
import {
  AdminManager,
  type UsuarioItem,
  type GrupoItem,
} from "@/components/admin/admin-manager";

export default async function AdminPage() {
  const user = await getSession();
  const perms = await getPermissoesUsuario(user?.id);

  if (!perms.has("admin.gerenciar")) {
    return (
      <>
        <PageHeader title="Administração" description="Usuários, grupos e permissões." />
        <EmptyState
          icon={ShieldAlert}
          title="Sem permissão"
          description="Apenas administradores podem gerenciar usuários, grupos e permissões."
        />
      </>
    );
  }

  const [usuarios, grupos, permissoes] = await Promise.all([
    getUsuarios(),
    getGrupos(),
    getPermissoes(),
  ]);

  const usuariosView: UsuarioItem[] = usuarios.map((u) => ({
    id: u.id,
    nome: u.nome,
    email: u.email,
    cargo: u.cargo,
    role: u.role,
    ativo: u.ativo,
    grupoIds: u.grupos.map((g) => g.id),
    grupoNomes: u.grupos.map((g) => g.nome),
  }));
  const gruposView: GrupoItem[] = grupos.map((g) => ({
    id: g.id,
    nome: g.nome,
    descricao: g.descricao,
    membros: g._count.usuarios,
    permissaoIds: g.permissoes.map((p) => p.id),
  }));
  const permissoesView = permissoes.map((p) => ({ id: p.id, chave: p.chave, descricao: p.descricao }));

  return (
    <>
      <PageHeader
        title="Administração"
        description="Usuários, grupos e permissões (mapeados do Active Directory)."
      />
      <AdminManager usuarios={usuariosView} grupos={gruposView} permissoes={permissoesView} />
    </>
  );
}
