# Destravar o "Operação duplicada." no Diagnóstico PROSFEC IA

## Causa confirmada

Ao gerar o diagnóstico, o servidor cria um documento de trava com caminho fixo por lead e número da geração (`consultas_realizadas/ia_diagnostico_<leadId>_<n>`), usando uma criação que só funciona se o documento **não existir**.

Quando uma tentativa falha (Gemini, tempo esgotado, consulta ausente), o código atual apenas marca a trava como `falha` — mas o documento continua existindo. Na tentativa seguinte, o número da geração é o mesmo, o documento já está lá, e a criação devolve conflito, que a tela mostra como **"Operação duplicada."**. Ou seja: a primeira falha bloqueia o lead para sempre.

Na tela, o estado de carregamento já é liberado corretamente no erro; o problema é somente no servidor.

## Correção proposta

### 1. Trava reutilizável após falha (`src/lib/prosfec-server.ts`)

Antes de criar a trava do diagnóstico:

- Ler a trava existente naquele caminho.
- Se não existir: criar normalmente (comportamento atual).
- Se existir com status `falha` ou `estornado`: reaproveitar, atualizando para `processando` com nova data — sem devolver conflito.
- Se existir com status `processando` mas antiga (acima de 5 minutos, tempo maior que o limite das chamadas externas): considerar abandonada e reaproveitar da mesma forma.
- Se existir com status `processando` recente: manter o bloqueio atual, com a mensagem clara "Este diagnóstico já está sendo gerado. Aguarde alguns instantes."
- Se existir com status `sucesso`: manter bloqueio (a contagem de gerações já cobre esse caso).

### 2. Liberação garantida no fim da operação

- Manter a marcação de `sucesso` ao concluir.
- No tratamento de erro, garantir que a trava sempre termine como `falha`, incluindo os casos que hoje saem por resposta de erro antes do bloco final (por exemplo, quando não há consultas de crédito válidas), para que a próxima tentativa entre pelo caminho de reaproveitamento.
- O conflito real de concorrência continua devolvendo 409, mas com mensagem própria, sem se confundir com "Operação duplicada.".

### 3. Sem mudanças visuais

Nenhuma alteração de layout. A tela só passa a receber mensagens de erro mais precisas.

## Arquivo afetado

- `src/lib/prosfec-server.ts` — rota `POST /api/credit/diagnostico-prosfec` (criação e liberação da trava).

Nada muda na integração com a RedeBE, no débito de saldo, nas regras do banco ou na interface.
