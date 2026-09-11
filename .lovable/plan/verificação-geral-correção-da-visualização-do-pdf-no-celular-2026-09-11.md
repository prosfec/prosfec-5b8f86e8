# Verificação geral + correção da visualização do PDF no celular

## Situação atual (verificado agora)

- A compilação do projeto está OK, sem erros pendentes.
- O envio do PDF pela equipe, o selo de situação na ficha do lead e o aviso de
  "PDF pendente" no painel do ADM estão ligados e funcionando no código.
- A tela de erro no celular tem causa conhecida: o relatório é exibido dentro de
  uma "janela embutida" (iframe). Navegadores de celular (Safari no iPhone e
  Chrome no Android) não abrem PDF assim — resultam em tela em branco, erro ou
  download forçado. Em computador funciona; em celular, não.

## O que será feito

1. **Detectar celular** e trocar a exibição:
   - Em computador: continua exatamente como está hoje (relatório aberto na
     própria tela).
   - Em celular: no lugar da janela embutida, aparece um cartão limpo com o nome
     do titular, documento e data, e dois botões grandes — **Abrir relatório** e
     **Baixar PDF** — que abrem o arquivo no leitor nativo do aparelho.
2. **Rede de segurança em qualquer aparelho**: se o relatório não carregar na
   tela em alguns segundos, aparece automaticamente o aviso "Não foi possível
   exibir aqui" com os mesmos dois botões, em vez de tela de erro.
3. **Ajuste de layout no celular**: o visualizador passa a ocupar a tela inteira,
   com cabeçalho compacto e botões que não se sobrepõem em telas estreitas.
4. **Revisão dos textos**: confirmar que em nenhuma tela aparece o nome da fonte
   externa — apenas PROSFEC DIAGNÓSTICO 360.

## O que NÃO muda

Execução e cobrança da consulta, saldo, catálogo e preços, envio do PDF pela
equipe, notificações, aviso de PDF pendente no painel do ADM, contratos,
permissões, painel do parceiro fora do Passo 3, site público e simulador.

## Detalhes técnicos

- `src/components/RelatorioPdfViewerModal.tsx`: usar `useIsMobile()`
  (`src/hooks/use-mobile.tsx`) para escolher entre `<iframe>` (desktop) e cartão
  com ações (mobile); adicionar `onLoad`/timeout com estado `loadFailed` para o
  fallback; classes responsivas (`h-[100dvh] sm:h-auto`, `max-h-[100dvh]`,
  botões com rótulo oculto em telas pequenas).
- Manter o link de download com o nome `PROSFEC_DIAGNOSTICO_360_{documento}.pdf`
  e `target="_blank" rel="noreferrer"`.
- Varredura de menções residuais à fonte externa em `src/` (apenas textos
  visíveis; códigos internos de produto e cobrança permanecem).
- Validação: `bunx tsgo --noEmit` + build, e conferência da tela em largura de
  celular.
