import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getVersao } from "@/lib/data/document-service";
import { lerArquivo, existeArquivo } from "@/lib/storage";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ versaoId: string }> },
) {
  const user = await getSession();
  if (!user) return new NextResponse("Não autorizado", { status: 401 });

  const { versaoId } = await params;
  const versao = await getVersao(versaoId);
  if (!versao || !versao.storagePath || !(await existeArquivo(versao.storagePath))) {
    return new NextResponse("Arquivo não encontrado", { status: 404 });
  }

  const buf = await lerArquivo(versao.storagePath);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": versao.mimeType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${encodeURIComponent(versao.nomeArquivo)}"`,
      "Content-Length": String(buf.length),
      "Cache-Control": "private, no-store",
    },
  });
}
