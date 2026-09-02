# Redesign do Workspace do Lead — Fintech Premium B2B

## Objetivo

Refatorar exclusivamente a apresentação do Workspace do Lead compartilhado pelos painéis ADM e Parceiro, reduzindo a sensação de conteúdo esticado e transformando a ficha em um CRM financeiro compacto, hierárquico e escaneável.

A direção visual fica travada em:

- **Paleta:** fundo `#F8FAFC`, cards brancos, texto `#0F172A`, verde institucional `#0A3D2E` e acento `#00A86B`.
- **Tipografia:** Sora para títulos, métricas e números; Manrope para labels, campos e conteúdo.
- **Composição:** sidebar contextual no desktop; navegação horizontal compacta no mobile.
- **Escopo técnico:** somente JSX de apresentação e classes Tailwind. Nenhuma regra de negócio, estado, handler, validação, integração, consulta ou payload será alterado.

## O que a auditoria confirmou

- `LeadWorkspaceModal.tsx` concentra a casca do workspace, nove áreas de navegação, formulários cadastrais, sócios, consultas, contratos, credenciais, estruturação, simulador e visualizadores técnicos.
- A navegação atual usa duas faixas horizontais no topo — timeline e tabs — e o corpo fica limitado a `max-w-5xl`, o que aumenta a rolagem e deixa campos/blocos visualmente longos.
- `LeadRegisterForm.tsx` já possui grids parciais, mas mistura duas e três colunas, cards internos e estilos de campo repetidos sem uma hierarquia única.
- `FichaRatingCreditoForm.tsx` e `FintechDiagnosisView.tsx` já têm badges e métricas pontuais, porém usam tratamentos visuais diferentes do restante da ficha.
- A análise de crédito, a elegibilidade de linhas como FGI/PEAC e os dados cadastrais aparecem em diferentes blocos do workspace; o redesign deve unificá-los visualmente sem reinterpretar os valores.

## Plano de implementação

### 1. Reestruturar a casca do Workspace

- Ampliar o modal para uma área de trabalho responsiva, com largura útil maior no desktop e altura controlada pela viewport.
- Manter o cabeçalho fixo e compacto, com identidade do lead, CNPJ/ID, responsável e status organizados sem competir com o conteúdo.
- Converter as tabs existentes em uma **sidebar contextual sticky** no desktop, reutilizando exatamente os mesmos `workspaceTab`, `handleTabClick`, ícones, permissões e bloqueios.
- No mobile, preservar a mesma navegação como faixa horizontal rolável para evitar perda de espaço.
- Colocar o conteúdo ativo sobre `bg-slate-50`, com coluna principal `min-w-0`, rolagem própria e espaçamento uniforme.
- Manter a timeline das oito etapas, mas torná-la compacta e integrada ao topo da área de conteúdo, sem criar uma segunda navegação visual concorrente.

### 2. Criar uma linguagem visual consistente só com Tailwind

Aplicar o mesmo padrão diretamente nas classes dos componentes em escopo:

- **Seção/card:** `bg-white rounded-xl shadow-sm border border-slate-200` com padding consistente.
- **Grid principal:** `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6` onde os campos têm peso equivalente.
- **Campos largos justificados:** descrição, endereço completo, pareceres, links e documentos poderão ocupar `md:col-span-2` ou `lg:col-span-3`, evitando alargar campos curtos.
- **Label:** `text-xs font-semibold uppercase tracking-wider text-slate-500`.
- **Valor lido:** `text-sm font-medium text-slate-900`.
- **Input/select/textarea:** `bg-slate-50/50 border-slate-200 rounded-lg transition-all focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary`.
- **Estados desabilitados:** aparência suave e legível, sem remover contraste ou indicação de bloqueio.
- **Cabeçalhos de seção:** ícone pequeno, título Sora e divisor discreto; eliminar títulos excessivamente grandes e caixas decorativas pesadas.
- Não criar CSS utilitário novo nem alterar tokens globais: o trabalho ficará restrito às classes Tailwind dos componentes solicitados.

### 3. Redesenhar Dados do CNPJ e origem do lead

Em `LeadWorkspaceModal.tsx` e `LeadRegisterForm.tsx`:

- Organizar identificação da empresa, contato, porte, ramo, banco, faturamento e origem em cards funcionais separados.
- Usar três colunas no desktop para campos curtos e duas para campos médios; reservar largura total apenas para informações realmente extensas.
- Transformar dados somente leitura em pares compactos de label/valor, evitando parágrafos corridos e linhas de 100% da largura.
- Dar à origem/captura do lead um bloco discreto de metadados, preservando todo texto e valor atuais.
- Uniformizar mensagens de consulta de CNPJ, erros e sucesso como alertas compactos, sem alterar quando aparecem.

### 4. Redesenhar cadastro e visualização de sócios

Em `LeadRegisterForm.tsx`, `LeadWorkspaceModal.tsx` e `FichaRatingCreditoForm.tsx`:

- Cada sócio passa a ter um card visual próprio, com cabeçalho, identificação e badge de papel/participação quando o valor já existir.
- Distribuir nome, CPF, nascimento, telefone, RG, órgão emissor, participação, renda e escolaridade em grid responsivo de até três colunas.
- Manter referências pessoais e documentos em subgrids visualmente separados, sem cards aninhados desnecessários.
- Preservar integralmente adicionar/remover sócio, alternância de sócio ativo, validações, máscaras e campos condicionais.
- Aplicar `min-w-0`, truncamento apenas em metadados de linha única e quebra natural em conteúdo longo para evitar estouro em telas estreitas.

### 5. Compactar Elegibilidade FGI/PEAC e indicadores

Nas áreas de diagnóstico e estruturação renderizadas pelo Workspace:

- Converter as grandes caixas de elegibilidade em uma faixa de **Metric Cards** compactos.
- Cada métrica terá label microtipográfica, valor em Sora, contexto curto e status em badge.
- Organizar rating, score, risco, potencial de crédito, restrições, regularidade e linhas elegíveis em grids de 2 colunas no tablet e 3 colunas no desktop.
- Exibir FGI, PEAC e demais esteiras como badges/cards compactos, sem mudar a lista, o critério ou a origem dos dados.
- Converter textos soltos como “Alto”, “Regularizada / Ativa”, “Pendente”, “Apto” e equivalentes em pílulas semânticas:
  - verde para situação positiva;
  - âmbar para atenção;
  - vermelho para impedimento;
  - azul para informação/processamento.
- Preservar exatamente as condições atuais que determinam cor e texto; somente a forma visual muda.

### 6. Harmonizar Ficha de Rating e visualizadores técnicos

- Aplicar a mesma superfície, radius, borda, sombra e microtipografia à ficha, ao diagnóstico IA, ao dossiê e aos blocos de documentos exibidos dentro do Workspace.
- Reduzir cards muito altos, espaços vazios e painéis de texto em largura excessiva.
- Organizar progresso, fase atual, nota, classificação de risco e potencial de crédito em hierarquia de dashboard.
- Manter pareceres e relatórios longos em blocos de leitura com largura confortável, espaçamento vertical e contraste adequados.
- Preservar accordions, modais, links, downloads, testes de link, sinalizações e permissões administrativas.

### 7. Refinar ações e responsividade

- Agrupar ações primárias e secundárias no rodapé visual de cada seção, sem mudar eventos ou ordem funcional.
- Manter botões essenciais visíveis e impedir que rótulos estourem usando grids responsivos, `min-w-0`, `shrink-0` e quebra controlada.
- Garantir alvos de toque adequados no mobile, foco visível por teclado e contraste compatível com os estados semânticos.
- Respeitar `prefers-reduced-motion`; limitar animações a transições leves já existentes.

## Arquivos previstos

- `src/components/LeadWorkspaceModal.tsx` — shell, sidebar contextual, grids, cards, labels, campos, badges e área de análise.
- `src/components/LeadRegisterForm.tsx` — cadastro da empresa, endereço, sócios, dados bancários e origem.
- `src/components/FichaRatingCreditoForm.tsx` — ficha, sócios, documentos, fases e conclusão.
- `src/components/FintechDiagnosisView.tsx` — métricas, restrições, score, rating e status.
- `src/components/DossierComparativeViewer.tsx` e/ou `DiagnosticStep3Viewer.tsx` — somente os blocos efetivamente renderizados dentro do Workspace que apresentem elegibilidade, FGI/PEAC ou indicadores relacionados.
- `src/components/FichaRatingAdmViewer.tsx` — apenas para alinhar o visual da leitura administrativa ao mesmo sistema.

`src/styles.css`, rotas, Firebase, APIs e arquivos de regra de negócio ficam fora do escopo.

## Garantias de preservação funcional

Durante a implementação, serão mantidos sem alteração:

- nomes e tipos de estados;
- handlers e callbacks;
- condições de renderização e permissões ADM/Parceiro;
- leituras e gravações no Firestore;
- cálculos, simulações, elegibilidade e validações;
- textos funcionais, payloads e integrações;
- sequência das etapas e regras de avanço.

## Verificação

- Comparar visualmente o Workspace como ADM e Parceiro em desktop e mobile.
- Percorrer as abas: Concierge, CNPJ, Sócios, Diagnóstico, Contratos, Credenciais, Estruturação, Apta Bancária e Dossiê ADM.
- Conferir preenchimento, foco, erro, sucesso, disabled, loading, vazio e conteúdo longo.
- Validar que todas as ações continuam acionando os mesmos handlers e que nenhuma chamada de rede ou dado persistido foi alterado.
- Verificar ausência de overflow, sobreposição e campos desnecessariamente esticados.
- Conferir o build e os erros de runtime antes de concluir.
