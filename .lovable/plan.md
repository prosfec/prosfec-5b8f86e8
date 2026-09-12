# Parceiro voltar a enxergar as consultas e os PDFs do seu lead

Nada do visualizador de PDF muda. Ele fica exatamente como está hoje (abre o arquivo
com o leitor do navegador, com o cartão de download como alternativa). Nenhuma
biblioteca nova foi instalada na tentativa anterior, então não há o que desfazer.

## O que está acontecendo (verificado no código)

Na ficha do lead, a lista de consultas é buscada direto do banco pelo navegador, com
dois filtros ao mesmo tempo: o documento (CNPJ/CPF) **e** o campo `partnerId` da
consulta. As regras do banco também só liberam a leitura quando esse `partnerId` é do
próprio parceiro logado.

Quando a consulta é disparada com a ficha aberta pela equipe, ou quando o vínculo do
lead está gravado em outro campo, a consulta é registrada com `partnerId` da equipe
("admin"). Nesse caso o parceiro dono do lead:

- não recebe nenhum resultado na busca (fica "nenhuma consulta executada");
- não conseguiria ler o registro nem que a busca fosse por outro caminho, porque a
  regra do banco barra a leitura.

Também há um segundo caminho de falha: se a sessão do parceiro no Firebase ainda não
estiver pronta, a busca é negada por permissão e a tela simplesmente mostra vazio, sem
nenhum aviso.

## Como corrigir

Parar de buscar as consultas direto do navegador e passar a pedi-las ao servidor, que
já sabe checar quem é o dono do lead — o mesmo mecanismo usado para executar a
consulta. Assim o parceiro passa a ver **todas** as consultas do lead dele,
independentemente de quem apertou o botão, e nenhum parceiro enxerga lead alheio.

1. **Nova rota de leitura no servidor**: recebe o `leadId`, identifica quem está
   chamando, confirma que a pessoa é a equipe ou o parceiro responsável por aquele lead
   e devolve as consultas daquele lead (por vínculo com o lead e, para registros
   antigos, pelo CNPJ da empresa e CPFs dos sócios), já sem registros de controle.
2. **Ficha do lead** passa a usar essa rota em vez da consulta direta ao banco. A lista,
   os selos "Relatório disponível" / "Relatório em preparação", o botão "Ver relatório
   completo" e o bloco de anexo da equipe continuam iguais.
3. **Aviso claro em vez de tela vazia**: se a busca falhar (rede, sessão), a ficha mostra
   "Não foi possível carregar as consultas — tentar novamente", em vez de dar a
   impressão de que nenhuma consulta foi feita.
4. **Liberação do Passo 4** continua igual: basta existir uma consulta executada.

O anexo do PDF pela equipe, o armazenamento, as permissões do arquivo, a cobrança, o
saldo e o painel administrativo não mudam.

## Detalhes técnicos

- `src/lib/prosfec-server.ts`: nova rota `GET /api/credit/consultas?leadId=...`, usando
  `authenticateApiCaller` + `assertLeadAccess`, `runQueryRest("consultas_realizadas")`
  por `leadId` (EQUAL) e por `documento` (IN, CNPJ + CPFs dos sócios), unindo por id,
  descartando locks (`ia_diagnostico_*` / sem `resultado`) e ordenando por
  `dataConsulta` desc. Retorna apenas os campos usados na tela, incluindo
  `relatorioPdfUrl`, `relatorioPdfNome`, `relatorioPdfEnviadoEm`.
- `src/components/LeadWorkspaceModal.tsx`: `loadLeadConsultas` troca
  `getDocs(query(...))` pela chamada autenticada à nova rota (`authenticatedHeaders`),
  mantendo `leadConsultas`, `loadingConsultas` e a recarga após executar consulta ou
  anexar/remover PDF; novo estado de erro com botão "Tentar novamente".
- Nenhuma alteração em `firestore.rules`, `storage.rules`, `RelatorioPdfViewerModal.tsx`
  ou `RelatorioPdfUploader.tsx` (o upload da equipe segue direto no banco, como hoje).
- Validação: `bunx tsgo --noEmit` e build.

## Fora de escopo

Visualizador de PDF, upload, regras do banco e do armazenamento, cobrança, catálogo de
preços, contratos, autenticação, painel administrativo, site público e simulador.
