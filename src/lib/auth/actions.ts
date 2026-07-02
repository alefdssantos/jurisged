"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserById } from "./mock-users";
import { SESSION_COOKIE } from "./session";
import { logAudit } from "@/lib/audit";

export async function loginAction(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  if (!getUserById(userId)) {
    redirect("/login?erro=usuario-invalido");
  }
  const store = await cookies();
  store.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  try {
    await logAudit({ usuarioId: userId, acao: "LOGIN", entidade: "Usuario", entidadeId: userId });
  } catch {
    // auditoria de login é best-effort (não bloqueia o login)
  }
  redirect("/dashboard");
}

export async function logoutAction() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
