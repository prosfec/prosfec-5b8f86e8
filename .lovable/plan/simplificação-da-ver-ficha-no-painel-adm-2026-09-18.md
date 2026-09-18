# Simplificação da “Ver Ficha” no Painel ADM

Transformar a ficha do lead em uma área administrativa leve e focada, sem repetir informações já disponíveis no Workspace.

## Estrutura final

1. **Cabeçalho compacto de identificação**
  - Manter somente nome do cliente/lead e identificação necessária para o ADM saber qual operação está aberta.
  - Manter o botão de fechar.
  - Remover o excesso de etiquetas e informações decorativas do cabeçalho.
2. **Mesa de Operações**
  - Preservar integralmente o “Chat de Pendências & Atendimento”.
  - Manter histórico, contador de mensagens, limpeza do chat, status da pendência, envio de mensagem e estados de carregamento.
  - Reorganizar visualmente o bloco para seguir a aparência leve e objetiva do Workspace, sem alterar seu funcionamento.
3. **Painel Financeiro & Controle de Comissão**
  - Preservar valor aprovado, resultado da análise, controle de serviço pago e comissão do parceiro.
  - Manter cálculos, permissões, confirmações, estados e botões atuais.
  - Organizar as informações financeiras em uma leitura mais direta, com hierarquia clara entre valor, status e ações.

## Conteúdo removido da “Ver Ficha”

Como já está disponível no Workspace, retirar desta janela:

- Jornada do Lead e controle visual das etapas;
- status geral e data de cadastro;
- dados básicos da empresa;
- origem e vínculo do parceiro;
- contato do responsável;
- dados dos sócios e endereço;
- informações financeiras e cadastrais do diagnóstico;
- alertas, recomendações e resultado de elegibilidade;
- serviços recomendados e sua edição;
- credenciais de acesso do cliente;
- demais blocos cadastrais ou operacionais repetidos.

Nenhum desses dados será apagado: eles apenas deixarão de aparecer em “Ver Ficha” e continuarão acessíveis no Workspace.

## Limites

- Alteração restrita à janela aberta por “Ver Ficha” nos cards de leads do ADM.
- Não alterar o Workspace, os cards, o banco de dados ou o Portal do Parceiro.
- Não alterar regras de negócio, cálculos de comissão, permissões, mensagens ou gravações.
- Preservar as aparências Clara e Tecnológica e a rolagem em celular.

## Detalhes técnicos

- Simplificar o bloco `selectedLead` em `src/components/AdminDashboard.tsx`.
- Remover somente a renderização dos blocos duplicados; manter estados e funções que ainda sejam usados em outros pontos do painel.
- Aplicar os padrões visuais existentes de `.soft-ui.pf-admin`, incluindo superfícies, tipografia e etiquetas semânticas nos dois temas.
- Garantir que ações destrutivas ou financeiras continuem com confirmação e estado desabilitado durante salvamento.

## Validação

- Conferir “Ver Ficha” com e sem parceiro associado, com e sem mensagens e em diferentes etapas financeiras.
- Testar envio, resolução e limpeza de pendências.
- Testar valor aprovado, crédito recusado, serviço pago e comissão paga/pendente.
- Conferir desktop e celular nas aparências Clara e Tecnológica.
- Confirmar construção sem erros e ausência de mudanças no Workspace.  
  
Detalhe: O nome do botao "Ver Ficha" deve ser alterado para "Operacional"