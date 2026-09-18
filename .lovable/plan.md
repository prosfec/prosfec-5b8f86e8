# Corrigir texto invisível nos campos do simulador (página inicial)

## Diagnóstico (confirmado no navegador)

Medição real no preview: os campos do simulador na Home estão com `color: rgb(15, 23, 42)` (quase preto) sobre fundo escuro `rgb(11, 15, 20)` — por isso o texto digitado "some".

Causa técnica: a regra direta `.home-simulator input { color: #ffffff }` (src/styles.css, linha 1673) perde a disputa de cascata para a classe utilitária `text-slate-800` que o componente Simulador.tsx aplica nos campos. E `text-slate-800` não está na lista de remapeamento do skin escuro (linhas 1741-1754), que cobre `text-slate-900/600/500` mas esqueceu o `800`. Os campos de valores monetários usam `text-emerald-800`, também fora da lista.

## O que muda

Somente o bloco "Tema escuro do Simulador na Home" em `src/styles.css`:

1. **Campos de texto/seleção**: incluir `text-slate-800` e `text-slate-700` na lista que vira branco (`#ffffff`) — assim tudo que se digita aparece claro sobre o fundo escuro.
2. **Campos de valores (R$)**: remapear `text-emerald-800` e `text-emerald-700` para um verde claro legível (`#6ee7b7`), mantendo o destaque em verde que esses campos têm hoje.
3. Reforçar a regra direta de cor dos campos com maior especificidade (ex.: `.home-simulator input[class]`), garantindo que nenhuma utilidade do componente volte a derrubar a cor clara.

Nada muda no componente `Simulador.tsx`, nas janelas dos painéis internos (que usam o mesmo simulador em tema claro — o skin é escopado a `.home-simulator` da Home), nem em textos, lógica ou funcionamento.

## Detalhes técnicos

- Arquivo único: `src/styles.css`, bloco `.home-simulator` (linhas ~1741-1760) e regra de campos (linhas ~1673-1679).
- Validação: `bunx tsgo --noEmit`, build e Playwright medindo `getComputedStyle` dos inputs/selects — cor deve sair clara (branco/verde claro) — com screenshot desktop e mobile da seção #simulador com campos preenchidos.
