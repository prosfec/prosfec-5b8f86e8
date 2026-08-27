# Por que os dados não aparecem (e como corrigir)

## O que eu verifiquei direto no banco

Consultei o Firestore com a identidade de serviço. **Nada foi perdido**:

- `leads`: 33 documentos
- `parceiros`: 17 documentos
- Só existe um banco no projeto (`ai-studio-...`), não há base antiga separada

Vínculo lead → consultor:

- 29 leads com `parceiroId` apontando para um parceiro que existe
- 4 leads com `parceiroId` apontando para parceiros que **não existem mais** na coleção `parceiros`
  (ex.: `PRF-844251`, `PRF-107886`, `PRF-931706` → "EVELLYN LUZIA SANTOS SANTIAGO";
  `PRF-751683` → "john herbert santana da silva")

Ou seja: o problema não é migração de dados. São três causas distintas.

## Causa 1 — a chave do navegador bloqueia o login (principal)

A chave Firebase usada no navegador tem restrição por referenciador e responde
`403 Requests from referer ... are blocked` neste domínio. Sem login, as regras
novas do Firestore negam a leitura e o painel aparece vazio, mesmo com os dados lá.

Correção (feita por você no Google Cloud, não dá para fazer por código):
adicionar aos "HTTP referrers" da chave do navegador os domínios do app
(`*.lovable.app/*`, o domínio final e, se quiser testar, `localhost`).
Sem isso, nem ADM nem parceiro conseguem entrar.

## Causa 2 — Portal do Cliente ficou sem leitura

`TrackingPortal` procura o lead por protocolo/CNPJ **sem usuário logado**, mas a
regra atual é `leads: allow read: if isSignedIn()`. Resultado: o cliente digita o
protocolo e o sistema diz que não encontrou.

Correção: mover essa busca para o servidor — nova rota `POST /api/portal/buscar-lead`
que consulta com a identidade de serviço e devolve **apenas** os campos que o cliente
pode ver (sem senha/hash, sem dados de comissão). O portal passa a chamar essa rota em
vez de consultar o Firestore direto. Mesmo tratamento para a leitura de
`configuracoes/precos_consultas` quando ocorre antes do login.

## Causa 3 — 4 leads órfãos

Esses 4 continuam invisíveis no portal do consultor porque o parceiro dono foi
apagado. O nome do responsável ainda está gravado em `parceiroNome`.

Correção: nova aba no painel ADM "Leads sem consultor ativo", listando esses casos e
permitindo reatribuir o lead a um parceiro existente (grava `parceiroId` e
`parceiroNome` novos e registra a alteração no histórico do lead).

## Detalhes técnicos

- Rota `POST /api/portal/buscar-lead` em `src/lib/prosfec-server.ts`, usando
  `runQuery` do Firestore REST com a sessão de serviço; whitelist explícita de campos
  na resposta; rate limit simples por protocolo/CNPJ.
- `src/components/TrackingPortal.tsx`: substituir `getDocs`/`getDoc` de pré-login por
  chamadas à rota; manter o fluxo de senha já existente (`/api/auth/cliente-login`).
- `src/components/AdminDashboard.tsx`: detectar `parceiroId` sem parceiro correspondente
  ao carregar os dados e exibir o bloco de reatribuição.
- Nenhuma mudança em `firestore.rules` é necessária — o servidor continua sendo o único
  caminho de leitura pública.

## Resumo

Nenhum dado sumiu. Falta liberar o domínio na chave do navegador (você), devolver a
busca pública do Portal do Cliente via servidor e reatribuir 4 leads cujo consultor
foi excluído.
