# Limpeza de webhooks, preços fantasmas e assinatura de parceiro dinâmica

## 1. Remoção dos webhooks Hubla e Lastlink

Em `src/lib/prosfec-server.ts`, excluir por completo:

- `POST /api/hubla-webhook` (linha ~162) e toda a lógica de baixa automática associada.
- `POST /api/webhooks/lastlink` e `GET /api/webhooks/lastlink` (linhas ~2711–2950).

Remover também `HUBLA_WEBHOOK_TOKEN` e `LASTLINK_WEBHOOK_TOKEN` de `src/utils/env.ts` e helpers que ficarem sem uso (comparação de token dos webhooks), se não forem usados por outra rota.

Nada é removido de `src/utils/serviceUtils.ts` (campo `hublaLink` dos serviços) nem dos tipos: esses dados já estão gravados em leads antigos e removê-los quebraria o catálogo de serviços. Se você quiser eliminar os links de checkout dos serviços também, digo e faço em uma etapa separada.

## 2. Correção dos preços fantasmas (Dashboard do parceiro)

Causa: em `src/components/PartnerPortal.tsx` o catálogo de preços inicia com `DEFAULT_SERVICES_CATALOG` (valores fixos no código) ou com um cache de sessão, e só depois é substituído pelo que está em `configuracoes/precos_consultas`. Por isso o parceiro vê valores antigos por um instante nas vendas e comissões dos serviços do Passo 6.

Correção:

- Estado inicial do catálogo passa a ser vazio/nulo, com um novo estado `precosCarregados`.
- Enquanto os preços não chegarem do banco, os cartões de vendas/comissões de serviços do Passo 6 exibem blocos de carregamento (skeleton `animate-pulse`) no lugar dos valores, sem números provisórios.
- O cache de sessão continua sendo usado apenas como aceleração, mas sempre revalidado; se não houver cache, nada de valor é exibido antes da resposta.

## 3. Assinatura do Parceiro configurável (Admin) — 3 preços separados

Em `src/components/AdminDashboard.tsx`, aba "Preços e Serviços", nova seção "Assinatura do Parceiro" com **três** campos numéricos distintos:

- "Preço Mensal Starter" (padrão 97)
- "Preço Mensal Executive" (padrão 97)
- "Preço Mensal Master" (padrão 97)

Os três são gravados no mesmo documento `configuracoes/precos_consultas`, em `assinaturaParceiro: { starter, executive, master }`, incluídos no salvar e na restauração de padrões, seguindo o padrão já usado em "Valores de Mensalidade (Assessoria)".

## 4. Endpoint público

`GET /api/config/mensalidades` passa a retornar também `assinaturaParceiro` com os três valores separados (`starter`, `executive`, `master`), cada um com fallback 97, mantendo os três valores de Assessoria já retornados.

## 5. Tela inicial — preço mensal por card + teste grátis

Em `src/components/Parceiros.tsx`:

- Os três planos (Starter, Executive, Master) permanecem com seus conteúdos e benefícios.
- **Cada card passa a exibir o seu próprio valor mensal dinâmico** vindo do endpoint, no lugar dos valores anuais fixos atuais (R$500/ano, R$800/ano, R$1.500/ano): Starter mostra o preço Starter, Executive o Executive e Master o Master, formatados em BRL com o sufixo "/mês". Enquanto carrega, cada card mostra um traço de carregamento no lugar do número.
- Todos os botões dos três cards passam a ser "Começar Teste Grátis de 3 Dias" e levam direto ao formulário de cadastro (`UserRegistrationForm`, via o fluxo já existente `onSelectPlan`).
- Remoção de todos os botões e links de pagamento/checkout dessa seção.


## Validação

1. Typecheck e build.
2. Abrir a vitrine e conferir os três preços mensais dinâmicos (um por card), os botões de teste grátis e a ausência de botões de pagamento.
3. Alterar os três valores no Admin e conferir a atualização em cada card da tela inicial.
4. Abrir o dashboard do parceiro e conferir que nenhum preço antigo aparece antes do carregamento.
