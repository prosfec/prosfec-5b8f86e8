# Ajustar documentos do Passo 6 para links individuais em PDF

## Resultado esperado

No Passo 6 — Estruturação, o parceiro informará somente o link individual de cada documento específico. O formulário deixará claro que cada endereço deve apontar para o respectivo documento em PDF, com acesso liberado para a equipe PROSFEC.

## Alterações

### 1. Corrigir o informativo dos documentos
- Trocar os textos “Anexos fiscais, contábeis e societários (PDFs)”, “Anexos Obrigatórios da Empresa (Apenas formato PDF)” e “.PDF Obrigatório” por orientações coerentes com o fluxo atual de links.
- Usar um aviso direto: **“Informe abaixo o link individual de cada documento em PDF.”**
- Ajustar a ajuda dos campos para orientar que o link deve abrir o PDF correspondente e estar compartilhado para visualização.
- Manter a validação atual de URL (`http://` ou `https://`) e os campos individuais já existentes para Cartão CNPJ, Contrato Social, Comprovante de Residência, Faturamento, DRE e Balanço Patrimonial.

### 2. Retirar a CCB somente da ficha documental
- Remover do formulário do Passo 6 todo o bloco **“CCB — Cédula de Crédito Bancário (PDF)”**, incluindo upload, dados complementares, visualização e ação de análise pela PROSFEC IA.
- Remover do formulário os estados, funções e dependências que ficarem sem uso após a retirada desse bloco.
- Não remover o serviço CCB/RTB do Catálogo de Serviços.
- Não apagar os campos, análises ou arquivos CCB já armazenados; permanecem preservados para histórico e compatibilidade administrativa.
- Manter a rota de análise e os tipos legados, evitando quebrar registros antigos ou outros pontos do sistema.

### 3. Retirar o link geral da pasta
- Remover do formulário do parceiro o bloco **“Link da Pasta de Documentos”**.
- Parar de gravar ou sobrescrever `pastaDocumentosUrl`, `pastaDocumentosAtualizadoEm` e o espelho `linkDocumentos` em novos salvamentos.
- Preservar valores já existentes no banco e sua visualização histórica no painel administrativo.
- Ajustar o status da ficha para não depender do link geral da pasta; os links individuais e o envio da ficha passam a representar o recebimento documental.

### 4. Conferência do fluxo
- Confirmar que o progresso continua sendo calculado pelos links individuais obrigatórios.
- Confirmar que salvar rascunho e enviar a ficha não apagam links de pasta ou CCB antigos.
- Verificar o Passo 6 em computador e celular, incluindo preenchimento, abertura e limpeza dos links individuais.
- Validar que o Catálogo de Serviços e os registros históricos de CCB permanecem intactos.

## Escopo técnico

Arquivos principais: `FichaRatingCreditoForm.tsx` e ajuste pontual em `FichaRatingAdmViewer.tsx` para o status não depender da pasta. `AdminDashboard.tsx`, tipos e servidor só serão alterados se necessário para impedir sobrescrita de dados antigos; o serviço CCB/RTB e a API histórica não serão removidos.
