# Lista de Infraestrutura para Produção

Ordem objetiva do que provisionar/contratar para colocar o JurisGED em produção.
Itens 1–6 são o mínimo para subir; 7–9 habilitam as integrações reais; 10–12 são operação.

1. **Servidor Linux** — VM/host (Ubuntu/Debian). Sugestão inicial: 2 vCPU, 4 GB RAM, 50 GB SSD
   (suba RAM/CPU se houver muito OCR; disco cresce com os arquivos).
2. **Docker + Docker Compose** instalados no servidor.
3. **Domínio + certificado TLS** (HTTPS) — domínio próprio e um reverse proxy
   (Caddy/Traefik/Nginx) terminando TLS na frente do app.
4. **Banco de dados** — para single-node pequeno, o SQLite embarcado já funciona;
   para escala/robustez, um **PostgreSQL** gerenciado ou container dedicado.
5. **Armazenamento de arquivos** — volume persistente para `storage/` (documentos, anexos,
   `.eml`); para escala, um bucket **S3/MinIO**. Dimensione conforme volume documental.
6. **Destino de backup externo** — outro disco/bucket para guardar os backups (regra 3-2-1).

7. **Identidade (AD/LDAP ou OIDC)** — para login corporativo:
   - **OIDC/Entra ID** (recomendado): um *app registration* (client id/secret, tenant) com
     emissão de claims de grupo; **ou**
   - **LDAP/Active Directory** on-premises: URL LDAPS, base DN e uma **conta de serviço** de leitura.
8. **Caixa de e-mail para arquivamento** — uma conta/mailbox de serviço com **IMAP** habilitado
   e **OAuth2** (Gmail/Microsoft 365). Alternativas: regra de **journaling** ou **endereço de
   encaminhamento** dedicado. (Ver `docs/EMAIL.md`.)
9. **OCR** — já incluso na imagem Docker (**Tesseract + idioma português + Poppler**); nada a
   contratar. Para alto volume, prever um **worker** de OCR separado. (Ver `docs/OCR.md`.)

10. **Segredos/variáveis de ambiente** — `DATABASE_URL` e as credenciais de AD/OIDC, IMAP/OAuth2
    (e SMTP, se notificações). Guardar em cofre de segredos / `.env` fora do versionamento.
11. **Backup agendado** — cron diário (`npm run backup`) + cópia para o destino externo (item 6).
12. **Monitoramento e logs** — healthcheck HTTP, coleta de logs do container, alerta de disco.

Opcional: **SMTP** (envio de notificações), **antivírus** para uploads, e política de
**retenção/WORM** se houver exigência probatória/jurídica.
