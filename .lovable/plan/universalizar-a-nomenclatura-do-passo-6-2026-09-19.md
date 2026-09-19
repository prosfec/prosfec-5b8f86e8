# Universalizar a nomenclatura do Passo 6

## Resultado esperado

- Nenhuma tela exibirá “Rating” como nome de ficha, módulo, dossiê, serviço, fase, parecer ou indicador.
- A nomenclatura universal será **“Estruturação Financeira Corporativa”**.
- Quando a empresa estiver marcada como apta para análise de crédito bancária, o Passo 6 usará linguagem exclusivamente documental, sem referências a melhoria, aplicação, score ou classificação de Rating.
- Empresas não aptas manterão o fluxo atual de estruturação e melhoria, apenas com a nova nomenclatura universal.

## Alterações

### 1. Ficha do parceiro no Passo 6

- Fazer o formulário receber o contexto de empresa apta.
- Para empresa apta, trocar títulos e textos por termos como **“Ficha Documental do Cliente”**, **“Coleta de Documentos”**, **“Validação Documental”** e **“Documentação Concluída”**.
- Ocultar, somente nesse modo, o painel de resultado pós-aplicação, nota/classificação, etapas de melhoria e mensagens sobre pagamento de serviços de melhoria.
- Manter campos, links, validações, progresso, salvamento e envio da documentação.
- Para empresa não apta, preservar a experiência existente, substituindo “Rating” por **“Estruturação Financeira Corporativa”** nos textos.

### 2. Cabeçalho e status do Workspace

- Trocar “Ficha de Rating & Documentos do Cliente” por uma nomenclatura documental no modo apto.
- No modo apto, os estados serão somente documentais: aguardando documentos, documentos recebidos, em validação e documentação concluída.
- Remover a menção antiga à pasta geral e orientar sobre os links individuais dos documentos.
- No modo não apto, manter checklist, proposta e histórico como estão, usando “Estruturação Financeira Corporativa” onde hoje aparece “Rating”.

### 3. Área administrativa 

- Renomear a aba, cabeçalhos, botões, filtros, mensagens e status de “Rating” para **“Estruturação Financeira Corporativa”**.
- Para empresas aptas, apresentar a área administrativa como conferência documental, sem controles de nota, classificação ou melhorias de Rating.
- Preservar esses controles no fluxo não apto, mas com rótulos universais sem a palavra “Rating”.

### 4. Demais textos visíveis do sistema.

- Não alterar nomes técnicos de campos, tipos, IDs, rotas ou dados persistidos, evitando quebrar registros antigos e integrações.

### 5. Validação

- Conferir o Passo 6 com um lead apto e outro não apto.
- Confirmar que o lead apto vê apenas coleta, validação documental, proposta e histórico.
- Confirmar que o lead não apto mantém o checklist e o fluxo de melhoria.
- Buscar novamente a palavra “Rating” para garantir que não reste nenhuma ocorrência visível ao usuário.
- Validar computador e celular, salvamento da ficha, painel administrativo e páginas públicas afetadas.

## Escopo técnico

As mudanças serão principalmente de apresentação e condição por `aptoMesaCredito` em `FichaRatingCreditoForm.tsx`, `LeadWorkspaceModal.tsx` e `FichaRatingAdmViewer.tsx`, além da substituição auditada de textos visíveis nos demais componentes e respostas públicas. Estruturas legadas como `fichaRatingCredito`, `faseRating`, IDs de serviço e campos de conclusão serão preservadas internamente.