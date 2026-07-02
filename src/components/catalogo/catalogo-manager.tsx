"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActionState } from "@/lib/data/metadata-actions";
import * as actions from "@/lib/data/metadata-actions";

type ServerAction = (prev: ActionState, fd: FormData) => Promise<ActionState>;

interface Item {
  id: string;
  nome: string;
}
interface Campo extends Item {
  tipo: string;
}

const selectClass =
  "h-9 rounded-md border bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function CatalogoManager({
  categorias,
  tags,
  campos,
}: {
  categorias: Item[];
  tags: Item[];
  campos: Campo[];
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  function executar(action: ServerAction, fd: FormData, msgOk: string, form?: HTMLFormElement) {
    start(async () => {
      const res = await action({ ok: false }, fd);
      if (res.ok) {
        toast.success(msgOk);
        form?.reset();
        router.refresh();
      } else {
        toast.error(res.message ?? "Erro.");
      }
    });
  }

  function ItemRow({ item, action, badge }: { item: Item; action: ServerAction; badge?: string }) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-sm">
        <span className="flex items-center gap-2">
          {item.nome}
          {badge ? <Badge variant="secondary" className="text-[10px]">{badge}</Badge> : null}
        </span>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            executar(action, fd, "Removido.");
          }}
        >
          <input type="hidden" name="id" value={item.id} />
          <Button type="submit" variant="ghost" size="icon-sm" disabled={pending} aria-label={`Remover ${item.nome}`}>
            <X className="size-4" />
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Categorias</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            {categorias.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma categoria.</p>
            ) : (
              categorias.map((c) => <ItemRow key={c.id} item={c} action={actions.acaoExcluirCategoria} />)
            )}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              executar(actions.acaoCriarCategoria, new FormData(e.currentTarget), "Categoria criada.", e.currentTarget);
            }}
          >
            <Input name="nome" placeholder="Nova categoria" required />
            <Button type="submit" size="icon" disabled={pending} aria-label="Adicionar categoria">
              <Plus className="size-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            {tags.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma tag.</p>
            ) : (
              tags.map((t) => <ItemRow key={t.id} item={t} action={actions.acaoExcluirTag} />)
            )}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              executar(actions.acaoCriarTag, new FormData(e.currentTarget), "Tag criada.", e.currentTarget);
            }}
          >
            <Input name="nome" placeholder="Nova tag" required />
            <Button type="submit" size="icon" disabled={pending} aria-label="Adicionar tag">
              <Plus className="size-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Campos personalizados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            {campos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum campo.</p>
            ) : (
              campos.map((c) => (
                <ItemRow key={c.id} item={c} action={actions.acaoExcluirCampo} badge={c.tipo} />
              ))
            )}
          </div>
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              executar(actions.acaoCriarCampo, new FormData(e.currentTarget), "Campo criado.", e.currentTarget);
            }}
          >
            <Input name="nome" placeholder="Nome do campo" required />
            <div className="flex gap-2">
              <select name="tipo" className={`${selectClass} flex-1`} defaultValue="TEXTO">
                <option value="TEXTO">Texto</option>
                <option value="NUMERO">Número</option>
                <option value="DATA">Data</option>
                <option value="BOOLEANO">Booleano</option>
                <option value="LISTA">Lista</option>
              </select>
              <Button type="submit" size="icon" disabled={pending} aria-label="Adicionar campo">
                <Plus className="size-4" />
              </Button>
            </div>
            <Input name="opcoes" placeholder="Opções da lista: a, b, c (só p/ tipo Lista)" />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
