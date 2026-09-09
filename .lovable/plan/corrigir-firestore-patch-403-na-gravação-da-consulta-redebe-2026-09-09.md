# Corrigir "Firestore PATCH 403" na gravação da consulta RedeBE

## Diagnóstico (confirmado no código)

O botão **"Confirmar & Executar Consulta"** (`LeadWorkspaceModal.tsx`, `handleExecuteLocalQuery`) chama `POST /api/credit/consultas` no servidor (`src/lib/prosfec-server.ts`). O fluxo:

1. Chama a API da RedeBE (funciona — o usuário confirmou que dispara com sucesso).
2. **Debita o saldo do parceiro**: `patchDocRest("parceiros/{partnerId}", { saldoGeral })` (linha ~731) — autenticado como a **identidade de serviço** do servidor (`PROSFEC_SERVICE_EMAIL`).
3. Registra a consulta em `consultas_realizadas` via REST.

O passo 2 quebra com `Firestore PATCH 403: Missing or insufficient permissions` porque as regras atuais de `parceiros` permitem update apenas para:

- `isStaff()` (admin/contador) — a identidade de serviço não é staff;
- `isOwnPartnerDoc()` + `partnerSafeUpdate()` — a identidade de serviço não é a dona do documento (e `partnerSafeUpdate` proíbe tocar campos de saldo).

Já existe a função `isServico()` nas regras (e-mail `servico.interno@prosfec.app`), mas ela **só é usada na coleção `leads`** — não em `parceiros`.

## Alteração (somente firestore.rules)

1. Adicionar `isServico()` como condição permitida no `allow update` de `parceiros/{partnerId}`:

```
allow update: if isStaff()
              || isServico()
              || (isOwnPartnerDoc(partnerId) && partnerSafeUpdate())
              || (isOwnPartnerDoc(partnerId) && partnerAuthMigration())
              || (isMyDirectConsultant() && masterConsultantUpdate());
```

2. Robustez no mesmo bloco: adicionar `isServico()` também nas subcoleções de `parceiros` (`match /{sub=**}` → `allow write: if isStaff() || isServico() || isOwnPartnerDoc(partnerId)`), para escritas operacionais do backend (ex.: histórico) não travarem da mesma forma.

Nenhuma outra coleção é alterada. `consultas_realizadas` (create: `isSignedIn()`) e `notificacoes` (create: `isSignedIn()`) já permitem a identidade de serviço autenticada — não precisam de mudança.

## Segurança preservada

- Parceiros comuns continuam **sem** poder alterar o próprio saldo: `partnerSafeUpdate()` continua bloqueando `saldo`, `saldoDisponivel`, `comissaoTotal` etc. para o dono do documento.
- A identidade de serviço é uma conta de backend dedicada (e-mail/senha em variável de ambiente do servidor), nunca exposta ao navegador.
- Nenhuma regra existente é afrouxada para usuários finais.

## Entrega

1. Arquivo `firestore.rules` atualizado no projeto.
2. **Código completo do `firestore.rules` impresso no chat** em bloco único, para copiar e publicar no Console do Firebase (Firestore → Regras → Publicar).

## Validação (após publicar as regras)

- Recarregar o workspace de um lead, clicar em "Confirmar & Executar Consulta" com um CNPJ/CPF e confirmar: consulta concluída, saldo debitado e registro visível no histórico — sem erro 403.

## Fora de escopo (conforme solicitado)

- Nenhuma alteração de UI, nenhuma alteração na integração RedeBE, nenhum arquivo além de `firestore.rules`.
