"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Scale,
  LayoutDashboard,
  FileText,
  Mail,
  Search,
  Users,
  ChevronRight,
  Building2,
  Gavel,
  FolderClosed,
  ScrollText,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { TreeNode } from "@/lib/data/tree";

const NAV = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/documentos", label: "Documentos", icon: FileText },
  { href: "/emails", label: "E-mails", icon: Mail },
  { href: "/busca", label: "Busca", icon: Search },
  { href: "/clientes", label: "Clientes & Processos", icon: Users },
] as const;

const branchTriggerClass =
  "flex h-7 w-full items-center gap-2 overflow-hidden rounded-md px-2 text-sm text-sidebar-foreground outline-hidden ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0";

function NodeIcon({ tipo }: { tipo: TreeNode["tipo"] }) {
  if (tipo === "cliente") return <Building2 />;
  if (tipo === "processo") return <Gavel />;
  return <FolderClosed />;
}

function TreeBranch({ node }: { node: TreeNode }) {
  const [open, setOpen] = React.useState(node.tipo === "cliente");
  const href = node.href;

  if (!node.filhos?.length) {
    return (
      <SidebarMenuSubItem>
        <SidebarMenuSubButton render={<Link href={href} />}>
          <NodeIcon tipo={node.tipo} />
          <span className="truncate">{node.nome}</span>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <SidebarMenuSubItem>
        <CollapsibleTrigger className={branchTriggerClass}>
          <ChevronRight
            className={cn("transition-transform", open && "rotate-90")}
          />
          <NodeIcon tipo={node.tipo} />
          <span className="truncate">{node.nome}</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {node.filhos.map((child) => (
              <TreeBranch key={child.id} node={child} />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuSubItem>
    </Collapsible>
  );
}

export function AppSidebar({
  tree,
  mostrarAuditoria,
}: {
  tree: TreeNode[];
  mostrarAuditoria: boolean;
}) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/dashboard" />}
              tooltip="JurisGED"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand text-brand-foreground">
                <Scale className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">JurisGED</span>
                <span className="text-xs text-muted-foreground">
                  GED Jurídico
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={active}
                      tooltip={item.label}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              {mostrarAuditoria ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link href="/auditoria" />}
                    isActive={pathname.startsWith("/auditoria")}
                    tooltip="Auditoria"
                  >
                    <ScrollText />
                    <span>Auditoria</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Pastas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuSub>
                {tree.length === 0 ? (
                  <SidebarMenuSubItem>
                    <span className="px-2 py-1 text-xs text-muted-foreground">
                      Nenhum cliente cadastrado.
                    </span>
                  </SidebarMenuSubItem>
                ) : (
                  tree.map((node) => <TreeBranch key={node.id} node={node} />)
                )}
              </SidebarMenuSub>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
