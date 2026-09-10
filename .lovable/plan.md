# Plano: Regras Anti-Alucinação no Diagnóstico PROSFEC IA

## Objetivo
Adicionar instruções críticas e restritivas ao System Prompt do Gemini na rota `POST /api/credit/diagnostico-prosfec`, evitando que a IA invente valores de dívidas, protestos ou prejuízos SCR e recomende serviços de "Limpa Nome" para empresas sem restrições.

## Escopo
- Alterar APENAS o arquivo `src/lib/prosfec-server.ts`.
- Inserir as regras no System Prompt da Etapa 2 (`stage2SystemPrompt`), responsável pelo laudo executivo e pelos blocos `json_servicos` / `json_subetapas`.
- Manter toda a lógica existente intacta (extração de JSON, parsing, validação de laudo vazio, locks, débito, etc.).

## Mudança técnica
No bloco `stage2SystemPrompt` (após a seção `DIRETRIZES DA REDAÇÃO EXECUTIVA` e antes da `ESTRUTURA DO LAUDO EM MARKDOWN`), incluir as seguintes regras em caixa alta:

```text
REGRA 1: FIDELIDADE ABSOLUTA. Você é proibido de inventar ou estimar valores de dívidas, protestos, cheques sem fundo ou prejuízos no SCR. Se o relatório indicar 0, vazio ou Nada Consta, os campos numéricos do JSON devem ser estritamente 0.

REGRA 2: COERÊNCIA COMERCIAL. Nunca recomende serviços de Limpa Nome, Baixa de Protesto ou Saneamento de SCR se a empresa não tiver essas restrições. Para empresas limpas (saudáveis), o plano de ação (json_subetapas) e os serviços (json_servicos) devem focar APENAS em serviços preventivos (ex: Melhoria de Rating, Estruturação de Capacidade, Proteção Financeira).

REGRA 3: COERÊNCIA TOTAL. O texto final em Markdown e a estrutura JSON (json_servicos/json_subetapas) devem estar 100% alinhados: nenhum dado, valor ou serviço pode aparecer em um e contradizer o outro.
```

## Validação
- Executar `bunx tsgo --noEmit` para garantir que a alteração não quebre a tipagem.
- Verificar o build (`build OK` em `/tmp/observability/build-errors.log`).
- Não alterar interface visual, regras do Firestore, APIs ou lógica de autenticação.
