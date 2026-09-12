# Preview do PDF com fallback premium no celular

## Objetivo

Permitir a leitura imediata do laudo dentro do modal em computadores, mantendo o download sempre acessível e preservando o card premium como alternativa segura em celulares.

## Como ficará

1. Ao clicar em **“Ver relatório completo”**, o modal ocupará grande parte da tela.
2. O topo permanecerá visível e exibirá:
   - **Laudo Oficial PROSFEC DIAGNÓSTICO 360**;
   - identificação resumida da consulta;
   - botão destacado **“Baixar PDF Completo”**;
   - botão de fechar.
3. Em desktop, o PDF será exibido logo abaixo em uma área ampla, com altura aproximada de 75% da tela.
4. Se o PDF não carregar dentro de alguns segundos, o visualizador será substituído pelo card premium de download.
5. Em telas menores, o iframe não será renderizado. O card premium aparecerá diretamente, evitando a tela de erro comum em iOS e Android.
6. Quando ainda não existir PDF anexado, continuará aparecendo o aviso atual **“Relatório em preparação pela equipe”**.

## Escopo preservado

- Nenhuma alteração em gravação, leitura ou exclusão no Firestore.
- Nenhuma alteração no Firebase Storage, regras, upload ou URL do arquivo.
- Nenhuma alteração em consultas, cobrança, permissões ou outros componentes.
- O nome do arquivo e a lógica atual de download serão mantidos.

## Detalhes técnicos

- Alterar somente `src/components/RelatorioPdfViewerModal.tsx`.
- Ampliar o contêiner para `max-w-6xl`/largura próxima de 11/12 da tela.
- Reutilizar `useIsMobile()` para decidir entre preview e card.
- Reintroduzir o `iframe` apenas no desktop, com título acessível e área estável de aproximadamente `h-[75vh]`.
- Adicionar estado de carregamento e temporizador para detectar falha ou bloqueio do preview; limpar o temporizador ao carregar, fechar ou trocar de consulta.
- Manter o card premium existente como fallback, sem duplicar a lógica do link.
- Manter o botão de download no cabeçalho durante a visualização desktop e dentro do card quando ele for exibido.
- Validar a compilação e conferir visualmente em desktop e celular.
