# Destravar o seletor "Consulta de Crédito Integrada"

## O que está acontecendo

O bloco de execução de consulta fica em "Carregando tabela oficial de preços..." porque a busca da tabela de preços não tem tempo limite. Se a resposta do servidor demora ou nunca chega, a tela permanece em carregamento e o botão de executar consulta continua desativado.

## O que será feito (somente na tela do Workspace do Lead)

1. **Tempo limite na busca de preços** — a consulta à tabela oficial passa a ter limite de 8 segundos. Se estourar, o carregamento é encerrado imediatamente.
2. **Tabela padrão de segurança** — se a busca falhar, vier vazia ou estourar o tempo, o seletor é preenchido na hora com a consulta padrão ("Rating de Crédito + Diagnóstico Finan. 360", R$ 69,86), com um aviso discreto de que é o valor de referência e um botão "Atualizar preços".
3. **Botão sempre liberado** — com a tabela padrão ativa, "Confirmar & Executar Consulta" fica clicável normalmente.
4. **Registro de erro** — a falha é registrada no console do navegador para diagnóstico, sem travar a interface.

O valor realmente cobrado continua sendo calculado apenas pelo servidor; a tela nunca envia preço. Ou seja, o valor padrão exibido é só referência visual e não abre brecha de cobrança errada.

## Detalhes técnicos

- Arquivo único: `src/components/LeadWorkspaceModal.tsx`.
- `fetchLocalCatalog`: envolver o `fetch("/api/credit/catalogo")` com `AbortController` + `setTimeout(8000)`; `try/catch/finally` mantendo `setLoadingLocalCatalog(false)` em todos os caminhos.
- Novo `CREDIT_CATALOG_FALLBACK` local: `[{ code: "REDEBE_DIAGNOSTICO_360", name: "Rating de Crédito + Diagnóstico Finan. 360", originalPrice: 49.9, price: 69.86 }]`, espelhando `FALLBACK_CATALOG` de `src/lib/prosfec-server.ts` com o markup de 1,40.
- Em qualquer falha/vazio: `setLocalCatalog(CREDIT_CATALOG_FALLBACK)`, `setSelectedProductCode("REDEBE_DIAGNOSTICO_360")`, e um estado `usingFallbackCatalog` para o aviso; não zerar mais o catálogo.
- `disabled` do botão de execução permanece dependente de documento selecionado e catálogo preenchido — que agora nunca fica vazio.
- Sem mudanças em `src/lib/prosfec-server.ts`, `firestore.rules`, integração RedeBE/Gemini, débito de saldo ou layout das demais abas.
