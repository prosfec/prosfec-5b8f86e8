# Alinhar escopo do contrato de Assessoria com Estruturação e Reabilitação de Crédito

Ajuste textual em `src/components/AssessoriaContractText.tsx` para deixar explícito que o contrato de Assessoria inclui os serviços de Estruturação e Reabilitação de Crédito do modelo Avulso.

## Alterações

1. **Cláusula 1ª – Do Objeto (item 1.3)**
   - Substituir o texto atual do item 1.3 por:
     > 1.3. O serviço poderá compreender, conforme o plano contratado e a elegibilidade da CONTRATANTE: a) estruturação e reabilitação de crédito; b) diagnóstico financeiro e creditício inicial; c) análise do perfil financeiro e bancário; d) mapeamento de informações cadastrais e restrições; e) melhoria e análise de Score/Rating; f) elaboração de plano estratégico; g) monitoramento contínuo.

2. **Lista dinâmica de entregáveis (Cláusula 2ª)**
   - Inserir, como primeiro item de `ENTREGAVEIS_ESSENTIAL`, `ENTREGAVEIS_GROWTH` e `ENTREGAVEIS_CORPORATE`:
     > Serviço de Estruturação Completa: englobando Reabilitação de Crédito, Melhoria de Rating e Score, e mapeamento de pendências.
   - Manter os demais itens específicos de cada plano na ordem atual.

## O que permanece inalterado

- Estrutura, formatação justificada e estilo tipográfico do contrato.
- Preenchimento em tempo real do representante legal (nome e CPF), plano, mensalidade e totais.
- Cláusula de Honorários de Êxito (5%) recém-adicionada e numeração das cláusulas.
- Integração em `src/routes/contrato.$leadId.tsx` e fluxo de assinatura.
- Nenhuma alteração em preços, comissões, etapas, diagnóstico, RedeBE, pagamentos ou contrato Avulso.

## Validação

1. Abrir `/contrato/{leadId}` para um lead do tipo Assessoria e conferir que a Cláusula 1.3 lista estruturação/reabilitação de crédito e itens a–g.
2. Verificar que o primeiro entregável de todos os planos (Essential, Growth, Corporate) é o "Serviço de Estruturação Completa".
3. Typecheck e build sem erros.
