# Remover informativo "Link de Afiliado" dos planos de parceiro

## Contexto
Na janela de planos da página inicial (`src/components/Parceiros.tsx`), os três cartões (Starter, Executive e Master) ainda exibem um item de benefício: "Link de Afiliado Exclusivo: Ganhe 30% ..." — modelo que não existe mais no projeto.

Escopo confirmado: a aba de afiliados no painel do parceiro já está desativada e não é exibida; o informativo visível está somente nos três cartões de plano.

## Mudanças
Em `src/components/Parceiros.tsx`, remover os três itens `<li>` "Link de Afiliado Exclusivo ..." das listas de benefícios dos cartões Starter (~linha 376-381), Executive (~linha 501-506) e Master (~linha 616-621).

## Limites
- Nenhuma alteração de preços dinâmicos, badges, botões, seleção de plano ou cadastro.
- Nenhuma alteração em regras de comissão, dados históricos ou outras páginas.

## Validação
- `bunx tsgo --noEmit` e build.
- Playwright desktop e mobile: abrir a janela de planos pelo botão "Conhecer o Programa de Parceiros" e confirmar que os três cartões não mostram mais o item e permanecem legíveis.
