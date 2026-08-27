# Auditoria de Segurança + Status das APIs

## 1. Status das APIs (testado agora, todas respondendo)

| Endpoint | Resultado |
|---|---|
| GET /api/credit/catalogo | 200 — catálogo REDEBE retornado |
| GET /api/credit/supplier-balance | 200 |
| GET /api/caca-leads-status | 200 |
| POST /api/consulta-cnpj | 200 — dados reais da Receita |
| GET /api/proxy/integrador-catalogo | 200 — integrador respondendo |
| POST /api/proxy/places-search | 200 (chave Google válida; erro só aparece se o campo `textQuery` vier vazio) |
| GET /api/webhooks/lastlink | 200 — receptor online |
| POST /api/hubla-webhook sem token | 401 — bloqueio funcionando |

Nenhuma API quebrada. Nenhum token hardcoded restante no código — todos vêm de secrets.

## 2. Riscos encontrados (por gravidade)

### Crítico — Regras do Firestore abertas
O `firestore.rules` tem um "negar tudo" no topo, mas em seguida quase todas as coleções liberam `allow read, write: if true`. Na prática, qualquer pessoa com a chave pública do app pode ler e alterar **leads, parceiros, comissões, solicitações de saque e configurações** direto do navegador, sem login. As funções `isAdmin()` existem mas estão anuladas por `|| true`.

### Crítico — Senhas em texto puro
- Senhas de parceiros são gravadas em `parceiros.senha` e comparadas no navegador (`data.senha === loginPassword`).
- Senhas de clientes ficam em `leads.clienteSenha` e são exibidas/enviadas por WhatsApp.
- Senha de membro de equipe também é salva em texto puro.
Quem lê a coleção (que hoje está aberta) obtém todas as credenciais.

### Alto — Webhook LastLink sem autenticação
`POST /api/webhooks/lastlink` aceita qualquer requisição. Qualquer um pode simular uma venda paga e gerar comissão indevida.

### Médio — Comparação de token do Hubla não é constante no tempo
Usa `!==` simples; o correto é comparação time-safe.

### Médio — Endpoints internos sem verificação de origem
Rotas como `/api/proxy/*`, `/api/credit/consultas` e os diagnósticos de IA são públicas e consomem crédito de fornecedores externos; hoje qualquer um pode chamá-las em massa.

## 3. O que proponho fazer

**Etapa A — Fechar o Firestore (maior ganho)**
- Reescrever `firestore.rules` removendo todos os `|| true` e os `if true`.
- Exceções públicas confirmadas por você: `create` público em `leads` (simulador/captação) e `read` público em `parceiros` (resolver links de indicação) — com projeção de campos limitada.
- Todo o resto: leitura para autenticado quando necessário e **escrita apenas para Admin/Contador** (`configuracoes`, `solicitacoes_comissao`, `servicos_contabilidade`, `recargas`, `comunicados`, logs de webhook, etc.).
- Entrego o arquivo pronto para você colar no Console do Firebase.

**Etapa B — Tirar senhas do banco (com migração automática)**

Sim, dá para automatizar. Uso a API REST do Firebase Auth (que aceita a chave pública `apiKey` já presente no projeto), então **não preciso que você crie usuário por usuário no Console**.

Novas rotas no servidor:
- `POST /api/auth/provision-parceiro` — cria a conta no Firebase Auth (e-mail + senha) no momento do cadastro de um novo parceiro. Passa a ser chamada pelo formulário de cadastro, e o Firestore deixa de gravar o campo `senha`.
- `POST /api/auth/migrar-parceiros` — rota de migração única, protegida por um secret (`MIGRATION_ADMIN_TOKEN`), que percorre a coleção `parceiros`, cria no Auth cada parceiro que ainda não existe usando a senha atual dele, grava o `authUid` no documento e **apaga o campo `senha`**. Quem já existir no Auth é apenas vinculado, sem erro.
- Login do parceiro passa a usar `signInWithEmailAndPassword` (mesmo padrão do Admin), com fallback temporário: se o parceiro ainda não tiver conta no Auth, o sistema cria na hora com a senha que ele digitou e valida contra o Firestore uma última vez — depois disso ele só existe no Auth. Assim ninguém fica travado durante a virada.
- "Esqueci minha senha" passa a usar o e-mail de redefinição do Firebase.
- Mesma abordagem para senha de cliente (`leads.clienteSenha`) e de membro de equipe.

O que continua manual: só marcar quem é admin/contador (custom claims) — isso exige credencial de service account. Enquanto isso as regras usam a lista de e-mails que já está no `firestore.rules`.


**Etapa C — Blindar webhooks e APIs**
- Exigir o segredo `LASTLINK_WEBHOOK_TOKEN` por cabeçalho no `POST /api/webhooks/lastlink` (aceita `x-lastlink-token` / `authorization: Bearer`), com comparação time-safe e resposta 401 sem vazar detalhe.
- Trocar a comparação do token Hubla por `crypto.timingSafeEqual`.
- Idempotência: ignorar evento já processado (evita comissão duplicada em reenvio).
- Rate limit simples nos proxies que gastam crédito.

## Execução acordada
1. Gerar e revisar juntos **A** (arquivo `firestore.rules` completo) e **C** (código do servidor).
2. Depois de aprovados, seguir para **B** com as rotas `/api/auth/provision-parceiro` e `/api/auth/migrar-parceiros` + lazy migration no login e exclusão do campo `senha` em texto puro.
3. Por fim **D**.

**Etapa D — Higiene**
- Centralizar leitura de envs em um único módulo do servidor.
- Remover senhas e payloads sensíveis dos `console.log`.

## 4. Ordem sugerida
A → C → B → D. A e C são rápidas e cortam a maior parte do risco; B mexe no login e precisa de janela para a migração dos parceiros.

## 5. O que exige ação sua no Firebase
- Publicar as novas `firestore.rules`.
- Habilitar o provedor **E-mail/Senha** em Authentication → Sign-in method (obrigatório para a migração funcionar).
- Cadastrar o token do webhook LastLink no painel da LastLink.
- (Opcional, depois) definir custom claims de admin/contador via service account.
