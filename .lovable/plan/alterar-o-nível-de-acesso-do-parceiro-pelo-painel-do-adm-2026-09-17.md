# Alterar o nível de acesso do parceiro pelo painel do ADM

## O que muda

Dentro de "Abrir Operação" (ficha do parceiro no painel do ADM), no bloco "Plano de Parceria e Termos", entra um controle para trocar o nível de acesso do parceiro entre:

- Starter
- Executive Partner PROSFEC
- Master Partner

Assim o ADM promove ou rebaixa o parceiro sem pedir novo cadastro.

## Como vai funcionar

1. O campo "Plano Escolhido" continua mostrando o nível atual e ganha ao lado um seletor com as três opções.
2. Ao escolher um nível diferente, aparece uma confirmação com o nome do parceiro, o nível atual e o novo nível.
3. Confirmado, o novo nível é gravado no cadastro do parceiro e a ficha, a lista de parceiros e o texto de comissão estimada atualizam na hora.
4. O parceiro recebe uma notificação no painel dele informando o novo nível de acesso.
5. Contador não pode alterar (mesmo critério já usado no ajuste de saldo); o seletor fica desabilitado para esse perfil.
6. Nada de saldo, comissões já geradas, leads ou contratos é alterado — só o nível de acesso.

## Observação sobre consultores de equipe

Parceiros que são consultores de um Master (plano "Consultor Executivo"/"Consultor Starter") não entram nessa troca: para eles o seletor aparece bloqueado com o aviso de que o plano é gerido pelo Master. Se você quiser que o ADM também troque o plano desses consultores, é só avisar que eu incluo.  
  
O usuario Master, nao consegue alterar a o nivel de usuario de sua equipe. Matenha o controle total sobre o Master de seu equipe, mas configure para que o usuario master consiga alterar.

## Detalhes técnicos

- Arquivo: `src/components/AdminDashboard.tsx` (modal `selectedPartner`, bloco "Plano de Parceria e Termos", por volta da linha 7075).
- Nova função `handleUpdatePartnerPlan(partnerId, novoPlano)`: `updateDoc(doc(db, "parceiros", id), { plano, planoAlteradoEm, planoAlteradoPor })`, atualização de `partners` e `selectedPartner` no estado local e `createNotification(partnerId, "parceiro", ...)`.
- Valores gravados seguem os rótulos já reconhecidos pelos filtros e por `getPlanName`/`getCommissionDetailText`: `STARTER`, `Executive Partner PROSFEC`, `MASTER PARTNER`.
- Regras do Firestore já permitem essa escrita (`parceiros` update para `isStaff()`), sem necessidade de republicar regras.
- Nenhuma alteração em lógica de comissões (`commissionUtils.ts`) ou no painel do parceiro.  
  
Nao alterar mais nada alem do solicitado. Deixe o sitema e estrutura exatamente como esta e faça somente o solicitado acima.