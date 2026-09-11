# Relatório em PDF anexado pela equipe (PROSFEC DIAGNÓSTICO 360)

## Objetivo

Acabar com o relatório montado pelo sistema (que vem quebrado e genérico). A consulta
continua sendo disparada normalmente pelo sistema; o resultado que o parceiro enxerga
passa a ser o arquivo PDF original, anexado manualmente pela equipe. Nenhuma leitura
automática, nenhum cruzamento de dados, nenhuma dependência de IA.

## Como fica na prática

1. O parceiro executa a consulta como hoje (mesmo custo, mesmo saldo, mesmo registro).
2. Na ficha do lead, no Passo 3, cada consulta executada vira um item da lista com
   titular, documento, data e um selo de situação:
   - "Relatório em preparação" (ainda sem PDF)
   - "Relatório disponível" (PDF já anexado)
3. Quem é da equipe (Admin) vê, dentro do mesmo item, a área de anexo: escolher o
   arquivo PDF, enviar, substituir ou remover. Um PDF por consulta.
4. Ao clicar em "Ver relatório completo":
   - com PDF anexado: abre o próprio arquivo em tela cheia, com botões de baixar e
     abrir em nova aba;
   - sem PDF: abre um aviso "Relatório em preparação pela equipe" — a tela antiga de
     resultado montado pelo sistema deixa de existir.
5. Quando a equipe anexa o PDF, o parceiro dono do lead recebe uma notificação
   ("Relatório de crédito disponível").

## Nome da fonte

Todo texto visível deixa de citar a fonte externa. Onde hoje aparece o nome do
fornecedor ou o selo "REDEBE", passa a aparecer **PROSFEC DIAGNÓSTICO 360**. Isso vale
para a ficha do lead, o painel administrativo, o visualizador de relatório e o título
do arquivo baixado. Códigos internos de produto e cobrança não mudam, para não afetar
preços nem histórico.

## O que NÃO muda

Execução e cobrança da consulta, saldo, catálogo e tabela de preços, contratos,
autenticação, permissões, inclusão manual de serviços pelo Admin no Passo 6, painel do
parceiro fora do Passo 3, site público e simulador.

## Detalhes técnicos

- **Armazenamento**: Firebase Storage (bucket já configurado no projeto), caminho
  `relatorios_consultas/{consultaId}.pdf`. O upload é feito pelo painel, autenticado
  como usuário da equipe. Validação no envio: apenas `application/pdf`, até 15 MB.
- **Registro**: no documento de `consultas_realizadas` gravamos
  `relatorioPdfUrl`, `relatorioPdfNome`, `relatorioPdfTamanho`,
  `relatorioPdfEnviadoEm`, `relatorioPdfEnviadoPor`. As regras atuais já permitem
  `update` por staff — nenhuma mudança no `firestore.rules`.
- **Novo componente** `src/components/RelatorioPdfViewerModal.tsx`: cabeçalho PROSFEC
  DIAGNÓSTICO 360 + `<iframe>` do PDF + botões baixar / nova aba; estado vazio com o
  aviso de "em preparação".
- **Novo componente** `src/components/RelatorioPdfUploader.tsx` (só renderiza quando
  `isAdmin`): input de arquivo, barra de progresso via `uploadBytesResumable`,
  substituir e remover (`deleteObject` + limpeza dos campos no Firestore) e disparo de
  `createNotification` para o `partnerId` da consulta.
- `src/components/LeadWorkspaceModal.tsx`: no Passo 3, trocar
  `RedeBEReportViewerModal` pelo novo visualizador, adicionar o selo de situação e o
  bloco de upload no card de cada consulta; ajustar os textos que citam a fonte.
- `src/components/DiagnosticStep3Viewer.tsx`: mesma troca de visualizador, selo de
  situação e badge fixo "PROSFEC DIAGNÓSTICO 360" no lugar de `produto_code`.
- `src/components/AdminDashboard.tsx` e `src/components/DossierComparativeViewer.tsx`:
  substituir as menções visíveis à fonte externa.
- `src/components/RedeBEReportViewerModal.tsx` deixa de ser usado e é removido.
- `src/firebase.ts`: exportar `storage` via `getStorage(app)`.
- Validação: `bunx tsgo --noEmit` e build.

## Ação manual necessária (uma vez)

O Firebase Storage precisa estar habilitado no projeto e com as regras publicadas.
Vou entregar o conteúdo do arquivo `storage.rules` para você colar no Console do
Firebase (Storage → Regras → Publicar): leitura liberada para quem tem o link do
arquivo, escrita apenas para a equipe autenticada. Sem esse passo o envio do PDF
retorna erro de permissão.
