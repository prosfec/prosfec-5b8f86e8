# Card de Download Premium no lugar do iframe de PDF

## Objetivo

Eliminar a exibição embutida do PDF do laudo (iframe) e substituí-la por um card limpo e premium de download, funcionando igualmente bem em desktop e mobile. A URL do PDF e todo o backend permanecem inalterados.

## Como fica na prática

1. Ao clicar em "Ver relatório completo" com PDF anexado, o modal exibe um card centralizado em vez do iframe.
2. O card mostra:
   - Ícone grande de documento (`FileText` ou `FileDown` do lucide-react).
   - Título em destaque: "Laudo Oficial PROSFEC DIAGNÓSTICO 360".
   - Subtítulo explicando que o documento contém o detalhamento oficial e pode ser baixado.
   - Botão primário "Baixar PDF Completo" apontando para `consulta.relatorioPdfUrl` com `target="_blank" rel="noopener noreferrer"` e atributo `download`.
3. O estado "Relatório em preparação" (sem PDF) continua igual, sem alterações.
4. O cabeçalho do modal e os botões de ação no desktop (quando existirem) permanecem.

## O que NÃO muda

- Nenhuma lógica de gravação, leitura ou exclusão no Firestore.
- Nenhuma regra ou função do Firebase Storage.
- A URL do PDF (`relatorioPdfUrl`) e o nome do arquivo para download.
- Componentes de upload (`RelatorioPdfUploader.tsx`), listagem (`DiagnosticStep3Viewer.tsx`, `LeadWorkspaceModal.tsx`) e painel administrativo (`AdminDashboard.tsx`).
- Textos que já citam "PROSFEC DIAGNÓSTICO 360" permanecem padronizados; o nome da fonte externa não volta a aparecer.

## Detalhes técnicos

- Arquivo alterado: `src/components/RelatorioPdfViewerModal.tsx`.
- Remover a tag `<iframe>` (linhas 177–182) e todo o estado/efeito relacionado a carregamento (`loaded`, `loadFailed`, timer `setTimeout`, `onLoad`).
- Remover a importação de ícones que deixarem de ser usados (`Clock`, `AlertCircle`, `ExternalLink`, `Download`, `FileText` — ajustar conforme necessário).
- Manter o cabeçalho do modal e o botão de fechar.
- No corpo do modal, quando `url` existir, renderizar um card premium centralizado:
  - Fundo branco, borda sutil, sombra leve, bordas arredondadas.
  - Ícone `FileText` (ou `FileDown`) em tamanho grande (`w-16 h-16` ou similar) com cor da identidade PROSFEC.
  - Título em negrito e subtítulo em tom suave.
  - Botão primário "Baixar PDF Completo" com ícone de download.
- Preservar o estado vazio "Relatório em preparação pela equipe" quando `!url`.
- Validação: `bunx tsgo --noEmit` e build.
