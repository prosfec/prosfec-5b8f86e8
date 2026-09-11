# Diagnóstico PROSFEC: acabar com números presumidos, incluir os sócios e blindar a leitura da IA

## O que foi verificado agora no sistema

- **Números presumidos existem, sim** — em `FintechDiagnosisView.tsx` (linhas 275-282): quando o laudo não traz a inadimplência, o sistema **inventa** um percentual a partir da letra do rating (Rating A vira 5%, B vira 15%, C 32%, e assim por diante). Também deriva a letra do rating a partir do score quando ela não vem no laudo.
- **Não existe** um laudo falso completo salvo em caso de erro: quando a IA falha, a rota já devolve erro (503/502) com códigos próprios e a tela mostra o aviso. Isso já está correto.
- **Os CPFs dos sócios já são buscados** no banco (a lista de documentos inclui CNPJ + CPFs), **mas só 1 consulta chega até a IA**: o resumo é limitado a 3 consultas e a Etapa 1 envia apenas a primeira (`maxItems: 1`). Na prática, a IA analisa só o CNPJ. Além disso, o bloco enviado não identifica o que é CNPJ e o que é CPF de sócio.
- **O parser já corta o lixo** (`extractJsonPayload`): já lê bloco com crases e já faz o recorte do primeiro `{` até o último `}`. Falta apenas abortar de forma explícita quando o recorte não produzir JSON válido.
- O campo `servicosNecessariosIds` já é forçado a lista de textos no esquema, mas o prompt não proíbe expressamente objetos com título/preço.

## O que será feito

### 1. Remover os números presumidos da tela
- Eliminar a tabela que transforma rating em percentual de inadimplência. Sem o dado no laudo, o campo mostra "—" / "Não informado".
- Eliminar a conversão de score em letra de rating: a letra só aparece se vier do laudo ou da consulta real.
- Nenhum outro valor da tela passa a ser estimado.

### 2. Levar CNPJ e sócios para a análise
- Ampliar o envio para todas as consultas do lead (até 6, as mais recentes), com rótulo claro por bloco: `EMPRESA (CNPJ ...)` ou `SÓCIO (CPF ...)`, usando o documento consultado.
- Aumentar o limite de conteúdo enviado para acomodar os blocos extras, mantendo o corte de segurança por tamanho e o orçamento de tempo da rota.

### 3. Regra de risco cruzado no prompt
Adicionar à Etapa 1, em caixa alta:
- Avaliar CNPJ e CPFs em conjunto; se a empresa está limpa mas os sócios têm apontamentos graves (Refin, Pefin, protestos, prejuízo BACEN), o risco **contamina** a empresa: rebaixar o rating consolidado, bloquear a sugestão de crédito e listar os apontamentos dos sócios em `fatoresCriticosBloqueio`.
- Responder **somente** com o objeto JSON, sem crases, sem repetir instruções.
- `servicosNecessariosIds` deve conter **apenas códigos** de serviços do catálogo, nunca objetos com título ou preço.

### 4. Parser à prova de lixo
Manter a extração atual e adicionar aborto explícito: se após o recorte o conteúdo não converter em JSON, registrar a resposta bruta no log e devolver erro claro (`GEMINI_INVALID_JSON`), sem salvar nada.

## Detalhes técnicos

- `src/components/FintechDiagnosisView.tsx`: remover o bloco de inferência de `inadimplenciaPercent` por letra (linhas ~275-282) e a derivação `scoreVal → ratingLetter` (~259-267); manter apenas leitura do laudo e das consultas estruturadas.
- `src/lib/prosfec-server.ts` (rota `POST /api/credit/diagnostico-prosfec`):
  - `consultationsSummary`: `.slice(0, 6)`, incluindo `documento`/`tipoDocumento` derivados do doc consultado (CNPJ do lead vs. CPF em `leadData.socios`).
  - `buildConsultationsBlock`: prefixo textual por item (`### EMPRESA — CNPJ x` / `### SÓCIO <nome> — CPF y`), `maxItems` da Etapa 1 de 1 para 6 e `maxChars` de 12k para ~20k, com truncagem preservada.
  - `buildStage1Prompt`: novas regras de risco cruzado e formato estrito.
  - Parser: manter `extractJsonPayload`; no `catch`, log da resposta bruta + `Object.assign(new Error(...), { statusCode: 503, code: "GEMINI_INVALID_JSON" })`.

Sem mudanças de cobrança, locks, RedeBE, regras do banco ou layout.
