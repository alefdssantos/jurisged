import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getPermissoesUsuario } from "@/lib/auth/permissions";
import { getTree } from "@/lib/data/tree";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  const [tree, perms] = await Promise.all([getTree(), getPermissoesUsuario(user.id)]);
  const mostrarAuditoria = perms.has("admin.gerenciar");

  return (
    <SidebarProvider>
      <AppSidebar tree={tree} mostrarAuditoria={mostrarAuditoria} />
      <SidebarInset>
        <AppTopbar user={user} />
        <div className="flex-1 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
