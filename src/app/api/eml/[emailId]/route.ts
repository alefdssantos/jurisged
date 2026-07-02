import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { lerArquivo, existeArquivo } from "@/lib/storage";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ emailId: string }> },
) {
  const user = await getSession();
  if (!user) return new NextResponse("Não autorizado", { status: 401 });

  const { emailId } = await params;
  const email = await prisma.email.findUnique({ where: { id: emailId } });
  if (!email || !email.emlPath || !(await existeArquivo(email.emlPath))) {
    return new NextResponse("Arquivo .eml não encontrado", { status: 404 });
  }

  const buf = await lerArquivo(email.emlPath);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "message/rfc822",
      "Content-Disposition": `attachment; filename="email-${emailId}.eml"`,
      "Content-Length": String(buf.length),
      "Cache-Control": "private, no-store",
    },
  });
}
