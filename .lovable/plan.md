# Página inicial 100% escura (Full Dark SaaS) e mais compacta

Levar o visual escuro já aprovado no topo da página para todo o restante do site público (Segurança, Soluções, Momento da Empresa, Diagnóstico, Como Atuamos, Benefícios, Soluções Específicas, Simulador, Parceiros, FAQ, Chamada final e Rodapé).

Mudança puramente estética. Textos, links, ordem das seções, SEO, animações, responsividade e todo o funcionamento do simulador permanecem iguais.

## O que muda

1. **Fundo único**
   - Acaba o branco/cinza-claro do corpo: toda a página passa a usar o mesmo preto-azulado do topo (#0B0F14), sem quebras de cor entre as seções.
   - Divisórias entre seções feitas por linha fina branca a 10%, não por mudança de fundo.

2. **Espaçamento mais compacto**
   - Respiro vertical das seções reduzido (de generoso para compacto), eliminando os "buracos" entre blocos.
   - Menos distância entre o título da seção e os cartões; grades com espaçamento curto entre cartões.

3. **Cartões**
   - Nenhum cartão branco: superfície quase transparente (branco a 2–4%) sobre o fundo escuro.
   - Borda fina branca a 10% define o contorno; sombras removidas (a profundidade vem da borda).
   - Ao passar o mouse: leve elevação e borda esverdeada, como já acontece hoje.

4. **Tipografia de alto contraste**
   - Títulos de seção em branco, negrito e compactos.
   - Parágrafos e descrições em cinza claro.
   - Rótulos superiores (linhas curtas em caixa alta) em verde brilhante.
   - Etiquetas, ícones e listas ajustados para permanecerem legíveis no escuro.

5. **Simulador**
   - Caixa geral escura translúcida com borda branca a 10%.
   - Campos de texto e seleções com fundo preto, borda sutil, texto branco e dica em cinza.
   - Barra de progresso, etapas, validações e envio continuam exatamente como estão.
   - O simulador também aparece dentro de janelas de outras áreas: o modo escuro se aplica apenas à página inicial.

6. **FAQ**
   - Sanfona sem caixas: fundo transparente, cada pergunta separada por linha fina inferior.
   - Pergunta em cinza muito claro, resposta em cinza claro.

7. **Rodapé e chamadas finais**
   - Já escuros; serão alinhados ao mesmo preto e às mesmas bordas para não destoar.
   - As janelas de Termos e Privacidade abertas pelo rodapé também ficam escuras e legíveis.

## O que não muda

Nenhum texto, link, botão, cálculo, envio de formulário, rota ou metadado de SEO. A barra fixa de ações no celular continua funcionando igual, apenas escura.

## Detalhes técnicos

- Base da conversão em `src/styles.css`, dentro do escopo `.home-premium` (não afeta Portal do Parceiro, ADM, contrato ou proposta): remapear `bg-white`, `bg-slate-50`, `bg-gray-50`, `bg-gray-100` para `#0B0F14` / `rgba(255,255,255,0.03)`, bordas `slate-100/200` para `rgba(255,255,255,0.10)`, textos `text-gray-500/600/700/800/900` e `text-slate-*` para `#e4e4e7` / `#a1a1aa`, `shadow-*` para `none`.
- Ajustes pontuais de classe nos componentes da Home onde o token não resolve: `App.tsx` (raiz `bg-zinc-950`, wrapper do simulador, barra fixa mobile), `Seguranca.tsx`, `Pilares.tsx`, `MomentoEmpresa.tsx`, `DiagnosticoSection.tsx`, `ComoFunciona.tsx`, `Beneficios.tsx`, `SolucoesEspecificas.tsx`, `FAQ.tsx`, `CTAFinal.tsx`, `Parceiros.tsx`, `Footer.tsx`: trocar `bg-white`/`bg-slate-50` por `bg-white/[0.02] border-white/10`, `home-heading` para branco, `home-kicker` para `#34d399`.
- Compactação: `py-16 md:py-24` → `py-12 md:py-16`; `mb-10/12` dos cabeçalhos → `mb-8`; `gap-8` das grades → `gap-4`/`gap-6`.
- Simulador: escurecer somente sob `.home-simulator` (modo página), preservando `isModalMode` claro nos painéis internos. Inputs/selects/textarea → fundo `#0b0f14`, borda `rgba(255,255,255,0.10)`, texto branco, placeholder `#71717a`, foco verde.
- `.home-card` mantém a transição atual; sombra no hover trocada por realce de borda.
- Nenhuma alteração em lógica, estado, Firebase, rotas ou `head()`.

## Validação

- Typecheck e build.
- Conferência visual com captura em desktop e celular: topo, todas as seções, simulador em uso, FAQ aberto e rodapé, verificando ausência de faixas claras, textos apagados e rolagem horizontal.
