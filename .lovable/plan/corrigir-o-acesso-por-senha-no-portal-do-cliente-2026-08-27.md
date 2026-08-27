# Corrigir o acesso por senha no Portal do Cliente

## O que está acontecendo (verificado no código)

1. **Quem já tem senha nunca vê a tela de login.** A busca do lead passa pela rota do servidor `/api/portal/buscar-lead`, que — por segurança — remove qualquer campo com "senha/hash/salt" antes de devolver os dados, e informa separadamente `temSenha: true/false`. O `TrackingPortal.tsx` ignora esse `temSenha` e decide a tela olhando `candidateLead.clienteSenha`/`clienteSenhaHash`, que agora vêm sempre vazios. Resultado: **todo cliente cai na tela de "primeiro acesso"**, e ao tentar salvar o servidor responde 409 "Este acesso já possui senha" — o erro ao salvar que você viu.

2. **O portal do cliente grava direto no Firestore sem estar autenticado.** Há 6 pontos em `TrackingPortal.tsx` (`updateDoc`) — registro de último acesso, envio de documentos, assinatura, solicitação de redefinição de senha. As regras publicadas exigem servidor/staff/usuário autenticado para atualizar `leads`, e o cliente do portal não faz login no Firebase. Essas gravações são negadas — inclusive o botão "solicitar redefinição de senha", que por isso não chega ao Admin.

3. **Redefinição pelo Admin**: a rota `/api/auth/cliente-reset-senha` existe e está correta, mas hoje qualquer falha aparece como mensagem genérica. Depende ainda do item 2 (o marcador de "solicitação atendida" é gravado pelo navegador do admin, esse sim autenticado, então funciona).

## O que será feito

### 1. Escolher a tela certa (login x primeiro acesso)
- `TrackingPortal.tsx` passa a guardar o `temSenha` devolvido por `/api/portal/buscar-lead` e usa esse valor para decidir entre "digite sua senha" e "crie sua senha".
- Se o servidor responder `SEM_SENHA_CADASTRADA` no login, o portal troca automaticamente para a tela de criação de senha (e vice-versa no 409).

### 2. Gravações do cliente passam pelo servidor
- Nova rota `POST /api/portal/salvar-lead`, que aceita apenas uma **lista fixa de campos** que o cliente pode alterar (documentos/links, ficha de rating, assinatura, último acesso, solicitação de redefinição) e bloqueia qualquer campo de senha, comissão, status ou aprovação.
- Os 6 `updateDoc` do `TrackingPortal.tsx` passam a chamar essa rota, com a identidade de serviço gravando no Firestore.
- O botão "Esqueci minha senha" volta a funcionar e marca `solicitacaoResetSenha.pendente = true`, que é o que o Admin lê.

### 3. Mensagens de erro reais
- No portal do cliente e no botão de redefinir senha do Admin, exibir o motivo devolvido pelo servidor em vez da mensagem genérica, para qualquer falha restante ficar identificável na hora.

## Detalhes técnicos

- A rota de gravação usa o mesmo `getServiceIdToken()` já existente (identidade `servico.interno@prosfec.app`, que as regras já autorizam) — **não é preciso republicar o `firestore.rules`**.
- Allowlist de campos aplicada no servidor com `updateMask`, então nenhum campo fora da lista pode ser tocado pelo portal público.
- Sem mudança de schema: os nomes de campo no Firestore continuam iguais.

## Como testar depois

1. Abrir `https://prosfec.com.br/?acompanhamento=<ID>` de um cliente **que já tem senha** → deve aparecer a tela de senha e o login deve entrar.
2. Cliente **novo** → tela de criação de senha, salvar sem erro, e reentrar com ela.
3. "Esqueci minha senha" → no Admin, o lead aparece com solicitação pendente.
4. Admin redefine a senha → cliente entra com a nova senha.
5. Enviar link de documento pelo portal → salva e aparece no Dossiê Rating (ADM).
