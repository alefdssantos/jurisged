"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Building2,
  Gavel,
  FolderClosed,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  FolderPlus,
  FilePlus2,
  FolderInput,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import type { ActionState } from "@/lib/data/tree-actions";
import * as actions from "@/lib/data/tree-actions";

export interface PastaItem {
  id: string;
  nome: string;
  parentId: string | null;
}
export interface ProcessoItem {
  id: string;
  titulo: string;
  numero: string | null;
  area: string | null;
  pastas: PastaItem[];
}
export interface ClienteItem {
  id: string;
  nome: string;
  documento: string | null;
  processos: ProcessoItem[];
}

type ServerAction = (prev: ActionState, fd: FormData) => Promise<ActionState>;

type Modal =
  | { tipo: "novo-cliente" }
  | { tipo: "editar-cliente"; cliente: ClienteItem }
  | { tipo: "excluir-cliente"; cliente: ClienteItem }
  | { tipo: "novo-processo"; cliente: ClienteItem }
  | { tipo: "editar-processo"; processo: ProcessoItem }
  | { tipo: "excluir-processo"; processo: ProcessoItem }
  | { tipo: "nova-pasta"; processo: ProcessoItem; parentId: string | null }
  | { tipo: "editar-pasta"; pasta: PastaItem }
  | { tipo: "mover-pasta"; processo: ProcessoItem; pasta: PastaItem }
  | { tipo: "excluir-pasta"; pasta: PastaItem }
  | null;

function pastasOrdenadas(pastas: PastaItem[]): { pasta: PastaItem; depth: number }[] {
  const porPai = new Map<string | null, PastaItem[]>();
  for (const p of pastas) {
    const a = porPai.get(p.parentId) ?? [];
    a.push(p);
    porPai.set(p.parentId, a);
  }
  const out: { pasta: PastaItem; depth: number }[] = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const p of porPai.get(parentId) ?? []) {
      out.push({ pasta: p, depth });
      walk(p.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

function descendentes(pastas: PastaItem[], raizId: string): Set<string> {
  const porPai = new Map<string | null, PastaItem[]>();
  for (const p of pastas) {
    const a = porPai.get(p.parentId) ?? [];
    a.push(p);
    porPai.set(p.parentId, a);
  }
  const set = new Set<string>();
  const walk = (id: string) => {
    for (const c of porPai.get(id) ?? []) {
      set.add(c.id);
      walk(c.id);
    }
  };
  walk(raizId);
  return set;
}

export function ClientesManager({
  clientes,
  selecionadoId,
  podeGerenciar,
}: {
  clientes: ClienteItem[];
  selecionadoId?: string;
  podeGerenciar: boolean;
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [erro, setErro] = React.useState<string>();
  const [modal, setModalState] = React.useState<Modal>(null);

  const setModal = React.useCallback((m: Modal) => {
    setErro(undefined);
    setModalState(m);
  }, []);

  function onSubmit(
    e: React.FormEvent<HTMLFormElement>,
    action: ServerAction,
    msgOk: string,
  ) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await action({ ok: false }, fd);
      if (res.ok) {
        toast.success(msgOk);
        setModal(null);
        router.refresh();
      } else {
        setErro(res.message ?? "Erro inesperado.");
      }
    });
  }

  const destaque = (id: string) =>
    id === selecionadoId ? "ring-2 ring-brand/40" : "";

  return (
    <div className="space-y-4">
      {podeGerenciar ? (
        <div className="flex justify-end">
          <Button data-testid="novo-cliente" onClick={() => setModal({ tipo: "novo-cliente" })}>
            <Plus className="size-4" />
            Novo cliente
          </Button>
        </div>
      ) : null}

      {clientes.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Nenhum cliente cadastrado"
          description="Crie o primeiro cliente para montar a estrutura Cliente → Processo → Pasta."
          action={
            podeGerenciar ? (
              <Button onClick={() => setModal({ tipo: "novo-cliente" })}>
                <Plus className="size-4" />
                Novo cliente
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {clientes.map((cli) => (
            <Card key={cli.id} className={cn("gap-0 py-0", destaque(cli.id))}>
              <CardHeader className="flex flex-row items-center gap-3 border-b p-4">
                <div className="flex size-9 items-center justify-center rounded-md bg-brand/10 text-brand">
                  <Building2 className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{cli.nome}</div>
                  {cli.documento ? (
                    <div className="truncate text-xs text-muted-foreground">{cli.documento}</div>
                  ) : null}
                </div>
                <Badge variant="secondary">{cli.processos.length} processo(s)</Badge>
                {podeGerenciar ? (
                  <AcoesMenu rotulo={`Ações do cliente ${cli.nome}`}>
                    <DropdownMenuItem onClick={() => setModal({ tipo: "novo-processo", cliente: cli })}>
                      <FilePlus2 className="size-4" /> Novo processo
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setModal({ tipo: "editar-cliente", cliente: cli })}>
                      <Pencil className="size-4" /> Renomear
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => setModal({ tipo: "excluir-cliente", cliente: cli })}>
                      <Trash2 className="size-4" /> Excluir
                    </DropdownMenuItem>
                  </AcoesMenu>
                ) : null}
              </CardHeader>

              <CardContent className="p-0">
                {cli.processos.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">Sem processos.</p>
                ) : (
                  <ul className="divide-y">
                    {cli.processos.map((proc) => (
                      <li key={proc.id} className={cn("p-4", destaque(proc.id))}>
                        <div className="flex items-center gap-2">
                          <Gavel className="size-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{proc.titulo}</div>
                            <div className="truncate text-xs text-muted-foreground">
                              {[proc.numero, proc.area].filter(Boolean).join(" · ") || "—"}
                            </div>
                          </div>
                          {podeGerenciar ? (
                            <AcoesMenu rotulo={`Ações do processo ${proc.titulo}`}>
                              <DropdownMenuItem onClick={() => setModal({ tipo: "nova-pasta", processo: proc, parentId: null })}>
                                <FolderPlus className="size-4" /> Nova pasta
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setModal({ tipo: "editar-processo", processo: proc })}>
                                <Pencil className="size-4" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onClick={() => setModal({ tipo: "excluir-processo", processo: proc })}>
                                <Trash2 className="size-4" /> Excluir
                              </DropdownMenuItem>
                            </AcoesMenu>
                          ) : null}
                        </div>

                        {proc.pastas.length > 0 ? (
                          <ul className="mt-2 space-y-1">
                            {pastasOrdenadas(proc.pastas).map(({ pasta, depth }) => (
                              <li
                                key={pasta.id}
                                className={cn("flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted/60", destaque(pasta.id))}
                                style={{ marginLeft: depth * 16 }}
                              >
                                <FolderClosed className="size-4 shrink-0 text-muted-foreground" />
                                <span className="flex-1 truncate text-sm">{pasta.nome}</span>
                                {podeGerenciar ? (
                                  <AcoesMenu rotulo={`Ações da pasta ${pasta.nome}`} pequeno>
                                    <DropdownMenuItem onClick={() => setModal({ tipo: "nova-pasta", processo: proc, parentId: pasta.id })}>
                                      <FolderPlus className="size-4" /> Nova subpasta
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setModal({ tipo: "editar-pasta", pasta })}>
                                      <Pencil className="size-4" /> Renomear
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setModal({ tipo: "mover-pasta", processo: proc, pasta })}>
                                      <FolderInput className="size-4" /> Mover
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem variant="destructive" onClick={() => setModal({ tipo: "excluir-pasta", pasta })}>
                                      <Trash2 className="size-4" /> Excluir
                                    </DropdownMenuItem>
                                  </AcoesMenu>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 pl-6 text-xs text-muted-foreground">Sem pastas.</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={modal !== null} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent>{modal ? renderModal(modal) : null}</DialogContent>
      </Dialog>
    </div>
  );

  function renderModal(m: NonNullable<Modal>) {
    const erroBox = erro ? (
      <p className="text-sm text-destructive" role="alert">
        {erro}
      </p>
    ) : null;

    const rodape = (label: string, variant?: "destructive") => (
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
        <Button type="submit" data-testid="salvar" disabled={pending} variant={variant === "destructive" ? "destructive" : "default"}>
          {pending ? "Processando…" : label}
        </Button>
      </DialogFooter>
    );

    switch (m.tipo) {
      case "novo-cliente":
        return (
          <form onSubmit={(e) => onSubmit(e, actions.acaoCriarCliente, "Cliente criado.")}>
            <DialogHeader>
              <DialogTitle>Novo cliente</DialogTitle>
              <DialogDescription>Cadastre um novo cliente do escritório.</DialogDescription>
            </DialogHeader>
            <div className="my-4 space-y-3">
              <Campo label="Nome" name="nome" autoFocus required />
              <Campo label="CNPJ/CPF (opcional)" name="documento" />
              {erroBox}
            </div>
            {rodape("Criar cliente")}
          </form>
        );

      case "editar-cliente":
        return (
          <form onSubmit={(e) => onSubmit(e, actions.acaoRenomearCliente, "Cliente atualizado.")}>
            <input type="hidden" name="id" value={m.cliente.id} />
            <DialogHeader>
              <DialogTitle>Renomear cliente</DialogTitle>
            </DialogHeader>
            <div className="my-4 space-y-3">
              <Campo label="Nome" name="nome" defaultValue={m.cliente.nome} autoFocus required />
              {erroBox}
            </div>
            {rodape("Salvar")}
          </form>
        );

      case "excluir-cliente":
        return (
          <form onSubmit={(e) => onSubmit(e, actions.acaoExcluirCliente, "Cliente excluído.")}>
            <input type="hidden" name="id" value={m.cliente.id} />
            <DialogHeader>
              <DialogTitle>Excluir cliente</DialogTitle>
              <DialogDescription>
                Excluir <strong>{m.cliente.nome}</strong> remove também seus processos e pastas. Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <div className="my-4">{erroBox}</div>
            {rodape("Excluir", "destructive")}
          </form>
        );

      case "novo-processo":
        return (
          <form onSubmit={(e) => onSubmit(e, actions.acaoCriarProcesso, "Processo criado.")}>
            <input type="hidden" name="clienteId" value={m.cliente.id} />
            <DialogHeader>
              <DialogTitle>Novo processo</DialogTitle>
              <DialogDescription>Cliente: {m.cliente.nome}</DialogDescription>
            </DialogHeader>
            <div className="my-4 space-y-3">
              <Campo label="Título" name="titulo" autoFocus required />
              <Campo label="Número do processo (opcional)" name="numero" />
              <Campo label="Área (opcional)" name="area" placeholder="Trabalhista, Cível…" />
              {erroBox}
            </div>
            {rodape("Criar processo")}
          </form>
        );

      case "editar-processo":
        return (
          <form onSubmit={(e) => onSubmit(e, actions.acaoRenomearProcesso, "Processo atualizado.")}>
            <input type="hidden" name="id" value={m.processo.id} />
            <DialogHeader>
              <DialogTitle>Editar processo</DialogTitle>
            </DialogHeader>
            <div className="my-4 space-y-3">
              <Campo label="Título" name="titulo" defaultValue={m.processo.titulo} autoFocus required />
              <Campo label="Número" name="numero" defaultValue={m.processo.numero ?? ""} />
              <Campo label="Área" name="area" defaultValue={m.processo.area ?? ""} />
              {erroBox}
            </div>
            {rodape("Salvar")}
          </form>
        );

      case "excluir-processo":
        return (
          <form onSubmit={(e) => onSubmit(e, actions.acaoExcluirProcesso, "Processo excluído.")}>
            <input type="hidden" name="id" value={m.processo.id} />
            <DialogHeader>
              <DialogTitle>Excluir processo</DialogTitle>
              <DialogDescription>
                Excluir <strong>{m.processo.titulo}</strong> remove também suas pastas.
              </DialogDescription>
            </DialogHeader>
            <div className="my-4">{erroBox}</div>
            {rodape("Excluir", "destructive")}
          </form>
        );

      case "nova-pasta":
        return (
          <form onSubmit={(e) => onSubmit(e, actions.acaoCriarPasta, "Pasta criada.")}>
            <input type="hidden" name="processoId" value={m.processo.id} />
            <input type="hidden" name="parentId" value={m.parentId ?? ""} />
            <DialogHeader>
              <DialogTitle>{m.parentId ? "Nova subpasta" : "Nova pasta"}</DialogTitle>
              <DialogDescription>Processo: {m.processo.titulo}</DialogDescription>
            </DialogHeader>
            <div className="my-4 space-y-3">
              <Campo label="Nome" name="nome" autoFocus required />
              {erroBox}
            </div>
            {rodape("Criar pasta")}
          </form>
        );

      case "editar-pasta":
        return (
          <form onSubmit={(e) => onSubmit(e, actions.acaoRenomearPasta, "Pasta renomeada.")}>
            <input type="hidden" name="id" value={m.pasta.id} />
            <DialogHeader>
              <DialogTitle>Renomear pasta</DialogTitle>
            </DialogHeader>
            <div className="my-4 space-y-3">
              <Campo label="Nome" name="nome" defaultValue={m.pasta.nome} autoFocus required />
              {erroBox}
            </div>
            {rodape("Salvar")}
          </form>
        );

      case "mover-pasta": {
        const bloqueados = descendentes(m.processo.pastas, m.pasta.id);
        const opcoes = m.processo.pastas.filter((p) => p.id !== m.pasta.id && !bloqueados.has(p.id));
        return (
          <form onSubmit={(e) => onSubmit(e, actions.acaoMoverPasta, "Pasta movida.")}>
            <input type="hidden" name="id" value={m.pasta.id} />
            <DialogHeader>
              <DialogTitle>Mover pasta</DialogTitle>
              <DialogDescription>Mover “{m.pasta.nome}” para:</DialogDescription>
            </DialogHeader>
            <div className="my-4 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="novoParentId">Destino</Label>
                <select
                  id="novoParentId"
                  name="novoParentId"
                  defaultValue={m.pasta.parentId ?? ""}
                  className="h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Raiz do processo</option>
                  {opcoes.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nome}
                    </option>
                  ))}
                </select>
              </div>
              {erroBox}
            </div>
            {rodape("Mover")}
          </form>
        );
      }

      case "excluir-pasta":
        return (
          <form onSubmit={(e) => onSubmit(e, actions.acaoExcluirPasta, "Pasta excluída.")}>
            <input type="hidden" name="id" value={m.pasta.id} />
            <DialogHeader>
              <DialogTitle>Excluir pasta</DialogTitle>
              <DialogDescription>
                Excluir <strong>{m.pasta.nome}</strong> remove também suas subpastas.
              </DialogDescription>
            </DialogHeader>
            <div className="my-4">{erroBox}</div>
            {rodape("Excluir", "destructive")}
          </form>
        );
    }
  }
}

function AcoesMenu({
  rotulo,
  children,
  pequeno,
}: {
  rotulo: string;
  children: React.ReactNode;
  pequeno?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size={pequeno ? "icon-sm" : "icon"}
            aria-label={rotulo}
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuGroup>{children}</DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Campo({
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
