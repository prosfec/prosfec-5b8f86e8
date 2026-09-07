# Novo visual do Painel do Parceiro (Soft UI / SaaS moderno)

Deixar o painel do parceiro mais leve e moderno: fundo cinza bem claro, menu lateral branco fixo, cartões brancos bem arredondados com sombra suave, e botões, campos de busca e etiquetas em formato de pílula — mantendo o verde PROSFEC como cor principal.

Nada do funcionamento muda: saldos, comissões, controle de acesso, botões de WhatsApp, buscas e gravações continuam exatamente como estão. A mudança é só de aparência.

## O que muda na tela

1. **Estrutura geral**
   - Área de conteúdo com fundo cinza super claro, ocupando a tela inteira.
   - Menu lateral branco, fixo à esquerda, com uma linha divisória bem sutil. No celular ele continua aparecendo acima do conteúdo, como hoje.

2. **Menu de navegação**
   - Item ativo em formato de pílula, com fundo verde PROSFEC e texto branco.
   - Itens inativos em cinza escuro, ganhando um fundo cinza claro ao passar o mouse.
   - Cadeados e indicadores de bloqueio continuam onde estão.

3. **Cartão do perfil**
   - Continua verde escuro (como você escolheu), só com cantos mais arredondados e sombra mais suave, para combinar com o novo conjunto.

4. **Cartões de conteúdo**
   - Dashboard, indicadores, Caça Leads, Equipe, Serviços, Perfil e Termos: fundo branco, cantos bem arredondados, sombra difusa e leve, sem bordas escuras.

5. **Botões, campos e etiquetas**
   - Botões de ação e campos de busca totalmente arredondados nas pontas; ação principal em verde PROSFEC.
   - Etiquetas/status em pílula com fundo cinza bem claro e texto colorido conforme o significado (verde, âmbar, vermelho).

6. **Respiro entre blocos**
   - Grade responsiva com espaçamento maior entre os cartões, para tudo "respirar" sobre o fundo claro.

## Alcance

- Apenas o painel do Parceiro. O painel do Administrador fica exatamente como está hoje.
- A tela de login/assinatura do parceiro recebe apenas o ajuste de fundo e arredondamento, para não destoar.

## Detalhes técnicos

- Novas classes utilitárias com prefixo próprio em `src/styles.css` (`soft-shell`, `soft-card`, `soft-nav-item`, `soft-nav-item-active`, `soft-btn`, `soft-btn-primary`, `soft-field`, `soft-badge`), via `@utility` do Tailwind v4. As utilitárias atuais (`panel`, `panel-deep`, `sidebar-item`, `stat-tile`, etc.) não são alteradas, garantindo que o Admin não seja afetado.
- Em `src/components/PartnerPortal.tsx`, apenas JSX/`className`: troca do contêiner autenticado (linha ~4709) para `flex` de tela cheia com barra lateral branca fixa; substituição de `sidebar-item`/`sidebar-item-active` pelas novas classes de pílula; varredura dos cartões (`panel`, `panel-raised`, `bg-white rounded-xl/2xl`) para `soft-card`; botões/inputs/badges para as versões `rounded-full`.
- Proibido tocar em: `useState`/`useEffect`, handlers `onClick`, `getSubscriptionStatus`, cálculos de comissão/saldo, chamadas Firestore/API e `buildWhatsAppUrl`/`formatWhatsAppPhone`.
- Verificação ao final: `bunx tsgo --noEmit` e `bun run build`, mais conferência visual do painel nas abas Dashboard, Leads e Caça Leads.
