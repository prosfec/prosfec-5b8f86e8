# Corrigir troca automática do serviço "Renegociação Estratégica de Dívidas - Pessoa Física"

## O que está acontecendo

Existe uma regra antiga de unificação de serviços no sistema. Qualquer serviço cujo nome
contenha "renegociação" (ou "reabilitação", "limpa nome") é automaticamente convertido em
um único serviço: recebe o nome do primeiro serviço do catálogo com essa palavra, o valor
dele e o mesmo identificador interno.

Por isso, ao colocar "Renegociação Estratégica de Dívidas - Pessoa Física" no Workspace do
lead, ele é reescrito como "Renegociação Estratégica de Dívidas - Empresa". E como a regra
só deixa passar um item desse grupo, os dois serviços nunca coexistem na ficha do lead.

Essa regra existia para consolidar registros antigos (Renegociação / BACEN avulso), mas hoje
atrapalha o catálogo atual, em que PF e Empresa são serviços distintos.

## Correção proposta

Passar a tratar o serviço pelo que está cadastrado no catálogo:

- Se o serviço do lead casar com um item do catálogo (por identificador ou pelo nome exato),
  ele mantém o próprio nome, valor, descrição e link — sem ser fundido com nenhum outro.
- A unificação antiga passa a valer apenas para registros realmente legados: itens com os
  identificadores antigos (`serv_reabilitacao`, `serv_renegociacao`, `serv_bacen`) que não
  existam mais no catálogo atual.
- Continua sem duplicar: dois registros legados idênticos seguem sendo consolidados em um.

Resultado: PF e Empresa podem ser cadastrados e usados lado a lado, cada um com seu preço,
descrição e link de pagamento.

## Detalhes técnicos

- `src/utils/serviceUtils.ts`, `sanitizeAndSyncServicosList`:
  - antes de aplicar a regra de unificação, procurar correspondência direta no catálogo ativo
    (`id` igual ou `nome` normalizado igual); havendo match, seguir pelo caminho normal de
    sincronização (nome/valor/descrição/hublaLink do catálogo) e não entrar no merge;
  - restringir `isReabilitacao`/`isBacenAvulso` a itens sem correspondência no catálogo;
  - manter `mergedReabilitacaoItem` / `mergedRatingScoreItem` apenas para esse caso legado.
- Nada muda em `AdminDashboard.tsx`, `LeadWorkspaceModal.tsx` ou `PartnerPortal.tsx`: todos
  consomem a mesma função.
- Validação: `bunx tsgo --noEmit`, build, e teste manual adicionando os dois serviços de
  renegociação (PF e Empresa) no Workspace de um lead.

## Fora de escopo

Preços, comissões, links de checkout, contratos, regras do Firestore, autenticação, simulador
e qualquer outra tela.
