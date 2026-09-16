# Assinatura única para todos os contratos do cliente

Hoje o link público lista os documentos pendentes e pede uma assinatura em cada um. A mudança:
o cliente assina **uma vez só** e essa assinatura vale para todos os documentos pendentes, desde
que ele confirme que abriu e leu cada um deles.

## Como fica para o cliente

1. Ao abrir o link, ele vê a lista de documentos pendentes (ex.: Contrato de Assessoria e
   Contrato Avulso de Serviços), com um selo "Não lido" em cada um.
2. Ele clica em um documento, o texto completo é exibido e, ao final da leitura, marca a caixa
   "Li e concordo com este documento". O selo passa a "Lido".
3. O bloco de assinatura (nome, CPF e desenho) fica bloqueado até que **todos** os documentos
   pendentes estejam marcados como lidos. Enquanto faltar algum, aparece o aviso
   "Abra e confirme a leitura de todos os documentos para assinar".
4. Com tudo lido, ele preenche nome, CPF, desenha a assinatura uma única vez e clica em
   "Assinar todos os documentos (N)".
5. A tela de sucesso mostra a lista dos documentos assinados e o recibo (signatário, CPF
   mascarado, data/hora, IP e dispositivo) — o mesmo recibo aplicado a todos.

Quando houver apenas um documento pendente, a experiência continua igual à de hoje: abre direto,
confirma a leitura e assina.

## O que não muda

- Documentos já assinados continuam em modo leitura, congelados e imutáveis.
- O Passo 3, o Passo 4 e o painel do parceiro seguem exatamente como estão.
- O texto das cláusulas continua vindo de "Preços e Serviços" e sendo congelado na assinatura.
- Termo aditivo gerado depois da assinatura continua funcionando: se surgir um documento novo,
  ele aparece sozinho e pede uma nova assinatura.

## Detalhes técnicos

- `src/routes/contrato.$leadId.tsx`:
  - novo estado `lidos: Set<string>` com o id de cada documento cuja leitura foi confirmada;
  - checkbox "Li e concordo com este documento" abaixo do texto do documento selecionado;
  - selo Lido/Não lido na lista de documentos (além do Assinado/Pendente atual);
  - o formulário de assinatura passa a ser único e global (não mais por documento): validação
    exige nome, CPF, desenho e `lidos` cobrindo todos os documentos pendentes;
  - o envio deixa de mandar `contratoId` único e passa a mandar `contratoIds: string[]` com todos
    os pendentes; após sucesso, todos são marcados como assinados no estado local.
- `src/lib/prosfec-server.ts`, `POST /api/public/contrato/:leadId/assinar`:
  - aceita `contratoIds: string[]` (mantendo `contratoId` como compatibilidade quando vier só um);
  - itera os ids aplicando a lógica já existente para cada caso (`principal` grava no lead;
    `avulso_auto`/`aditivo_auto` deriva e grava novo doc em `contratos`; id real de contrato em
    `aguardando_assinatura` grava a assinatura), reusando o **mesmo** bloco de assinatura
    (nome, cpf, desenho, data, ip, dispositivo) para todos;
  - documentos já assinados no meio da lista são ignorados em vez de derrubar a operação;
  - resposta: `{ success, assinados: [{ id, tipo }], registro }`; uma única notificação ao Admin
    listando os documentos assinados.
- Sem alteração em `firestore.rules`, Storage, tipos do lead ou no contrato de assessoria.
- Validação: `bunx tsgo --noEmit`, build limpo e teste com dois documentos pendentes (confirmar
  que o botão só libera após as duas leituras e que ambos ficam assinados com o mesmo recibo).

## Fora de escopo

Painel ADM, painel do parceiro, catálogo de serviços, pagamentos, consulta de crédito e a página
de acompanhamento `/proposta/{leadId}`.
