# Corrigir as 4 regressões do lockdown de segurança

## O que foi confirmado no código

1. **Histórico de consultas não abre** — a regra de `consultas_realizadas` exige uma checagem que busca o documento do parceiro (`partnerDocBelongsToMe`). Em consultas em lista o Firestore compara a regra com o filtro enviado pela tela; a tela filtra por `partnerId == currentPartner.id` (o ID do documento do parceiro), que nem sempre é igual ao identificador de login. Resultado: "Missing or insufficient permissions".

2. **Gravação da RedeBE bloqueada** — todas as gravações do servidor usam a conta de serviço que faz login por e-mail/senha (`PROSFEC_SERVICE_EMAIL`). A regra `isServico()` só aceita o e-mail exato `servico.interno@prosfec.app`. Se o e-mail configurado for outro, toda gravação do servidor volta 403, mesmo com as regras publicadas.

3. **Notificações não são marcadas como lidas** — a tela grava `lida` **e** `dataLeitura`, mas a regra só permite alterar `lida`. Confirmado em `PartnerPortal.tsx` (linha 626) e na regra de `notificacoes`.

4. **Botão travado após erro** — quando a consulta falha com erro de servidor (5xx) ou 409, a tela **mantém** a mesma chave da tentativa. Na nova tentativa o servidor encontra o registro anterior e devolve 409 "já está sendo processada", travando o botão até fechar e reabrir o modal.

## Correções propostas

### 1. Histórico de consultas
- Ajustar a regra de leitura de `consultas_realizadas` para uma comparação direta e aceita em listagens: dono pelo identificador de login **ou** pelo identificador do parceiro presente no token, mantendo acesso total para equipe interna e servidor.
- Ajustar a busca na ficha do lead para filtrar sempre pelo mesmo identificador usado na regra, evitando bloqueio por filtro incompatível.

### 2. Gravação da RedeBE
- Tornar a regra `isServico()` compatível com a conta de serviço realmente usada, aceitando também a marcação de serviço no token, em vez de depender de um único e-mail fixo.
- No servidor, expor o motivo real quando a gravação for negada (hoje o erro chega genérico) e registrar o e-mail da conta de serviço em uso — sem expor senha — para confirmar a correspondência.
- Após a correção, executar uma consulta de teste e conferir que o registro é gravado e o saldo debitado.

### 3. Notificações
- Permitir na regra a alteração conjunta de `lida` e `dataLeitura`.

### 4. Retentativa liberada
- Na tela: sempre limpar a chave da tentativa quando a consulta terminar em erro, de modo que a próxima tentativa use uma chave nova e o botão volte a funcionar imediatamente.
- No servidor: quando o registro anterior estiver como falha ou estorno, permitir refazer a consulta em vez de devolver conflito; manter o bloqueio apenas para tentativas realmente em andamento.

## Entrega
Ao final, o arquivo completo de regras será impresso no chat para republicação no console.

## Arquivos afetados
- `firestore.rules` — consultas_realizadas, notificacoes, isServico
- `src/components/LeadWorkspaceModal.tsx` — filtro do histórico e limpeza da chave de tentativa
- `src/lib/prosfec-server.ts` — retentativa após falha e mensagem de erro da gravação

Nenhuma alteração visual será feita.
