# Limpeza B2B dos relatórios de diagnóstico

## Objetivo

Alinhar `FintechDiagnosisView`, `DiagnosticStep3Viewer` e `DossierComparativeViewer` ao modelo 100% B2B Concierge, sem alterar cálculos, dados de crédito ou regras do funil.

## Alterações

### 1. Remover linguagem do antigo Portal do Cliente

- Em `FintechDiagnosisView.tsx`, remover o texto legado “Visível para admin, consultor e cliente final”.
- Eliminar a variante `isClientView`, que hoje só existe para controlar essa mensagem B2C.
- Em `DiagnosticStep3Viewer.tsx`, substituir a orientação “realizada pelo seu consultor/parceiro” por uma mensagem operacional dirigida à equipe/consultor responsável.
- Manter os estados técnicos “Aguardando Consulta via API” e “Aguardando Consulta Pós-Estruturação”, pois descrevem processos internos reais, não uma ação pendente do cliente.

### 2. Preservar apenas o conteúdo operacional válido

- Manter métricas de rating, score, inadimplência, apontamentos, plano de ação, serviços recomendados, comparação antes/depois e pareceres técnicos.
- Não remover nenhum bloco de upload granular nesses arquivos, pois a auditoria confirmou que eles não possuem upload, anexos individuais nem formulários exclusivos do antigo portal.
- Limpar imports e propriedades que ficarem sem uso após a remoção da variante de cliente.

### 3. Coerência das ações

- Preservar somente as ações atuais que fazem sentido no B2B: expandir/recolher laudo, copiar parecer/dossiê e recalcular a análise administrativa quando disponível.
- Confirmar que nenhuma ação ou legenda mencione notificação, acesso ou acompanhamento pelo Portal do Cliente.
- Manter a visualização adequada tanto no Admin quanto no Workspace do Parceiro.

## Validação

- Fazer uma busca final nos três componentes por “Portal do Cliente”, “cliente final”, “ação do cliente” e instruções equivalentes.
- Validar o build e abrir os relatórios no fluxo do Workspace para conferir estados vazio e concluído, botões e ausência de conteúdo B2C.

## Fora de escopo

- Nenhuma alteração em dados, APIs, cálculos de diagnóstico, Firestore ou regras de negócio.
- Nenhuma mudança visual ampla fora dos três relatórios auditados.
