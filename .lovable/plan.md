# Linha do tempo animada no card "Estruturação de Crédito" (só no computador)

## O que muda

No bloco "Nossas soluções", o primeiro card ("Estruturação de Crédito") deixa de mostrar as 4 etiquetas soltas quando visto no computador e passa a exibir uma linha do tempo horizontal com 4 pontos, preenchendo o espaço vazio do card.

Os 4 passos exibidos (os mesmos textos que já existem):

1. Diagnóstico de crédito
2. Identificação de linhas
3. Estruturação de propostas
4. Preparação para solicitação

## Comportamento

- **Celular e tablet:** continua exatamente como está hoje, com as 4 etiquetas.
- **Computador:** as etiquetas somem e aparece a linha do tempo.
- **Animação:** quando o card entra na tela ao rolar, uma linha verde cresce da esquerda para a direita e acende os 4 pontos em sequência. O ponto aceso ganha miolo verde com brilho suave e o texto abaixo passa de cinza para branco.
- Acontece uma única vez por visita, respeitando quem pediu menos animação no sistema.

## Visual

- Pontos: anel escuro com borda translúcida; aceso com verde e leve brilho.
- Linha de base translúcida clara; linha de progresso verde por cima.
- Títulos abaixo de cada ponto em maiúsculas pequenas, centralizados.
- Card mantém o mesmo fundo, borda e altura; os outros cards da grade continuam alinhados.

## Detalhes técnicos

- Arquivo: `src/components/Pilares.tsx`.
- A lista `<ul>` de etiquetas do primeiro card recebe `flex lg:hidden`; um novo bloco `hidden lg:block` renderiza a timeline.
- Timeline construída com `motion/react` (já usado no arquivo): container com `whileInView` + `viewport={{ once: true }}`, trilha `bg-white/5 h-px`, barra de progresso `motion.div bg-emerald-500` animando `width: 0% → 100%` em ~1.2s, e nós com `transition delay` escalonado (0.15s, 0.45s, 0.75s, 1.05s).
- Nó: `w-4 h-4 rounded-full bg-zinc-900 border border-white/10`; ativo ganha miolo `bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]`.
- Rótulos: `text-[10px] uppercase font-bold tracking-wider text-zinc-500` → `text-white` quando ativo.
- Somente o card de índice 0 usa a timeline; os demais ficam inalterados.
- Nenhuma mudança de texto, conteúdo, rotas, SEO ou lógica.

## Validação

- `bunx tsgo --noEmit` e build.
- Conferência no navegador em desktop (linha acendendo os 4 passos) e em celular (etiquetas intactas).
