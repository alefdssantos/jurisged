"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { acaoSalvarClassificacao, type ActionState } from "@/lib/data/metadata-actions";

interface Campo {
  id: string;
  nome: string;
  tipo: string;
  opcoes: string | null;
}

const selectClass =
  "h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ClassificacaoEditor({
  documentoId,
  categoriaIdAtual,
  tagIdsAtuais,
  metadadosAtuais,
  categorias,
  tags,
  campos,
}: {
  documentoId: string;
  categoriaIdAtual: string | null;
  tagIdsAtuais: string[];
  metadadosAtuais: { campoId: string; valor: string }[];
  categorias: { id: string; nome: string }[];
  tags: { id: string; nome: string }[];
  campos: Campo[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [erro, setErro] = React.useState<string>();
  const [pending, start] = React.useTransition();

  const metaMap = new Map(metadadosAtuais.map((m) => [m.campoId, m.valor]));

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res: ActionState = await acaoSalvarClassificacao({ ok: false }, fd);
      if (res.ok) {
        toast.success("Classificação salva.");
        setOpen(false);
        setErro(undefined);
        router.refresh();
      } else {
        setErro(res.message ?? "Erro.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setErro(undefined); }}>
      <Button
        variant="outline"
        size="sm"
        data-testid="editar-classificacao"
        onClick={() => setOpen(true)}
      >
        <Tags className="size-4" /> Editar classificação
      </Button>

      <DialogContent className="sm:max-w-md">
        {open ? (
        <form onSubmit={onSubmit}>
          <input type="hidden" name="documentoId" value={documentoId} />
          <input type="hidden" name="campoIds" value={campos.map((c) => c.id).join(",")} />
          <DialogHeader>
            <DialogTitle>Editar classificação</DialogTitle>
            <DialogDescription>Categoria, tags e campos personalizados.</DialogDescription>
          </DialogHeader>

          <div className="my-4 max-h-[60vh] space-y-4 overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label htmlFor="categoriaId">Categoria</Label>
              <select id="categoriaId" name="categoriaId" className={selectClass} defaultValue={categoriaIdAtual ?? ""}>
                <option value="">— sem categoria —</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Tags</legend>
              <div className="grid grid-cols-2 gap-1.5">
                {tags.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="tagIds"
                      value={t.id}
                      defaultChecked={tagIdsAtuais.includes(t.id)}
                      className="size-4 rounded border"
                    />
                    {t.nome}
                  </label>
                ))}
              </div>
            </fieldset>

            {campos.length > 0 ? (
              <fieldset className="space-y-3">
                <legend className="text-sm font-medium">Campos personalizados</legend>
                {campos.map((campo) => (
                  <CampoInput key={campo.id} campo={campo} valor={metaMap.get(campo.id) ?? ""} />
                ))}
              </fieldset>
            ) : null}

            {erro ? <p className="text-sm text-destructive" role="alert">{erro}</p> : null}
          </div>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
            <Button type="submit" data-testid="salvar" disabled={pending}>
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CampoInput({ campo, valor }: { campo: Campo; valor: string }) {
  const name = `meta_${campo.id}`;
  const opcoes: string[] = campo.tipo === "LISTA" ? safeParse(campo.opcoes) : [];

  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{campo.nome}</Label>
      {campo.tipo === "LISTA" ? (
        <select id={name} name={name} className={selectClass} defaultValue={valor}>
          <option value="">—</option>
          {opcoes.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : campo.tipo === "BOOLEANO" ? (
        <select id={name} name={name} className={selectClass} defaultValue={valor}>
          <option value="">—</option>
          <option value="true">Sim</option>
          <option value="false">Não</option>
        </select>
      ) : (
        <Input
          id={name}
          name={name}
          type={campo.tipo === "NUMERO" ? "number" : campo.tipo === "DATA" ? "date" : "text"}
          step={campo.tipo === "NUMERO" ? "any" : undefined}
          defaultValue={valor}
        />
      )}
    </div>
  );
}

function safeParse(s: string | null): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}
