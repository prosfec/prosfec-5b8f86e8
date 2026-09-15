# Suspensão do comparativo de taxa de mercado

Ajuste apenas do item 8 do plano aprovado. O restante permanece como está.

## O que muda

A taxa fixa de 38% a.a. deixa de existir no resultado do simulador — nem como valor, nem como estimativa, nem como referência aproximada. Nenhum novo benchmark é criado agora.

## Backend (`src/lib/prosfec-server.ts` + `src/utils/creditEligibilityEngine.ts`)

- Remover a constante `MARKET_BENCHMARK` e todo o cálculo derivado dela: `parcelaMercado`, `economiaMensal`, `economiaTotal`.
- A resposta da rota `POST /api/credit/diagnostico-simulador` deixa de enviar `taxaMercadoAnual`, `parcelaMercado`, `economiaMensal`, `economiaTotal`, `taxaMercadoEstimativa` e `taxaMercadoObservacao`.
- `capacidadeTotal`, `excedenteCapacidade`, limite, taxa da linha, carência, prazo e parcela continuam exatamente como estão.

## Frontend — apenas ocultar o que perdeu a fonte

Mesmo o plano sendo de backend, esses campos hoje são desenhados na tela e ficariam zerados. Então:

- `src/components/Simulador.tsx`: remover o bloco de economia/comparativo (o cartão de economia mensal e total, a linha "Taxa média de 38% a.a." e o texto de vantagem competitiva que cita o valor economizado) e o cálculo local que fixava `taxaMercadoAnual: 38.0`.
- `src/components/LeadWorkspaceModal.tsx`: o Passo 1 deixa de exibir o bloco de economia mensal/total.
- `src/App.tsx`: deixa de gravar esses quatro campos no lead.

Nenhuma outra parte da interface é tocada.

## Compatibilidade com leads antigos

Os campos continuam declarados como opcionais em `src/types.ts` e os registros já gravados permanecem intactos no banco — apenas deixam de ser exibidos e de ser gravados em novas simulações.

## Registro de fontes

Em `src/utils/creditRuleSources.ts`, o item `BENCHMARK_MERCADO` passa a constar como **SUSPENSO**, com a exigência de que um benchmark futuro só entre com: fonte identificável, URL, data de verificação, metodologia de cálculo e escopo da amostra.

## Validação

`bunx tsgo --noEmit`, build limpo e uma simulação de teste confirmando que a resposta não traz mais nenhum campo de comparativo de mercado e que a tela de resultado não mostra economia.
