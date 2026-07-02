"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, Download, RotateCcw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  acaoNovaVersao,
  acaoRestaurarVersao,
  type ActionState,
} from "@/lib/data/version-actions";

type ServerAction = (prev: ActionState, fd: FormData) => Promise<ActionState>;

export interface VersaoView {
  id: string;
  numero: number;
  tamanhoFmt: string;
  criadoPor: string;
  dataFmt: string;
  atual: boolean;
  nomeArquivo: string;
  comentario: string | null;
}

export function VersoesPanel({
  documentoId,
  versoes,
  podeEscrever,
}: {
  documentoId: string;
  versoes: VersaoView[];
  podeEscrever: boolean;
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [open, setOpen] = React.useState(false);
  const [erro, setErro] = React.useState<string>();

  function exec(action: ServerAction, fd: FormData, msgOk: string, after?: () => void) {
    start(async () => {
      const res = await action({ ok: false }, fd);
      if (res.ok) {
        toast.success(msgOk);
        setErro(undefined);
        after?.();
        router.refresh();
      } else {
        setErro(res.message ?? "Erro inesperado.");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm">Versões ({versoes.length})</CardTitle>
        {podeEscrever ? (
          <Button variant="outline" size="sm" data-testid="nova-versao" onClick={() => setOpen(true)}>
            <Upload className="size-4" /> Nova versão
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {versoes.map((v) => (
          <div key={v.id} className="flex items-start justify-between gap-2 text-sm">
            <div className="min-w-0">
              <span className="font-medium">v{v.numero}</span>{" "}
              <span className="text-muted-foreground">{v.tamanhoFmt}</span>
              <div className="truncate text-xs text-muted-foreground">
                {v.criadoPor} · {v.dataFmt}
              </div>
              {v.comentario ? (
                <div className="text-xs text-muted-foreground italic">“{v.comentario}”</div>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {v.atual ? (
                <Badge variant="secondary">atual</Badge>
              ) : podeEscrever ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    exec(acaoRestaurarVersao, new FormData(e.currentTarget), `Versão v${v.numero} restaurada.`);
                  }}
                >
                  <input type="hidden" name="documentoId" value={documentoId} />
                  <input type="hidden" name="versaoId" value={v.id} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon-sm"
                    disabled={pending}
                    aria-label={`Tornar v${v.numero} a versão atual`}
                    title="Tornar atual"
                  >
                    <RotateCcw className="size-4" />
                  </Button>
                </form>
              ) : null}
              <a
                href={`/api/arquivo/${v.id}`}
                download={v.nomeArquivo}
                className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                aria-label={`Baixar v${v.numero}`}
                title="Baixar versão"
              >
                <Download className="size-4" />
              </a>
            </div>
          </div>
        ))}
      </CardContent>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setErro(undefined); }}>
        <DialogContent>
          {open ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                exec(acaoNovaVersao, new FormData(e.currentTarget), "Nova versão enviada.", () => setOpen(false));
              }}
            >
              <input type="hidden" name="documentoId" value={documentoId} />
              <DialogHeader>
                <DialogTitle>Nova versão</DialogTitle>
                <DialogDescription>Envia um novo arquivo como versão atual do documento.</DialogDescription>
              </DialogHeader>
              <div className="my-4 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="arquivo-versao">Arquivo</Label>
                  <Input id="arquivo-versao" name="arquivo" type="file" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="comentario-versao">Comentário (opcional)</Label>
                  <Textarea id="comentario-versao" name="comentario" rows={2} />
                </div>
                {erro ? <p className="text-sm text-destructive" role="alert">{erro}</p> : null}
              </div>
              <DialogFooter>
                <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
                <Button type="submit" data-testid="salvar" disabled={pending}>
                  {pending ? "Enviando…" : "Enviar versão"}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
