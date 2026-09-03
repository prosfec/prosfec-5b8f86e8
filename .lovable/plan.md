# Redesign Fintech Premium B2B — Ficha expandida do Lead (Painel ADM)

## Escopo

Apenas apresentação em `src/components/AdminDashboard.tsx`, no modal de detalhes do lead (`selectedLead`, aproximadamente linhas 5280–5830). Nenhuma lógica de negócio, estado, handler, condição de renderização ou gravação no Firebase será alterada — somente JSX de marcação e classes Tailwind.

## O que muda

### 1. Casca do modal e cabeçalho
- Corpo do modal sobre `bg-slate-50`, cards brancos `bg-white rounded-xl shadow-sm border border-slate-200`.
- Cabeçalho compacto: nome do lead, ID e badge de tipo com hierarquia clara, sem pesos tipográficos exagerados.

### 2. "Jornada do Lead" (timeline)
- Hoje é um bloco escuro (`bg-slate-900`) destoante. Passa a card branco com borda `slate-200`, faixa de cabeçalho `bg-slate-50`.
- Etapas: círculos concluído (esmeralda), atual (verde institucional `#0A3D2E`), futuro (slate claro) sobre fundo claro; conectores em slate/esmeralda.
- Botão "Abrir Workspace" em `rounded-lg`, verde institucional, `transition-all hover:shadow-md`.

### 3. Status do Lead e Data de Cadastro
- Card branco com `grid grid-cols-1 md:grid-cols-3 gap-4`.
- Rótulos `text-xs font-semibold uppercase tracking-wider text-slate-500`; valores `text-sm font-medium text-slate-900`.
- Select de status com visual polido (`bg-slate-50/50 border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20`), preservando as cores semânticas do badge de status.

### 4. Chat de Pendências & Atendimento
- Remove a borda âmbar grossa: card branco, cabeçalho `bg-amber-50/50` apenas como marcador de contexto.
- Área de conversa deixa de ser bloco escuro; vira superfície `bg-slate-50` com balões brancos (parceiro) e verdes suaves (admin), metadados em microtipografia.
- Campo de mensagem e botões no padrão novo de input/botão.

### 5. Painel Financeiro & Controle de Comissão
- Card branco com cabeçalho sutil `bg-emerald-50/40`, sem borda verde pesada.
- Conteúdo em `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`: valor aprovado, status do serviço (Passo 6), bloco de comissão do parceiro.
- Valores monetários em destaque tipográfico (Sora), rótulos em microtipografia.
- Todos os status textuais ("Aprovado", "Em Análise Bancária", "Pago", "Pendente", "Aguardando", "Crédito Recusado") viram pílulas `text-xs font-bold px-2.5 py-0.5 rounded-full` com semântica de cor: verde positivo, âmbar atenção, vermelho impedimento, slate neutro.
- Botões de ação rápida (Marcar Recusado / Serviço Pago) em `rounded-lg` com transição suave, mantendo os mesmos handlers e estados.

### 6. Dados Básicos da Empresa e demais seções cadastrais
- `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4` dentro de card branco.
- Pares label/valor uniformes com a microtipografia acima; porte e afins como badges compactos.
- Mesma padronização aplicada ao bloco "Contato do Responsável" para não ficar visualmente destoante logo abaixo.

### 7. Origem do Lead
- Card branco com cabeçalho discreto; parceiro, ID de afiliação e plano em grid de metadados.
- Estado "sem parceiro vinculado" vira alerta compacto (faixa âmbar suave, sem borda pesada), com o mesmo botão de direcionamento.
- Botões "Alterar Parceiro Master" e "Direcionar para Master" no padrão `rounded-lg transition-all hover:shadow-md`.

### 8. Rodapé de ações
- "Fechar Detalhes" e "Iniciar Atendimento WhatsApp" alinhados no rodapé do modal, `rounded-lg`, hierarquia clara entre secundário e primário, com transições sutis.

## Padrões aplicados

- Superfície: `bg-white rounded-xl shadow-sm border border-slate-200`.
- Fundo de conteúdo: `bg-slate-50`.
- Label: `text-xs font-semibold uppercase tracking-wider text-slate-500`.
- Valor: `text-sm font-medium text-slate-900`.
- Input/select: `bg-slate-50/50 border-slate-200 rounded-lg transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary`.
- Badge: `text-xs font-bold px-2.5 py-0.5 rounded-full` com cor semântica.
- Botão: `rounded-lg transition-all hover:shadow-md`.

## Garantias de preservação

Nomes de estados, handlers (`handleUpdateEtapa`, `handleUpdateStatus`, `handleUpdateValorAprovado`, `handleToggleServicoPago`, `handleUpdateComissaoPaga`, `handleClearChatHistory`, envio de pendência), condições de exibição, cálculos de comissão, textos funcionais e gravações no Firestore permanecem idênticos.

## Verificação

- Build e typecheck sem erros.
- Abrir a ficha expandida de um lead com e sem parceiro, com e sem histórico de chat, em desktop e mobile.
- Conferir ausência de overflow, contraste dos badges e que todos os botões continuam disparando os mesmos handlers.
