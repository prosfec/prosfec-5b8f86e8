# Acabamento "Fintech Premium" no painel do parceiro

Somente estética. Nenhuma mudança de grid, de layout mobile, de textos ou de lógica (saldos, comissões, consultas, botões e seus comportamentos ficam idênticos).

## O que muda visualmente

1. **Fundo e superfícies**
   - Fundo da área do painel passa de branco para um off-white sutil (slate-50), fazendo os cartões brancos se destacarem.
   - Cartões perdem a borda marcada; ficam com borda quase invisível e sombra difusa e suave.
   - Cartões clicáveis ganham transição suave e sombra um pouco maior ao passar o mouse.

2. **Cartão do usuário e cartão de saldo (verde escuro)**
   - Verde chapado vira gradiente sofisticado (verde profundo → grafite), com um filete interno claro que dá acabamento de "cartão black".

3. **Tipografia**
   - Rótulos como "TOTAL INDICADOS", "SALDO GERAL": cinza médio, corpo pequeno, semibold, maiúsculas com espaçamento entre letras.
   - Números principais: quase-preto, negrito, com letras levemente mais juntas.

4. **Botões**
   - Ações principais (Copiar, Adicionar, Recarregar, Solicitar Comissão) ganham leve elevação e micro-deslocamento no hover.
   - Botões escuros deixam o preto puro e usam grafite; o verde fica em tom vibrante moderno.

5. **Caixinhas de ícone**
   - Fundo sólido claro vira fundo verde bem suave com ícone verde, cantos mais arredondados e anel discreto.

## Restrições

- Tamanhos compactos atuais mantidos (nada cresce).
- Mobile/gaveta/kanban/modais permanecem como estão.
- Painel do ADM não é tocado.

## Detalhes técnicos

- `src/styles.css`: ajustar as utilitárias `soft-card`, `soft-btn`, `soft-btn-primary`, `soft-badge` e `soft-nav-item-active` (sombras difusas, hover com `translateY(-1px)`, paleta emerald/slate). Nada fora do escopo `.soft-ui`.
- `src/components/PartnerPortal.tsx`: apenas `className` — fundo do shell para `bg-slate-50`, cartões verdes para `bg-gradient-to-br from-emerald-900 to-slate-900 ring-1 ring-white/10`, rótulos para `text-[11px] font-semibold uppercase tracking-wider text-slate-500`, valores para `font-bold tracking-tight text-slate-900`, contêineres de ícone para `bg-emerald-50 text-emerald-600 rounded-xl ring-1 ring-emerald-100/60`.
- Proibido tocar em estado, handlers, chamadas Firestore/API, cálculos e breakpoints `md:`/`lg:` já definidos para mobile.

## Validação

- `bunx tsgo --noEmit` e build limpo.
- Conferência visual em desktop (1627px) do Dashboard do parceiro.
