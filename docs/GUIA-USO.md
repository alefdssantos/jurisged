# Guia de Uso e Administração (treinamento básico)

## Entrar
1. Acesse o sistema e escolha um perfil (em produção: login do Active Directory).
2. O painel mostra KPIs, documentos recentes, atividade e acervo por cliente.

## Estrutura: Cliente → Processo → Pasta
1. Menu **Clientes & Processos**.
2. **Novo cliente** → preencha nome e CNPJ/CPF.
3. No menu (⋯) do cliente → **Novo processo** (título, número, área).
4. No menu (⋯) do processo → **Nova pasta** (e subpastas). É possível **renomear**, **mover** e **excluir**.
5. A árvore aparece também na barra lateral (Pastas).

## Documentos
1. Menu **Documentos** → **Enviar documento**: escolha a pasta, o arquivo, nome e categoria.
2. Clique no documento para abrir o **visualizador** (PDF/imagem/texto inline) com painel lateral.
3. **Editar classificação**: categoria, tags e campos personalizados.
4. **Versões**: enviar nova versão, **tornar atual** (restaurar) uma anterior, **baixar** uma versão.
5. **OCR**: o texto reconhecido aparece no card "Texto reconhecido"; botão **Executar OCR** reprocessa.
6. **Histórico**: timeline de tudo que aconteceu no documento.

## Catálogo (categorias, tags, campos)
- Em **Documentos → Catálogo**: criar/remover categorias, tags e **campos personalizados**
  (Texto, Número, Data, Booleano, Lista). Esses campos viram opções na classificação.

## Busca
- Barra superior: busca rápida. Página **Busca**: texto + filtros (tipo, cliente, processo,
  categoria, tag, intervalo de datas). A busca é insensível a acento e cobre documentos e e-mails.

## E-mails
1. Menu **E-mails** → **Arquivar e-mail**: selecione um arquivo `.eml`.
2. Deixe a pasta em **classificar automaticamente** (pelo domínio do remetente) ou escolha manualmente.
3. Abra o e-mail para ver **corpo, remetente, destinatários, cc, data, message-id, anexos** e baixar o `.eml`.

## Administração (apenas Administrador)
- Menu do usuário → **Administração**:
  - **Usuários**: ver papel/grupos, ativar/desativar, **editar grupos**.
  - **Grupos**: criar/renomear/excluir, **definir permissões**.
- **Auditoria** (barra lateral): trilha completa, com filtros por ação e entidade.

## Backup (operação)
- `npm run backup` gera um backup do banco e dos arquivos; `npm run restore -- <pasta>` restaura.
- Detalhes em `docs/OPERACAO.md`.
