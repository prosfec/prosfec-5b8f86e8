# Preços das mensalidades de Assessoria configuráveis pelo Administrador

Hoje os valores 497 / 797 / 1497 estão escritos direto no código, em dois lugares: na vitrine de planos mostrada após a simulação e no seletor de plano da Etapa 4. O objetivo é que o Administrador defina esses três valores na tela "Preços & Serviços" e que todas as telas passem a exibir e gravar o valor configurado.

## O que muda

### 1. Nova seção no painel do Administrador
Na aba "Preços & Serviços", abaixo da tabela de preços de consultas, entra o bloco **"Valores de Mensalidade (Assessoria)"** com três campos numéricos:

- Preço Mensal — Essential (padrão 497)
- Preço Mensal — Growth (padrão 797)
- Preço Mensal — Corporate (padrão 1.497)

Os valores são gravados junto com os demais preços, pelo mesmo botão "Salvar Todos os Preços", no mesmo documento global de configurações. O botão "Restaurar Padrões" volta os três para 497 / 797 / 1.497.

### 2. Vitrine de planos (após a simulação)
Os textos "R$ 497,00/mês", "R$ 797,00/mês" e "R$ 1.497,00/mês" passam a vir das configurações, formatados em Reais. Enquanto o valor não carrega, exibe o padrão atual — o cliente nunca vê um preço em branco.

Detalhe importante: essa tela é pública (visitante não logado), e as configurações não podem ser lidas diretamente pelo navegador de quem não está logado. Por isso os três valores serão entregues por um endereço público somente-leitura do próprio sistema, que devolve apenas esses preços.

### 3. Etapa 4 — seleção de plano na ficha do lead
As opções do seletor passam a exibir o valor configurado (ex.: "Assessoria Essential — R$ 497,00/mês"). Ao clicar em "Salvar definição", o valor gravado no lead (`valorMensalidade`) é o valor vigente nas configurações no momento da seleção — não mais o número fixo do código.

### 4. Integridade
Contrato público e aba "Faturamento (Mensalidades)" continuam lendo `valorMensalidade` do próprio lead: nada muda neles. Leads já assinados mantêm o valor contratado; alterar o preço no painel não altera contratos existentes.

## Detalhes técnicos

- **Fonte de verdade:** novo campo `mensalidades: { essential, growth, corporate }` em `configuracoes/precos_consultas`, gravado por `handleSavePrices` e zerado ao padrão por `handleResetToDefaults` em `src/components/AdminDashboard.tsx`; carregado em `fetchData` (junto de `data.precos`) para um estado `editMensalidades`.
- **Helper compartilhado** (`src/utils/serviceUtils.ts` ou novo `src/utils/planPricing.ts`): `DEFAULT_MENSALIDADES` e `normalizeMensalidades(raw)` (coage números, aplica padrão em valores ausentes/inválidos).
- **Endpoint público:** `GET /api/config/mensalidades` em `src/lib/prosfec-server.ts`, usando o `getDocRest("configuracoes/precos_consultas")` já existente, retornando apenas os três números (necessário porque a regra `configuracoes` exige `isSignedIn()`).
- **`src/components/PlanSelectionView.tsx`:** `PLANOS_PROSFEC` vira `buildPlanosProsfec(precos)`; o export atual é mantido como catálogo padrão para não quebrar `planoParaPorte`. O componente busca os preços no `useEffect` via o endpoint acima, com fallback para os padrões; `valorLabel` passa a ser formatado com `formatCurrencyBRL`.
- **`src/components/LeadWorkspaceModal.tsx`:** o `useEffect` que já lê `configuracoes/precos_consultas` (linha ~312, usuário autenticado) passa a guardar também `mensalidades`; `PLANO_VALORES` deixa de ser constante e passa a derivar desse estado, alimentando tanto os rótulos das `<option>` quanto o `valorMensalidade` salvo.
- Sem mudanças em comissões, etapas, diagnóstico, RedeBE ou pagamentos.

## Validação

1. Alterar os três valores no painel, salvar e recarregar: os campos mantêm o valor salvo.
2. Rodar uma simulação pública e conferir o preço novo no card de assessoria.
3. Na Etapa 4 de um lead, conferir os rótulos do seletor e, após "Salvar definição", o `valorMensalidade` gravado.
4. Typecheck e build sem erros.
