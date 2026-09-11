# Destravar o Diagnóstico IA (erro na auditoria)

## O que foi verificado agora

- Os modelos usados hoje (`gemini-3.6-flash`, `gemini-flash-latest`, `gemini-2.5-flash-lite`) **existem e estão ativos** na conta — consultei a lista oficial de modelos com a chave do projeto. Os modelos `gemini-1.5-*` citados no pedido **não existem mais** na lista e retornariam erro; por isso não serão usados.
- A normalização defensiva pedida (números nulos viram `0`, listas nulas viram `[]`) **já existe** no código da Etapa 1.
- A mensagem do banner só aparece em dois casos: a IA devolveu um texto que não é JSON válido, ou devolveu resposta vazia. Hoje o texto bruto **não é registrado**, então não dá para saber qual dos dois ocorreu.
- Cada tentativa da Etapa 1 tem espera máxima de 8s (segunda tentativa 6s), com limite de 800 tokens de saída. Uma resposta cortada no meio pelo limite de tokens também produz JSON inválido e cai nesse mesmo banner.

## O que será feito

### 1. Registrar a resposta bruta (diagnóstico real)
No bloco de falha do parser da Etapa 1, gravar no log do servidor a resposta bruta recebida (recortada com segurança) junto com o modelo usado e o tamanho do texto. Sem isso, qualquer correção é chute.

### 2. Parser blindado
Substituir a limpeza atual por um extrator robusto: procurar primeiro um bloco delimitado por crases (com ou sem o rótulo `json`); se não houver, recortar do primeiro `{` até o último `}` do texto, descartando qualquer frase conversacional antes ou depois. Só então converter.

### 3. Menos chance de resposta cortada
Aumentar o limite de saída da Etapa 1 (de 800 para cerca de 1500 tokens) e a espera máxima da primeira tentativa (de 8s para 12s), mantendo o orçamento total da rota dentro do limite do servidor. Resposta truncada é a causa mais provável de JSON inválido com o limite atual.

### 4. Tentativa extra em caso de JSON inválido
Hoje, quando o JSON vem inválido, o sistema repete apenas com relatório menor. Passará a repetir também com instrução reforçada de responder somente em JSON puro, antes de declarar falha.

### 5. Mensagem de erro mais útil
Quando a falha for realmente da resposta da IA, o banner passa a distinguir "a IA respondeu em formato inválido" de "a IA não respondeu", mantendo o comportamento atual de não salvar nenhum laudo estimado e liberar nova tentativa.

## Detalhes técnicos

Arquivo único: `src/lib/prosfec-server.ts`, rota `POST /api/credit/diagnostico-prosfec`.

- Nova função `extractJsonPayload(text)`: regex de bloco cercado (```` ```json ... ``` ```` / ```` ``` ... ``` ````, case-insensitive) com fallback para `slice(indexOf("{"), lastIndexOf("}")+1)`.
- `console.error("[PROSFEC IA] Raw Gemini Response:", raw.slice(0, 2000))` no `catch` do parser, sem expor chave.
- `stage1Attempts`: `[{maxItems:1,maxChars:12_000,timeoutMs:12_000,maxOutputTokens:1500}, {maxItems:1,maxChars:5_000,timeoutMs:8_000,maxOutputTokens:1200,reinforceJson:true}]`; `TOTAL_AI_BUDGET_MS` ajustado para acomodar.
- Lista de modelos mantida (`gemini-3.6-flash` → `gemini-flash-latest` → `gemini-2.5-flash-lite`) — confirmada como ativa; nenhum `gemini-1.5-*`.
- Normalização defensiva existente preservada; `code: "GEMINI_INVALID_JSON"` no erro 503.

Sem mudanças visuais, de cobrança, do fluxo RedeBE ou das regras do banco.
