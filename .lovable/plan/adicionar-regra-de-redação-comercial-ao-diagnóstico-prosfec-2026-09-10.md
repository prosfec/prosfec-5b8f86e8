# Adicionar regra de redação comercial ao Diagnóstico PROSFEC IA

## Objetivo
Evitar contradições no laudo técnico quando a `capacidadeTomadaGeral` da auditoria for `0` ou nula, mas a empresa for classificada como saudável/alta elegibilidade ou possuir limites em linhas específicas (ex: PRONAMPE).

## Escopo
- Alterar APENAS o arquivo `src/lib/prosfec-server.ts`.
- Inserir a nova regra no `stage2SystemPrompt`, na seção de diretrizes de redação executiva, antes da `ESTRUTURA DO LAUDO EM MARKDOWN`.
- A regra deve ser adicionada em caixa alta, como as demais regras anti-alucinação já existentes.

## Mudança técnica
No bloco `stage2SystemPrompt`, após a `REGRA 4: CLASSIFICAÇÃO LITERAL` e antes do item `1. TOM FORMAL E PERICIAL BANCÁRIO`, incluir:

```text
REGRA 5: REDAÇÃO COMERCIAL DE CAPACIDADE. Se a variável capacidadeTomadaGeral for 0 ou nula, mas a empresa for classificada como "Saudável" / "Alta Elegibilidade" ou possuir limite estimado em outras linhas (como PRONAMPE), OMITA completamente qualquer menção de que a capacidade geral é R$ 0,00. É expressamente proibido afirmar que uma empresa com Alta Elegibilidade possui limite de R$ 0,00. Em vez disso, exalte a saúde financeira, foque nos limites que foram identificados (ex: PRONAMPE) e afirme que a empresa tem forte potencial de alavancagem junto ao mercado.
```

## Validação
- Executar `bunx tsgo --noEmit` para garantir que a alteração não quebre a tipagem.
- Verificar o build (`build OK` em `/tmp/observability/build-errors.log`).
- Não alterar interface visual, regras do Firestore, APIs ou lógica de autenticação.
