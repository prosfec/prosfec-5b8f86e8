# Remover "Completar Cadastro e Documentação" do link de acompanhamento do cliente

A página pública `/proposta/{lead}` perde o bloco editável de cadastro e documentos, continuando a funcionar como painel de acompanhamento somente leitura.

## O que muda

- Em `src/routes/proposta.$leadId.tsx`:
  - Remove o **Bloco 4 — Completar Cadastro e Documentação** ( JSX das linhas ~614-709).
  - Remove estados e funções que só serviam a esse bloco: `links`, `cadastro`, `enviando`, `formErro`, `enviado` e `handleSalvar`.
  - Remove imports que deixarem de ser usados (`Send`, `Link2` e outros que só existiam para o formulário).
  - Mantém o carregamento inicial da proposta e todos os blocos de leitura: cabeçalho, acompanhamento da operação, simulação e serviços/pagamento.
  - Mantém a numeração dos blocos restantes como está (1, 2, 3) para não confundir o cliente.

- Em `src/lib/prosfec-server.ts`:
  - Mantém o `GET /api/public/proposta/:leadId` inalterado.
  - Mantém o `POST /api/public/proposta/:leadId/documentos` inalterado — a rota continua existindo, mas não será chamada pela página até que o formulário volte a ser reintroduzido.

## O que NÃO muda

- Layout, cores, faixa verde do cabeçalho e selo da linha governamental.
- Bloco 1 (acompanhamento: progresso, checklist, documentação, linha do tempo).
- Bloco 2 (simulação em modo leitura, tabela de amortização).
- Bloco 3 (serviços recomendados, valores, botões de pagamento, selo "Pago").
- Botão "Copiar Link da Proposta para o Cliente" no workspace do parceiro.
- Firestore rules, storage rules, autenticação e demais rotas da API.

## Validação

- `bunx tsgo --noEmit` sem erros.
- Build OK.
