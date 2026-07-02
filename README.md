# JurisGED — Gestão Eletrônica de Documentos (jurídico)

GED/DMS para escritórios jurídicos, no estilo iManage, **construído sob medida**.
Organiza por **Cliente → Processo → Pasta**, com documentos, versionamento, OCR,
metadados/tags/categorias, busca textual, permissões (estilo Active Directory),
auditoria e **arquivamento de e-mail com fidelidade total** (corpo + remetente +
destinatários + cc + data + assunto + anexos + `.eml` original).

> **Ambiente de demonstração:** roda 100% local com **dados mock**. Nenhuma chave,
> variável ou número de produção é necessária. As integrações externas (OCR real,
> AD/LDAP, IMAP) ficam atrás de interfaces, com a implementação de produção
> **pesquisada e documentada** em `docs/`.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 + shadcn/ui · Prisma 7 + SQLite
(driver adapter) · busca **SQLite FTS5** · parsing de e-mail com **mailparser** ·
testes com **Vitest** (unit/integração) e **Playwright** (E2E na UI real).

## Como rodar (desenvolvimento)

```bash
npm install
npm run db:push        # cria o banco a partir do schema
npm run db:generate    # gera o Prisma Client
npm run db:seed        # popula dados de exemplo (idempotente)
npm run dev            # http://localhost:3000
```

Login (perfis simulados do AD — sem senha):

| Usuário      | Papel         | Pode |
|--------------|---------------|------|
| Ana Silva    | Administrador | tudo (inclui auditoria e admin) |
| Bruno Costa  | Advogado      | criar/editar/versionar documentos, arquivar e-mail |
| Carla Dias   | Secretária    | criar/editar documentos, arquivar e-mail |
| Diego Alves  | TI            | administração e estrutura |

## Scripts

```bash
npm run dev | build | start         # app
npm test                            # unit (Vitest)
npm run test:int                    # integração (banco real)
npm run test:e2e                    # E2E (Playwright, UI real)
npm run lint                        # ESLint
npm run db:push | db:generate | db:seed | db:reset | db:studio
npm run backup                      # backup db + storage
npm run restore -- backups/<dir>    # restaura backup
```

## Funcionalidades (cobertura do escopo)

- **Estrutura documental** Cliente → Processo → Pasta (árvore + CRUD + mover, sem ciclos)
- **Documentos**: upload real, listagem, **visualizador** inline (PDF/imagem/texto), exclusão
- **Versionamento**: nova versão, histórico, restaurar, baixar versão específica
- **Metadados**: categoria, tags e **campos personalizados** por tipo + **catálogo** gerenciável
- **OCR**: extração indexada para busca (mock trocável; Tesseract documentado em `docs/OCR.md`)
- **Busca textual (FTS5)** insensível a acento + **filtros** (cliente, processo, categoria, tag, data, tipo)
- **Permissões/RBAC** por grupos (estilo AD) + **ACL por pasta**; enforcement no servidor + gating na UI
- **Arquivamento de e-mail** (`.eml`) com fidelidade total + classificação por remetente/manual
- **Rastreabilidade**: auditoria de todas as ações + timeline por documento/e-mail + página `/auditoria`
- **Administração**: usuários, grupos e permissões
- **Dashboard**: KPIs, recentes, atividade e acervo por cliente
- **Operação**: backup/restore, Docker, segurança e atualização (`docs/OPERACAO.md`)

## Testes

Unit + integração (banco real, FTS, fidelidade de e-mail, RBAC, backup) + E2E na UI
real, incluindo um **fluxo completo de ponta a ponta** (`e2e/fluxo-completo.spec.ts`).
Antes de qualquer entrega:
`npm run lint && npx tsc --noEmit && npm test && npm run test:int && npm run build && npm run test:e2e`.

## Documentação

- `docs/OCR.md` — OCR real (Tesseract + Poppler, Docker, pipeline PDF, OCRmyPDF)
- `docs/AD-LDAP.md` — autenticação real (LDAP bind ou OIDC/Entra ID) + sync de grupos
- `docs/EMAIL.md` — captação real de e-mail (IMAP/imapflow + OAuth2, journaling/forward)
- `docs/OPERACAO.md` — backup, segurança, atualização, manutenção, deploy
- `docs/GUIA-USO.md` — guia de uso e administração (treinamento básico)
- `docs/INFRA.md` — lista do que provisionar para produção
- `PLANO.md` — checklist do escopo (feature a feature, com status e testes)

## Produção (referência)

```bash
docker compose up -d --build
docker compose exec jurisged npx prisma db seed   # opcional (dados de exemplo)
```

Ver `Dockerfile` (já inclui Tesseract-pt + Poppler) e `docs/INFRA.md`.
