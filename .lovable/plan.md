# Etapa B-2 (senhas de cliente e equipe) + Etapa D (higiene)

## Situação atual verificada

- `parceiros`: login já usa Firebase Auth com lazy migration (Etapa B concluída).
- **Membro de equipe**: o cadastro em `PartnerPortal.tsx` (`handleAddTeamMember`) ainda grava `senha` em texto puro no doc de `parceiros`. O login dele passa pelo mesmo fluxo do parceiro, então a migração no login já funciona — falta só parar de criar senha em texto puro.
- **Cliente (`leads.clienteSenha`)**: `TrackingPortal.tsx` compara a senha em texto puro no navegador (`enteredPassword === candidateLead.clienteSenha`), grava a senha do primeiro acesso direto no Firestore, e o `AdminDashboard.tsx` exibe/redefine a senha do cliente em texto puro (4 pontos no código).
- Envs: `process.env.*` espalhado em 12 pontos de `src/lib/prosfec-server.ts`; não existe `src/utils/env.ts`.
- Logs: 31 `console.log` no servidor, vários imprimindo payload completo de webhook, e-mails e documentos.

## Etapa B-2 — Parte 1: membros de equipe

Mesmo padrão do parceiro:
- Criar a conta no Firebase Auth (`createUserWithEmailAndPassword`) antes de gravar o doc.
- Salvar `authUid` no documento; **nunca** gravar `senha`.
- Ao alterar senha no perfil, usar `updatePassword` do Auth em vez de `updatedFields.senha`.
- Membros antigos com `senha` em texto puro continuam entrando pela lazy migration já existente.

## Etapa B-2 — Parte 2: senha do cliente

O cliente entra por protocolo/CNPJ, sem e-mail garantido, então o Firebase Auth não se aplica. Solução: **hash com salt, validado no servidor**.

- Novos campos: `clienteSenhaHash`, `clienteSenhaSalt`, `clienteSenhaAlgo` (PBKDF2-SHA256, 150k iterações, WebCrypto).
- Nova rota `POST /api/auth/cliente-login`: recebe `leadId` + senha, valida o hash no servidor e responde apenas sucesso/erro (nunca devolve a senha).
- **Lazy migration**: se o lead ainda tiver `clienteSenha` em texto puro, o servidor valida contra ela, gera o hash, grava e **apaga `clienteSenha`** na mesma requisição.
- Primeiro acesso: `POST /api/auth/cliente-definir-senha` grava só o hash.
- `TrackingPortal.tsx` deixa de comparar senha no cliente e passa a chamar essas rotas.
- `AdminDashboard.tsx`: remove a exibição da senha do cliente (não é mais recuperável). O reset passa a gerar uma senha temporária mostrada **uma única vez** na tela/WhatsApp no momento da geração, gravando apenas o hash.
- `firestore.rules`: bloquear leitura/escrita de `clienteSenha*` pelo cliente; escrita do hash só pelo servidor autenticado/admin.

## Etapa D — Higiene

- Criar `src/utils/env.ts` com um acessor único e tipado (`requireEnv` / `optionalEnv`) para: `GEMINI_API_KEY`, `REDEBE_TOKEN`, `INTEGRADOR_API_KEY`, `INTEGRADOR_API_BASE_URL`, `GOOGLE_MAPS_API_KEY`, `HUBLA_WEBHOOK_TOKEN`, `LASTLINK_WEBHOOK_TOKEN`, `MIGRATION_ADMIN_TOKEN`, `FIREBASE_API_KEY`. Leitura sempre dentro do handler.
- Substituir os 12 usos diretos de `process.env` no servidor por esse módulo.
- Sanitizar logs: remover o dump do payload do webhook Hubla, mascarar e-mails (`jo***@dominio.com`) e documentos (CPF/CNPJ com dígitos parciais), remover qualquer log de senha ou token. Adicionar helper `maskEmail`/`maskDoc`/`redact`.
- Nenhuma senha ou token pode aparecer em `console.*` ou em mensagens de erro devolvidas ao cliente.

## Detalhes técnicos

- Hash: `crypto.subtle.importKey` + `deriveBits` (PBKDF2, SHA-256, salt de 16 bytes aleatórios) — compatível com o runtime edge.
- Comparação do hash em tempo constante (`timingSafeCompare` já existente no servidor).
- Migração em lote opcional: estender `/api/auth/migrar-parceiros` com `?alvo=clientes` para converter `clienteSenha` em hash em lote, protegido pelo `MIGRATION_ADMIN_TOKEN`.
- Ao final entrego o `firestore.rules` atualizado em bloco de código para você republicar.

## O que muda para o usuário final

- Parceiros e clientes continuam entrando com a mesma senha — a conversão é transparente no primeiro login.
- Admin deixa de ver a senha do cliente; passa a gerar uma senha temporária visível só na hora.
