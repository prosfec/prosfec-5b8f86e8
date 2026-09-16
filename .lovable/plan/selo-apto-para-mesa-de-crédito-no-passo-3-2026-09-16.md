# Selo "Apto para Mesa de Crédito" no Passo 3

## Objetivo

Quando o cliente não precisa de nenhum serviço de estruturação, o ADM marca o lead
como **apto para iniciar a análise de crédito bancária**. A ficha do lead (Passo 3)
passa a exibir um visual de destaque parabenizando a empresa, e o link público de
acompanhamento do cliente mostra a mesma conquista.

## O que muda

### 1. Botão no Passo 3 do Workspace (somente ADM)

- Botão "Marcar como Apto para Mesa de Crédito" dentro do Passo 3, visível apenas
  para o ADM — ao lado da área onde os serviços são gerenciados.
- Ao clicar, grava no lead o selo de aptidão (com data e quem marcou) e o botão vira
  "Remover aptidão", permitindo alternar livremente.
- O parceiro não vê o botão, apenas o resultado.

### 2. Visual de parabéns na ficha do lead (ADM e parceiro)

- Quando o selo estiver ativo, o Passo 3 exibe um cartão de destaque (faixa verde
  institucional com degradê, ícone de conquista, microtipografia e espaçamento no
  padrão já usado no resultado da simulação):
  - Título: parabenizando a estrutura da empresa (ex.: "Empresa apta para análise
    de crédito bancária").
  - Mensagem: empresa com estrutura em conformidade, pronta para iniciar na mesa de
    crédito após o recolhimento das documentações.
  - Data em que o ADM marcou a aptidão.
- O cartão aparece para ADM e parceiro, somente leitura para o parceiro.

### 3. Link público de acompanhamento do cliente

- Quando o selo estiver ativo, a página `/proposta/{leadId}` exibe uma faixa de
  parabéns no topo do acompanhamento: empresa apta e pronta para a mesa de crédito
  após o envio das documentações.
- Nenhum dado interno (quem marcou, notas do ADM) é exposto.

### 4. Convivência com serviços

- O selo é independente: o ADM pode marcar/desmarcar livremente e pode adicionar
  serviços mesmo com o selo ativo (e vice-versa). Nada é bloqueado.

## O que NÃO muda

Fluxo de consulta RedeBE, PDF do relatório, inclusão de serviços, contratos
(assessoria e avulso/aditivo), simulador, pagamentos, permissões e regras do banco.

## Detalhes técnicos

- `src/types.ts`: `Lead` ganha `aptoMesaCredito?: boolean`,
  `aptoMesaCreditoData?: string`, `aptoMesaCreditoPor?: string`.
- `src/components/LeadWorkspaceModal.tsx`: botão de alternância no Passo 3 (guarda
  `isAdminUser`), gravação via atualização do lead, e cartão visual de aptidão
  renderizado quando `aptoMesaCredito` for verdadeiro (ADM e parceiro).
- `src/lib/prosfec-server.ts`: `GET /api/public/proposta/:leadId` passa a incluir
  `aptoMesaCredito` e `aptoMesaCreditoData` na resposta pública.
- `src/routes/proposta.$leadId.tsx`: faixa de parabéns quando o selo estiver ativo.
- Sem nova coleção no banco; campos novos ficam no próprio lead, cobertos pelas
  regras existentes.

## Validação

- `bunx tsgo --noEmit` e build sem erros.
- Teste: ADM marca aptidão no Passo 3 → cartão aparece para ADM e parceiro → link do
  cliente mostra a faixa de parabéns → ADM remove aptidão → tudo some.
