# Linha do tempo curva no card "Estruturação de Crédito" (só no computador)

A linha reta na base do card deixou um vazio grande no meio. Ela será trocada por uma curva de crescimento que atravessa o card, com os 4 pontos apoiados nos altos e baixos dessa curva.

## Como fica

- Área da curva ocupa a altura livre do card (cerca de 160 px), entre a descrição e a borda inferior.
- Uma curva suave sobe e desce como um gráfico de alta, desenhada em cinza bem discreto; por cima, a mesma curva em verde é "desenhada" da esquerda para a direita quando o card entra na tela.
- Os 4 pontos ficam encostados na curva, em alturas diferentes:
  1. Diagnóstico de crédito — mais baixo, à esquerda
  2. Identificação de linhas — subindo
  3. Estruturação de propostas — leve descida
  4. Preparação para solicitação — ponto mais alto, à direita
- Cada ponto acende em verde com brilho suave no instante em que a linha verde passa por ele, e o texto muda de cinza para branco.
- O texto de cada passo fica abaixo do ponto quando ele está no alto e acima quando está embaixo, para nunca vazar do card.
- Acontece uma vez por visita e respeita quem pediu menos animação no sistema.

## O que não muda

- Celular e tablet continuam com as 4 etiquetas atuais, intactas.
- Fundo, borda, textos, altura relativa do card e alinhamento com os cards vizinhos permanecem.
- Só o card "Estruturação de Crédito" é afetado; nada de conteúdo, links, SEO ou lógica muda.

## Detalhes técnicos

- Arquivo: `src/components/Pilares.tsx`, componente `CreditTimeline` (substitui a trilha reta atual).
- Container `hidden lg:block relative h-40 mt-auto`; `<svg viewBox="0 0 600 160" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">`.
- Dois paths com o mesmo `d` (curva Bezier: começa em ~y=120, sobe a ~y=50, desce a ~y=90, termina em ~y=30): base `stroke-white/10`, progresso `motion.path stroke-emerald-500 strokeWidth={2} fill="none" strokeLinecap="round"` com `initial={{ pathLength: 0 }}` / `whileInView={{ pathLength: 1 }}` / `viewport={{ once: true, margin: "-80px" }}` / `transition={{ duration: 1.6, ease: "easeInOut" }}`.
- Nós em `absolute` com percentuais casados ao path (≈ `left-[8%] bottom-6`, `left-[34%] top-8`, `left-[62%] bottom-12`, `right-[6%] top-3`), cada um com `w-4 h-4 rounded-full bg-zinc-900 border border-white/10` e miolo `bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]` animado com delay 0.25 / 0.65 / 1.05 / 1.45 s.
- Rótulos `text-[10px] uppercase font-bold tracking-wider w-[120px] text-center leading-tight`, cinza → branco no mesmo delay, posicionados acima ou abaixo conforme o nó.
- Fallback de movimento reduzido já coberto pela regra global existente em `src/styles.css`.

## Validação

- `bunx tsgo --noEmit` e build.
- Captura no navegador em desktop (curva desenhada e nós acesos) e em celular (etiquetas inalteradas), conferindo que o card não estoura a grade.
