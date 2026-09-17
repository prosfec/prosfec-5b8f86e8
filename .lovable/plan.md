# Correção global de contraste no modo “Aparência Tecnológica”

A correção será exclusivamente visual e restrita ao Portal do Parceiro. Não haverá alteração de dados, cálculos, permissões, etapas, pagamentos, contratos, consultas ou comportamento dos botões.

## Diagnóstico confirmado

- O Espaço do Lead é aberto dentro do escopo do tema do Portal, mas ainda contém cartões, etiquetas e textos definidos localmente para fundo claro.
- O CSS atual converte várias cores `*-50` no tema escuro, porém não cobre de forma consistente variantes `*-100`, fundos fixos como `#eef2f0`, bordas brancas e combinações locais de etiqueta.
- No **Concierge**, estados neutros e “Em Andamento” ainda usam fundos sólidos e cores fixas; títulos, descrições, círculos da jornada e bordas também dependem de valores do tema claro.
- Em **Simulação & Proposta de Linha Governamental**, o selo da linha, seletores rápidos, avisos de conformidade, tabela de amortização e seus tipos “Carência/Amortização” usam combinações claras locais.
- Em **Linha do Tempo & Histórico Auditável**, o contador, estado vazio, cartões dos eventos e etiquetas de autoria usam fundos claros e bordas que perdem hierarquia no modo Tecnológico.
- O mesmo padrão aparece em etiquetas do Funil Kanban, tabelas, Painel de Oportunidades e áreas financeiras do Passo 6.

## O que será corrigido

1. **Sistema semântico de etiquetas do Portal**
   - Criar variantes reutilizáveis e isoladas no `.soft-ui`: sucesso, atenção, neutro, erro e informativo.
   - No modo Tecnológico, todas usarão fundo translúcido de 10%, texto luminoso e borda de 20%:
     - sucesso: emerald;
     - atenção: amber;
     - neutro: zinc;
     - erro: rose;
     - informativo: blue.
   - Nenhuma etiqueta/status permanecerá com fundo branco ou cor pastel sólida no modo escuro.

2. **Concierge e jornada do lead**
   - Adaptar cabeçalho, dados do consultor, status geral, próxima ação, títulos e descrições das etapas.
   - Corrigir círculos, conectores, bordas e etiquetas “Pendente”, “Em Andamento”, “Concluído”, “Atenção” e “Recusado”.
   - Preservar a hierarquia: título quase branco, texto principal claro, descrição em cinza médio legível e status na cor semântica.

3. **Passo 6 — Simulação & Proposta de Linha Governamental**
   - Corrigir título, descrição, limites, campos, seletores, presets e textos auxiliares.
   - Aplicar contraste correto aos avisos azul, verde e vermelho, sem transformar blocos inteiros em cores sólidas.
   - Corrigir tabela de amortização, cabeçalho, linhas, valores e etiquetas “Carência/Amortização”.
   - Manter o cartão de resultados financeiros escuro e reforçar a leitura dos valores e rótulos.

4. **Linha do Tempo & Histórico Auditável**
   - Corrigir contador de eventos, estado vazio, trilho, marcadores, cartões, datas, detalhes e autoria.
   - “Mesa de Operações” ficará âmbar translúcido; autor/sistema seguirá variante verde ou neutra, sempre com contraste alto.

5. **Varredura completa do Portal**
   - Revisar Ficha do Lead Completa, Funil Kanban, tabelas, Painel de Oportunidades e os quatro cartões inferiores de Desempenho/Passo 6.
   - Migrar etiquetas locais encontradas para as variantes semânticas, incluindo estados de pagamento, comissão, pendência, aprovação, recusa e informação.
   - Corrigir também ícones e bordas que dependem de cores claras, sem mudar dimensões, espaçamento ou posição.

## Detalhes técnicos

- `src/styles.css`: ampliar os tokens escuros dentro de `.dark .soft-ui`, criar variantes semânticas de badge e cobrir fundos `50/100` apenas no escopo do Portal.
- `src/components/LeadConciergeTracker.tsx`: substituir mapas de cores fixas pelas variantes semânticas e aplicar classes de superfície/texto compatíveis com os dois temas.
- `src/components/LeadWorkspaceModal.tsx`: aplicar as variantes na Simulação Governamental, tabela de amortização e Histórico Auditável.
- `src/components/PartnerPortal.tsx` e componentes internos realmente encontrados na varredura: normalizar somente etiquetas/status afetados.
- O componente global de Badge não será alterado de forma que alcance Home, ADM ou páginas públicas.

## Validação

- Conferir modo Tecnológico e modo Claro, garantindo que a correção escura não degrade o tema claro.
- Verificar desktop e celular nas telas acessíveis: Concierge, Passo 6, histórico, Ficha, Funil, Painel de Oportunidades e tabelas.
- Medir contraste de textos/etiquetas renderizados e revisar visualmente fundos, bordas e ícones.
- Executar verificação de código e confirmar construção sem erros.
- Se o ambiente automatizado continuar sem sessão de parceiro, a validação interna autenticada será registrada como pendente de conferência na conta do usuário, sem alegar cobertura visual inexistente.
