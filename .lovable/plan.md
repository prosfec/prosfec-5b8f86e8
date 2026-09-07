# Botão Sincronizar no Desempenho & Controle Financeiro de Serviços (Passo 6)

## O que será feito

Adicionar um botão local de re-fetch cirurgicamente no cabeçalho do card "Desempenho & Controle Financeiro de Serviços (Passo 6)" em `src/components/PartnerPortal.tsx`. Ao clicar, o botão recarrega a tabela de preços do Firestore (`configuracoes/precos_consultas`) e os leads do parceiro, atualizando os cálculos financeiros da seção sem afetar o restante do painel.

## Passos

1. **Tornar o carregamento de preços reutilizável**
   - Extrair o `getDoc` de `configuracoes/precos_consultas` do `useEffect` atual (linhas ~698-721) para uma função nomeada `fetchPriceCatalog()`.
   - A função atualiza os estados `catalogServices`, `precosCarregados` e `precosErro`, mantendo o comportamento atual de nunca usar catálogo padrão hardcoded.

2. **Estado local do botão**
   - Adicionar `const [isSyncingStep6, setIsSyncingStep6] = useState(false);`.

3. **Handler de sincronização**
   - Criar `handleSyncStep6` que:
     - Define `isSyncingStep6 = true`.
     - Executa `await fetchPriceCatalog()`.
     - Se houver parceiro autenticado, executa `await fetchPartnerLeads(currentPartner.id)`.
     - Define `isSyncingStep6 = false`.
     - Exibe toast/feedback sutil "Dados do Passo 6 sincronizados".

4. **Botão no cabeçalho da seção**
   - Inserir no header do card (linhas ~5801-5824) um botão discreto com ícone `RefreshCw` e texto "Sincronizar".
   - Aplicar `animate-spin` no ícone enquanto `isSyncingStep6` for true.
   - Desabilitar o botão durante a sincronização.

5. **Feedback ao usuário**
   - Montar `<Toaster />` do `@/components/ui/sonner` em `src/routes/__root.tsx` (o modern stack não o monta por padrão).
   - Usar `toast.success("Dados do Passo 6 sincronizados")` do `sonner` no `handleSyncStep6`.

## Escopo limitado

- Nenhuma alteração na lógica de cálculo de comissão, regras de saque, Firestore, autenticação ou outras abas.
- O botão afeta apenas a seção do Passo 6 visualmente; os estados globais (`catalogServices`, `leads`) são compartilhados, mas o re-fetch é local e direcionado.
