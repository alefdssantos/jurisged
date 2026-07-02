import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { lerArquivo, existeArquivo } from "@/lib/storage";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ anexoId: string }> },
) {
  const user = await getSession();
  if (!user) return new NextResponse("Não autorizado", { status: 401 });

  const { anexoId } = await params;
  const anexo = await prisma.anexo.findUnique({ where: { id: anexoId } });
  if (!anexo || !(await existeArquivo(anexo.storagePath))) {
    return new NextResponse("Anexo não encontrado", { status: 404 });
  }

  const buf = await lerArquivo(anexo.storagePath);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": anexo.mimeType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${encodeURIComponent(anexo.nome)}"`,
      "Content-Length": String(buf.length),
      "Cache-Control": "private, no-store",
    },
  });
}
