"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mail, MailPlus, MoreHorizontal, Eye, Trash2, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { ActionState } from "@/lib/data/email-actions";
import * as actions from "@/lib/data/email-actions";

export interface EmailItemView {
  id: string;
  assunto: string;
  remetente: string;
  dataFmt: string;
  local: string;
  anexos: number;
}

type ServerAction = (prev: ActionState, fd: FormData) => Promise<ActionState>;
type Modal = { tipo: "arquivar" } | { tipo: "excluir"; email: EmailItemView } | null;

const selectClass =
  "h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function EmailsManager({
  emails,
  pastas,
  tags,
  podeArquivar,
}: {
  emails: EmailItemView[];
  pastas: { id: string; rotulo: string }[];
  tags: { id: string; nome: string }[];
  podeArquivar: boolean;
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
      {podeArquivar ? (
        <div className="flex justify-end">
          <Button data-testid="arquivar-email" onClick={() => setModal({ tipo: "arquivar" })}>
            <MailPlus className="size-4" /> Arquivar e-mail
          </Button>
        </div>
      ) : null}

      {emails.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="Nenhum e-mail arquivado"
          description="Arquive um arquivo .eml — corpo, metadados e anexos são preservados."
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assunto</TableHead>
                <TableHead className="hidden md:table-cell">Remetente</TableHead>
                <TableHead className="hidden lg:table-cell">Local</TableHead>
                <TableHead className="hidden sm:table-cell">Data</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {emails.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <Link href={`/emails/${e.id}`} className="font-medium hover:underline">
                      {e.assunto}
                    </Link>
                    {e.anexos > 0 ? (
                      <span className="ml-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Paperclip className="size-3" /> {e.anexos}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                    {e.remetente}
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                    {e.local}
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                    {e.dataFmt}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" size="icon-sm" aria-label={`Ações do e-mail ${e.assunto}`} />}
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuGroup>
                          <DropdownMenuItem render={<Link href={`/emails/${e.id}`} />}>
                            <Eye className="size-4" /> Abrir
                          </DropdownMenuItem>
                          {podeArquivar ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onClick={() => setModal({ tipo: "excluir", email: e })}>
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
          {modal?.tipo === "arquivar" ? (
            <form onSubmit={(e) => onSubmit(e, actions.acaoArquivarEmail, "E-mail arquivado.")}>
              <DialogHeader>
                <DialogTitle>Arquivar e-mail (.eml)</DialogTitle>
                <DialogDescription>
                  Corpo, remetente, destinatários, data, assunto e anexos são preservados.
                </DialogDescription>
              </DialogHeader>
              <div className="my-4 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="eml">Arquivo .eml</Label>
                  <Input id="eml" name="eml" type="file" accept=".eml,message/rfc822" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pastaId">Pasta (vazio = classificar por remetente)</Label>
                  <select id="pastaId" name="pastaId" className={selectClass} defaultValue="">
                    <option value="">— classificar automaticamente —</option>
                    {pastas.map((p) => (
                      <option key={p.id} value={p.id}>{p.rotulo}</option>
                    ))}
                  </select>
                </div>
                {tags.length > 0 ? (
                  <fieldset className="space-y-1.5">
                    <legend className="text-sm font-medium">Tags (opcional)</legend>
                    <div className="grid grid-cols-2 gap-1.5">
                      {tags.map((t) => (
                        <label key={t.id} className="flex items-center gap-2 text-sm">
                          <input type="checkbox" name="tagIds" value={t.id} className="size-4 rounded border" />
                          {t.nome}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ) : null}
                {erro ? <p className="text-sm text-destructive" role="alert">{erro}</p> : null}
              </div>
              <DialogFooter>
                <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
                <Button type="submit" data-testid="salvar" disabled={pending}>
                  {pending ? "Arquivando…" : "Arquivar"}
                </Button>
              </DialogFooter>
            </form>
          ) : modal?.tipo === "excluir" ? (
            <form onSubmit={(e) => onSubmit(e, actions.acaoExcluirEmail, "E-mail excluído.")}>
              <input type="hidden" name="id" value={modal.email.id} />
              <DialogHeader>
                <DialogTitle>Excluir e-mail</DialogTitle>
                <DialogDescription>
                  Excluir <strong>{modal.email.assunto}</strong> remove o e-mail, seus anexos e o .eml.
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
