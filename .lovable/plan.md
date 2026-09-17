# Impedir consulta duplicada no mesmo CPF/CNPJ

## O que acontece hoje

Na ficha do lead, o botão "Confirmar & Executar Consulta" só fica bloqueado enquanto a consulta está processando. Depois que o resultado chega, ele volta a ficar ativo com o mesmo documento selecionado — e um segundo clique gera uma nova consulta e um novo débito de saldo. A proteção contra clique duplo hoje só cobre a mesma requisição em andamento (chave de idempotência), não uma nova consulta feita depois.

## O que será feito

### 1. Botão bloqueado para documento já consultado

O sistema passa a comparar o documento selecionado (só os números) com o histórico de consultas já realizadas daquele lead.

- Se já existe consulta para aquele CPF/CNPJ, o botão fica desativado e mostra "Consulta já realizada para este documento".
- Logo abaixo aparece uma linha explicando a data da consulta existente e orientando a trocar de documento ou abrir o relatório no histórico.
- Ao escolher outro CPF/CNPJ (ou digitar um manual) que ainda não tenha consulta, o botão libera normalmente.

### 2. Trava imediata após o resultado

Assim que a consulta é concluída com sucesso, o documento recém-consultado entra na lista de bloqueados na hora, sem depender do histórico recarregar. Ou seja, o botão trava no mesmo instante em que o resultado aparece.

### 3. Trava dupla de clique

Enquanto a requisição está em andamento, o botão continua desativado e um segundo clique é ignorado mesmo que o navegador dispare o evento duas vezes.

### 4. Proteção no servidor (rede de segurança)

Antes de chamar o fornecedor e debitar o saldo, o servidor verifica se já existe consulta concluída com sucesso para a combinação lead + documento + produto. Se existir, responde com o registro existente, sem nova cobrança, e a tela mostra "Este documento já possui consulta — nenhum saldo foi debitado".

Isso garante que, mesmo com duas abas abertas ou clique muito rápido, nunca haja dois débitos para o mesmo documento.

### 5. Liberar refazer quando for realmente necessário

O Admin continua podendo refazer a consulta de um documento já consultado; para ele o botão não trava (aparece apenas o aviso). O parceiro só consegue consultar documentos novos.

## Detalhes técnicos

- `src/components/LeadWorkspaceModal.tsx`
  - Novo conjunto derivado `documentosConsultados` a partir de `leadConsultas` (dígitos de `c.documento`), acrescido de um estado local com os documentos consultados nesta sessão.
  - `documentoJaConsultado = documentosConsultados.has(selectedQueryDocument.replace(/\D/g,""))`.
  - `disabled` do botão (linha ~3958) recebe `|| (documentoJaConsultado && !isAdminUser)`; rótulo e aviso condicionais.
  - `handleExecuteLocalQuery`: guarda inicial `if (executingLocalQuery) return;` e, no sucesso, adiciona o documento ao estado local antes de `loadLeadConsultas()`.
- `src/lib/prosfec-server.ts`, rota `POST /api/credit/consultas`
  - Antes da reserva/débito, consulta `consultas_realizadas` por `leadId` + documento + produto com status de sucesso; havendo registro, retorna `{ success: true, duplicate: true, debited: false, consulta_id, data }`.
  - Bypass do bloqueio quando o chamador é admin e envia `forcarNovaConsulta: true`.
  - Idempotência, débito atômico e estorno atuais permanecem inalterados.

## Fora de escopo

Preços, catálogo, integração RedeBE, PDF do relatório, layout geral da ficha e qualquer outra área do sistema.
