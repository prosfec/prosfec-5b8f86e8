# Atualizar escopo do Contrato Avulso: Reabilitação, Rating e Score

Ajuste textual no componente `src/components/AvulsoContractText.tsx` para deixar explícito, na Cláusula de Objeto/Serviços, os serviços tradicionais de Reabilitação de Crédito e Melhoria de Rating/Score da PROSFEC.

## Alteração

Na Cláusula 2 – Do Objeto e Natureza dos Serviços, adicionar os itens abaixo de forma clara e integrada ao texto jurídico existente:

- Prestação de serviços de consultoria e assessoria voltados à **Reabilitação de Crédito** da CONTRATANTE.
- Estratégias e orientações direcionadas à **Melhoria de Rating e Score** da empresa junto aos órgãos de proteção e bureaus de crédito.
- **Mapeamento de pendências, restrições e apontamentos** passíveis de regularização, com plano de ação para correção cadastral e financeira.

## O que permanece inalterado

- Estrutura, formatação justificada e estilo tipográfico já aprovados.
- Preenchimento em tempo real do representante legal (nome e CPF).
- Demais cláusulas (honorários 5% êxito, anti-burla, isenções, LGPD, foro São Luís/MA, assinatura eletrônica).
- Integração em `src/routes/contrato.$leadId.tsx` e ausência de `max-h-80` no contrato Avulso.
- Nenhuma alteração em preços, comissões, etapas, diagnóstico, RedeBE, pagamentos ou contrato de Assessoria.

## Validação

1. Abrir link público de lead Avulso e conferir que a Cláusula 2 lista Reabilitação de Crédito, Melhoria de Rating/Score e Mapeamento de pendências/restrições/apontamentos.
2. Verificar que nome/CPF do representante continuam preenchendo em tempo real.
3. Typecheck e build sem erros.
