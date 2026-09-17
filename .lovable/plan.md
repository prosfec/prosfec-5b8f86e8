# Ajustes de nomes e organização no painel do parceiro e ADM

## O que será feito

Três ajustes visuais/de nomenclatura, sem alterar lógica de negócio, Firestore, rotas internas ou cálculos:

### 1. Renomear "Caça Leads" → "Painel de Oportunidade" (parceiro + ADM) e remover selos "NOVO"

- Trocar apenas os textos exibidos ao usuário; identificadores internos permanecem (`activeTab "caca-leads"`, rota `/api/caca-leads`, ids de elementos).
- `src/components/PartnerPortal.tsx`: item do menu lateral, título "Painel Ativo: Caça Leads", "Saldo Caça Leads (buscas)", "Saldo de Buscas do Caça-Leads (Por Recargas)", mensagens de bloqueio/erro, mensagem de WhatsApp, textos da inspeção de consultores e do modal de recarga.
- `src/components/AdminDashboard.tsx`: faixa "Caça-Leads" do strip de saldos, "Aprovação de Recargas (Saldo Geral & Caça-Leads)" e "Saldo Caça Leads (buscas)".
- Remover o selo "NOVO" do item "Painel de Oportunidade" e do item "Serviços Contábeis" no menu lateral do parceiro.

### 2. Renomear "Meus Leads" → "Funil Kanban Vendas" (painel do parceiro)

- Item do menu lateral mantém o contador: "Funil Kanban Vendas (N)".
- Botão "Ver Meus Leads" do Dashboard passa a "Ver Funil Kanban Vendas".

### 3. Passo 6 do Dashboard — controle "Todos os detalhes" / "Recolher"

- A tabela de serviços passa a **iniciar sempre recolhida** (nenhum cliente expandido).
- Trocar o estado `expandedServiceLeadId` (um por vez) por `expandedServiceLeadIds` (conjunto), permitindo vários abertos.
- Dois botões globais junto aos filtros da tabela:
  - "Todos os detalhes" — expande todos os clientes filtrados de uma vez.
  - "Recolher" — fecha todos, deixando só os cards de resumo.
- O botão por linha continua funcionando (abre/fecha aquele cliente), sincronizado com o conjunto.

## Escopo limitado

- Somente textos e comportamento de expansão/recolhimento.
- Nada muda em comissões, Firestore, regras, autenticação, rotas de API ou outras abas.
- Validação: `bunx tsgo --noEmit` e build limpo.
