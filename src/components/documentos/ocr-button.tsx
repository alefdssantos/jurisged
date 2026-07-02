"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ScanText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acaoExecutarOcr } from "@/lib/data/ocr-actions";

export function OcrButton({
  documentoId,
  versaoId,
}: {
  documentoId: string;
  versaoId: string;
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      data-testid="executar-ocr"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const fd = new FormData();
          fd.set("versaoId", versaoId);
          fd.set("documentoId", documentoId);
          const res = await acaoExecutarOcr({ ok: false }, fd);
          if (res.ok) {
            toast.success("OCR executado.");
            router.refresh();
          } else {
            toast.error(res.message ?? "Erro no OCR.");
          }
        })
      }
    >
      <ScanText className="size-4" /> {pending ? "Processando…" : "Executar OCR"}
    </Button>
  );
}
