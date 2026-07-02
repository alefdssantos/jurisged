"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ShieldCheck, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ActionState } from "@/lib/data/admin-actions";
import * as actions from "@/lib/data/admin-actions";

export interface UsuarioItem {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  role: string;
  ativo: boolean;
  grupoIds: string[];
  grupoNomes: string[];
}
export interface GrupoItem {
  id: string;
  nome: string;
  descricao: string | null;
  membros: number;
  permissaoIds: string[];
}
export interface PermItem {
  id: string;
  chave: string;
  descricao: string;
}

type ServerAction = (prev: ActionState, fd: FormData) => Promise<ActionState>;
type Modal =
  | { tipo: "novo-grupo" }
  | { tipo: "editar-grupo"; grupo: GrupoItem }
  | { tipo: "excluir-grupo"; grupo: GrupoItem }
  | { tipo: "permissoes"; grupo: GrupoItem }
  | { tipo: "grupos-usuario"; usuario: UsuarioItem }
  | null;

export function AdminManager({
  usuarios,
  grupos,
  permissoes,
}: {
  usuarios: UsuarioItem[];
  grupos: GrupoItem[];
  permissoes: PermItem[];
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [erro, setErro] = React.useState<string>();
  const [modal, setModalState] = React.useState<Modal>(null);
  const setModal = (m: Modal) => {
    setErro(undefined);
    setModalState(m);
  };

  function run(action: ServerAction, fd: FormData, msgOk: string, fecharModal = true) {
    start(async () => {
      const res = await action({ ok: false }, fd);
      if (res.ok) {
        toast.success(msgOk);
        if (fecharModal) setModal(null);
        router.refresh();
      } else if (fecharModal) {
        setErro(res.message ?? "Erro.");
      } else {
        toast.error(res.message ?? "Erro.");
      }
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>, action: ServerAction, msgOk: string) {
    e.preventDefault();
    run(action, new FormData(e.currentTarget), msgOk);
  }

  return (
    <div className="space-y-6">
      {/* ---------- Usuários ---------- */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <UsersRound className="size-4" />
          <CardTitle className="text-sm">Usuários ({usuarios.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead className="hidden sm:table-cell">Papel</TableHead>
                <TableHead className="hidden md:table-cell">Grupos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-medium">{u.nome}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="secondary">{u.role}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {u.grupoNomes.map((g) => (
                        <Badge key={g} variant="outline" className="text-[10px]">{g}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        run(actions.acaoDefinirAtivoUsuario, new FormData(e.currentTarget), u.ativo ? "Usuário desativado." : "Usuário ativado.", false);
                      }}
                    >
                      <input type="hidden" name="usuarioId" value={u.id} />
                      <input type="hidden" name="ativo" value={u.ativo ? "false" : "true"} />
                      <Button
                        type="submit"
                        variant={u.ativo ? "secondary" : "outline"}
                        size="sm"
                        disabled={pending}
                        data-testid={`toggle-ativo-${u.id}`}
                      >
                        {u.ativo ? "Ativo" : "Inativo"}
                      </Button>
                    </form>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setModal({ tipo: "grupos-usuario", usuario: u })}
                    >
                      Grupos
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ---------- Grupos e permissões ---------- */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className="size-4" /> Grupos e permissões ({grupos.length})
          </CardTitle>
          <Button size="sm" data-testid="novo-grupo" onClick={() => setModal({ tipo: "novo-grupo" })}>
            <Plus className="size-4" /> Novo grupo
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {grupos.map((g) => (
            <div key={g.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="font-medium">{g.nome}</div>
                <div className="text-xs text-muted-foreground">
                  {g.descricao ?? "—"} · {g.membros} membro(s) · {g.permissaoIds.length} permissão(ões)
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="outline" size="sm" onClick={() => setModal({ tipo: "permissoes", grupo: g })}>
                  Permissões
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label={`Renomear ${g.nome}`} onClick={() => setModal({ tipo: "editar-grupo", grupo: g })}>
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label={`Excluir ${g.nome}`} onClick={() => setModal({ tipo: "excluir-grupo", grupo: g })}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={modal !== null} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent>{modal ? renderModal(modal) : null}</DialogContent>
      </Dialog>
    </div>
  );

  function renderModal(m: NonNullable<Modal>) {
    const erroBox = erro ? <p className="text-sm text-destructive" role="alert">{erro}</p> : null;
    const rodape = (label: string, variant?: "destructive") => (
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
        <Button type="submit" data-testid="salvar" disabled={pending} variant={variant === "destructive" ? "destructive" : "default"}>
          {pending ? "Processando…" : label}
        </Button>
      </DialogFooter>
    );

    switch (m.tipo) {
      case "novo-grupo":
        return (
          <form onSubmit={(e) => onSubmit(e, actions.acaoCriarGrupo, "Grupo criado.")}>
            <DialogHeader><DialogTitle>Novo grupo</DialogTitle></DialogHeader>
            <div className="my-4 space-y-3">
              <Field label="Nome" name="nome" autoFocus required />
              <Field label="Descrição (opcional)" name="descricao" />
              {erroBox}
            </div>
            {rodape("Criar")}
          </form>
        );
      case "editar-grupo":
        return (
          <form onSubmit={(e) => onSubmit(e, actions.acaoRenomearGrupo, "Grupo atualizado.")}>
            <input type="hidden" name="id" value={m.grupo.id} />
            <DialogHeader><DialogTitle>Renomear grupo</DialogTitle></DialogHeader>
            <div className="my-4 space-y-3">
              <Field label="Nome" name="nome" defaultValue={m.grupo.nome} autoFocus required />
              <Field label="Descrição" name="descricao" defaultValue={m.grupo.descricao ?? ""} />
              {erroBox}
            </div>
            {rodape("Salvar")}
          </form>
        );
      case "excluir-grupo":
        return (
          <form onSubmit={(e) => onSubmit(e, actions.acaoExcluirGrupo, "Grupo excluído.")}>
            <input type="hidden" name="id" value={m.grupo.id} />
            <DialogHeader>
              <DialogTitle>Excluir grupo</DialogTitle>
              <DialogDescription>Excluir <strong>{m.grupo.nome}</strong> remove o vínculo com usuários e permissões.</DialogDescription>
            </DialogHeader>
            <div className="my-4">{erroBox}</div>
            {rodape("Excluir", "destructive")}
          </form>
        );
      case "permissoes":
        return (
          <form onSubmit={(e) => onSubmit(e, actions.acaoDefinirPermissoesGrupo, "Permissões atualizadas.")}>
            <input type="hidden" name="grupoId" value={m.grupo.id} />
            <DialogHeader>
              <DialogTitle>Permissões — {m.grupo.nome}</DialogTitle>
              <DialogDescription>Marque as permissões do grupo.</DialogDescription>
            </DialogHeader>
            <div className="my-4 max-h-[55vh] space-y-2 overflow-y-auto">
              {permissoes.map((p) => (
                <label key={p.id} className="flex items-start gap-2 text-sm">
                  <input type="checkbox" name="permissaoIds" value={p.id} defaultChecked={m.grupo.permissaoIds.includes(p.id)} className="mt-0.5 size-4 rounded border" />
                  <span><span className="font-medium">{p.chave}</span> — <span className="text-muted-foreground">{p.descricao}</span></span>
                </label>
              ))}
              {erroBox}
            </div>
            {rodape("Salvar")}
          </form>
        );
      case "grupos-usuario":
        return (
          <form onSubmit={(e) => onSubmit(e, actions.acaoDefinirGruposUsuario, "Grupos do usuário atualizados.")}>
            <input type="hidden" name="usuarioId" value={m.usuario.id} />
            <DialogHeader>
              <DialogTitle>Grupos — {m.usuario.nome}</DialogTitle>
              <DialogDescription>Define os grupos do usuário (origem das permissões).</DialogDescription>
            </DialogHeader>
            <div className="my-4 space-y-2">
              {grupos.map((g) => (
                <label key={g.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="grupoIds" value={g.id} defaultChecked={m.usuario.grupoIds.includes(g.id)} className="size-4 rounded border" />
                  {g.nome}
                </label>
              ))}
              {erroBox}
            </div>
            {rodape("Salvar")}
          </form>
        );
    }
  }
}

function Field({
  label,
  name,
  ...props
}: { label: string; name: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...props} />
    </div>
  );
}
