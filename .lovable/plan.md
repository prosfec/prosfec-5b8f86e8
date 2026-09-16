# Remover o "Parceiro Oficial de Demonstração"

## O que é

Não é um cadastro real nem um plano novo. É um registro de exemplo que o próprio sistema cria sozinho.

No painel ADM, quando a lista de parceiros é carregada e está **vazia**, o sistema cria automaticamente um parceiro fictício para a tela não ficar em branco:

- Nome: Parceiro Oficial de Demonstração
- E-mail: parceiro.teste@prosfec.com.br
- WhatsApp: (11) 99999-9999
- Cidade: São Paulo - SP
- Status: aprovado
- Plano: "premium"

O plano "premium" está escrito direto nesse registro de exemplo — por isso ele não existe em lugar nenhum do sistema. Foi só um texto colocado no cadastro fictício.

Importante: como a criação acontece sempre que a lista aparece vazia, se você apagar o registro e a lista ficar sem nenhum parceiro, ele volta a ser criado na próxima vez que o painel abrir.

O mesmo comportamento existe para os comunicados: quando não há nenhum, o sistema cria sozinho o comunicado "Bem-vindo ao Portal de Parceiros PROSFEC!".

## O que fazer

1. Remover a criação automática do parceiro de demonstração. A lista de parceiros passa a mostrar simplesmente "nenhum parceiro cadastrado" quando estiver vazia, sem inventar registro.
2. Remover também a criação automática do comunicado de boas-vindas, pelo mesmo motivo.
3. Depois disso, apagar manualmente o registro "Parceiro Oficial de Demonstração" pelo painel — ele não será recriado.

Nada mais é alterado: parceiros reais, planos, saldos, leads e comissões continuam iguais.

## Detalhe técnico

Em `src/components/AdminDashboard.tsx`, dentro de `fetchData`:
- linhas ~1345-1364: bloco `if (partnersSnapshot.empty)` que faz `addDoc(collection(db, "parceiros"), examplePartner)` — remover o bloco inteiro, mantendo o `partnersSnapshot` da consulta original.
- linhas ~1380-1397: bloco equivalente para `comunicados` — remover.

Depois: `bunx tsgo --noEmit` e conferir o build.
