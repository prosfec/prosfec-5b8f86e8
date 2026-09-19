# Alinhar a interface do Passo 7 ao padrão do sistema

## Objetivo
Melhorar somente a apresentação do Passo 7, mantendo intactos os PDFs, permissões, notificações, dados e regras já implementados.

## Ajustes visuais
- Aplicar a mesma linguagem visual do Workspace: cartões arredondados, bordas suaves, espaçamento compacto, títulos e microtextos na hierarquia já usada nos demais passos.
- Transformar cada relatório em um bloco organizado, com identificação do cliente/documento e data no cabeçalho, sem excesso de caixas dentro de caixas.
- Destacar claramente a comparação **Antes** e **Depois** em duas colunas equilibradas no computador e em sequência vertical no celular.
- Padronizar estados de PDF disponível, em preparação, erro e validação documental com as etiquetas semânticas do sistema.
- Reorganizar as ações **Visualizar**, **Baixar**, **Anexar**, **Substituir** e **Remover** em uma barra enxuta, sem repetir informações entre o cartão do PDF e o controle administrativo.
- Ajustar a área de upload do ADM para parecer parte natural do lado **Depois**, incluindo progresso e mensagens no mesmo padrão visual.
- Para leads aptos, apresentar o aviso de documentação validada e os PDFs iniciais com o mesmo acabamento, sem mostrar a coluna **Depois**.
- Harmonizar o visualizador de PDF com o Workspace nos temas claro e escuro, preservando a experiência em tela cheia no celular.

## Limites
- Nenhuma alteração no fluxo de consulta, saldo, armazenamento, permissões ou notificações.
- Nenhuma nova consulta será criada e nenhuma API de diagnóstico será chamada.
- Os PDFs **Antes** e **Depois** continuarão vinculados exatamente aos mesmos registros e campos.

## Validação
- Conferir Passo 7 para lead apto e não apto.
- Conferir visual de ADM e parceiro, incluindo ausência de controles administrativos para o parceiro.
- Conferir estados com e sem PDFs, múltiplos relatórios e mensagens de erro/carregamento.
- Conferir temas claro/escuro e layout em computador e celular.
