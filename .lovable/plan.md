# Correções de segurança — o que dá para aplicar

Sim, dá para aplicar quase tudo. Duas ressalvas importantes antes:

- Este projeto espelhado **não tem pasta `netlify/functions` nem `server.ts` na raiz**. Todo o backend virou `src/lib/prosfec-server.ts` servido por `src/routes/api/$.ts`. Então os itens 4 e 6 se aplicam a esse arquivo único — e **os fallbacks hardcoded (REDEBE, INTEGRADOR, HUBLA, GOOGLE MAPS) já foram removidos** numa etapa anterior; hoje tudo lê de secrets. Resta só padronizar a checagem.
- Não existe `firestore.rules` no repositório. Posso criar o arquivo com as regras, mas **a publicação delas é manual no Console do Firebase** (este projeto não faz deploy para o Firebase).

## O que será feito

### 1. `firestore.rules` (novo arquivo)
Regras com deny-all no topo; `request.auth != null` para qualquer read/update/delete em leads, parceiros, comunicados, recargas, leads_vistos_parceiro, leads_distribuidos, notificacoes, consultas_realizadas, configuracoes, historico_buscas_caca_leads e subcoleção pendencias; `create` público mantido apenas em leads e parceiros com validação de campos obrigatórios; update/delete administrativos restritos a `request.auth.token.admin == true`; comentários explicando cada bloco.

### 2. Login de admin (`AdminDashboard.tsx`)
- Remove `correctEmail/correctPassword/contadorEmail/contadorPassword`.
- `handleLoginSubmit` passa a usar `signInWithEmailAndPassword`.
- Papel (admin/contador) lido do custom claim `role` via `getIdTokenResult`, com `// TODO: configurar custom claims via Cloud Function/Admin SDK`.
- `onAuthStateChanged` vira a fonte de verdade; `sessionStorage` fica só como cache de UI.
- Mensagens de erro específicas do Firebase (senha errada, usuário não encontrado, muitas tentativas).
- UI, textos e layout inalterados.

### 3. Login de parceiros (`PartnerPortal.tsx`)
- Login deixa de comparar `data.senha` e passa a usar `signInWithEmailAndPassword`; o documento do parceiro é carregado depois, pelo e-mail autenticado.
- Cadastro usa `createUserWithEmailAndPassword` e **não grava mais o campo `senha`** no Firestore.
- Troca de senha usa `updatePassword` em vez de gravar `senha`.
- Cadastro de membro de equipe segue o mesmo padrão (sem senha em texto puro).
- Formulários, campos e textos permanecem idênticos.

### 4/5/6. Segredos e webhook (`src/lib/prosfec-server.ts` + `src/utils/env.ts` novo)
- Novo `src/utils/env.ts` com `requireEnv(nome)` centralizando REDEBE_TOKEN, INTEGRADOR_API_KEY, INTEGRADOR_API_BASE_URL, GOOGLE_MAPS_API_KEY, HUBLA_WEBHOOK_TOKEN — erro claro quando faltar, sem fallback.
- `prosfec-server.ts` passa a importar dali (leitura sempre dentro dos handlers, exigência do runtime edge).
- Validação do webhook Hubla passa a usar comparação de tempo constante (`crypto.timingSafeEqual`, tamanhos diferentes = inválido, sem exceção).

## O que consigo fazer automaticamente SEM ação sua no Firebase

Tudo que é alteração de código neste repositório:

1. Reescrever `firestore.rules` e deixar o arquivo pronto para você publicar.
2. Trocar o login do admin para `signInWithEmailAndPassword` do Firebase Auth.
3. Trocar o login do parceiro para `signInWithEmailAndPassword`.
4. Trocar cadastro/troca de senha do parceiro para `createUserWithEmailAndPassword` / `updatePassword`.
5. Remover gravação do campo `senha` em texto puro no Firestore.
6. Centralizar leitura obrigatória de secrets em `src/utils/env.ts`.
7. Aplicar `timingSafeEqual` na validação do webhook Hubla.

## O que NÃO consigo fazer sem ação manual sua no Firebase

- **Publicar as `firestore.rules`**: só crio o arquivo; o deploy é via Firebase CLI ou Console.
- **Habilitar o provedor Email/Senha no Authentication**: só o Console faz isso.
- **Criar os usuários admin/contador no Firebase Auth**: precisa do Console ou de um Admin SDK com service account.
- **Configurar custom claims (`role: admin` / `role: contador`)**: exige Cloud Function ou Admin SDK; não dá pelo cliente web.
- **Migrar parceiros existentes**: as senhas deles estão em texto no Firestore, mas não existem no Firebase Auth. Só dá para criar esses usuários via Admin SDK/Cloud Function; o navegador não pode.

## Sugestão de caminho

1. Eu aplico todas as mudanças de código agora.
2. Você faz só o essencial no Console: habilitar Email/Senha, criar os 2 usuários admin, publicar as regras.
3. Custom claims e migração de parceiros existentes podem vir depois — enquanto isso, o login novo já funciona para usuários criados manualmente.

Quer que eu prossiga com as alterações de código?
