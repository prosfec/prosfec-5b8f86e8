# Remover dados falsos e tornar o diagnóstico estritamente fiel

## Causa confirmada

A busca encontrou dados e comportamentos artificiais no fluxo atual:

- `FintechDiagnosisView.tsx` mantém o valor literal **"6.389,45"** como fallback visual quando existe contagem de protestos sem valor.
- O “Plano de ação PROSFEC” dessa tela é inteiramente fixo: sempre mostra **Regularização SCR/Bacen**, **Limpa nome e baixa de protestos** e **Melhoria de Rating**, independentemente do JSON da IA.
- Quando `json_subetapas` e `json_servicos` não são encontrados ou não passam no parse, `prosfec-server.ts` cria cinco subetapas padrão, incluindo saneamento de restrições e melhoria no SCR.
- A tela ainda tenta extrair valores do texto livre do laudo com expressões amplas. Isso pode classificar uma capacidade de crédito, como R$ 67.200, como negativação se ela aparecer na mesma linha após uma menção a “restrições”.
- O backend remove cercas Markdown apenas no JSON da Etapa 1. Os blocos finais aceitam somente os rótulos exatos `json_servicos` e `json_subetapas`; outras cercas comuns podem não ser reconhecidas.

## Alterações

### 1. Remover todos os mocks financeiros do diagnóstico

- Excluir o fallback literal `R$ 6.389,45` e os serviços padrão de reabilitação da tela.
- Remover do backend as cinco subetapas corretivas criadas quando o JSON não é válido.
- Na ausência de dados válidos, usar somente números `0` e arrays `[]`.
- Não estimar score, inadimplência, capacidade de captação, dívidas, protestos ou serviços quando esses dados não existirem.

### 2. Tornar a auditoria estruturada a fonte oficial

- Validar e normalizar o resultado da Etapa 1 antes de prosseguir: valores numéricos inválidos viram `0`; arrays inválidos viram `[]`.
- Persistir a auditoria validada junto ao diagnóstico.
- Fazer a interface ler negativações e protestos primeiro dessa auditoria estruturada e das consultas reais, sem inferir valores financeiros do texto narrativo.
- Não reutilizar dados antigos do lead quando a nova geração retornar arrays vazios válidos.

### 3. Blindar o parse dos blocos JSON

- Criar um parser único que remova cercas Markdown de forma case-insensitive (`json`, `json_servicos`, `json_subetapas` e cercas simples), aplique `trim()` e então execute `JSON.parse()`.
- Aceitar os blocos delimitados esperados sem deixar as cercas contaminarem o conteúdo.
- Se um bloco estiver ausente ou inválido, registrar a falha e usar `[]`; nunca fabricar serviços, etapas ou valores.
- Validar os itens resultantes e descartar entradas malformadas em vez de completar campos com conteúdo inventado.

### 4. Exibir o plano de ação real

- Substituir os três passos fixos do `FintechDiagnosisView` pelas `subEtapasPasso6` validadas retornadas pelo diagnóstico.
- Para perfil sem restrições e sem etapas retornadas, mostrar estado neutro de empresa apta, sem texto de reabilitação.
- Serviços recomendados vazios permanecem vazios, sem inserir “Programa de reabilitação” ou preço padrão.

### 5. Reforçar a instrução da IA

Adicionar ao prompt:

> ATENÇÃO: A chave `valor_negativacoes` deve ser preenchida APENAS com dívidas do Pefin/Refin. NUNCA coloque capacidade de crédito, limite estimado, PRONAMPE ou potencial de captação em chaves de restrição/negativação.

Também exigir zero para campos ausentes e arrays vazios quando não houver recomendações comprovadas.

## Validação

- Buscar novamente pelos valores `6389`, `6.389`, `67200` e `67.200` no fluxo do diagnóstico e confirmar que não resta nenhum fallback desse tipo.
- Testar o parser com JSON puro, cercado por `json`, cercado por `json_servicos`/`json_subetapas`, vazio e malformado.
- Validar um lead saudável: negativações e protestos em zero, sem SCR/reabilitação e sem serviços artificiais.
- Validar um lead com restrições reais: somente os valores presentes na auditoria aparecem.
- Confirmar tipagem e compilação sem erros.

## Arquivos previstos

- `src/lib/prosfec-server.ts`
- `src/components/FintechDiagnosisView.tsx`
- `src/components/LeadWorkspaceModal.tsx` apenas para repassar as subetapas estruturadas ao visualizador, se necessário.

Sem alterações em cobrança, autenticação, permissões, RedeBE ou regras do banco.
