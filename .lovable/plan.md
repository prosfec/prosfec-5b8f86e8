# Área do Cliente nativa em /portal-cliente

## Resposta curta

Sim, é tecnicamente viável, e dá para fazer sem quebrar o Portal do Parceiro nem o Administrativo. Hoje o "Portal do Cliente" já roda dentro da mesma aplicação (`TrackingPortal.tsx`, aberto por `?acompanhamento=<id>` em `src/App.tsx`) — o que falta é rota própria, sessão real e regras de Firestore que reconheçam o cliente.

## Situação atual verificada

- `src/App.tsx` (linha ~251) abre o portal por query string; não existe rota `/portal-cliente`. `/admin` já é rota própria (`src/routes/admin.tsx`).
- O login do cliente é feito por hash PBKDF2 validado no servidor (`/api/auth/cliente-login`, `/api/auth/cliente-definir-senha`, `/api/auth/cliente-reset-senha` em `src/lib/prosfec-server.ts`). O cliente **não** obtém sessão no Firebase.
- Por isso toda gravação do cliente foi desviada para `/api/portal/salvar-lead`, que grava com a identidade de serviço (`servico.interno@prosfec.app`, função `isServico()` no `firestore.rules`). A leitura passa por `/api/portal/buscar-lead`.
- `firestore.rules` hoje: `leads` só é legível por usuário autenticado; atualização por serviço, staff ou autenticado sem tocar campos de senha. Não há nenhuma cláusula para "o próprio cliente".

## Arquitetura recomendada

Recomendo o **modelo B (Firebase Auth real para o cliente)** como destino, com o modelo A (BFF via servidor) permanecendo como caminho de compatibilidade durante a transição.

### Modelo B — conta real no Firebase Auth
- Cada lead com acesso ganha uma conta Email/Senha no Firebase Auth (criada pela REST API com a `FIREBASE_API_KEY` que o servidor já usa para provisionar parceiros).
- O e-mail já existe no lead; quando faltar, o acesso continua pelo modelo A até o cliente cadastrar um e-mail.
- Vínculo: grava-se `clienteAuthUid` no doc do lead.
- Regras passam a permitir leitura/gravação do próprio lead:
  - `allow read: if isClienteDoLead()` — `resource.data.clienteAuthUid == request.auth.uid` ou `resource.data.email.lower() == userEmail().lower()`.
  - `allow update: if isClienteDoLead() && clienteCamposPermitidos()` — allowlist espelhando a que já existe em `/api/portal/salvar-lead` (documentos/links, ficha de rating, assinatura, último acesso), bloqueando comissão, status, aprovação e campos de senha.
- Vantagem: senha, reset por e-mail, verificação e sessão passam a ser responsabilidade do Firebase; o cliente lê em tempo real (`onSnapshot`), sem depender do proxy.
- Limitação importante: **custom claims** (ex.: `role: cliente`) exigem chave de conta de serviço (Admin SDK), que hoje não está no projeto. Por isso as regras devem se basear em `uid`/`email` no próprio documento, e não em claims.

### Modelo A — continua para quem não tem e-mail
Mantém `/api/auth/cliente-login` + `/api/portal/salvar-lead` intactos. Nenhuma regressão para clientes antigos.

## Como eu estruturaria a migração

1. **Rota e navegação** — criar `src/routes/portal-cliente.tsx` (`ClientOnly` + lazy, `noindex`), renderizando `TrackingPortal`. `?acompanhamento=<id>` passa a redirecionar para `/portal-cliente?lead=<id>`, e todos os links gerados (`LeadWorkspaceModal`, `FichaRatingAdmViewer`, `TrackingPortal`, `Simulador`) apontam para a URL nova. Os links antigos continuam funcionando.
2. **Sessão** — extrair a lógica de sessão do cliente para um `useClienteAuth`: guarda `leadId` + modo de sessão (Firebase ou servidor) e mantém o cliente logado ao recarregar a página (hoje o acesso se perde a cada refresh).
3. **Provisionamento Auth** — nova rota `POST /api/auth/cliente-provision`: cria/vincula a conta Firebase do lead e grava `clienteAuthUid`. Chamada no primeiro acesso, no login bem-sucedido do modelo A (migração preguiçosa, igual à dos parceiros) e opcionalmente em lote protegido por `MIGRATION_ADMIN_TOKEN`.
4. **Regras** — publicar `firestore.rules` com `isClienteDoLead()` e a allowlist de campos do cliente. Entrego o arquivo completo em bloco de código para você publicar no console (é a única etapa manual).
5. **Leitura direta** — depois que a conta existir, `TrackingPortal` passa a ler o lead por `onSnapshot`; enquanto não existir, segue com `/api/portal/buscar-lead`.
6. **Área do Cliente propriamente dita** — organizar o conteúdo já existente em seções da rota: dashboard/andamento, diagnóstico, documentos (links de nuvem), assinaturas, notificações e suporte.

## Riscos

| Risco | Mitigação |
| --- | --- |
| Regras novas publicadas incorretamente derrubam o acesso (já aconteceu) | Entregar o arquivo completo, só adicionando blocos; testar admin, parceiro e cliente logo após publicar |
| Lead sem e-mail ou com e-mail duplicado entre leads | Modelo A como fallback; ao provisionar, tratar `EMAIL_EXISTS` vinculando pelo uid existente |
| Regra por e-mail dá acesso a mais de um lead do mesmo cliente | É o comportamento desejado (mesma empresa/pessoa); a Área do Cliente lista os leads dele |
| Exposição de campos internos ao ler o lead direto do Firestore | A tela só renderiza os campos já exibidos hoje; campos de senha continuam bloqueados por regra |
| Quebrar links `?acompanhamento=` já enviados a clientes por WhatsApp | Redirecionamento permanente para a rota nova, mantendo o parâmetro antigo |
| Regressão em Parceiro/Admin | Nenhum arquivo desses fluxos é alterado; as mudanças em `firestore.rules` são aditivas |

## Impacto nos outros portais

Nenhuma alteração em `PartnerPortal.tsx` ou `AdminDashboard.tsx`, além de trocar a URL gerada nos links de acompanhamento. As regras dos parceiros e do staff permanecem literalmente as mesmas.

## O que muda para o cliente

Ele passa a acessar `prosfec.com.br/portal-cliente`, entra com e-mail e senha, continua logado ao voltar, vê o andamento atualizando em tempo real e pode recuperar a senha sozinho por e-mail.
