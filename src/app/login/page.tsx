import { Scale } from "lucide-react";
import { MOCK_USERS, ROLE_LABEL } from "@/lib/auth/mock-users";
import { loginAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function LoginPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-brand text-brand-foreground">
            <Scale className="size-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">JurisGED</h1>
          <p className="text-sm text-muted-foreground">
            Gestão Eletrônica de Documentos — ambiente de demonstração
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="mb-3 text-sm font-medium">
            Entrar como (usuários simulados do Active Directory):
          </p>
          <ul className="flex flex-col gap-2">
            {MOCK_USERS.map((u) => (
              <li key={u.id}>
                <form action={loginAction} autoComplete="off">
                  <input
                    type="hidden"
                    name="userId"
                    value={u.id}
                    suppressHydrationWarning
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    data-testid={`login-${u.id}`}
                    className="h-auto w-full justify-between py-2.5"
                  >
                    <span className="flex flex-col items-start">
                      <span className="font-medium">{u.nome}</span>
                      <span className="text-xs text-muted-foreground">
                        {u.cargo}
                      </span>
                    </span>
                    <Badge variant="secondary">{ROLE_LABEL[u.role]}</Badge>
                  </Button>
                </form>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Sem senha — login simulado. Em produção: Active Directory (SSO).
          </p>
        </div>
      </div>
    </main>
  );
}
