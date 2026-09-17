# Destravar a rolagem da ficha do lead no celular

## Problema confirmado

Ao abrir a ficha do lead (Mesa de Operações) no celular, o conteúdo abaixo do que cabe na tela fica cortado e não rola. Só é possível ver e preencher a parte de cima.

Causa: a ficha tem altura fixa igual à da tela, mas a área de conteúdo interna não recebe essa altura no celular. Ela cresce além do limite e o excesso é simplesmente escondido, em vez de virar uma área rolável. No computador o comportamento está correto porque ali o layout usa duas colunas.

## O que será feito

- Fazer a área de conteúdo da ficha ocupar o espaço restante da tela no celular e rolar normalmente até o fim do formulário.
- Manter o cabeçalho e a régua de etapas fixos no topo enquanto o conteúdo rola.
- Garantir que o menu de abas (Concierge, Etapas etc.) continue deslizando na horizontal, sem roubar a rolagem vertical.
- Revisar as outras janelas internas da ficha (relatório/contrato) para o mesmo comportamento no celular.
- Nada muda no computador e no tablet: o layout aprovado continua idêntico.

## Detalhes técnicos

- `src/components/LeadWorkspaceModal.tsx` linha ~2511: o wrapper `min-h-0 flex-1 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]` passa a ser `flex flex-col` no mobile, mantendo `lg:grid`.
- Linha ~2706 (corpo do workspace): acrescentar `flex-1 min-h-0` ao lado do `overflow-y-auto` existente, para que a rolagem vertical aconteça nesse elemento.
- Linha ~5481/5485 (modal secundário): conferir `max-h-[90vh]` + corpo com `flex-1 overflow-y-auto` no mobile.
- Verificação: `bunx tsgo --noEmit`, build e conferência com Playwright em viewport 390x844 rolando até o rodapé da ficha.
