# Redesign Fintech Premium — Portal do Parceiro PROSFEC

Objetivo: o portal deixa de parecer painel administrativo e passa a parecer uma plataforma financeira PROSFEC. Mudança 100% visual, nos dois temas (Claro e Tecnológico), cobrindo o portal inteiro em etapas.

Identidade: verde/teal PROSFEC como destaque, cinza-chumbo e branco para hierarquia, Sora nos títulos e Manrope no texto (já usados). Glow apenas onde faz sentido; nada de neon ou amarelo.

## 1. Componentes principais envolvidos

- Casca do portal: sidebar, cabeçalho, área de conteúdo.
- Cartão de identidade do parceiro.
- Cartões de métrica: Total Indicados, Em Atendimento, Crédito Aprovado Real, Saldo Geral, Saldo do Painel de Oportunidade, Comissões & Repasses.
- Link exclusivo de indicação.
- Funil de conversão e lista de leads recentes.
- Passo 6 (Desempenho & Controle Financeiro de Serviços): totais, filtros, busca, linhas de cliente, detalhes.
- Abas: Funil Kanban Vendas, Painel de Oportunidade, serviços, equipe, perfil.
- Modais: Adicionar Saldo, Recarga, Solicitar Comissão, Ficha do Lead.

## 2. Arquivos alterados

- `src/styles.css` — camada de estilo do portal (tokens, utilitárias `soft-*`, bloco do tema escuro).
- `src/components/PartnerPortal.tsx` — apenas classes de estilo e agrupamento visual de blocos já existentes.

Nenhum outro arquivo é tocado.

## 3. O que é reutilizado

Utilitárias existentes `soft-card`, `soft-nav-item`, `soft-btn`, `soft-btn-primary`, `soft-field`, `soft-badge`; ícones lucide já importados; grid, breakpoints e padrões de modal atuais; a variante `dark` já existente. Nenhum design system paralelo é criado — as utilitárias atuais são evoluídas.

## 4. Estrutura visual proposta

```text
┌───────────────┬──────────────────────────────────────────┐
│ LOGO PROSFEC  │ Header: saudação + status + ações        │
│ Identity Card ├──────────────────────────────────────────┤
│ OPERAÇÃO      │ [Crédito Aprovado] [Comissões] [Saldo]   │  métricas principais
│  Dashboard    │ [Indicados] [Atendimento] [Consultas]    │  métricas secundárias
│  Funil        ├──────────────────────────────────────────┤
│ FINANCEIRO    │ Funil de conversão (barra segmentada)    │
│  ...          ├──────────────────────────────────────────┤
│ FERRAMENTAS   │ Link de indicação (card comercial)       │
│  ...          ├──────────────────────────────────────────┤
│ ── ações ──   │ Passo 6 — painel de controle financeiro  │
│ Sair / Tema   │ Leads recentes (lista operacional)       │
└───────────────┴──────────────────────────────────────────┘
```

## 5. Sidebar

Fundo escuro nos dois temas (mantém o caráter de produto financeiro), logo PROSFEC no topo, Partner Identity Card logo abaixo, navegação agrupada por seções com rótulos discretos (Operação, Financeiro, Ferramentas), ícones lucide, item ativo com faixa verde sutil e barra indicadora à esquerda, e uma divisória clara separando navegação das ações secundárias (Aparência, Voltar ao Site, Sair).

## 6. Header

Faixa superior com saudação em Sora, nome/código do parceiro, selo de status da conta e as ações rápidas já existentes alinhadas à direita; borda inferior finíssima e fundo levemente translúcido ao rolar.

## 7. Novo padrão dos cards

Bordas de 1px translúcidas, cantos amplos, profundidade discreta, respiro interno maior. Cada card: caixinha de ícone, rótulo pequeno em maiúsculas, número grande em Sora com tabular numbers, selo de status e microtexto de contexto. Hover eleva levemente e acende a borda em verde.

Hierarquia: Crédito Aprovado, Comissões e Saldo Disponível ganham cards maiores, número em destaque e leve halo verde; leads, atendimento, buscas e consultas ficam em cards compactos de segunda linha.

## 8. Passo 6

Vira o bloco de maior peso da tela: cabeçalho próprio com título, sincronizar e controles "Todos os detalhes / Recolher" (comportamento atual preservado); faixa de totais em destaque (pendentes, pagos, repasses, comissão, saldo disponível); filtros e busca em barra própria; lista de clientes em linhas de extrato, com valores em fonte tabular, selos de status muito legíveis e detalhes expansíveis. Regras de liquidação continuam exibidas como estão.

## 9. Comissões e repasses

Apresentação de extrato resumido: comissão conquistada, pendente, repasses pagos, valores em processamento e saldo disponível em linhas alinhadas com valores à direita, separadores finos e destaque do saldo sacável, com o botão de saque atual preservado.

## 10. Funil

Barra segmentada moderna com proporção por estágio, contagem e percentual, legenda compacta e tooltip no hover. Mesmos estágios e mesmos cálculos.

Leads recentes: lista com ícone/inicial, nome, empresa, estágio, data, selo de status e ação — mesmos dados.

## 11. Mobile e tablet

Sidebar em gaveta (como hoje), cards empilhados com texto legível (sem encolher fontes), métricas principais primeiro, tabelas e kanban com rolagem lateral por cartão, modais subindo da base, alvos de toque de 44px, sem overflow horizontal. Tablet reorganiza os cards em 2 colunas.

## 12. Microinterações

Hover com elevação leve e borda acesa, transições de 150–250ms, feedback visual ao copiar o link, brilho sutil nos cards principais, indicador de atualização ao sincronizar. Sem animações pesadas; respeita redução de movimento.

## 13. Confirmação

Nenhuma regra de negócio muda: autenticação, permissões, Firestore, APIs, comissões, saldos, leads, buscas, consultas, serviços, Passo 6, links de indicação, contratos, pagamentos e rotas permanecem exatamente como estão. Nada é removido.

## Ordem de execução

1. Tokens e utilitárias premium em `src/styles.css` (claro + escuro).
2. Sidebar, header e Partner Identity Card.
3. Cards financeiros e hierarquia de métricas.
4. Funil, leads recentes e link de indicação.
5. Passo 6 e bloco de comissões.
6. Demais abas e modais.

Ao final de cada etapa: typecheck e build.
