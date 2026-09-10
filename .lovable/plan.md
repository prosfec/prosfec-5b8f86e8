# Ajuste manual de saldo do parceiro (Painel Admin)

## Observação importante sobre os campos

No PROSFEC o saldo do parceiro **não** usa `saldo` / `saldoDisponivel`. Os campos reais (confirmados no código e no tipo `Partner`) são:

- `saldoGeral` — saldo unificado em reais, usado nas consultas RedeBE e serviços;
- `saldoConsultas` — campo legado mantido em paralelo (a liberação de recarga grava os dois com o mesmo valor);
- `cacaLeadsCredits` — buscas do Caça-Leads (não será tocado).

O ajuste manual vai sobrescrever `saldoGeral` e `saldoConsultas` com o novo valor, mantendo o mesmo comportamento já usado na aprovação de recargas.

## O que será feito

### 1. Botão "Ajustar Saldo"
Na aba **Parceiros** do painel admin, em dois lugares:
- no cartão de cada parceiro (visão em cards) e na linha da tabela;
- dentro do modal de detalhes do parceiro, no bloco "Saldos e Créditos da Conta".

### 2. Modal de ajuste
Ao clicar, abre um diálogo mostrando:
- nome do parceiro;
- saldo atual em reais (`saldoGeral`, com fallback para `saldoConsultas`);
- campo numérico "Novo saldo (R$)" — aceita 0 e valores decimais;
- prévia da diferença (ex.: "−R$ 49,90") calculada automaticamente;
- campo de texto opcional "Motivo do ajuste" (pré-preenchido com "Correção de falha de cobrança");
- botões Cancelar / Confirmar ajuste, com confirmação explícita antes de gravar.

Validações: valor obrigatório, numérico, não negativo; botão desabilitado enquanto grava.

### 3. Gravação e auditoria
Ao confirmar:
1. `updateDoc(parceiros/{partnerId})` gravando `saldoGeral` e `saldoConsultas` com o novo valor, mais `saldoAjustadoEm` e `saldoAjustadoPor`.
2. Registro de auditoria em `recargas` (coleção já existente e usada como extrato financeiro), com: `partnerId`, `partnerNome`, `tipo: "ajuste_manual"`, `saldoAnterior`, `saldoNovo`, `valor` (diferença), `motivo`, `status: "aprovado"`, data e e-mail do admin.
3. Notificação ao parceiro via `createNotification`, informando o ajuste e o motivo.
4. Toast de sucesso e atualização imediata do estado local `partners` (e do parceiro aberto no modal), sem precisar recarregar a página.

## Detalhes técnicos

- Arquivo alterado: `src/components/AdminDashboard.tsx` (novos estados `balanceAdjustPartner`, `balanceAdjustValue`, `balanceAdjustReason`, `isSavingBalance`, handler `handleAdjustPartnerBalance`, e o markup do modal).
- Regras do Firestore não mudam: `parceiros` já permite update por `isStaff()` e `recargas` permite create por usuário autenticado.
- Nada muda no portal do parceiro, na API RedeBE, no diagnóstico IA ou no fluxo de comissões.
