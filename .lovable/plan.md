# Contratos: avulso completo na página pública + nova minuta de Assessoria

Duas correções na página pública `/contrato/{leadId}`, mantendo intactos preços, comissões, etapas, diagnóstico e RedeBE.

## 1. Restaurar o contrato Avulso completo

Hoje a página pública mostra apenas um resumo de 5 parágrafos para o modelo Avulso. Ele passa a exibir o mesmo contrato oficial já usado na minuta do painel (CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE CONSULTORIA E ASSESSORIA EM CRÉDITO EMPRESARIAL PJ — modelo 100% êxito, 5% sobre o crédito liberado, cláusula anti-burla, isenções, LGPD, foro).

- Novo componente `src/components/AvulsoContractText.tsx` com esse texto, formatado como o de Assessoria (títulos de cláusula em negrito, corpo justificado).
- Variáveis injetadas: razão social, CNPJ, cidade/endereço, e-mail; nome e CPF do representante vêm dos campos digitados na hora da assinatura (preenchimento em tempo real).
- A área do contrato deixa de ter altura limitada (`max-h-80`) também no Avulso, para leitura integral.

## 2. Nova minuta do Contrato de Assessoria

`src/components/AssessoriaContractText.tsx` é reescrito com o texto enviado, em 12 cláusulas:

1. Objeto; 2. Plano e escopo (com diagnóstico incluso); 3. Obrigação de meio (incisos I–V); 4. Responsabilidades da Contratada; 5. Responsabilidades da Contratante; 6. Serviços não inclusos; 7. Prazo e pagamento (multa 2% + juros 1% a.m.); 8. Rescisão antecipada (50% das vincendas); 9. Confidencialidade e LGPD; 10. Plataforma PROSFEC; 11. Assinatura eletrônica (com o bloco de registro); 12. Disposições finais e foro. Ao final, os blocos "Dados da Contratação" e "Aceite Eletrônico".

Correções de dados e variáveis:

- CONTRATADA passa a ser: PROSFEC, DCS SOLUCOES TECNOLOGICAS E SERVICOS FINANCEIROS LTDA (DCS Tech & Finance), CNPJ 65.668.670/0001-26, Edif Office Tower Setor Coluna 1 Sala 501, Renascença, São Luís - MA, CEP 65075-060.
- Representante legal (nome e CPF): refletem em tempo real o que o cliente digita no formulário de assinatura; enquanto vazios, mostram um marcador discreto.
- Início = data em que a assinatura ocorre (antes de assinar, exibe a data de hoje); Término = início + 12 meses.
- Foro: São Luís/MA.
- Plano, mensalidade, valor total (mensalidade x 12), forma de pagamento e lista de entregáveis por plano (Essential / Growth / Corporate) permanecem dinâmicos como hoje.
- Bloco de assinatura eletrônica: antes de assinar mostra os campos a preencher; após assinar, exibe signatário, CPF, data/hora, IP e ID da assinatura (o próprio `leadId` + timestamp), além do status ASSINADO.

## Detalhes técnicos

- `GET /api/public/contrato/:leadId` passa a devolver também `cidade`, `uf` e `email` do lead, necessários para a qualificação das partes e para o contrato avulso. Nenhum dado sensível adicional é exposto.
- `src/routes/contrato.$leadId.tsx`: renderiza `AvulsoContractText` no ramo avulso e `AssessoriaContractText` no outro, repassando `nome` e `cpf` do formulário (estado já existente) para preenchimento em tempo real; remove o `max-h-80`. O recibo pós-assinatura continua como está, acrescido do ID da assinatura.
- Sem alterações em `LeadWorkspaceModal.tsx`, comissões, preços ou fluxos de pagamento.

## Validação

1. Abrir o link público de um lead Avulso: conferir o contrato completo com dados do lead e nome/CPF aparecendo enquanto digita.
2. Abrir leads Essential, Growth e Corporate: conferir cláusulas, valores, datas de início/término e entregáveis.
3. Assinar e conferir o recibo (signatário, CPF mascarado, data/hora, IP, dispositivo).
4. Typecheck e build.
