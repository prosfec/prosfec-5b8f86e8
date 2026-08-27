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
- Modelo: leitura/escrita de leads e parceiros só para usuário autenticado; `configuracoes`, `solicitacoes_comissao` (aprovação), `servicos_contabilidade` e logs de webhook só para admin/contador; criação pública apenas onde o site precisa (ex.: cadastro inicial de lead), com campos limitados.
- Você aplica publicando as regras no Console (posso deixar o arquivo pronto e o passo a passo).

**Etapa B — Tirar senhas do banco**
- Migrar login de parceiro para Firebase Auth (e-mail/senha), como já está no Admin.
- Parar de gravar `senha` / `clienteSenha` / senha de equipe no Firestore; reset passa a usar o fluxo de redefinição do Firebase.
- Script/rotina de migração para os parceiros existentes (senha atual vira conta no Auth uma única vez), para ninguém perder acesso.

**Etapa C — Blindar webhooks e APIs**
- Exigir token/assinatura no webhook LastLink (secret novo `LASTLINK_WEBHOOK_TOKEN`).
- Trocar a comparação do Hubla por `timingSafeEqual`.
- Idempotência: ignorar evento já processado (evita comissão duplicada em reenvio).
- Rate limit simples + verificação de sessão nos proxies que gastam crédito.

**Etapa D — Higiene**
- Centralizar leitura de envs em um único módulo do servidor.
- Remover senhas e payloads sensíveis dos `console.log`.

## 4. Ordem sugerida
A → C → B → D. A e C são rápidas e cortam a maior parte do risco; B mexe no login e precisa de janela para a migração dos parceiros.

## 5. O que exige ação sua no Firebase
- Publicar as novas `firestore.rules`.
- Habilitar provedor E-mail/Senha (se ainda não estiver) para o login de parceiros.
- Cadastrar o token do webhook LastLink no painel da LastLink.
