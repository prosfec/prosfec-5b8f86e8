# Remover o serviço fixo "Programa de Reabilitação Financeira e Creditícia"

Apagar esse serviço direto no Firebase não resolve: ao abrir a aba Preços e Serviços,
o próprio sistema verifica se o serviço existe no catálogo e, se não existir, ele é
recriado na hora com o valor R$ 2.000,00 e o link de pagamento antigo. Por isso ele
sempre volta "cravado" na tela.

## O que muda

- O serviço deixa de ser recriado automaticamente. Se ele não estiver no catálogo salvo,
  simplesmente não aparece.
- Também deixa de existir a lista padrão que trazia esse serviço quando o catálogo
  ainda não foi salvo nenhuma vez.
- Os demais serviços (Rating/Score, Contábil) continuam exatamente como estão, com os
  links atuais.
- Depois do ajuste, basta você apagar a linha do serviço no painel (ícone de remover) e
  clicar em salvar — ele não volta mais.

## Detalhes técnicos

- `src/components/AdminDashboard.tsx` (~1499-1512): remover o bloco que faz
  `processedCatalog.unshift({ id: "serv_reabilitacao", ... })` quando `hasReabilitacao`
  é falso; remover a variável `hasReabilitacao`.
- `src/components/AdminDashboard.tsx` (~1514-1520): manter o preenchimento de links
  padrão por id, mas excluir `serv_reabilitacao` e `serv_renegociacao` dessa
  atribuição, para que o link antigo não seja reaplicado.
- `src/utils/serviceUtils.ts`: remover o item `serv_reabilitacao` de
  `DEFAULT_SERVICES_CATALOG` (usado como fallback quando não há catálogo salvo).
- Nada nas rotas de servidor, comissões, preços dos outros serviços, leads já
  cadastrados, contratos ou regras do Firebase.
- Validação: `bunx tsgo --noEmit` e build.

## Observação sobre leads já existentes

Leads que já têm esse serviço gravado continuam com ele (histórico preservado).
A remoção afeta o catálogo, que é o que alimenta novos leads.

## Fora de escopo

Links dos demais serviços, preços, comissões, saldo, consulta de crédito, anexo de PDF,
autenticação, site público.
