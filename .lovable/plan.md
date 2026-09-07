# Corrigir preços fantasmas nos blocos de Saque e Comissões

## Problema confirmado

No portal do parceiro, a tabela de preços começa com valores fixos do código (`DEFAULT_SERVICES_CATALOG`) ou com uma cópia guardada na sessão do navegador (válida por 30 minutos). Os cálculos de comissão e de saldo de saque usam essa tabela imediatamente, antes de o banco responder com os preços reais. Resultado: aparecem valores desatualizados na tela até um recarregamento manual.

## O que será feito

1. **Nada de valores em R$ antes do banco responder**
   - Novo estado `precosCarregados` (falso no início).
   - Enquanto for falso, os blocos financeiros (Comissões Pendentes, Saques & Repasses, Saldo Disponível para Saque, Desempenho de Serviços e o resumo financeiro do Dashboard) mostram barras cinzas animadas (skeleton) no lugar dos números.
   - O botão "Solicitar Saque" fica desabilitado enquanto carrega.

2. **Cálculo reativo**
   - O bloco financeiro que hoje é calculado direto dentro do desenho da tela passa a ser calculado em um `useMemo` com dependências: leads, leads da equipe, solicitações de comissão, parceiro atual e a tabela de preços.
   - Quando o banco responde, o React recalcula sozinho, sem F5.

3. **Sem cache nem valores fixos para dinheiro**
   - A tabela usada nos cálculos financeiros vem exclusivamente da resposta do banco.
   - Remoção da leitura inicial do cache de sessão e do uso de `DEFAULT_SERVICES_CATALOG` nesse caminho; as chaves antigas de cache de preços deixam de ser gravadas/lidas para fins financeiros.
   - Se o banco falhar, exibe aviso de indisponibilidade em vez de números possivelmente errados.

## Detalhes técnicos

- Arquivo: `src/components/PartnerPortal.tsx`.
- `catalogServices` passa a iniciar como `[]` e ganha o par `precosCarregados` / `precosErro`, alimentados pelo `getDoc(doc(db, "configuracoes", "precos_consultas"))` (linhas ~692-723).
- Cuidado: `sanitizeAndSyncServicosList` (em `src/utils/serviceUtils.ts:249`) volta ao catálogo padrão quando recebe lista vazia; por isso a renderização financeira só ocorre com `precosCarregados === true`.
- O IIFE financeiro atual (a partir da linha ~5447, incluindo `comissaoPendente`, `totalComissaoLiberadaSaque`, `totalSaquesPagos/Pendentes` e `saldoDisponivelParaSaque`) é extraído para um `useMemo` e o JSX passa a consumir esse resultado.
- O modal de saque (~11600-11800) usa o mesmo resultado memoizado, mantendo a separação Vendas x Serviços.
- Sem mudanças em regras de comissão, Firestore, autenticação ou no painel Admin.
