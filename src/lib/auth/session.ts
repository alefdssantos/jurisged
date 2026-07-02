import { cookies } from "next/headers";
import { getUserById, type MockUser } from "./mock-users";

export const SESSION_COOKIE = "ged_session";

/** Lê a sessão mock a partir do cookie (servidor). */
export async function getSession(): Promise<MockUser | null> {
  const store = await cookies();
  return getUserById(store.get(SESSION_COOKIE)?.value);
}
