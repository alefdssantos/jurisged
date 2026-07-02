export type Role = "ADMIN" | "ADVOGADO" | "SECRETARIA" | "TI";

export interface MockUser {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  role: Role;
  /** Grupos no estilo Active Directory — base para RBAC (F8). */
  grupos: string[];
  iniciais: string;
}

/**
 * Usuários mock simulando contas vindas do Active Directory.
 * Em produção, virão de LDAP/AD (ver doc de integração — F8). Nenhuma senha real.
 */
export const MOCK_USERS: MockUser[] = [
  {
    id: "ana.silva",
    nome: "Ana Silva",
    email: "ana.silva@exemplo.adv.br",
    cargo: "Sócia",
    role: "ADMIN",
    grupos: ["Sócios", "Advogados"],
    iniciais: "AS",
  },
  {
    id: "bruno.costa",
    nome: "Bruno Costa",
    email: "bruno.costa@exemplo.adv.br",
    cargo: "Advogado",
    role: "ADVOGADO",
    grupos: ["Advogados"],
    iniciais: "BC",
  },
  {
    id: "carla.dias",
    nome: "Carla Dias",
    email: "carla.dias@exemplo.adv.br",
    cargo: "Secretária",
    role: "SECRETARIA",
    grupos: ["Secretaria"],
    iniciais: "CD",
  },
  {
    id: "diego.alves",
    nome: "Diego Alves",
    email: "diego.alves@exemplo.adv.br",
    cargo: "TI / Administrador",
    role: "TI",
    grupos: ["TI"],
    iniciais: "DA",
  },
];

export function getUserById(id: string | undefined | null): MockUser | null {
  if (!id) return null;
  return MOCK_USERS.find((u) => u.id === id) ?? null;
}

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrador",
  ADVOGADO: "Advogado",
  SECRETARIA: "Secretaria",
  TI: "TI",
};
