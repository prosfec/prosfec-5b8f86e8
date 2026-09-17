# Painel do Parceiro com experiência de aplicativo no celular

Objetivo: melhorar o uso no celular sem mudar nada no desktop/tablet já aprovado. Nenhuma regra de negócio, estado ou dado é alterado — apenas layout e estilo.

## O que muda no celular

1. **Fim do zoom automático no iPhone**
   - Campos de texto, seleção e área de texto passam a ter fonte mínima de 16px em telas pequenas, o que impede o Safari de dar zoom ao tocar no campo. No desktop a fonte compacta continua igual.

2. **Áreas de toque maiores**
   - Botões principais, itens do menu e ações de cartão passam a ter altura mínima confortável para o polegar no celular, voltando ao tamanho compacto a partir do desktop.

3. **Menu lateral**
   - Já funciona como gaveta sobre a tela com fundo escurecido e fecha ao tocar num item. Ajuste: mais respiro entre os itens do menu no celular, para evitar toque errado.

4. **Listas e funil**
   - Tabelas largas ganham rolagem lateral suave com "encaixe" de coluna, em vez de espremer o conteúdo.
   - No Funil Kanban Vendas, cada coluna passa a ocupar quase a largura da tela no celular, com rolagem lateral que para uma coluna por vez. No desktop o funil continua exatamente como está.

5. **Janelas de ação viram folha inferior**
   - No celular, janelas como Adicionar Saldo, Adquirir Recarga e Solicitar Comissão passam a subir da base da tela, coladas embaixo, com cantos arredondados só no topo e rolagem interna. No desktop continuam centralizadas como hoje.

6. **Dashboard "cockpit" do desktop**
   - Intocado. Todos os ajustes usam as regras de tela pequena e são revertidos a partir de `md:`/`lg:`.

## Detalhes técnicos

- `src/styles.css`: regra em `@media (max-width: 1023px)` fixando `font-size: 16px` em `input, select, textarea` (inclui `input[type=...]`), sem tocar em tokens de tema; ajuste de altura mínima em `@utility soft-nav-item` apenas nessa faixa.
- `src/components/PartnerPortal.tsx` (apenas JSX/classes):
  - gaveta mobile (~4813): `space-y-3` entre itens de navegação no bloco `renderNavItems` com `lg:space-y-1`.
  - kanban (~6960): container `overflow-x-auto snap-x snap-mandatory`, remoção do `min-w-[1500px]` fixo no mobile (mantido em `lg:`), colunas `w-[86vw] snap-start lg:w-72`.
  - tabelas com `overflow-x-auto` (~5948, 6175, 6587, 9278, 9497): adicionar `snap-x` e rolagem suave; as que já são `hidden md:block` ficam como estão.
  - modais de saldo/recarga/comissão (~10381, 10450, 11095, 11198, 11338, 11677, 12004): wrapper passa a `items-end md:items-center`, painel interno `w-full rounded-t-2xl rounded-b-none md:rounded-2xl max-h-[88vh] overflow-y-auto`.
  - botões de ação: `min-h-[44px] lg:min-h-0 lg:h-9` nos CTAs principais do dashboard e dos modais.
- Nenhum `useState`, handler, consulta ou cálculo é modificado.

## Validação

- `bunx tsgo --noEmit` e build limpo.
- Conferência com Playwright em 390x844 (celular) e 1604x994 (desktop), garantindo que o cockpit não cresceu nem quebrou.
