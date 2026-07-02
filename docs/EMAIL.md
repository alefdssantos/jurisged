# Arquivamento de E-mail em Produção — GED Jurídico (Node.js/Next.js + Docker)

Guia técnico para **alimentar** o arquivamento de e-mails a partir de caixas reais, com fidelidade total.

> **Estado atual do app:** já parseamos `.eml` com `mailparser` (corpo texto/html, remetente, destinatários, cc, data, assunto, anexos, `message-id`) e gravamos nos modelos `Email`/`Anexo`, vinculados a `Cliente → Processo → Pasta`, **preservando o `.eml` original**. Este documento descreve **como entram os e-mails** nesse fluxo em produção.

---

## 1. Captação automática via IMAP

### Biblioteca recomendada: `imapflow`

Use **`imapflow`** (mantido pela equipe Postalsys/EmailEngine, ecossistema Nodemailer). É moderno, Promise/async-await, com suporte nativo a **IDLE**, **OAuth2** e download do **source bruto (RFC822)**. É o recomendado pela própria página de extras do Nodemailer.

- `node-imap`/`imap` (`mscdex/node-imap`) ainda funciona, mas é baseado em callbacks, mais antigo e com manutenção bem menos ativa. Para projeto novo, **prefira `imapflow`**.

> Nota: o `imapflow` implementa RFC 3501 (IMAP4rev1). A API exata abaixo segue a documentação oficial; onde a fonte não detalha um caso, está sinalizado.

```bash
npm install imapflow mailparser
```

### Conectar (IMAP + TLS), baixar `.eml` bruto e marcar como processado

```js
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');

const client = new ImapFlow({
  host: process.env.IMAP_HOST,        // ex.: outlook.office365.com / imap.gmail.com
  port: 993,                          // 993 => TLS direto
  secure: true,                       // conexão sobre TLS desde o início
  auth: {
    user: process.env.IMAP_USER,
    pass: process.env.IMAP_PASS,      // ou: accessToken (OAuth2 — ver seção 6)
  },
  logger: false,
});

async function processarCaixa() {
  await client.connect();

  // Lock garante exclusividade da seleção da pasta (evita corrida entre workers)
  const lock = await client.getMailboxLock('INBOX');
  try {
    // Busca só não lidas (ou troque por { seen: false } / range de UIDs / desde uma data)
    for await (const msg of client.fetch({ seen: false }, {
      uid: true,
      source: true,     // <-- retorna o RFC822 bruto (Buffer): este é o .eml original
      envelope: true,
    })) {
      const emlBruto = msg.source;          // Buffer com o .eml íntegro (RFC822)

      // 1) GRAVE o .eml bruto como está (storage/objeto/coluna) — fonte de verdade
      await salvarEmlBruto(msg.uid, emlBruto);

      // 2) Parse só para INDEXAR metadados/corpo/anexos (não substitui o bruto)
      const parsed = await simpleParser(emlBruto);
      await indexarMetadados(parsed);       // assunto, de/para/cc, data, message-id, anexos

      // 3) Marque como processado: flag + move para pasta "Arquivado"
      await client.messageFlagsAdd(msg.uid, ['\\Seen', 'Arquivado'], { uid: true });
      await client.messageMove(String(msg.uid), 'Arquivado', { uid: true });
    }
  } finally {
    lock.release();
  }

  await client.logout();
}
```

Pontos da API oficial usados acima:
- **`source: true`** no `fetch`/`fetchOne` retorna a mensagem bruta (RFC822) — é exatamente o `.eml`.
- **`messageFlagsAdd(seq, ['\\Seen', 'custom'], { uid: true })`** marca como lida e/ou adiciona flag custom (idempotência: pule mensagens já com a flag `Arquivado`).
- **`messageMove(range, 'Pasta', { uid: true })`** move para outra pasta (evita reprocessar).
- **`getMailboxLock`** serializa o acesso à pasta dentro do processo.

### Worker contínuo: IDLE vs polling

**IDLE (recomendado, baixa latência):** o servidor avisa quando chega mensagem nova, sem ficar perguntando.
- O `imapflow` **entra em IDLE automaticamente** ao selecionar a caixa (a menos que você desabilite com `disableAutoIdle`).
- Escute o evento **`exists`** (chega/some mensagem) e dispare o processamento:

```js
client.on('exists', async (data) => {
  // data.count = total de mensagens agora na pasta
  await processarNovas();   // refaça o fetch({ seen:false }) com lock
});
```

**Polling (fallback):** se o servidor não suportar IDLE (raro hoje), rode `processarCaixa()` em intervalo fixo (ex.: cron a cada 1–5 min). O `imapflow` faz fallback para `NOOP`/poll quando IDLE não está disponível.

**Em Docker:** rode o worker como **serviço separado** do Next.js (um container só para o consumidor IMAP), com reconexão automática (try/catch + backoff no `connect`), `restart: unless-stopped` no compose e healthcheck. Mantenha **uma conexão por caixa** e processe com lock para não duplicar.

---

## 2. Fidelidade: por que arquivar o `.eml` bruto (RFC822)

**Arquive sempre o `.eml` bruto e trate-o como fonte de verdade.** Parseie apenas para *indexar*.

Por quê:
- O `.eml`/RFC822 é a mensagem **exatamente como trafegou**: todos os headers (incl. `Received`, `DKIM-Signature`, `Authentication-Results`), MIME boundaries, encoding e anexos originais. Isso é o que dá **valor probatório**.
- **Reconstruir** o e-mail a partir dos campos parseados *perde* fidelidade: ordem/headers originais, assinaturas DKIM (que deixam de validar), partes MIME e bytes exatos de anexos podem mudar. Para uso jurídico, reconstruir **não** é aceitável como original.
- O `mailparser` (`simpleParser`) é ótimo para **extrair** o que você indexa, mas é uma representação *derivada*, não substitui o bruto.

O que o `simpleParser` entrega para indexar:
- **Headers:** `parsed.headers` (Map, chaves minúsculas) + atalhos `parsed.subject`, `parsed.from`, `parsed.to`, `parsed.cc`, `parsed.date`, `parsed.messageId`.
- **Corpo:** `parsed.text`, `parsed.html`, `parsed.textAsHtml`.
- **Anexos:** `parsed.attachments[]` com `filename`, `contentType`, `size`, `content` (Buffer), `checksum`, `cid`.

**Melhor prática (confirmada):** *preservar o `.eml` bruto + parsear para metadados/índice* é o padrão correto. Você já faz isso — mantenha. Sugestão: guarde também um **hash (SHA-256)** do `.eml` bruto no registro `Email` para verificação de integridade.

---

## 3. Métodos de entrada alternativos (e quando usar)

| Método | Como funciona | Quando usar | Prós | Contras |
|---|---|---|---|---|
| **(a) Journaling / SMTP** | O servidor de e-mail (Exchange Online/M365, Google) envia **cópia automática de todo e-mail** (enviados e recebidos) para um endereço/serviço de arquivamento. | Captura **completa e à prova de usuário** — compliance corporativo. | Pega 100% do tráfego, inclui internos, não depende de ação humana. | Captura **tudo** (ruído alto); exige classificação posterior; em M365 o destino **não pode ser uma mailbox do Exchange Online** (tem de ser sistema externo/serviço de arquivamento). |
| **(b) Forward-to-address** | Usuário (ou regra) **encaminha** o e-mail para um endereço que seu sistema lê (caixa IMAP dedicada ou webhook de inbound). | Arquivamento **seletivo** simples, sem add-in. | Fácil de implementar; funciona em qualquer cliente. | Encaminhar **altera headers** (vira mensagem nova; o `.eml` "original" passa a ser anexo `message/rfc822`); depende de disciplina do usuário. |
| **(c) Add-in / drag-drop no cliente** | Add-in do **Outlook** ou **Thunderbird**, ou arrastar o e-mail para o app/DMS. O cliente exporta o item. | Arquivamento **manual contextual** ("salvar este e-mail neste processo"). | Usuário escolhe cliente/processo na hora; preserva metadados. | Depende de instalação/treino; **formato varia**: Outlook Clássico (Windows) solta `.msg`; Outlook Mac solta `.eml`; **Novo Outlook não exporta `.msg` por drag-drop**. |

Detalhe do drag-drop (Microsoft):
- Drag-and-drop para o task pane de um add-in: **Windows clássico → `.msg`**, **Mac → `.eml`**. O **Novo Outlook** não suporta salvar `.msg` via drag-drop (precisa do Clássico).
- Se você aceitar **`.msg`** (formato proprietário Outlook), precisará de um conversor `.msg → .eml`/MIME no ingest, pois seu pipeline é RFC822. **`.eml` é o formato preferido** por já ser RFC822.

**Recomendação para GED jurídico:**
- **Captura ampla obrigatória** → use **(a) journaling** para uma caixa/serviço de arquivamento + worker IMAP (seção 1).
- **Arquivamento manual no processo certo** → use **(c) add-in/drag-drop** ou **(b) forward** com *plus-alias* (seção 4) para o usuário direcionar.

---

## 4. Classificação por cliente / processo / pasta / remetente / assunto

Estratégias (combine-as; a primeira regra que casar vence):

1. **Domínio/endereço do remetente → Cliente.** Ex.: `@acme.com` → Cliente "ACME". Mapa configurável por cliente.
2. **Regex no assunto → Processo.** Ex.: número CNJ `\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}` no `subject` → Processo correspondente.
3. **Plus-alias (subaddressing, RFC 5233) no endereço de forward → roteamento explícito.** Ex.: o usuário encaminha para `arquivo+cliente123-proc456@seudominio.com`. O servidor entrega em `arquivo@...` e o seu código lê o `+cliente123-proc456` para rotear. **Funciona no Gmail/Google Workspace e em servidores que suportam subaddressing** (confirme no seu provedor — nem todos habilitam por padrão).
4. **Escolha manual** (add-in/UI): o usuário seleciona Cliente→Processo→Pasta no ato. Maior precisão; use como fallback quando as regras não casarem.

**Esqueleto de regra:**

```js
// retorna { clienteId, processoId, pastaId } ou null (=> fila de triagem manual)
function classificar(parsed, destinoPlus /* parte após o + do To, se houver */) {
  // (3) Plus-alias tem prioridade: roteamento explícito do usuário
  if (destinoPlus) {
    const m = /^cliente(\d+)-proc(\d+)$/.exec(destinoPlus);
    if (m) return { clienteId: +m[1], processoId: +m[2], pastaId: null };
  }

  // (1) Domínio do remetente -> Cliente
  const dominio = (parsed.from?.value?.[0]?.address || '').split('@')[1]?.toLowerCase();
  const cliente = MAPA_DOMINIO_CLIENTE[dominio];   // tabela configurável

  // (2) Número de processo (CNJ) no assunto -> Processo
  const cnj = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/.exec(parsed.subject || '');
  const processoId = cnj ? buscarProcessoPorCNJ(cnj[0]) : null;

  if (cliente && processoId) return { clienteId: cliente.id, processoId, pastaId: null };
  return null; // sem match confiável -> triagem manual (NUNCA descarte; mantenha o .eml)
}
```

> Regra de ouro: se a classificação automática não tiver certeza, **arquive mesmo assim** numa pasta de **triagem** e deixe um humano vincular. Nunca perca o e-mail.

---

## 5. Conformidade e retenção (visão geral)

Arquivamento jurídico costuma exigir, em linhas gerais (mencionado, sem aprofundar):

- **Imutabilidade / WORM** (Write Once, Read Many): o registro não pode ser reescrito nem apagado durante o período de retenção. Referência clássica é a **SEC Rule 17a-4** (mercado financeiro EUA), que desde a emenda de 2022 aceita **ou** WORM **ou** um sistema com **trilha de auditoria** que garanta recriar o registro original.
- **Trilha de auditoria (audit trail):** log com data/hora de toda criação, modificação ou exclusão do registro.
- **Período de retenção** definido por lei/política (ex.: anos), com produção do registro em formato eletrônico legível quando solicitado.

Implicações práticas para o GED: guarde o `.eml` bruto em storage **imutável/WORM** (ou object lock), registre **hash** e **audit log**, e aplique **políticas de retenção** por tipo de documento. *Detalhamento jurídico específico deve ser validado com o compliance do cliente — varia por jurisdição.*

---

## 6. Variáveis, segredos e boas práticas

### Variáveis de ambiente (exemplo)

```env
# IMAP básico (apenas onde OAuth2 não for possível)
IMAP_HOST=outlook.office365.com
IMAP_PORT=993
IMAP_USER=arquivo@seudominio.com
IMAP_PASS=...            # evite; prefira OAuth2

# OAuth2 (recomendado)
OAUTH_CLIENT_ID=...
OAUTH_CLIENT_SECRET=...
OAUTH_TENANT_ID=...      # Microsoft 365
OAUTH_REFRESH_TOKEN=...  # ou client_credentials para conta de serviço
```

### OAuth2 com `imapflow` (em vez de senha)

Passe um **access token** via `auth.accessToken` (o `imapflow` monta o SASL **XOAUTH2** por baixo):

```js
const client = new ImapFlow({
  host: 'outlook.office365.com',   // ou imap.gmail.com
  port: 993,
  secure: true,
  auth: {
    user: process.env.IMAP_USER,
    accessToken: await obterAccessToken(),  // renove antes de expirar
  },
});
```

### Boas práticas (importantes em 2025/2026)

- **Use OAuth2, não senha.** Autenticação básica (senha) em IMAP **foi desativada**:
  - **Gmail/Google Workspace:** desde **14/03/2025**, IMAP/POP/SMTP **não funcionam mais com senha legada** — só OAuth 2.0. Para conta de serviço, use **domain-wide delegation** (escopo `https://www.googleapis.com/auth/gmail.imap_admin`).
  - **Microsoft 365/Exchange Online:** Basic Auth descontinuada; use **OAuth 2.0**, incluindo o **client credentials flow** (conta de serviço/app, sem usuário interativo) para IMAP/POP.
- **Sempre TLS** (`secure: true`, porta 993). Não use IMAP em texto claro.
- **Conta de serviço dedicada** para o arquivamento (não uma caixa pessoal), com privilégio mínimo (só leitura/arquivamento das caixas necessárias).
- **Nunca commitar segredos.** Use variáveis de ambiente / secret manager (Docker secrets, Vault, etc.); mantenha `.env` no `.gitignore`.
- **Rotacione tokens/refresh tokens** e trate expiração (renovar `accessToken` antes de cada conexão/sessão longa).
- **Em Docker:** injete segredos via `secrets`/env do orquestrador, não embutidos na imagem.

---

## Fontes oficiais

- ImapFlow — site e docs: https://imapflow.com/ · https://imapflow.com/docs/
- ImapFlow — Client API (fetch/source, flags, move, IDLE): https://imapflow.com/docs/api/imapflow-client/
- ImapFlow — Fetching Messages: https://imapflow.com/docs/guides/fetching-messages/
- ImapFlow — repositório: https://github.com/postalsys/imapflow
- Nodemailer — Extras (lista ImapFlow/MailParser): https://nodemailer.com/extras
- MailParser (`simpleParser`, headers, attachments, text/html): https://nodemailer.com/extras/mailparser · https://github.com/nodemailer/mailparser
- node-imap (alternativa legada): https://github.com/mscdex/node-imap
- Journaling em Exchange Online (M365): https://learn.microsoft.com/en-us/exchange/security-and-compliance/journaling/journaling
- Configurar journaling no Exchange Online: https://learn.microsoft.com/en-us/exchange/security-and-compliance/journaling/configure-journaling
- Outlook add-in — drag-and-drop de mensagens (.msg/.eml por plataforma): https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/drag-drop-items
- Abrir .eml/.msg/.oft no Outlook: https://support.microsoft.com/en-us/office/open-eml-msg-and-oft-files-in-new-outlook-60f71e69-e9a5-445b-b4dd-2e0d5aaf21d6
- RFC 5233 — Subaddressing (plus addressing): https://www.rfc-editor.org/rfc/rfc5233.html
- OAuth2 para IMAP/POP/SMTP no Microsoft 365 (Microsoft Learn): https://learn.microsoft.com/en-us/exchange/client-developer/legacy-protocols/how-to-authenticate-an-imap-pop-smtp-application-by-using-oauth
- OAuth 2.0 client credentials flow p/ POP/IMAP no Exchange Online: https://techcommunity.microsoft.com/blog/exchange/announcing-oauth-2-0-client-credentials-flow-support-for-pop-and-imap-protocols-/3562963
- Gmail — XOAUTH2 (IMAP): https://developers.google.com/workspace/gmail/imap/xoauth2-protocol
- Google Workspace — transição de "less secure apps" para OAuth (fim da senha legada): https://support.google.com/a/answer/14114704
- SEC — emenda à Rule 17a-4 (WORM x audit trail): https://www.sec.gov/investment/amendments-electronic-recordkeeping-requirements-broker-dealers
