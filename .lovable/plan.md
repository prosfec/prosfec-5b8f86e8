# Acesso ao Painel Administrativo

## Situação atual

A tela de login do ADM já existe dentro do `AdminDashboard` (Firebase Auth, e-mail + senha, whitelist com `prosfec.tesouraria@gmail.com` e UID `Nso5FBoBVHXNY60RDw6NNKeaCC23`).

O problema é a **porta de entrada**: hoje o painel só aparece quando a URL traz o parâmetro secreto `?admin=admprosfec` (ou `?painel=` / `?chave=`). Não existe nenhuma rota `/admin` nem botão no site. Por isso parece que "o acesso foi perdido".

URL que funciona hoje:
`https://<seu-dominio>/?admin=admprosfec`

## O que será feito

1. **Rota dedicada `/admin`**
   Nova rota que abre direto a tela de login do administrador, sem parâmetro secreto e sem passar pela home. O parâmetro antigo `?admin=admprosfec` continua funcionando para não quebrar links salvos.

2. **Entrada discreta no site**
   Link "Área Administrativa" no rodapé, apontando para `/admin`. Discreto, mas sempre encontrável — a proteção real é o Firebase Auth, não a URL escondida.

3. **Redirecionamento pós-login**
   Ao autenticar com um e-mail autorizado, o usuário entra direto no dashboard (aba Leads), sem tela intermediária. Ao sair, volta para a home.

4. **Carregamento de leads e estatísticas após o login**
   Revisar o carregamento inicial: garantir que a busca de leads, parceiros e indicadores só dispare **depois** que o token do Firebase Auth estiver pronto (hoje ela pode disparar antes, e as novas regras do Firestore recusam a leitura sem token válido). Incluir mensagem de erro clara caso o Firestore recuse a leitura, em vez de mostrar lista vazia.

## Detalhes técnicos

- Novo arquivo `src/routes/admin.tsx` (`createFileRoute("/admin")`) renderizando `AdminDashboard` dentro de `ClientOnly`, com `head()` próprio e `robots: noindex`.
- `src/App.tsx`: mantém o gate por query param; `onExit` navega para `/`.
- `src/components/AdminDashboard.tsx`: `fetchData()` passa a ser disparado apenas quando `isAuthenticated` e o usuário do Auth já estiverem resolvidos; tratamento de erro `permission-denied` com mensagem explícita.
- `src/components/Footer.tsx`: link para `/admin`.

## Importante (fora do código)

O login pelo domínio de preview pode retornar **403 "requests from referer ... are blocked"**. Isso é restrição da chave do navegador no Google Cloud Console, não do código. É preciso liberar os domínios `*.lovable.app` e o domínio de produção em: Google Cloud Console → APIs e Serviços → Credenciais → chave do Firebase Web → Restrições de referenciador HTTP.
