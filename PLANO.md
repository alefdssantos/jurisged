# PLANO — GED/DMS Jurídico (open-source style iManage)

Aplicação custom (frontend + backend) que cobre 100% do escopo, com **UI real sobre dados mock**, testada feature-a-feature. Sem chaves/variáveis/credenciais de produção.

## Stack
- Next.js 16 (App Router) + TypeScript + React 19
- Tailwind v4 + shadcn/ui
- Prisma + SQLite (persistência local real)
- SQLite FTS5 (busca textual real)
- mailparser (parsing real de `.eml`)
- Vitest (unit/integração) + Playwright (E2E na UI real)

## Arquitetura mock-mas-real
Funciona de verdade em dados locais: pastas, metadados, tags, versionamento, busca, parsing de e-mail, RBAC.
Integrações externas atrás de interface (mock agora + real documentado p/ produção):
- [x] OCR → mock trocável (`setOcrEngine`); produção: Tesseract — `docs/OCR.md`
- [x] AD/LDAP → mock (usuários/grupos); produção: LDAP bind ou OIDC/Entra ID — `docs/AD-LDAP.md`
- [x] IMAP/SMTP → ingestão real de `.eml`; produção: IMAP/imapflow + OAuth2 — `docs/EMAIL.md`

## Definição de "100% validado" (gate por feature)
1. Unit tests passam
2. Integração API/DB passa
3. Playwright E2E na UI real (happy path + vazio/inválido/sem-permissão/filtros)
4. Walkthrough mock com evidência (screenshot/vídeo)
5. Itens do escopo da feature marcados aqui → só então a próxima

---

## Checklist de features

### F0 — Fundação ✅
- [x] Scaffold Next.js (16.2.9, App Router, TS, Tailwind v4, shadcn/Base UI)
- [x] Design system / tokens (light+dark, acento institucional navy `--brand`)
- [x] App shell: sidebar hierárquica (Cliente→Processo→Pasta) + topbar busca global
- [x] Auth mock (cookie de sessão, login por usuário, proxy/middleware de proteção, logout)
- [x] Vitest + Playwright configurados
- [x] Testes F0 verdes — TSC ✓ · ESLint 0 ✓ · build 12/12 ✓ · unit 5/5 ✓ · E2E 8/8 ✓ · gate console/hidratação ✓
- Evidência: `evidence/F0/` (login + painel claro/escuro)

### F1 — Modelo de dados + seed ✅
- [x] Prisma 7 schema (SQLite + driver adapter): Cliente, Processo, Pasta, PastaAcl, Documento, Versao, MetadadoValor, CampoPersonalizado, Tag, Categoria, Usuario, Grupo, Permissao, Email, Anexo, AuditLog
- [x] FTS5 configurado (tabelas virtuais `documento_fts`/`email_fts`, acento-insensível, helpers reindex/search)
- [x] Seed mock realista e idempotente (2 clientes, 3 processos, 7 pastas, 4 docs, 5 versões, 2 e-mails)
- [x] Testes F1 verdes — integração 7/7 · tsc ✓ · lint ✓ · unit 5/5 ✓
- Setup pesquisado e verificado: Prisma 7 exige `@prisma/adapter-better-sqlite3`; seed via `tsx`; `db push`→`generate`

### F2 — Hierarquia Cliente→Processo→Pasta ✅
- [x] Árvore navegável (sidebar lê o banco real via `getTree`)
- [x] CRUD completo (criar/renomear/mover/excluir) p/ cliente, processo e pasta — service + server actions, com auditoria
- [x] Prevenção de ciclo no mover-pasta; validação de entrada; cascade no excluir
- [x] Estados vazio/erro (EmptyState, alerta de validação na UI)
- [x] Testes F2 verdes — integração 7 testes · E2E CRUD na UI real · build/tsc/lint ✓
- Evidência: `evidence/F2/01-clientes.png`

### F3 — Documentos: upload + listagem + visualizador ✅
- [x] Upload real (multipart server action → storage local, v1 criada, indexada no FTS)
- [x] Lista/tabela com categoria, local, versão, tamanho, tags
- [x] Visualizador inline (PDF/imagem/texto via API autenticada `/api/arquivo/[versaoId]`)
- [x] Excluir (remove arquivo + registro + índice); PDFs de exemplo no seed (renderáveis)
- [x] Testes F3 verdes — integração 4 (upload/disco/índice/exclusão) · E2E 2 (PDF inline + upload/abrir/excluir) · build/tsc/lint ✓
- Evidência: `evidence/F3/`

### F4 — Metadados + campos personalizados + tags/categorias ✅
- [x] Editor de classificação no documento (categoria + tags + valores de campos)
- [x] Campos personalizados por tipo (TEXTO/NÚMERO/DATA/BOOLEANO/LISTA) com input adequado
- [x] Catálogo (/catalogo): CRUD de categorias, tags e campos; bloqueio de duplicados; cascade
- [x] Testes F4 verdes — integração 4 · E2E 2 (editar classificação + gerenciar catálogo) · build/tsc/lint ✓

### F5 — Versionamento ✅
- [x] Nova versão (incrementa número, vira atual, salva arquivo, reindexa)
- [x] Histórico de versões (painel com comentário, autor, data, tamanho)
- [x] Restaurar versão anterior (torna-a a única atual) + baixar versão específica
- [x] Testes F5 verdes — integração 3 (nº/atual/restaurar/auditoria) · E2E 1 (nova versão + restaurar) · build/tsc/lint ✓

### F6 — OCR ✅
- [x] Serviço OCR atrás de interface (`OcrEngine`, mock trocável via `setOcrEngine`)
- [x] OCR roda no upload e na nova versão; texto extraído indexado no FTS (pesquisável)
- [x] Card de OCR no visualizador + botão "Executar OCR" (re-processar)
- [x] Doc real Tesseract pesquisada e escrita: `docs/OCR.md` (Docker, poppler, pipeline PDF, OCRmyPDF, `TesseractOcrEngine`, fontes oficiais)
- [x] Testes F6 verdes — integração 2 · E2E 1 · build/tsc/lint ✓

### F7 — Busca textual + filtros avançados ✅
- [x] Busca global FTS5 (documentos + e-mails) acionada pela topbar e pela página /busca
- [x] Filtros: texto, tipo, cliente, processo, categoria, tag, intervalo de datas (remetente coberto pelo FTS)
- [x] Filtros combinados (texto + relacionais via AND), categoria exclui e-mails
- [x] Testes F7 verdes — integração 7 (cada filtro + combinações + datas) · E2E 1 (texto/cliente/tipo) · build/tsc/lint ✓

### F8 — Permissões/RBAC + AD mock ✅
- [x] Papéis (ADMIN/ADVOGADO/SECRETARIA/TI) e permissões efetivas via grupos
- [x] Mapeamento grupo (estilo AD) → permissões; ADMIN herda todas
- [x] ACL por pasta (PastaAcl): pasta sem ACL = aberta; com ACL respeita grupo+nível
- [x] Enforcement no servidor (todas as actions sensíveis) + gating na UI (botões/menus escondidos)
- [x] Doc real AD/LDAP pesquisada: `docs/AD-LDAP.md` (LDAP bind vs OIDC/Entra ID, syncUserFromAd, fontes)
- [x] Testes F8 verdes — integração 6 (RBAC + ACL por nível) · E2E 2 (gating Secretária vs Sócia) · build/tsc/lint ✓

### F9 — Arquivamento de e-mail (diferenciador) ✅
- [x] Ingestão `.eml` com parsing real (mailparser)
- [x] Captura: corpo (texto/html) + remetente + destinatários + cc + data + assunto + message-id
- [x] Anexos extraídos e salvos; servidos por API autenticada
- [x] `.eml` original preservado (download)
- [x] Vínculo a cliente/processo/pasta; visualizador dedicado
- [x] Classificação por regra (domínio do remetente → pasta de e-mails do cliente) + manual
- [x] Doc real pesquisada: `docs/EMAIL.md` (imapflow + OAuth2, journaling/forward/add-in, classificação)
- [x] Testes F9 verdes — integração 3 · E2E 1 (arquivar/ver/excluir) · busca de e-mail · build/tsc/lint ✓

### F10 — Rastreabilidade / auditoria ✅
- [x] Log de todas as ações (CRIAR/EDITAR/EXCLUIR/MOVER/VERSIONAR/ARQUIVAR_EMAIL/LOGIN) com usuário
- [x] Timeline (Histórico) por documento e por e-mail no visualizador
- [x] Página /auditoria (admin) com filtros por ação/entidade; nav gated
- [x] Testes F10 verdes — integração 3 · E2E 2 (admin vê / secretária bloqueada) · build/tsc/lint ✓

### F11 — Admin de usuários/grupos/permissões ✅
- [x] /admin (gated): lista usuários (papel, grupos, ativar/desativar) e grupos
- [x] CRUD de grupos + atribuição de permissões ao grupo + grupos do usuário
- [x] Enforcement admin.gerenciar no servidor + gating de acesso
- [x] Testes F11 verdes — integração 4 · E2E 2 (admin gerencia / não-admin bloqueado) · build/tsc/lint ✓

### F12 — Dashboard / overview ✅
- [x] KPIs reais (clientes/processos/documentos/e-mails) + documentos recentes + atividade (auditoria) + acervo por cliente
- [x] Testes F12 verdes — integração 2 (contagens + por cliente) · E2E 1 (KPIs + seções) · build/tsc/lint ✓

### F13 — Backup / segurança / atualização ✅
- [x] Scripts `npm run backup` / `npm run restore` (db + storage + manifest)
- [x] `Dockerfile` (Tesseract-pt + Poppler) + `docker-compose.yml` (volumes persistentes) + `.dockerignore`
- [x] `docs/OPERACAO.md` (backup, segurança, atualização, manutenção, deploy)
- [x] `.gitignore` cobrindo db/storage/backups/artefatos
- [x] Teste roundtrip backup/restore (integração) verde + script provado · tsc/lint ✓

### F14 — Fluxo completo simulado (E2E) ✅
- [x] Jornada Playwright ponta a ponta: login → estrutura → documento → OCR → classificação → versão → busca → e-mail → auditoria → limpeza
- [x] Verde (1 teste, todo o escopo) — suite E2E 28/28

### F15 — Fechamento ✅
- [x] Checklist do escopo 100% ✓ (F0–F14 concluídas e testadas)
- [x] Documentação simples: `README.md` + `docs/GUIA-USO.md` (uso/admin) + `docs/OPERACAO.md` (manutenção)
- [x] **Lista de infra**: `docs/INFRA.md` (ordenada e objetiva)

---

## Mapeamento escopo → feature
- Levantamento/recomendação GED → PLANO + pesquisa (workflow)
- Instalação Linux/Docker → F13 + infra
- AD + usuários/grupos/permissões/estrutura → F8, F11, F2
- OCR → F6
- Busca textual + filtros → F7
- Metadados, tags/categorias → F4
- Versionamento → F5
- Integração e-mail (corpo+anexos+metadados+rastreabilidade) → F9, F10
- Classificar e-mails (cliente/processo/pasta/assunto/remetente/metadado) → F7, F9
- Backup/segurança/atualização/manutenção → F13
- Documentação simples → F15
- Treinamento básico → F15 (guia)
