# Corrigir a legibilidade dos textos no Portal do Parceiro (tema escuro e claro)

## O que foi encontrado na auditoria

O tema escuro já tem regras de adaptação para as cores padrão (cinzas e ardósia), mas elas não cobrem as cores da marca escritas como valor fixo. A varredura nos arquivos do portal encontrou:

- 70 usos de texto no verde institucional escuro `#0A3D2E` (Portal, Ficha do Lead, Cadastro de Lead, Simulador, Desempenho da Equipe) — é exatamente esse tom que some no fundo preto.
- 65 usos de texto no verde `#00A86B` e 3 em âmbar fixo, sem tratamento por tema.
- 101 fundos e 69 bordas em verde fixo, que no escuro perdem o contraste com o texto que está dentro.
- Campos de digitação e seleção: só 5 pontos definem cor de placeholder; o restante herda tom claro demais ou escuro demais.
- Nenhum texto preto puro e apenas um texto com cor por estilo direto, ou seja, o problema está concentrado nas cores fixas da marca.

Também confirmei que os cinzas (`text-slate-600/700/800/900`, 400+ ocorrências) já são convertidos automaticamente no escuro, então a correção não precisa tocar em cada um deles.

## O que será feito

Correção apenas de cor de texto, ícone, placeholder e contraste. Layout, ordem, tamanhos, dados e regras continuam iguais.

1. **Hierarquia semântica única para o portal** (no arquivo de estilos, escopo `.soft-ui`): título, subtítulo, texto principal, texto secundário, rótulo, microtexto, valor financeiro, status positivo, atenção e erro — cada um com um tom para o tema claro e outro para o escuro. Aproveita o sistema já existente, sem criar um segundo.
2. **Cobrir as cores fixas da marca** no tema escuro: o verde escuro `#0A3D2E` e variantes passam a ser lidos em branco/verde luminoso quando aparecem como texto ou ícone; quando aparecem como fundo, o texto interno passa a branco. No tema claro nada muda.
3. **Ícones**: passam a herdar a cor do texto do bloco onde estão, eliminando ícones quase invisíveis no escuro.
4. **Campos, seleções e filtros**: fundo, borda, texto, placeholder e foco com contraste definido nos dois temas, inclusive as opções das listas suspensas.
5. **Listas, tabelas e Passo 6**: cabeçalhos de coluna, nomes, datas, valores, textos de apoio, estados vazios e linhas expandidas revisados para contraste adequado.
6. **Cartões financeiros** (Crédito Aprovado, Saldo, Comissões, Indicados, Atendimento, Buscas, Consultas): rótulo, valor, microtexto e status com pesos distintos e o valor sempre como elemento de maior destaque.
7. **Menu lateral, topo e modais** (Adicionar Saldo, Recarga, Solicitar Comissão, Ficha do Lead e demais): título, descrição, rótulos, mensagens, rodapé e botões revisados nos dois temas.
8. **Componentes abertos dentro do portal** (Ficha do Lead, Cadastro de Lead, Simulador, Serviços Contábeis, Desempenho da Equipe) entram no mesmo escopo, já que herdam o tema do portal.

## Validação

- Verificação de código e construção do projeto.
- Captura das telas disponíveis sem login (entrada do portal) no escuro e no claro, em computador e celular.
- Como o painel interno exige login de parceiro e não há sessão de teste no ambiente, a conferência final do Dashboard, funil, Passo 6 e modais será sua, com sua conta.

## Detalhes técnicos

- Toda a correção fica em `src/styles.css`, dentro do escopo `.soft-ui` / `.dark .soft-ui`, sem afetar Home, ADM e páginas públicas.
- Seletores por atributo (`[class*="text-[#0A3D2E]"]`, etc.) cobrem as cores fixas sem editar centenas de linhas em `PartnerPortal.tsx`, evitando risco de regressão funcional.
- Ajustes pontuais em JSX só onde o token semântico não resolver (por exemplo rótulo com cor fixa dentro de fundo colorido).
- Nada de lógica, dados, Firestore, autenticação, pagamentos, comissões, contratos ou rotas é alterado.
