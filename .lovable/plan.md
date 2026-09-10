# Plano: Finalizar blindagem do fluxo RedeBE / Diagnóstico PROSFEC

## Contexto
A blindagem principal já foi aplicada em `src/lib/prosfec-server.ts`, `src/components/LeadWorkspaceModal.tsx` e `firestore.rules`. Restam ajustes de runtime e validações finais antes de publicar.

## Passos

1. **Corrigir parsing do catálogo no frontend**
   - Arquivo: `src/components/LeadWorkspaceModal.tsx`
   - Problema: `fetchCatalog` chama `res.json()` duas vezes quando a resposta não é `res.ok`.
   - Ação: parsear o body uma única vez e reutilizar o payload no sucesso e no erro.

2. **Corrigir status HTTP do RTB**
   - Arquivo: `src/lib/prosfec-server.ts`
   - Problema: catch do `/api/credit/analise-rtb-ccb` retorna `status(500)` fixo.
   - Ação: retornar `err?.statusCode || 500` para preservar códigos de erro upstream.

3. **Auditar e migrar chamadas restantes do SDK Firestore web**
   - Arquivo: `src/lib/prosfec-server.ts`
   - Rotas auxiliares ainda usam `addDoc`, `getDocs`, `updateDoc` do SDK web (`notificacoes`, provisionamento, migracao).
   - Ação: avaliar se estão no caminho crítico RedeBE/Gemini; se sim, migrar para REST. Se não, documentar risco.

4. **Validar variáveis de ambiente e secrets**
   - Confirmar presença de: `REDEBE_TOKEN`, `GEMINI_API_KEY`, `FIREBASE_API_KEY`, `FIREBASE_SERVICE_ACCOUNT_KEY` (ou equivalente para `isServico`).
   - Verificar se `isServico()` nas regras do Firestore reconhece a identidade usada pelo backend.

5. **Publicar regras do Firestore**
   - Copiar o conteúdo atualizado de `firestore.rules` e publicar manualmente no console do Firebase.

6. **Typecheck, build e testes**
   - Rodar `bunx tsgo --noEmit`.
   - Rodar `bun run build`.
   - Testar localmente (com servidor em execução) os endpoints `/api/credit/catalogo`, `/api/credit/consultas` e `/api/credit/diagnostico-prosfec`.

7. **Publicar o app**
   - Após aprovação e build OK, publicar via botão Publish no editor.

## Configurações manuais que você precisará fazer
- Publicar o `firestore.rules` no console do Firebase.
- Confirmar que todas as variáveis de ambiente/secrets estão preenchidas no painel do projeto.
- Aprovar e publicar o app após o build final.
