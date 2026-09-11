# Corrigir a falha de entrega do Diagnóstico PROSFEC IA

## O que a varredura encontrou

Testei a chave e os modelos direto no provedor, com os mesmos parâmetros que o sistema usa hoje:

- A chave está ativa e válida (nenhum erro de autenticação, nenhum limite estourado).
- Os três modelos usados existem e respondem normalmente.
- **A falha não é de configuração da chave — é de limite de escrita e de tempo.**

Os modelos novos "pensam" antes de escrever, e esse raciocínio consome o mesmo limite de escrita do laudo. Com o teto atual (2.200) o resultado medido foi:

```text
modelo mais novo   -> gastou 1.445 no raciocínio, sobrou pouco -> laudo CORTADO no meio
modelo intermediário -> gastou 631 no raciocínio -> laudo CORTADO no meio
modelo mais antigo  -> não usa raciocínio -> laudo COMPLETO
```

Consequências diretas do corte: o laudo termina antes dos blocos finais de serviços e do plano de ação, e por isso a tela fica sem serviços, sem sub-etapas e com campos vazios. O tempo também está apertado: uma geração real levou 12,4 segundos e o limite configurado é 12 segundos, então boa parte das tentativas morre como "a IA demorou demais".

Também confirmei que o comando usado hoje para reduzir o raciocínio só funciona no modelo antigo; nos modelos novos o comando correto é outro e hoje simplesmente não é aplicado.

## O que será feito

1. **Reduzir o raciocínio nos modelos novos** usando o comando que eles realmente aceitam, mantendo o comando antigo apenas no modelo antigo. Sobra muito mais espaço para o texto do laudo.
2. **Ampliar o limite de escrita** da etapa de auditoria e, principalmente, da redação do laudo, para caber o relatório inteiro com os dois blocos finais.
3. **Ampliar os prazos**: tempo por tentativa e orçamento total de geração, alinhados ao tempo real medido, para acabar com o erro de demora.
4. **Rejeitar laudo cortado**: se a resposta vier truncada ou sem os blocos finais de serviços e plano de ação, o sistema tenta o próximo modelo em vez de salvar um diagnóstico incompleto. Se todos falharem, continua exibindo erro claro — nunca laudo pela metade.

## Detalhes técnicos

Arquivo: `src/lib/prosfec-server.ts`, rota `POST /api/credit/diagnostico-prosfec`.

- `generateContentWithFallback`: substituir a regra atual (`thinkingConfig: { thinkingBudget: 0 }` só para `gemini-2.5*`) por `thinkingConfig: { thinkingLevel: "low" }` nos modelos `gemini-3*` e manter `thinkingBudget: 0` no `gemini-2.5-flash-lite`. Medido: `thinkingBudget` em `gemini-3.6-flash` retorna `INVALID_ARGUMENT`; `thinkingLevel: "low"` é aceito.
- Etapa 1 (`stage1Attempts`): `maxOutputTokens` 1.500/1.200 → 3.000/2.400; `timeoutMs` 14s/10s → 25s/18s.
- Etapa 2: `maxOutputTokens` 2.200 → 6.000; timeout `Math.min(12_000, remainingMs)` → `Math.min(45_000, remainingMs)`.
- `TOTAL_AI_BUDGET_MS`: 30.000 → 90.000, com a guarda de sobra mínima recalculada.
- Após a Etapa 2, validar que `responseText` contém os blocos `json_servicos` e `json_subetapas`; sem eles, tratar como falha do modelo e seguir para o próximo candidato (mesmo caminho de erro já existente, sem gravar laudo parcial no Firestore).

Nada muda nas regras de prompt (risco cruzado, fidelidade, formato estrito), na normalização de chaves nem na tela `FintechDiagnosisView.tsx`.

## Verificação

`bunx tsgo --noEmit` + build, e em seguida gerar um diagnóstico real para conferir laudo completo, serviços e plano de ação preenchidos.
