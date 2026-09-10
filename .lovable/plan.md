# Blindar o fluxo RedeBE e o diagnóstico PROSFEC IA

## Diagnóstico confirmado

O fluxo atual ainda possui pontos capazes de causar novas falhas:

1. **Consulta e diagnóstico sem validação do usuário no servidor**
   - `POST /api/credit/consultas` aceita `partnerId` e até `isAdminBypass` enviados pelo navegador.
   - `POST /api/credit/diagnostico-prosfec` aceita qualquer `leadId` sem conferir o responsável.
   - Isso permite identificar o parceiro errado, ignorar cobrança ou acessar dados de outro lead.

2. **Cobrança RedeBE sem operação atômica**
   - A RedeBE é chamada antes do débito.
   - O saldo é lido e gravado em operações separadas; duas requisições simultâneas podem usar o mesmo saldo.
   - Se o fornecedor responder e o débito ou o registro falhar depois, a consulta externa já ocorreu, mas o sistema pode devolver erro e perder a rastreabilidade.
   - Não existe chave de idempotência; repetição do navegador ou da rede pode gerar consulta e cobrança duplicadas.

3. **Erros do banco mascarados**
   - `getDocRest()` transforma qualquer resposta não bem-sucedida em “documento não encontrado”, inclusive permissão, autenticação e indisponibilidade.
   - O token da RedeBE ainda possui um valor fixo no código como fallback.
   - As chamadas externas e REST não têm proteção contra travamento; já há registros de requisições com status `0` no ambiente publicado.

4. **Problemas na geração do diagnóstico**
   - A Etapa 1 do Gemini, ao falhar ou retornar JSON inválido, cria uma auditoria estimada com dívidas e protestos zerados e continua gerando um laudo como se fosse válido.
   - Falhas ao buscar consultas também são ignoradas, permitindo diagnóstico sem os relatórios obrigatórios.
   - As consultas são associadas somente por CPF/CNPJ, sem validar `leadId` e parceiro responsável.
   - O fallback de modelos tenta outros modelos inclusive em erros permanentes e repete `429` imediatamente, sem espera.
   - A contagem máxima de diagnósticos não é atômica; duas solicitações simultâneas podem ultrapassar o limite.
   - O Passo 7 ainda usa o SDK web do banco dentro do servidor (`getDoc`, `getDocs`, `updateDoc`), mantendo o risco de `XMLHttpRequest is not defined` e requisição pendurada.

5. **Interface pode apresentar preço incorreto ou esconder a causa**
   - Se o catálogo falhar, a tela ainda mostra `R$ 69,86` fixo e permite enviar produto vazio, enquanto o servidor assume o produto padrão.
   - A consulta recente de produção em **09/09/2026 23:25 UTC** terminou em HTTP 400, mas o log disponível não registra o corpo do erro; portanto a causa exata desse evento precisa ser reproduzida de forma controlada.
   - Não há chamadas do diagnóstico no histórico do Lovable AI Gateway porque o projeto usa diretamente o SDK do Gemini; a análise disponível vem do código e dos logs do servidor.

## Implementação proposta

### 1. Proteger identidade e autorização

- Validar no servidor o token do usuário autenticado em todas as rotas de consulta e diagnóstico.
- Derivar `partnerId`, papel administrativo e acesso ao lead no servidor; nunca confiar em `partnerId` ou `isAdminBypass` enviados pelo navegador.
- Restringir a leitura das consultas ao parceiro responsável, staff ou serviço interno.

### 2. Tornar consulta, saldo e histórico consistentes

- Gerar uma chave de idempotência por solicitação e bloquear repetições da mesma operação.
- Reservar/debitar saldo com operação transacional antes da chamada cobrável.
- Se a RedeBE falhar, estornar a reserva e registrar a falha; se responder, finalizar o registro com o resultado recebido.
- Gravar estados explícitos (`processando`, `sucesso`, `falha`, `estornado`) para permitir recuperação e auditoria.
- Garantir que o saldo nunca fique negativo e que chamadas concorrentes não sobrescrevam débitos.
- Remover o token fixo da RedeBE e exigir a configuração segura do ambiente.

### 3. Corrigir comunicação e tratamento de falhas

- Fazer `getDocRest()` distinguir 404 de 401/403/429/5xx, preservando uma mensagem útil e segura.
- Adicionar limite de espera e tentativas controladas apenas para falhas transitórias da RedeBE e do banco.
- Exibir ao usuário a causa retornada pelo servidor sem transformar tudo em erro genérico.
- Bloquear “Confirmar & Executar Consulta” enquanto o catálogo oficial não estiver carregado; remover o preço visual fixo e impedir produto vazio.

### 4. Tornar o diagnóstico confiável

- Interromper a geração quando as consultas obrigatórias não puderem ser lidas ou estiverem ausentes; não produzir laudo financeiro com valores inventados.
- Validar o JSON da auditoria antes da redação final e rejeitar campos ausentes, inválidos ou fora do catálogo.
- Vincular cada consulta a `leadId` e `partnerId`, usando essa relação na seleção dos relatórios.
- Corrigir a política de tentativas do Gemini: erro de credencial/configuração para imediatamente; limite de uso espera antes de nova tentativa; falhas temporárias têm poucas tentativas com espera progressiva.
- Validar os modelos realmente disponíveis antes de manter a lista de fallback.
- Aplicar controle atômico ao limite de geração/refação.
- Migrar o Passo 7 restante para os helpers REST compatíveis com o servidor.

### 5. Validação

- Testar cenários automatizados: saldo suficiente, insuficiente, concorrência, repetição da mesma solicitação, RedeBE indisponível, falha de gravação, consulta sem CPF/CNPJ completo, Gemini sem chave, limite de uso, JSON inválido e diagnóstico duplicado.
- Confirmar que uma consulta bem-sucedida gera exatamente um débito, um histórico e a atualização imediata do saldo.
- Confirmar que nenhuma falha da auditoria gera laudo “estimado” apresentado como real.
- Executar validação de tipos, compilação e inspeção dos logs do servidor.
- Fazer uma consulta real somente com um CPF/CNPJ de teste autorizado, pois ela pode consumir saldo no fornecedor.

## Arquivos previstos

- `src/lib/prosfec-server.ts` — autorização, idempotência, transação de saldo, RedeBE, Gemini, REST e Passo 7.
- `src/components/LeadWorkspaceModal.tsx` — envio do token, catálogo obrigatório, chave idempotente e mensagens de erro.
- `firestore.rules` — somente se a nova estrutura de registro exigir permissão adicional; sem ampliar acesso de parceiros.

Nenhuma mudança visual ampla será feita; apenas estados e mensagens necessários para impedir cobrança ou diagnóstico incorreto.
