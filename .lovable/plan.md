# Correções de segurança — o que dá para aplicar

Sim, dá para aplicar quase tudo. Duas ressalvas importantes antes:

- Este projeto espelhado **não tem pasta `netlify/functions` nem `server.ts` na raiz**. Todo o backend virou `src/lib/prosfec-server.ts` servido por `src/routes/api/$.ts`. Então os itens 4 e 6 se aplicam a esse arquivo único — e **os fallbacks hardcoded (REDEBE, INTEGRADOR, HUBLA, GOOGLE MAPS) já foram removidos** numa etapa anterior; hoje tudo lê de secrets. Resta só padronizar a checagem.
- Não existe `firestore.rules` no repositório. Posso criar o arquivo com as regras, mas **a publicação delas é manual no Console do Firebase** (este projeto não faz deploy para o Firebase).

## O que será feito

### 1. `firestore.rules` (novo arquivo)
Regras com deny-all no topo; `request.auth != null` para read/update/delete em leads, parceiros, comunicados, recargas, leads_vistos_parceiro, leads_distribuidos, notificacoes, consultas_realizadas, configuracoes, historico_buscas_caca_leads e subcoleção pendencias; `create` público mantido apenas em leads e parceiros com validação de campos obrigatórios; update/delete administrativos restritos a `request.auth.token.admin == true`; comentários explicando cada bloco.

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

## Ponto que preciso confirmar com você

Os parceiros existentes hoje só têm senha em texto no Firestore — eles **não existem no Firebase Auth**. Ao trocar o login, esses parceiros perdem acesso até serem criados no Auth. Opções: (a) eu incluo um script/rotina única de migração criando os usuários no Auth a partir dos documentos atuais, ou (b) você recria os acessos manualmente no Console. Me diga qual prefere — sigo com (a) se não houver preferência.

## Configuração manual sua depois

- Firebase Console: habilitar provedor Email/Senha; criar `adm.prosfec@gmail.com` e `contador.prosfec@gmail.com`; configurar custom claims `role`/`admin` (Cloud Function ou Admin SDK); publicar as `firestore.rules`.
- Rotacionar como comprometidos (já estavam no código): REDEBE_TOKEN, INTEGRADOR_API_KEY, HUBLA_WEBHOOK_TOKEN, GOOGLE_MAPS_API_KEY, e as senhas admin/contador que estavam no bundle.
