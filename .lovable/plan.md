# Erro real do login e como destravar

## O que o navegador está acusando

A requisição de login para o Firebase (`identitytoolkit.googleapis.com/v1/accounts:signInWithPassword`) está voltando com **HTTP 403**:

```text
API_KEY_HTTP_REFERRER_BLOCKED
"Requests from referer https://aa418b68-...-.lovableproject.com/ are blocked."
```

Ou seja: **a senha e o e-mail estão corretos**. O que bloqueia é a restrição de referenciador HTTP da chave de navegador do Firebase no Google Cloud. A mensagem genérica aparece porque esse 403 chega ao SDK como um código que o `catch` atual não trata.

Isso não é corrigível por código — precisa ser liberado no console do Google.

## Ação necessária (fora do código, feita por você)

Google Cloud Console → APIs e Serviços → Credenciais → chave Web do Firebase (projeto `gen-lang-client-0885171769`) → Restrições de aplicativo → Referenciadores HTTP. Adicionar:

```text
https://*.lovableproject.com/*
https://*.lovable.app/*
https://<seu-dominio-de-producao>/*
```

Também confirmar em APIs e Serviços → Biblioteca que a **Identity Toolkit API** está habilitada. A propagação leva alguns minutos.

## O que será feito no código

1. **Mensagens de erro reais no login do Admin** (`src/components/AdminDashboard.tsx`)
   - `console.error` com `error.code`, `error.message` e o corpo do erro do Firebase.
   - Novo tratamento explícito para `auth/requests-from-referer-are-blocked` / `auth/api-key-not-valid` / erro 403, com texto na tela: "Domínio bloqueado na chave do Firebase — libere este endereço nas restrições de referenciador HTTP".
   - No fallback genérico, exibir também o código bruto entre parênteses, para nunca mais mascarar o erro.

2. **Mesmo tratamento no login do parceiro** (`src/components/PartnerPortal.tsx`), no `catch` do `signInWithEmailAndPassword`.

3. **Nenhuma senha ou payload de login em log** — apenas código e mensagem do Firebase.

## Sobre as variáveis de ambiente do frontend

Não existem `VITE_FIREBASE_*` neste projeto: a configuração do Firebase do navegador vem de `src/firebase-applet-config.json`, importado por `src/firebase.ts`. Os valores estão presentes e corretos (projectId, appId, apiKey, authDomain, database id) — a chamada realmente sai com a chave certa, tanto que o Google responde 403 de referenciador, e não "API key inválida". Portanto, não há variável faltando no preview; nada precisa ser alterado nessa parte.
