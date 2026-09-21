# Corrigir contraste dos planos de parceiros na página inicial

## Diagnóstico confirmado

- O botão **“Conhecer o Programa de Parceiros”** abre a janela de planos em `Parceiros`.
- A janela usa fundo cinza-claro e os três cartões usam branco quase transparente.
- Vários benefícios dos planos Starter, Executive e Master estão com texto `zinc-300`, uma cor clara adequada para fundo escuro, mas aplicada sobre esses cartões claros. Essa combinação deixa as informações praticamente invisíveis.
- O problema está restrito à janela de comparação dos planos; o botão e a abertura da janela funcionam normalmente.

## Alteração

- Corrigir somente as cores de texto, ícones, divisórias e etiquetas dentro da janela dos planos para garantir contraste consistente sobre o fundo claro.
- Padronizar a leitura nos três cartões, incluindo títulos, subtítulos, preços, comissões, descrições e listas de benefícios.
- Preservar integralmente textos, preços dinâmicos, botões, seleção de plano, cadastro e demais comportamentos.
- Não alterar o restante da página inicial nem os painéis internos.

## Validação

- Abrir a janela pelo botão na página inicial e conferir os três planos em computador e celular.
- Verificar legibilidade de todas as informações, sem cortes, sobreposição ou mudança funcional.
- Confirmar que selecionar qualquer plano continua abrindo o fluxo correto.
