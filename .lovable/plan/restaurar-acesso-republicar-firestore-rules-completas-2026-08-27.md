# Restaurar acesso: republicar firestore.rules completas

## Diagnóstico

Uma versão anterior do `firestore.rules` (sem `partnerAuthMigration()`, `leadSenhaFieldsUntouched()` e `isServico()`) foi publicada no Firebase, bloqueando o login de parceiros e as operações do servidor. O arquivo correto e completo já existe no projeto e foi entregue no chat para copiar/colar.

## Estado atual (já pronto no código)

- `firestore.rules` completo, com `isAdmin()` validando `prosfec.tesouraria@gmail.com` (UID `Nso5FBoBVHXNY60RDw6NNKeaCC23`), mais `partnerAuthMigration()`, `leadSenhaFieldsUntouched()` e `isServico()`.
- Rota `/admin` criada (`src/routes/admin.tsx`), com link "Área Administrativa" no rodapé.
- `AdminDashboard` só dispara `fetchData()` após o token do Firebase Auth estar resolvido, com mensagem de erro clara em caso de `permission-denied`.

## O que falta (ação manual do usuário)

1. No Console do Firebase → Firestore → Regras: colar o código entregue no chat e clicar em **Publicar**.
2. Após publicar, testar o login ADM em `/admin` e o login de um parceiro.

## Validação (após a publicação)

- Entrar em `/admin` com `prosfec.tesouraria@gmail.com` e confirmar que leads e estatísticas carregam.
- Entrar com um parceiro migrado e confirmar acesso ao portal.
- Se aparecer 403 "referer blocked" no login, liberar `*.lovable.app` e o domínio de produção nas restrições da chave web no Google Cloud Console.

Nenhuma alteração de código adicional é necessária nesta etapa.
