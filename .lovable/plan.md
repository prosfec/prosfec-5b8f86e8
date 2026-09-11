# Etapa 2 — Corrigir o vínculo das consultas com o lead

Alteração exclusivamente de bastidores, no caminho consulta → diagnóstico. Nada de tela, preço, cobrança, contratos, permissões ou regras comerciais muda.

## Situação verificada no código

- Quando uma consulta é executada, o registro já é gravado com `leadId`, `partnerId` e `documento` (rota de consulta, coleção `consultas_realizadas`).
- Na geração do diagnóstico, porém, a busca é feita **somente pelo documento**: monta-se a lista com o CNPJ da empresa e os CPFs dos sócios e consulta-se `documento IN (...)`. O `leadId` só é usado depois, como um dos critérios de permissão.
- Consequências: consultas gravadas para o lead, mas com documento diferente do cadastro atual (CPF corrigido depois, sócio alterado, CNPJ reformatado), não são encontradas; e consultas do mesmo documento pertencentes a outro lead podem entrar na análise.
- Quando o lead não tem CNPJ nem CPF de sócio preenchidos, a busca nem chega a acontecer e o diagnóstico falha com "Nenhuma consulta de crédito válida foi encontrada".

## O que será feito

### 1. Buscar primeiro pelo lead

A busca passa a ter duas etapas:

1. **Por `leadId`** — todas as consultas gravadas com o identificador daquele lead.
2. **Por documento** — CNPJ da empresa e CPFs dos sócios, como hoje, para alcançar registros antigos gravados sem `leadId`.

Os dois conjuntos são unidos, sem repetição (mesmo identificador de registro entra uma única vez).

### 2. Prioridade na hora de escolher as consultas usadas

Continuam sendo usadas até 6 consultas. A ordenação passa a ser:

1. Consultas vinculadas ao próprio lead vêm primeiro.
2. Dentro de cada grupo, da mais recente para a mais antiga.

Assim, se houver mais registros do que o limite, os do lead nunca são descartados em favor de registros de outro lead com o mesmo documento.

### 3. Evitar consulta de outro lead

Registros encontrados apenas pelo documento e que tenham `leadId` preenchido **diferente** deste lead passam a ser descartados. Registros sem `leadId` (histórico antigo) continuam aceitos pelo documento, mantendo a compatibilidade.

As regras de acesso atuais continuam valendo: administrador, parceiro responsável ou vínculo com o lead.

### 4. Não falhar quando faltar documento

Se o lead não tiver CNPJ nem CPF de sócio, a busca por `leadId` ainda acontece. Só quando as duas buscas voltarem vazias é que o diagnóstico informa que não há consulta.

### 5. Registro técnico de conferência

O log do servidor passa a mostrar quantas consultas vieram por vínculo com o lead, quantas vieram só por documento e quantas foram efetivamente usadas — sem documento completo nem dados pessoais.

## Detalhes técnicos

Arquivo único: `src/lib/prosfec-server.ts`, rota `POST /api/credit/diagnostico-prosfec` (bloco de busca das consultas, aprox. linhas 1088–1128, e a montagem de `consultationsSummary`, aprox. 1243–1262).

- Nova consulta `runQueryRest("consultas_realizadas", { fieldFilter: { field: leadId, op: "EQUAL", value: leadId } })` executada antes da busca por documento.
- Merge por `id` do documento, marcando cada item com `origem: "leadId" | "documento"`.
- Filtro de autorização mantido; acrescido o descarte de itens com `leadId` preenchido e diferente do lead atual.
- Ordenação: `origem === "leadId"` primeiro, depois `dataConsulta` decrescente; `slice(0, 6)` inalterado.
- Erro 422 apenas quando as duas buscas retornam vazio.
- A normalização da RedeBE, o prompt, os limites de tamanho e a gravação do diagnóstico permanecem exatamente como estão.
- Pode ser necessário um índice do Firestore para o campo `leadId` em `consultas_realizadas`; se o log acusar índice ausente, entrego a definição para publicação.

## Fora de escopo

Interface, PDF, simulador, cobrança, contratos, autenticação, regras do banco, área administrativa e de parceiros, e qualquer rota fora do caminho consulta → diagnóstico.
