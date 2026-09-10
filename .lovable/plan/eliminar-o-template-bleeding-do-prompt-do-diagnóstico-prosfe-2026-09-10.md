# Eliminar o "Template Bleeding" do prompt do Diagnóstico PROSFEC IA

## Causa confirmada

No `stage2SystemPrompt` (Etapa 2) em `src/lib/prosfec-server.ts`, os dois blocos de **exemplo** de saída JSON contêm dados concretos de reabilitação:

- `json_servicos`: exemplo com `"Programa de Reabilitação Financeira e Creditícia"`.
- `json_subetapas`: exemplo com 4 passos fixos — "Renegociação de Dívidas", "Limpa Nome", "Regularização SCR/BACEN" e "Melhoria de Rating (R$ 1.100)".

A IA está copiando esses exemplos literalmente para empresas sem restrição nenhuma, gerando os valores inventados ("1 protestado, R$ 6.389,45", "Regularização SCR") exibidos na interface. As regras anti-alucinação já existem, mas o exemplo concreto vence a regra abstrata.

## O que será feito

Arquivo único: `src/lib/prosfec-server.ts`, somente dentro do texto do `stage2SystemPrompt`.

### 1. Neutralizar os exemplos JSON
Substituir os exemplos com valores de reabilitação por esqueletos com placeholders genéricos, sem nenhum serviço ou valor real:

- `json_servicos`: `[ { "id": "[id exato de um serviço do CATÁLOGO ATIVO]", "nome": "[nome exato do catálogo]", "valor": "[valor exato do catálogo]", "justificativa": "[motivo técnico baseado APENAS nos dados auditados]" } ]`
- `json_subetapas`: `[ { "titulo": "[etapa baseada APENAS nos dados auditados]", "preco": "[valor do catálogo ou 0]" } ]`

Nenhum nome de serviço, título de etapa ou valor em Reais permanece no exemplo.

### 2. Regra de comportamento para perfis saudáveis (APTOS)
Adicionar instrução explícita:

- Se os relatórios indicarem 0 restrições, `json_subetapas` NÃO pode conter passos de reabilitação — apenas 1 ou 2 passos focados em "Empresa Apta para Captação" e/ou "Estruturação de Linhas de Crédito".
- Se não houver protestos, a quantidade de protestos no JSON DEVE ser estritamente `0` (nunca `1` com valor 0).
- `json_servicos` deve OMITIR o "Programa de Reabilitação" (e qualquer serviço corretivo) quando o cliente não precisar dele; empresa 100% limpa → `json_servicos` pode ser `[]` ou conter apenas serviços preventivos do catálogo.

### 3. Manter intacto todo o resto
- Regras 1–3 anti-alucinação já existentes, estrutura do laudo em Markdown, parsing dos blocos, validação de laudo vazio, locks e débito: sem alteração.

## Validação

- `bunx tsgo --noEmit` e confirmação de `build OK`.
- Sem mudanças visuais, de APIs, regras do banco ou lógica de autenticação.
