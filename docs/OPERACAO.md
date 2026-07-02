# Operação — Backup, Segurança, Atualização e Manutenção

## Backup e restauração

O acervo tem duas partes: o banco (`dev.db`) e os arquivos (`storage/` — documentos, anexos e `.eml`).

```bash
npm run backup                      # cria backups/<timestamp>/ com db + storage + manifest.json
npm run restore -- backups/<dir>    # restaura db + storage a partir de um backup
```

Recomendações:
- Agende com cron (ex.: diário): `0 2 * * * cd /app && npm run backup`.
- Replique os backups para fora do servidor (rsync/S3) — regra 3-2-1.
- **SQLite** quente: para consistência sob carga, faça `VACUUM INTO` ou pare o app no momento do copy; em produção com PostgreSQL, use `pg_dump`.
- Teste a restauração periodicamente (o roundtrip é coberto por teste de integração).

## Segurança

- **Segredos** ficam em `.env` (já ignorado pelo git). Nunca commitar credenciais.
- **AD/LDAP ou OIDC** para autenticação real — ver `docs/AD-LDAP.md` (LDAPS/StartTLS ou OAuth2).
- **RBAC**: permissões efetivas vêm dos grupos; ACL por pasta. Enforcement no servidor (todas as actions) + gating na UI.
- **TLS**: rode um reverse proxy (Caddy/Traefik/Nginx) na frente para HTTPS.
- **Arquivos**: servidos apenas por API autenticada (`/api/arquivo`, `/api/anexo`, `/api/eml`); o diretório `storage/` não é público.
- **Retenção/WORM**: para valor probatório jurídico, considere armazenamento imutável e trilha de auditoria (já há `AuditLog`) — ver `docs/EMAIL.md`.

## Atualização

```bash
npm outdated && npm update          # dependências (revisar breaking changes)
npx prisma generate                 # após mudar schema
npx prisma db push                  # aplica o schema (dev/single-node)
# produção com migrações: npx prisma migrate deploy
npx @next/codemod@latest upgrade    # upgrade do Next.js (segue codemods oficiais)
```
Antes de subir: `npm run lint && npx tsc --noEmit && npm test && npm run test:int && npm run build`.

## Manutenção

- **Índice de busca (FTS5)**: reconstruir após importações em massa — `reindexAllFts` (chamado pelo seed). 
- **Seed/demonstração**: `npm run db:seed` repõe dados de exemplo (idempotente).
- **Logs**: `next start` loga no stdout (capture com o orquestrador de containers).
- **Monitoramento**: healthcheck HTTP em `/login` (200 sem sessão); alertas de disco (storage cresce).
- **OCR/E-mail em produção**: rode workers separados (filas), conforme `docs/OCR.md` e `docs/EMAIL.md`.

## Implantação (Docker)

```bash
docker compose up -d --build        # sobe o app (volumes persistem db + storage)
docker compose exec jurisged npx prisma db seed   # (opcional) dados de exemplo
```
Ver `Dockerfile` (inclui Tesseract-pt + Poppler) e `docker-compose.yml`. Para escala, migrar SQLite→PostgreSQL e storage local→S3/MinIO.
