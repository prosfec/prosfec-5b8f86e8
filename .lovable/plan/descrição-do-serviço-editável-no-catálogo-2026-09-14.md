# Descrição do serviço editável no Catálogo

Hoje a frase que aparece embaixo do nome do serviço ("💡 Necessário para a desvinculação
e remoção dos impactos negativos de R$ 18.382,30...") vem gravada no lead, escrita pelo
diagnóstico antigo. Ela fica congelada e não pode ser corrigida.

A partir deste ajuste, a descrição passa a ser um texto padrão do catálogo, escrito e
editado pelo ADM, e usado em todas as telas.

## O que muda

**No painel do ADM — Preços e Serviços → Catálogo de Serviços de Saneamento & Adequação**
Cada serviço da tabela ganha uma caixa de texto "Descrição do serviço", logo abaixo da
linha do serviço, com espaço para vários parágrafos curtos. O texto é salvo junto com o
catálogo, pelo mesmo botão de salvar já existente.

**Passo 3 — Serviços Recomendados & Precificação**
A frase embaixo do nome do serviço passa a ser a descrição do catálogo. Enquanto o ADM não
escrever nada, o campo fica vazio (sem a frase antiga do diagnóstico).

**Passo 6 — Checklist Técnico de Estruturação & Adequação**
Cada item do checklist exibe a mesma descrição, em texto discreto abaixo do título.

**Link de acompanhamento do cliente (`/proposta/{lead}`)**
Os serviços do bloco de pagamento e as ações do acompanhamento exibem a mesma descrição.

**Serviços já existentes nos leads**
Ao abrir a ficha, o serviço é reconciliado com o catálogo (como já acontece hoje com nome e
preço) e recebe a descrição atual. O botão "Sincronizar" e o "Sincronizar todos os leads"
propagam a descrição para os leads já cadastrados. A frase antiga do diagnóstico deixa de
ser exibida.

## Detalhes técnicos

- `src/utils/serviceUtils.ts`:
  - `ServiceCatalogItem` ganha `descricao?: string`;
  - `sanitizeServiceCatalogForFirestore` grava `descricao` (texto aparado, até 600 chars);
  - `sanitizeAndSyncServicosList` passa a escrever `descricao` do catálogo em cada serviço
    do lead (reabilitação, rating/score e itens casados por id/nome), e a não mais usar a
    `justificativa` legada como texto de exibição.
- `src/components/AdminDashboard.tsx`: nova célula/linha com `<textarea>` ligada a
  `customServices[i].descricao`; ao adicionar serviço manualmente ao lead, copiar a
  `descricao` do catálogo em vez do texto fixo "Incluso manualmente pelo Administrador ADM";
  ao montar `subEtapasPasso6`, levar `descricao` junto.
- `src/components/LeadWorkspaceModal.tsx`: no Passo 3 exibir `serv.descricao` no lugar de
  `serv.justificativa`; no Passo 6 exibir `sub.descricao` abaixo do título (somente leitura).
- `src/lib/prosfec-server.ts` (GET `/api/public/proposta/:leadId`): `acompanhamento.subEtapas`
  passa a incluir `descricao`; `servicos.descricao` continua como está.
- `src/routes/proposta.$leadId.tsx`: exibir a descrição nos itens do acompanhamento
  (o bloco de serviços já exibe).
- Validação: `bunx tsgo --noEmit` e build.

## Fora de escopo

Preços, comissões, links de checkout, saldo, contratos, consulta de crédito, anexo de PDF,
regras do banco, autenticação e site público.
