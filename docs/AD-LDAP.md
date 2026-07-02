# Integração com Active Directory / LDAP

Guia técnico para acoplar **autenticação e autorização reais** contra Active Directory (AD) / LDAP a este app (Node.js + Next.js App Router, Docker/Linux), preservando o mapeamento já existente **grupo do AD → `Grupo` / `Permissao` do app**.

> Estado atual do app: usuários são **mock** (`src/lib/auth/mock-users.ts`), sessão por cookie (`src/lib/auth/session.ts`, `src/lib/auth/actions.ts`). O modelo Prisma já tem `Usuario`, `Grupo`, `Permissao` (relação N:N grupo↔permissão) e `Usuario`↔`Grupo`. Este doc descreve onde plugar a integração real sem mudar esse modelo.

---

## 1. Duas abordagens (e quando usar cada uma)

### (a) LDAP bind direto contra o AD

O app conecta no AD via protocolo LDAP, faz **bind** (autentica) com usuário+senha e lê os grupos via atributo `memberOf`.

**Prós**
- Funciona com **qualquer** AD/LDAP on-premises, sem depender de IdP em nuvem.
- Controle total do fluxo; sem redirecionar o usuário para fora do app.
- Simples de mapear: o DN/nome do grupo do AD bate direto com o `Grupo` do app.

**Contras**
- O app **vê a senha do usuário** (formulário próprio) — exige LDAPS/StartTLS e cuidado redobrado.
- Sem MFA, sem SSO, sem políticas modernas de senha/conditional access.
- App precisa de rede direta até o AD (porta 389/636) — exige VPN/firewall em cenários cloud.
- Você reimplementa lockout, expiração de senha, etc.

**Quando usar:** AD **on-premises** sem IdP, rede interna/intranet, ou quando o cliente exige login com formulário próprio e não tem (ou não quer) Entra ID/ADFS.

### (b) SSO moderno via OIDC/SAML com um IdP (Entra ID / Azure AD, ou ADFS) — **recomendada**

O app delega o login a um IdP (Microsoft Entra ID, antigo Azure AD, ou ADFS). O usuário autentica no IdP; o app recebe um **token** (OIDC/JWT ou SAML) com claims de identidade e grupos/roles.

**Prós**
- App **nunca vê a senha**; ganha MFA, SSO, conditional access "de graça".
- Padrão da indústria para AD corporativo; o Entra ID é a evolução cloud do AD.
- Sem rota de rede direta até o controlador de domínio.

**Contras**
- Depende de configuração no IdP (registro de app, emissão de claims de grupo).
- Limite de tamanho de token causa **overage** de grupos (ver §3).
- Fluxo de redirect e callback (mais peças móveis).

**Quando usar:** **AD corporativo** com Entra ID (caso mais comum hoje) ou ADFS. É a recomendação padrão.

> Regra prática: **AD corporativo → use (b) OIDC com Entra ID.** Só caia em (a) LDAP direto se o cliente tiver apenas AD on-premises sem federação.

---

## 2. Abordagem (a) — LDAP em Node.js

### Bibliotecas

| Lib | Papel | Observação |
| --- | --- | --- |
| [`ldapts`](https://www.npmjs.com/package/ldapts) | Cliente LDAP de baixo nível, em TypeScript | Fork moderno tipado; recomendado para controle total. |
| [`ldap-authentication`](https://www.npmjs.com/package/ldap-authentication) | Wrapper de alto nível para "autenticar + ler grupos" | Usa `ldapts` por baixo; reduz boilerplate. |
| `ldapjs` | Cliente clássico em JS | Alternativa madura; `ldapts` é a opção tipada equivalente. |

Recomendação: **`ldap-authentication`** para o caso comum (autenticar e pegar grupos). Use **`ldapts`** diretamente se precisar de queries customizadas.

### Snippet mínimo — `ldap-authentication` (modo admin/service account)

O padrão correto para AD é **service account**: o app faz bind com uma conta de leitura, busca o usuário pelo `sAMAccountName`/`userPrincipalName`, pega o DN dele, e então faz bind com o DN + senha digitada para validar a credencial. Em seguida lê `memberOf`.

```ts
// src/lib/auth/ldap.ts
import { authenticate } from "ldap-authentication";

export interface LdapUser {
  sAMAccountName: string;
  userPrincipalName?: string;
  mail?: string;
  displayName?: string;
  memberOf: string[]; // DNs dos grupos
}

export async function authenticateLdap(
  username: string, // sAMAccountName (ex.: "ana.silva") ou UPN ("ana.silva@empresa.com")
  password: string,
): Promise<LdapUser> {
  const user = await authenticate({
    ldapOpts: {
      url: process.env.LDAP_URL!, // ex.: "ldaps://dc01.empresa.local:636"
      // Em produção use LDAPS (ldaps://) ou starttls; NÃO desative rejectUnauthorized.
      tlsOptions: { minVersion: "TLSv1.2" },
    },
    // Service account de leitura (NÃO admin de domínio)
    adminDn: process.env.LDAP_BIND_DN!, // ex.: "CN=svc-ged,OU=Service,DC=empresa,DC=local"
    adminPassword: process.env.LDAP_BIND_PASSWORD!,
    // Validação da senha do usuário final:
    userPassword: password,
    userSearchBase: process.env.LDAP_BASE_DN!, // ex.: "DC=empresa,DC=local"
    usernameAttribute: "sAMAccountName", // ou "userPrincipalName"
    username,
    // Atributos a retornar:
    attributes: ["sAMAccountName", "userPrincipalName", "mail", "displayName", "memberOf"],
  });

  return {
    sAMAccountName: user.sAMAccountName,
    userPrincipalName: user.userPrincipalName,
    mail: user.mail,
    displayName: user.displayName,
    memberOf: ([] as string[]).concat(user.memberOf ?? []),
  };
}
```

> `memberOf` no AD é multivalorado e contém **DNs completos** dos grupos, ex.:
> `CN=Advogados,OU=Grupos,DC=empresa,DC=local`.
> Atenção: `memberOf` **não inclui grupos aninhados** nem o grupo primário (geralmente `Domain Users`). Se precisar de aninhamento, use a busca recursiva com a OID do AD `1.2.840.113556.1.4.1941` (`LDAP_MATCHING_RULE_IN_CHAIN`).

### Snippet mínimo — `ldapts` direto (bind + ler `memberOf`)

```ts
import { Client } from "ldapts";

const client = new Client({
  url: process.env.LDAP_URL!, // "ldaps://dc01.empresa.local:636"
  timeout: 5000,
  connectTimeout: 5000,
  tlsOptions: { minVersion: "TLSv1.2" },
});

try {
  // 1) Bind com service account de leitura
  await client.bind(process.env.LDAP_BIND_DN!, process.env.LDAP_BIND_PASSWORD!);

  // 2) Achar o DN do usuário e ler memberOf
  const { searchEntries } = await client.search(process.env.LDAP_BASE_DN!, {
    scope: "sub",
    filter: `(&(objectClass=user)(sAMAccountName=${username}))`,
    attributes: ["dn", "mail", "displayName", "memberOf"],
  });
  const entry = searchEntries[0];
  if (!entry) throw new Error("Usuário não encontrado");

  // 3) Validar a senha: re-bind com o DN do usuário + senha digitada
  await client.bind(entry.dn, password); // lança se a senha estiver errada

  const memberOf = ([] as string[]).concat(entry.memberOf ?? []);
  // memberOf = ["CN=Advogados,OU=Grupos,DC=empresa,DC=local", ...]
} finally {
  await client.unbind();
}
```

> StartTLS (porta 389 com upgrade) em vez de LDAPS: use `url: "ldap://..."` e chame `await client.startTLS({ ... })` **antes** do primeiro `bind`. Em `ldap-authentication`, passe `starttls: true`.

### Mapear DN de grupo do AD → `Grupo` do app

Estratégias (escolha uma e documente para o cliente):

1. **Por nome do grupo (CN):** extrair o `CN=...` do DN e casar com `Grupo.nome`. Simples; exige que os nomes batam.
2. **Tabela de-para explícita:** uma config `AD_GROUP_MAP` (DN ou CN do AD → `Grupo.nome` do app). Mais robusto contra renomeações no AD.

```ts
// Extrai o CN do DN do grupo: "CN=Advogados,OU=...,DC=..." -> "Advogados"
export function cnFromDn(dn: string): string {
  const m = /^CN=([^,]+)/i.exec(dn);
  return m ? m[1] : dn;
}

// De-para opcional (CN do AD -> nome do Grupo no app)
const AD_GROUP_MAP: Record<string, string> = {
  Advogados: "Advogados",
  Socios: "Sócios",
  Secretaria: "Secretaria",
  TI: "TI",
};

export function mapAdGroups(memberOf: string[]): string[] {
  const cns = memberOf.map(cnFromDn);
  return cns.map((cn) => AD_GROUP_MAP[cn] ?? cn);
}
```

---

## 3. Abordagem (b) — OIDC com Entra ID em Next.js (App Router)

### Biblioteca recomendada

[**Auth.js / NextAuth v5**](https://authjs.dev/getting-started/providers/microsoft-entra-id) com o provider **Microsoft Entra ID**. Para fluxos muito customizados, [`openid-client`](https://www.npmjs.com/package/openid-client) é a alternativa de baixo nível.

### Config base (`auth.ts`)

```ts
// auth.ts (raiz ou src/)
import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
      // Para forçar emissão de grupos/roles, pode-se ajustar authorization.params.scope
    }),
  ],
  callbacks: {
    // (ver §5 — sincronização grupos AD -> app)
  },
});
```

```ts
// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

O **issuer** (single tenant) tem o formato:
`https://login.microsoftonline.com/<TENANT_ID>/v2.0`.

### Obter grupos / roles via claims do token

Duas formas de trazer autorização nas claims (configuradas no **registro do app** no Entra):

**(i) Group claims** — claim `groups` no token, contendo por padrão os **objectId (GUID)** dos grupos. No portal: **App registrations → Token configuration → Add groups claim**, e escolha os tipos (**Security groups**, **Directory roles**, **All groups**, **Groups assigned to the application**).
Para grupos sincronizados do AD on-premises, dá para emitir **`sAMAccountName`** em vez do GUID (opções `sam_account_name` / `dns_domain_and_sam_account_name` / `netbios_domain_and_sam_account_name` no manifesto). Isso facilita casar com o `Grupo.nome` do app.

**(ii) App roles** — você define **app roles** no registro do app (Allowed member types: **Users/Groups**) e atribui usuários/grupos a essas roles. O token traz a claim **`roles`** com os nomes das roles atribuídas. Vantagem: você lê `Approver`/`Reviewer`/`admin` direto, **sem** mapear GUID de grupo para significado no app.

```ts
// Lendo claims dentro do callback jwt do Auth.js (primeiro login)
callbacks: {
  async jwt({ token, account, profile }) {
    if (account && profile) {
      // groups: array de GUIDs (ou sAMAccountName se configurado no manifesto)
      token.groups = (profile as any).groups ?? [];
      // roles: nomes das app roles atribuídas
      token.roles = (profile as any).roles ?? [];
    }
    return token;
  },
  async session({ session, token }) {
    (session as any).groups = token.groups;
    (session as any).roles = token.roles;
    return session;
  },
},
```

> No Auth.js, `account`/`profile` só vêm **no primeiro** `jwt()` após o login. Persista o que precisar em `token`.

### Pontos de atenção (Entra ID)

- **Configurar emissão de claims de grupo**: por padrão o token **não traz** `groups`. É preciso configurar em *Token configuration* (ou `groupMembershipClaims` no manifesto).
- **Overage de grupos** (limite por tamanho de token): se o usuário pertence a **mais grupos que o limite, o Entra ID NÃO emite a claim `groups`** — emite uma indicação de *overage*. Limites:
  - **200** grupos para JWT (OAuth2 / OpenID Connect).
  - **150** grupos para SAML.
  - **6** grupos no implicit flow (claim `hasgroups`).
- **Como tratar overage:** verifique a presença de `groups`. Se ausente, verifique `_claim_names`/`_claim_sources` (ou `hasgroups` no implicit). Se houver overage, **NÃO confie nos valores** — chame o **Microsoft Graph** (`GET /me/transitiveMemberOf` ou *List a user's memberships*) para obter os grupos. Trate só a **presença** do overage, não o valor.
- **Mitigações recomendadas:** emitir só **"Groups assigned to the application"** (mantém abaixo de 200; exige licença P1), **filtrar grupos**, ou — melhor — **usar app roles** (claim `roles`) para não depender da claim `groups` nem mapear GUIDs.

---

## 4. Variáveis / segredos e como NÃO commitar

`.gitignore` deste projeto já ignora `.env*` — confirme antes. Use `.env` local + secret manager em produção (nunca hardcode, nunca commit).

### LDAP (abordagem a)

```dotenv
LDAP_URL="ldaps://dc01.empresa.local:636"   # prefira LDAPS (636) ou StartTLS (389)
LDAP_BIND_DN="CN=svc-ged,OU=Service,DC=empresa,DC=local"  # service account de leitura
LDAP_BIND_PASSWORD="..."                     # SEGREDO
LDAP_BASE_DN="DC=empresa,DC=local"           # base de busca de usuários/grupos
```

### OIDC / Entra ID (abordagem b)

```dotenv
AUTH_SECRET="..."                            # segredo do Auth.js (openssl rand -base64 33)
AUTH_MICROSOFT_ENTRA_ID_ID="<Application (client) ID>"
AUTH_MICROSOFT_ENTRA_ID_SECRET="<Client secret>"   # SEGREDO
AUTH_MICROSOFT_ENTRA_ID_ISSUER="https://login.microsoftonline.com/<TENANT_ID>/v2.0"
```

### Boas práticas de segurança

- **Criptografia em trânsito**: sempre **LDAPS** (`ldaps://`, porta 636) ou **StartTLS** sobre 389. Nunca bind com senha em LDAP em texto claro. Mantenha `rejectUnauthorized` ligado e `minVersion: "TLSv1.2"`; importe a CA do AD quando for certificado interno.
- **Service account de leitura**: use uma conta dedicada e **com privilégio mínimo** (só leitura de usuários/grupos), **nunca** admin de domínio. Rotacione a senha.
- **Timeouts**: defina `timeout` e `connectTimeout` (ex.: 5s) no cliente LDAP para não pendurar requests; trate erro de rede explicitamente.
- **Segredos**: fora do código e do git; em produção use Docker secrets / Vault / KMS, injetados como env no container.
- **Em (b)**: o app não vê a senha; preserve isso, não crie formulário próprio que repasse a senha ao IdP.

---

## 5. Onde plugar no app

Hoje o login resolve via `getUserById` (mock). A integração real substitui esse ponto e **persiste/atualiza o `Usuario` + sincroniza `Grupo` a partir do AD**:

- **Mock atual:** `src/lib/auth/mock-users.ts`, `src/lib/auth/session.ts`, `src/lib/auth/actions.ts` (`loginAction` valida `userId` e grava cookie).
- **(a) LDAP:** trocar a validação do `loginAction` por `authenticateLdap(username, password)`; em sucesso, rodar a **sincronização** abaixo e gravar a sessão (id do `Usuario`).
- **(b) OIDC:** rodar a **sincronização** dentro do callback `signIn`/`jwt` do Auth.js, a partir das claims (`groups`/`roles`).

### Esqueleto da sincronização "grupos AD → grupos/permissões do app"

Idempotente: cria/atualiza o `Usuario`, garante os `Grupo` correspondentes e ajusta a relação N:N. As **permissões** já vêm do mapeamento `Grupo → Permissao` que existe no modelo — não precisa recalcular permissão por usuário; basta ligar o usuário aos grupos certos.

```ts
// src/lib/auth/sync.ts
import { prisma } from "@/lib/prisma"; // ajuste ao seu client Prisma

interface AdIdentity {
  id: string;        // ex.: sAMAccountName ("ana.silva") ou oid do Entra
  nome: string;
  email: string;
  cargo?: string;
  role?: string;     // ADMIN | ADVOGADO | SECRETARIA | TI (derive de role/grupo)
  grupos: string[];  // nomes de Grupo já mapeados do AD (ver §2 / §3)
}

/**
 * Cria/atualiza o Usuario e sincroniza seus Grupos a partir do AD.
 * As Permissao são herdadas via relação Grupo->Permissao (não tocada aqui).
 */
export async function syncUserFromAd(identity: AdIdentity) {
  // 1) Garante os grupos (cria os que faltam). Idempotente.
  const grupos = await Promise.all(
    identity.grupos.map((nome) =>
      prisma.grupo.upsert({
        where: { nome },
        update: {},
        create: { nome },
      }),
    ),
  );

  // 2) Cria/atualiza o usuario e REDEFINE seus grupos (set = espelha o AD).
  const usuario = await prisma.usuario.upsert({
    where: { id: identity.id },
    update: {
      nome: identity.nome,
      email: identity.email,
      cargo: identity.cargo ?? "",
      role: identity.role ?? "ADVOGADO",
      ativo: true,
      grupos: { set: grupos.map((g) => ({ id: g.id })) },
    },
    create: {
      id: identity.id,
      nome: identity.nome,
      email: identity.email,
      cargo: identity.cargo ?? "",
      role: identity.role ?? "ADVOGADO",
      grupos: { connect: grupos.map((g) => ({ id: g.id })) },
    },
    include: { grupos: { include: { permissoes: true } } },
  });

  return usuario; // usuario.grupos[].permissoes já reflete as permissões efetivas
}
```

Ponto de chamada — **(b) OIDC** (Auth.js):

```ts
callbacks: {
  async signIn({ profile }) {
    const p = profile as any;
    await syncUserFromAd({
      id: p.oid ?? p.preferred_username,
      nome: p.name,
      email: p.email ?? p.preferred_username,
      role: deriveRole(p.roles ?? []),        // sua regra app role -> role
      grupos: mapEntraGroups(p.groups ?? p.roles ?? []), // ver §3
    });
    return true;
  },
},
```

Ponto de chamada — **(a) LDAP** (dentro do `loginAction`):

```ts
const ldap = await authenticateLdap(username, password); // §2
const usuario = await syncUserFromAd({
  id: ldap.sAMAccountName,
  nome: ldap.displayName ?? ldap.sAMAccountName,
  email: ldap.mail ?? `${ldap.sAMAccountName}@empresa`,
  grupos: mapAdGroups(ldap.memberOf), // §2
});
// grava cookie de sessão com usuario.id
```

> Resolver permissões para checagem: `usuario.grupos.flatMap(g => g.permissoes.map(p => p.chave))` dá o conjunto de permissões efetivas (use em guards/`can()`).

---

## 6. Sincronização contínua (estrutura/permissões em dia)

| Estratégia | Quando roda | Prós | Contras |
| --- | --- | --- | --- |
| **No login (just-in-time)** | A cada autenticação (chama `syncUserFromAd`) | Simples; usuário sempre entra com seus grupos atuais | Só atualiza quem loga; mudança de grupo só reflete no próximo login |
| **Job periódico** | Cron / worker (ex.: a cada hora) | Reflete remoções/adições mesmo sem login; desativa quem saiu do AD | Mais infra; precisa percorrer o diretório |

Recomendação prática:

- **Sempre** sincronizar **no login** (cobre 90% dos casos, sem infra extra).
- Adicionar um **job periódico** quando o cliente exigir revogação rápida (ex.: usuário desligado do AD deve perder acesso antes do próximo login). O job:
  - Marca `Usuario.ativo = false` para quem sumiu do diretório (não deletar — preserva auditoria/FKs).
  - Re-sincroniza membros de grupos (adicionados/removidos).
- **Importante (caveat do token):** em OIDC, a claim de grupos reflete o estado **no momento da emissão do token**. Para autorização em tempo real, consulte o Microsoft Graph (também necessário no caso de *overage*, §3) ou re-sincronize no login/job.
- O **mapeamento `Grupo → Permissao`** (quais permissões cada grupo concede) é decisão do **app**, mantido na sua tabela; o AD só informa **a quais grupos** o usuário pertence. Mantenha esse de-para versionado e provisione os grupos esperados no seed.

---

## Fontes (oficiais)

- ldapts — cliente LDAP TypeScript: https://www.npmjs.com/package/ldapts • https://github.com/ldapts/ldapts
- ldap-authentication — wrapper de autenticação: https://www.npmjs.com/package/ldap-authentication • https://github.com/shaozi/ldap-authentication
- Auth.js / NextAuth — provider Microsoft Entra ID: https://authjs.dev/getting-started/providers/microsoft-entra-id
- Auth.js — Role Based Access Control: https://authjs.dev/guides/role-based-access-control
- openid-client: https://www.npmjs.com/package/openid-client
- Microsoft — Configure group claims and app roles in tokens: https://learn.microsoft.com/en-us/security/zero-trust/develop/configure-tokens-group-claims-app-roles
- Microsoft — Configure optional claims (incl. groups optional claims): https://learn.microsoft.com/en-us/entra/identity-platform/optional-claims
- Microsoft — Configure group claims for applications (limites/caveats on-prem): https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-fed-group-claims
- Microsoft — List a user's memberships (transitive) via Graph: https://learn.microsoft.com/en-us/graph/api/user-list-transitivememberof
- Microsoft — Add app roles e atribuir usuários/grupos: https://learn.microsoft.com/en-us/entra/identity-platform/howto-add-app-roles-in-apps
