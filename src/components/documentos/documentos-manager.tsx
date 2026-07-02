"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, MoreHorizontal, Eye, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/empty-state";
import type { ActionState } from "@/lib/data/document-actions";
import * as actions from "@/lib/data/document-actions";

export interface DocItemView {
  id: string;
  nome: string;
  categoria: string | null;
  local: string;
  numeroVersao: number;
  totalVersoes: number;
  tamanhoFmt: string;
  criadoPor: string;
  dataFmt: string;
  tags: { nome: string }[];
}

type ServerAction = (prev: ActionState, fd: FormData) => Promise<ActionState>;
type Modal = { tipo: "upload" } | { tipo: "excluir"; doc: DocItemView } | null;

export function DocumentosManager({
  docs,
  pastas,
  categorias,
  podeEnviar,
  podeExcluir,
}: {
  docs: DocItemView[];
  pastas: { id: string; rotulo: string }[];
  categorias: { id: string; nome: string }[];
  podeEnviar: boolean;
  podeExcluir: boolean;
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [erro, setErro] = React.useState<string>();
  const [modal, setModalState] = React.useState<Modal>(null);

  const setModal = (m: Modal) => {
    setErro(undefined);
    setModalState(m);
  };

  function onSubmit(e: React.FormEvent<HTMLFormElement>, action: ServerAction, msgOk: string) {
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

  return (
    <div className="space-y-4">
      {podeEnviar ? (
        <div className="flex justify-end">
          <Button
            data-testid="enviar-documento"
            disabled={pastas.length === 0}
            onClick={() => setModal({ tipo: "upload" })}
          >
            <Upload className="size-4" />
            Enviar documento
          </Button>
        </div>
      ) : null}

      {docs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum documento"
          description="Envie um documento para uma pasta de processo."
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead className="hidden md:table-cell">Local</TableHead>
                <TableHead className="hidden sm:table-cell">Categoria</TableHead>
                <TableHead className="hidden lg:table-cell">Versão</TableHead>
                <TableHead className="hidden lg:table-cell">Tamanho</TableHead>
                <TableHead className="hidden xl:table-cell">Atualizado</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <Link href={`/documentos/${d.id}`} className="font-medium hover:underline">
                      {d.nome}
                    </Link>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {d.tags.map((t) => (
                        <Badge key={t.nome} variant="outline" className="text-[10px]">
                          {t.nome}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                    {d.local}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {d.categoria ? <Badge variant="secondary">{d.categoria}</Badge> : "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    v{d.numeroVersao}
                    {d.totalVersoes > 1 ? (
                      <span className="text-xs text-muted-foreground"> / {d.totalVersoes}</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">{d.tamanhoFmt}</TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground xl:table-cell">
                    {d.dataFmt}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" size="icon-sm" aria-label={`Ações de ${d.nome}`} />}
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuGroup>
                          <DropdownMenuItem render={<Link href={`/documentos/${d.id}`} />}>
                            <Eye className="size-4" /> Abrir
                          </DropdownMenuItem>
                          {podeExcluir ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onClick={() => setModal({ tipo: "excluir", doc: d })}>
                                <Trash2 className="size-4" /> Excluir
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={modal !== null} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent>
          {modal?.tipo === "upload" ? (
            <form onSubmit={(e) => onSubmit(e, actions.acaoUploadDocumento, "Documento enviado.")}>
              <DialogHeader>
                <DialogTitle>Enviar documento</DialogTitle>
                <DialogDescription>O arquivo é armazenado localmente (mock).</DialogDescription>
              </DialogHeader>
              <div className="my-4 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pastaId">Pasta de destino</Label>
                  <select id="pastaId" name="pastaId" required className={selectClass}>
                    {pastas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.rotulo}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="arquivo">Arquivo</Label>
                  <Input id="arquivo" name="arquivo" type="file" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nome">Nome (opcional — usa o do arquivo se vazio)</Label>
                  <Input id="nome" name="nome" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="categoriaId">Categoria (opcional)</Label>
                  <select id="categoriaId" name="categoriaId" className={selectClass} defaultValue="">
                    <option value="">— sem categoria —</option>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="descricao">Descrição (opcional)</Label>
                  <Textarea id="descricao" name="descricao" rows={2} />
                </div>
                {erro ? <p className="text-sm text-destructive" role="alert">{erro}</p> : null}
              </div>
              <DialogFooter>
                <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
                <Button type="submit" data-testid="salvar" disabled={pending}>
                  {pending ? "Enviando…" : "Enviar"}
                </Button>
              </DialogFooter>
            </form>
          ) : modal?.tipo === "excluir" ? (
            <form onSubmit={(e) => onSubmit(e, actions.acaoExcluirDocumento, "Documento excluído.")}>
              <input type="hidden" name="id" value={modal.doc.id} />
              <DialogHeader>
                <DialogTitle>Excluir documento</DialogTitle>
                <DialogDescription>
                  Excluir <strong>{modal.doc.nome}</strong> remove o arquivo e todas as versões.
                </DialogDescription>
              </DialogHeader>
              <div className="my-4">
                {erro ? <p className="text-sm text-destructive" role="alert">{erro}</p> : null}
              </div>
              <DialogFooter>
                <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
                <Button type="submit" data-testid="salvar" variant="destructive" disabled={pending}>
                  {pending ? "Excluindo…" : "Excluir"}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

const selectClass =
  "h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring";
