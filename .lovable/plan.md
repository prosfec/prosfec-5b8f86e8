# Link da proposta como painel de acompanhamento do cliente

A página pública `/proposta/{lead}` passa a espelhar a mesma tela que o parceiro vê no
Passo 6 (Estruturação da Operação & Melhoria de Perfil de Crédito), em modo de leitura para
o cliente, funcionando também como painel de acompanhamento do andamento do serviço.

## Como a página fica (ordem dos blocos)

**Cabeçalho (igual ao do Passo 6)**
Faixa verde escura com o selo da linha governamental, o título "Estruturação da Operação &
Melhoria de Perfil de Crédito", o nome da empresa e o indicador de progresso
"X/Y concluídas (Z%)". Sem os botões de copiar proposta/link (são do parceiro).

**Bloco 1 — Acompanhamento da Operação (novo, somente leitura)**
- Barra de progresso e contador igual ao do painel.
- Lista do checklist técnico de estruturação: cada ação com o nome, marca de concluída ou
  pendente e o valor do serviço quando houver, além do selo de pagamento
  ("Pago" / "Aguardando pagamento" / "Sem custo inicial" / "Contratado por demanda").
- Situação da documentação: "Aguardando documentos", "Documentos recebidos",
  "Rating em aplicação" ou "Rating concluído", com a contagem de documentos aprovados.
- Linha do tempo simples das 8 etapas, destacando em qual a operação está.
- Nada de comissão, parceiro, saldo, caixas de marcar, campos editáveis ou botão de salvar.

**Bloco 2 — Simulação & Proposta de Linha Governamental (somente leitura)**
Permanece como está hoje: parâmetros como texto fixo, cartão escuro com Parcela Inicial,
Parcela Final, Total de Juros e Custo Total, e a tabela mês a mês. "Simulação em preparação"
quando ainda não houver proposta vinculada.

**Bloco 3 — Serviços e pagamento**
Permanece como está hoje: serviços recomendados, valores, total e botão
"Realizar Pagamento" por serviço. Serviços já pagos passam a exibir o selo "Pago" no lugar
do botão.

**Bloco 4 — Completar Cadastro e Documentação (editável)**
Permanece como está hoje: campos cadastrais faltantes + links por documento e o botão único
"Salvar Dados e Documentos".

## Detalhes técnicos

- `src/lib/prosfec-server.ts`, `GET /api/public/proposta/:leadId`: além do que já retorna,
  incluir em `proposta`:
  - `acompanhamento.subEtapas`: a partir de `lead.subEtapasPasso6`, apenas
    `{ titulo, concluida, valor, statusPagamento, semCustoInicial, porDemanda }`
    (sem comissão, sem link interno, sem ids de parceiro);
  - `acompanhamento.progresso`: `{ concluidas, total, percentual }`;
  - `acompanhamento.documentacao`: `{ fase, aprovados, rejeitados }` derivado de
    `lead.fichaRatingCredito.faseRating` e `validacoesDocumentos` (somente contagens e a
    fase — nenhum motivo interno de rejeição é exposto);
  - `acompanhamento.etapaAtual` e a lista fixa de rótulos das 8 etapas;
  - `linhaCredito`: `{ code, name, badge }` a partir de `GOVERNMENT_CREDIT_LINES` para o selo
    do cabeçalho.
  Os serviços já devolvidos ganham `pago: boolean` (de `statusPagamento === "pago"` ou
  `pago === true`) para esconder o botão de pagamento do que já foi quitado.
- `src/routes/proposta.$leadId.tsx`: novo cabeçalho no padrão do Passo 6, novo Bloco 1 de
  acompanhamento (progresso, checklist somente leitura, situação da documentação e linha do
  tempo), reordenação dos blocos existentes e selo "Pago" no bloco de pagamento. Nenhuma
  interação nova além do formulário já existente.
- Nenhuma alteração em `LeadWorkspaceModal.tsx`, `firestore.rules`, `storage.rules`, saldo,
  comissões, catálogo, contratos ou no `POST` de documentos.
- Validação: `bunx tsgo --noEmit` e build.

## Fora de escopo

Painel do parceiro e do administrador, consulta de crédito, anexo de PDF, catálogo de preços,
comissões, saldo, contratos, autenticação, regras do banco e site público.
