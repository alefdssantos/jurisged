import { describe, it, expect } from "vitest";
import { MOCK_USERS, getUserById, ROLE_LABEL, type Role } from "./mock-users";

describe("mock-users", () => {
  it("retorna o usuário correto por id", () => {
    const u = getUserById("bruno.costa");
    expect(u).not.toBeNull();
    expect(u?.nome).toBe("Bruno Costa");
    expect(u?.role).toBe("ADVOGADO");
  });

  it("retorna null para id inexistente, vazio ou nulo", () => {
    expect(getUserById("nao-existe")).toBeNull();
    expect(getUserById("")).toBeNull();
    expect(getUserById(undefined)).toBeNull();
    expect(getUserById(null)).toBeNull();
  });

  it("todos os usuários têm campos obrigatórios e grupos", () => {
    for (const u of MOCK_USERS) {
      expect(u.id).toBeTruthy();
      expect(u.nome).toBeTruthy();
      expect(u.email).toContain("@");
      expect(u.iniciais).toHaveLength(2);
      expect(u.grupos.length).toBeGreaterThan(0);
    }
  });

  it("ROLE_LABEL cobre todas as roles usadas", () => {
    const roles = new Set<Role>(MOCK_USERS.map((u) => u.role));
    for (const r of roles) {
      expect(ROLE_LABEL[r]).toBeTruthy();
    }
  });

  it("não há ids duplicados", () => {
    const ids = MOCK_USERS.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
