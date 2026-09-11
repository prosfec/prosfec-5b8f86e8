# Preencher os cards do diagnóstico com os dados reais da auditoria

## O que foi verificado

- A chamada da Etapa 1 já usa o modo JSON nativo: `responseMimeType: "application/json"` mais um `responseSchema` com os campos da auditoria. Ou seja, o Gemini já é obrigado a devolver JSON válido — não é aí que está a falha.
- O problema real é de **campos que não existem** na auditoria: o esquema atual não tem rating, nem score numérico, nem percentual de inadimplência. Ele só tem `scoreEstimado` como texto livre e `classificacaoElegibilidade`.
- Na tela (`FintechDiagnosisView.tsx`), depois da limpeza das inferências, rating e inadimplência só apareceriam se viessem da consulta bruta; como a auditoria não entrega esses campos, os cards mostram "Não informado" e "—".
- O score só aparece quando `scoreEstimado` contém um número; com a instrução atual a IA pode responder "Não informado" e o card fica vazio.

## O que será feito

### 1. Ampliar a auditoria com os campos que a tela mostra
Adicionar ao esquema JSON da Etapa 1, com preenchimento obrigatório a partir dos relatórios reais:

- `scoreNumerico` (0 a 1000; `0` quando nenhum score constar)
- `ratingConsolidado` (letra A–H; `"X"` quando não constar) — já considerando a regra de risco cruzado, ou seja, rebaixado pelos sócios quando for o caso
- `probabilidadeInadimplenciaPercent` (0 a 100; `0` quando não constar)

Esses campos entram também no molde do prompt e na lista de obrigatórios do esquema, sempre com placeholders neutros e a proibição de copiar exemplos.

### 2. Normalização defensiva das chaves no servidor
Criar uma camada de leitura tolerante logo após o `JSON.parse`: para cada campo, aceitar variações comuns de nome antes de gravar no formato oficial. Exemplos aceitos:

- score: `scoreNumerico`, `score`, `scoreBacen`, `score_serasa`, ou o número extraído de `scoreEstimado`
- rating: `ratingConsolidado`, `rating`, `ratingEmpresa`, `classificacaoRating`
- inadimplência: `probabilidadeInadimplenciaPercent`, `inadimplencia`, `inadimplenciaPercent`, `probabilidadeInadimplencia`
- dívidas/protestos/capacidade: variações em `snake_case` e sinônimos (`totalDividas`, `valor_negativacoes`, `valorTotalProtestos`, `capacidadeGeral`, `limitePronampe`, etc.)

A normalização é só de nome de chave: nenhum valor é inventado. Campo ausente continua `0`, `""` ou `[]`, e a comparação de nomes ignora maiúsculas, acentos e underscores.

### 3. Tela lê os novos campos
`FintechDiagnosisView.tsx` passa a usar, na Camada 2, o rating, o score e a inadimplência vindos da auditoria normalizada — mantendo a prioridade para o dado da consulta estruturada quando ele existir. Sem dado real, continua "Não informado", sem qualquer inferência a partir da elegibilidade.

### 4. Score no texto do laudo
Ajustar a instrução da Etapa 1 para que `scoreEstimado` seja preenchido com o score real quando existir, e `scoreNumerico` acompanhe o mesmo valor.

## Detalhes técnicos

- `src/lib/prosfec-server.ts`, rota `POST /api/credit/diagnostico-prosfec`: novos campos no `responseSchema` (`scoreNumerico`, `ratingConsolidado`, `probabilidadeInadimplenciaPercent`), novo helper `pickField(parsed, [aliases])` usado na montagem de `auditResult`, molde do prompt atualizado. `responseMimeType: "application/json"` mantido.
- `src/components/FintechDiagnosisView.tsx`: Camada 2 passa a ler `ratingConsolidado`, `scoreNumerico` e `probabilidadeInadimplenciaPercent` da auditoria.
- Validação: `bunx tsgo --noEmit` e build OK; gerar um diagnóstico real e conferir os cards.

Sem mudanças em cobrança, RedeBE, locks ou regras do banco.
