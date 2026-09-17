# Auditoria e correção das comissões de serviços de estruturação

## O que foi conferido

Regra desejada:
- Master: 30% no total. Venda direta dele = 30%. Venda da equipe = o consultor recebe a parte dele e o Master fica com a diferença (consultor Executive 20% + Master 10%; consultor Starter 10% + Master 20%).
- Executive sem Master: 20% direto.
- Starter sem Master: 10% direto.

Resultado da varredura:

1. O motor central de comissões (`src/utils/commissionUtils.ts`) está **correto**: 10% / 20% / 30% e repasse de equipe 20% / 10% / 0%, sempre fechando o teto de 30%.
2. O painel do parceiro **não usa esse motor**. Ele tem cópias próprias das mesmas contas dentro de `PartnerPortal.tsx` (linhas 1321-1337), com regras de "caso não reconhecido" diferentes. Hoje isso causa três riscos reais:
   - Parceiro com plano escrito de forma diferente (ex.: "Parceiro PROSFEC", "Consultor") recebe **20%** por padrão, mesmo sendo Starter.
   - Se o plano do consultor não for reconhecido, o Master recebe **10%** de repasse em vez de 20% — a soma deixa de fechar 30%.
   - Se o consultor não for encontrado na lista da equipe, o sistema assume "Executive" e paga 10% ao Master.
3. As parcelas de **mensalidade de assessoria** (itens espelho dentro do Passo 6) **entram na conta de comissão de serviço** no painel do parceiro (Desempenho de Serviços e Saldo para Saque). No painel do ADM e na ficha do lead esses itens são corretamente excluídos. Ou seja: o parceiro pode estar vendo — e sacando — comissão de serviço inflada.
4. Quando o próprio parceiro salva serviços na ficha do lead, o registro de comissão gravado no lead sai **sem a parte do Master** (a lista de parceiros é enviada vazia). O valor só é corrigido quando o ADM salva a ficha depois. A tela do Master mostra o valor certo, mas o registro histórico do lead fica divergente.

## O que será corrigido

1. **Uma única fonte de verdade para percentuais**
   - O painel do parceiro passa a usar as funções de `commissionUtils.ts`; as cópias locais são removidas.
   - Regra de segurança para plano não reconhecido: trata como **Starter (10%)** e, quando o consultor é da equipe de um Master, o Master recebe a diferença até 30% (20%). Assim a soma sempre fecha 30% e nunca paga a mais.

2. **Mensalidades fora da comissão de serviço**
   - Desempenho de Serviços, Comissões Pendentes e Saldo Disponível para Saque passam a ignorar os itens de mensalidade, igual ao ADM.

3. **Registro do lead com a parte do Master**
   - Ao salvar serviços pelo painel do parceiro, o sistema envia o vínculo com o Master, para o registro do lead já nascer com consultor + Master corretos.

4. **Conferência final**
   - Teste com três cenários: Starter independente (10%), Executive independente (20%), Master direto (30%), Master com consultor Executive (20% + 10%) e Master com consultor Starter (10% + 20%), verificando Desempenho, Comissões e Saldo de Saque.

## Detalhes técnicos

- `src/components/PartnerPortal.tsx`: remover `getServiceCommissionRate`, `getMasterTeamServiceOverrideRate`, `isFranquiaDigital` e `getPlanServiceLabel` locais (1321-1357) e importar de `@/utils/commissionUtils`; aplicar `withoutMensalidades` nas listas de serviço usadas em Desempenho (~5566-5800) e no modal de saque (~11610-11685).
- `src/utils/commissionUtils.ts`: `normalizePartnerPlan` passa a devolver `STARTER` (em vez de `EXECUTIVE`) quando o plano não for reconhecido, e `getMasterTeamServiceOverrideRate` devolve 20% nesse caso; consultor não encontrado na equipe também cai nessa regra.
- `src/components/LeadWorkspaceModal.tsx` e `src/components/LeadRegisterForm.tsx`: passar o Master (`parentPartnerId` do parceiro logado) na chamada de `buildLeadMultilevelFirestorePayload`, hoje feita com lista vazia.
- Sem mudanças em Firestore Rules, saques já registrados, comissões de venda de plano (0,5% / 1,5% / 3%) ou no painel do ADM.
- Validação: `bunx tsgo --noEmit` e build limpo.
