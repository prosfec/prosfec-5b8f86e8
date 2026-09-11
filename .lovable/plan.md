# Diagnóstico PROSFEC: eliminar valores presumidos e endurecer o formato da IA

## O que foi verificado no código atual

- Não existem no código os números citados (850, 60000, "Rating A", 5%) gravados como valor fixo em `catch`, `default` ou estado inicial. A busca em `src/lib/prosfec-server.ts` e `src/components/FintechDiagnosisView.tsx` não encontrou nenhum deles.
- As regras de risco cruzado, formato estrito e fidelidade já existem no prompt da Etapa 1 (`buildStage1Prompt`).
- O parser já extrai do primeiro `{` até o último `}` (`extractJsonPayload`) e, se o `JSON.parse` falhar, a rota lança erro 503 (`GEMINI_INVALID_JSON`) sem salvar laudo.

Ou seja: os números que aparecem na tela hoje vêm de **inferências** e de **exemplos numéricos dentro do prompt**, não de mocks. Os pontos exatos:

1. `FintechDiagnosisView.tsx` converte a classificação de elegibilidade em letra de rating: "Alta" vira **A**, "Média" vira C, "Baixa" vira E, "Crítica" vira G. É daí que sai o "Rating A".
2. A mesma tela ainda raspa score, rating e percentual de inadimplência do **texto livre** do laudo por expressão regular, e também do `fichaRatingCredito` do lead — dados que podem não ter relação com a consulta atual.
3. O prompt da Etapa 1 traz exemplos numéricos que o modelo pode copiar: `"scoreEstimado"` com o exemplo "280/1000 ... 750/1000" e `capacidadeTomadaPronampe` descrita como "30% do faturamento anual, teto 500k" — instrução de cálculo que produz potencial estimado mesmo sem dado real.
4. Em outra rota do backend há um faturamento presumido de `600000` quando o lead não informa receita.

## O que será feito

### 1. Prompt sem números de exemplo (backend)
No molde JSON da Etapa 1, trocar todo exemplo numérico por placeholder neutro (`0`, `"X"`, descrição sem número) e remover a fórmula de cálculo do PRONAMPE do texto do campo. Acrescentar em caixa alta: "É PROIBIDO COPIAR OS VALORES DO EXEMPLO. VOCÊ DEVE EXTRAIR OS NÚMEROS REAIS DOS TEXTOS FORNECIDOS." A regra de risco cruzado será reescrita com o parágrafo exato solicitado.

### 2. Fim das inferências na tela do diagnóstico
- Remover a conversão elegibilidade → letra de rating. Sem letra real vinda da consulta, a tela mostra "Não informado".
- Remover a raspagem de score, rating e inadimplência do texto livre do laudo e o uso de `fichaRatingCredito` como fonte de score/rating do diagnóstico.
- Fontes permitidas passam a ser apenas: a consulta estruturada (RedeBE/Serasa) e a auditoria validada da Etapa 1. Faltando o dado, exibe "Não informado" ou `0` — nunca um número construído.

### 3. Capacidade de captação só quando auditada
O potencial só aparece quando a auditoria devolver valor maior que zero. Sem isso, o bloco mostra "Não informado", sem cálculo local.

### 4. Parser sem tolerância
Mantido o corte do primeiro `{` ao último `}`; em falha de parse, erro explícito e banner vermelho na tela, sem nenhum valor padrão. Também será removido o faturamento presumido de 600000 na rota auxiliar, passando a 0 quando não informado.

## Detalhes técnicos

- `src/lib/prosfec-server.ts`: reescrita do molde JSON e das regras em `buildStage1Prompt`; remoção do fallback `600000` (linha ~1761). Nenhuma mudança em cobrança, locks, RedeBE ou regras do banco.
- `src/components/FintechDiagnosisView.tsx`: remoção da Camada 3 (ficha) e da Camada 4 (texto livre) para score/rating/inadimplência; remoção do mapeamento elegibilidade → letra; `capMin`/`capMax` apenas da auditoria.
- Validação: `bunx tsgo --noEmit` e build OK.
