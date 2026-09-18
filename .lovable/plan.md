# Linha do tempo curva no card "Estruturação de Crédito" (só no computador)

A linha reta na base do card deixou um vazio grande no meio. Ela será trocada por uma curva de crescimento que atravessa o card, com os 4 pontos apoiados nos altos e baixos dessa curva.

## Como fica

- A curva ocupa a altura livre do card, entre a descrição e a borda inferior.
- Uma curva suave sobe e desce como um gráfico de alta, em cinza bem discreto; por cima, a mesma curva em verde é "desenhada" da esquerda para a direita quando o card entra na tela.
- Os 4 pontos ficam exatamente sobre a curva, em alturas diferentes:
  1. Diagnóstico de crédito — mais baixo, à esquerda
  2. Identificação de linhas — subindo
  3. Estruturação de propostas — leve descida
  4. Preparação para solicitação — ponto mais alto, à direita
- Cada ponto acende em verde com brilho suave no instante em que a linha verde passa por ele, e o texto muda de cinza para branco.
- O texto de cada passo fica abaixo do ponto quando ele está no alto e acima quando está embaixo, para nunca vazar do card.
- Acontece uma vez por visita e respeita quem pediu menos animação no sistema.

## O que não muda

- Celular e tablet continuam com as 4 etiquetas atuais, intactas.
- Fundo, borda, textos e alinhamento com os cards vizinhos permanecem.
- Só o card "Estruturação de Crédito" é afetado; nada de conteúdo, links, SEO ou lógica muda.

## Detalhes técnicos

Arquivo único: `src/components/Pilares.tsx`, componente `CreditTimeline` (substitui a trilha reta em HTML).

**Arquitetura: um único sistema de coordenadas.** Linha, nós e rótulos vivem todos dentro do mesmo `<svg>`; nenhuma `<div>` posicionada por `absolute`/percentual. Assim a linha e os pontos escalam juntos em qualquer largura (1024 px ou 1920 px).

- Container: `hidden lg:block mt-auto w-full`.
- `<svg viewBox="0 0 1000 200" preserveAspectRatio="none" className="w-full h-40 overflow-visible">` — viewBox largo para precisão e para os rótulos das pontas não serem cortados; `overflow-visible` como garantia extra.
- Path único `d = "M 60 150 C 180 150, 220 60, 330 60 S 520 120, 640 120 S 860 40, 940 40"` (coordenadas dos nós: 60/150, 330/60, 640/120, 940/40).
- Dois `<path>` sobrepostos com o mesmo `d`, ambos `fill="none" strokeWidth={2} strokeLinecap="round" vectorEffect="non-scaling-stroke"`:
  - base `stroke="rgba(255,255,255,0.10)"`;
  - progresso `motion.path stroke="#10b981"` com `initial={{ pathLength: 0 }}`, `whileInView={{ pathLength: 1 }}`, `viewport={{ once: true, margin: "-80px" }}`, `transition={{ duration: 1.8, ease: "easeInOut" }}`.
- Nós: por passo, um `<circle r={9} fill="#18181b" stroke="rgba(255,255,255,0.10)" vectorEffect="non-scaling-stroke" />` mais um `<motion.circle r={4} fill="#10b981" vectorEffect="non-scaling-stroke" />` com `initial={{ opacity: 0, scale: 0.4 }}`, `whileInView={{ opacity: 1, scale: 1 }}`, delay 0.2 / 0.7 / 1.2 / 1.7 s (tempo aproximado em que o traçado cruza cada coordenada). Brilho por `filter` SVG (`feGaussianBlur` em `<defs>`), substituindo o `shadow-[...]` do CSS que não se aplica a SVG.
- Rótulos: `<motion.text textAnchor="middle" fontSize={11} fontWeight={700} letterSpacing={1.2}>` com o texto em maiúsculas, `y` deslocado +28 quando o nó está num pico e −22 quando está num vale. Cor animada de `#71717A` para `#FFFFFF` com o mesmo delay do nó. Títulos longos quebrados em dois `<tspan>` para não colidirem.
- `preserveAspectRatio="none"` estica o eixo X; `vector-effect="non-scaling-stroke"` em todos os traços impede espessura distorcida. Como o texto SVG também esticaria, os rótulos ficam num segundo `<svg>` irmão? Não — em vez disso o SVG usa `preserveAspectRatio="none"` apenas se necessário; a escolha adotada é **manter `preserveAspectRatio="none"` e renderizar os rótulos com `<text>` dentro de um `<g>` com contra-escala horizontal via `transform` calculado por `useRef`+`ResizeObserver`**, garantindo tipografia sem distorção e alinhada ao `cx` de cada nó.
- Movimento reduzido já coberto pela regra global existente em `src/styles.css`.

## Validação

- `bunx tsgo --noEmit` e build.
- Captura no navegador em 1024 px, 1440 px e 1920 px conferindo que os nós continuam colados na curva e que os textos não distorcem; captura em celular conferindo as etiquetas inalteradas.
