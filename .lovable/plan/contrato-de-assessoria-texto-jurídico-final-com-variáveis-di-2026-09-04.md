# Contrato de Assessoria: texto jurídico final com variáveis dinâmicas

Substituir o texto resumido de Assessoria na página pública `/contrato/{leadId}` pelo contrato jurídico completo, com injeção dinâmica dos dados do lead. O contrato do modelo Avulso permanece exatamente como está hoje.

## Trava de renderização condicional

A página já decide o modelo por `modeloContratacao` (comparação em minúsculas). Essa trava é mantida:

- `avulso` → renderiza o bloco de termos Avulso já existente, sem nenhuma alteração.
- qualquer outro valor (Assessoria) → renderiza o novo componente `AssessoriaContractText`.

## Novo componente `src/components/AssessoriaContractText.tsx`

Recebe por props os dados vindos do endpoint público (razão social, CNPJ, endereço, plano, valor mensal) e renderiza o contrato formal com `text-sm text-slate-700 text-justify space-y-4` e títulos de cláusula em negrito/maiúsculas.

Variáveis injetadas:

- Razão social e CNPJ da CONTRATANTE — dados do lead.
- Endereço da CONTRATANTE — endereço do lead (exibe "endereço não informado" quando ausente).
- Plano — `planoEscolhido` capitalizado.
- Investimento mensal — `valorMensalidade` em BRL; valor total do contrato = mensalidade x 12 em BRL.
- Prazo: 12 (doze) meses. Forma de pagamento: Recorrente via Cartão de Crédito / InfinitePay. Gateway: InfinitePay.
- Dados da CONTRATADA (PROSFEC: razão social, CNPJ, endereço) como constantes no próprio componente.

Cláusulas incluídas conforme o texto enviado: Objeto; Plano Contratado e Escopo; Obrigação de Meio; Prazo e Rescisão Antecipada (multa de 50% das mensalidades vincendas); Assinatura Eletrônica; e o bloco final "Dados da Contratação" (plano, valor mensal, valor total, forma de pagamento, gateway).

Entregáveis por plano (lista `<ul>` dentro da Cláusula Segunda):

- Essential: Diagnóstico Estratégico Inicial; Adequação de Perfil e Dossiê Completo; Implantação de Gateway de pagamento com Sistema de Gestão Financeira integrado; Monitoramento Contínuo por 12 meses.
- Growth: todos os itens do Essential; Auditoria Fiscal e Contábil; Criação de Site Institucional; Implantação de Automação de WhatsApp.
- Corporate: todos os itens do Growth; Auditoria Financeira profunda; Projeto Comercial Estruturado (Bancos Suíços); Atendimento Master com SLA de 12 horas.

Plano não reconhecido cai no escopo Essential como padrão seguro.

## Recibo eletrônico após assinar

A tela de sucesso passa a exibir o registro da assinatura: nome do signatário, CPF mascarado, data/hora, IP capturado e dispositivo — valores já coletados no fluxo atual e devolvidos pela API ao concluir a assinatura.

## Detalhes técnicos

- `GET /api/public/contrato/:leadId` em `src/lib/prosfec-server.ts` passa a incluir o `endereco` do lead no retorno (único campo novo exposto), necessário para a qualificação das partes.
- `POST /api/public/contrato/:leadId/assinar` passa a devolver no JSON os dados do registro (nome, cpf, data, ip, dispositivo) para alimentar o recibo, sem alterar o que já é gravado no Firestore.
- `src/routes/contrato.$leadId.tsx`: importa e renderiza o novo componente no ramo Assessoria, remove o `max-h-80` no ramo Assessoria (contrato longo deve ser lido por inteiro) e guarda o retorno da assinatura em estado para o recibo. O ramo Avulso fica intacto.
- Sem mudanças em comissões, preços, etapas, diagnóstico, RedeBE ou vitrine de planos.

## Validação

1. Definir um lead como Assessoria (Essential, Growth e Corporate) e abrir o link público: conferir texto completo, valores, total anual e lista de entregáveis correta.
2. Definir um lead como Avulso e conferir que o contrato antigo continua idêntico.
3. Assinar e conferir o recibo com IP, data/hora e signatário.
4. Typecheck e build.
