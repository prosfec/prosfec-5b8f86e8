# Corrigir senhas do Portal do Cliente no site publicado

## Causa raiz (confirmada nos logs de produção)

Os logs do servidor publicado mostram, em toda tentativa de redefinição:

```
[CLIENTE RESET] Falha: Pbkdf2 failed: iteration counts above 100000 are not supported (requested 150000).
```

O código usa `PBKDF2_ITERATIONS = 150000` (`src/lib/prosfec-server.ts`, linha 3292). No ambiente de desenvolvimento (Node) isso funciona; no runtime do site publicado (edge) o limite máximo é **100.000 iterações**, então toda operação de hash falha.

Isso explica os dois sintomas ao mesmo tempo:

- **ADM → redefinir senha do cliente**: falha ao gravar o hash (erro genérico "Erro ao redefinir a senha do cliente").
- **Portal do Cliente publicado**: falham tanto o "primeiro acesso" (definir senha) quanto o login, porque a verificação da senha também deriva o mesmo hash de 150.000 iterações.

Verificado também: o domínio `prosfec.com.br` responde normalmente às demais rotas de API (`/api/portal/buscar-lead`, `/api/auth/cliente-login` retornam corretamente), ou seja, não é problema de domínio, chaves ou regras do Firestore.

## O que será feito

1. **Iterações compatíveis com o runtime publicado**
   - Reduzir o padrão para 100.000 iterações (limite do edge), mantendo PBKDF2-SHA256 e salt de 16 bytes.
   - O campo `clienteSenhaAlgo` continua registrando o algoritmo e as iterações usadas.

2. **Verificação que respeita as iterações gravadas**
   - Na validação do login, ler as iterações a partir de `clienteSenhaAlgo` em vez de assumir um valor fixo, para que senhas antigas e novas convivam.
   - Se as iterações gravadas forem maiores que o limite do runtime (caso dos hashes de 150.000 criados na migração), o servidor não consegue verificar: nesse caso retorna um código claro (`SENHA_PRECISA_REDEFINICAO`) em vez de "senha incorreta".

3. **Re-hash automático no login bem-sucedido**
   - Quando um cliente entrar com sucesso usando um hash em formato antigo verificável, o servidor regrava a senha no formato novo (migração preguiçosa, igual à dos parceiros).

4. **Mensagens de erro úteis**
   - No Portal do Cliente: ao receber `SENHA_PRECISA_REDEFINICAO`, exibir "Sua senha precisa ser redefinida — solicite ao seu consultor" com o botão de solicitação de reset já existente, em vez de "senha incorreta".
   - No painel ADM: mostrar a mensagem real devolvida pelo servidor ao invés do texto genérico, para diagnósticos futuros.

5. **Rota de manutenção para os hashes antigos**
   - `POST /api/auth/rehash-senhas-clientes`, protegida por `MIGRATION_ADMIN_TOKEN`, lista os leads cujo `clienteSenhaAlgo` indica iterações acima do limite. Como não é possível recuperar a senha original a partir do hash, ela apenas **relata** quais clientes precisam de nova senha (os ~10 migrados anteriormente), para o ADM redefinir em lote pela tela já existente.

## Arquivos afetados

- `src/lib/prosfec-server.ts` — constante de iterações, `derivarHash`, `camposSenhaCliente`, validação em `/api/auth/cliente-login`, nova rota de relatório.
- `src/components/TrackingPortal.tsx` — tratamento do novo código de erro.
- `src/components/AdminDashboard.tsx` — exibir a mensagem real de erro do servidor.

## Ações suas depois do deploy

- Publicar o projeto novamente (a correção é de código do servidor).
- Para os clientes que já tinham senha migrada com o formato antigo, redefinir a senha pela tela do ADM (que voltará a funcionar) e reenviar ao cliente.

Nenhuma alteração em `firestore.rules`, no Portal do Parceiro ou nas regras de acesso.
