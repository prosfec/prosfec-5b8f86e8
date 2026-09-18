# Cards de Leads do ADM mais compactos ("Sleek & Compact")

Mudança apenas de estrutura visual nos cartões de leads da aba Leads do Painel ADM. Nenhum clique, troca de status, etapa, atribuição de parceiro, WhatsApp ou exclusão muda de comportamento.

## O que muda no cartão

1. **Fim das caixas dentro da caixa**
   - "Limite Estimado", "Certificado" e "Parceiro" deixam de ser blocos com borda e fundo próprios. Passam a flutuar dentro do cartão, organizados em uma linha com separação sutil.
   - Fundo suave fica só no ícone, não no bloco inteiro.

2. **Área de progresso mais enxuta**
   - Some o título "PROGRESSO DO FUNIL / Passo 3/8"; a etapa continua visível e editável na lista suspensa.
   - A barra de progresso perde a moldura cinza, fica mais fina (traços de 4px) e encostada na lista suspensa.

3. **Cabeçalho mais junto**
   - CNPJ colado abaixo do nome da empresa, em cinza discreto.
   - A etiqueta de status fica menor (padrão compacto já usado no sistema).

4. **Linha de dados vitais**
   - Rótulos minúsculos em caixa alta e cinza; valores em destaque.
   - Parceiro em uma única linha: ícone verde + rótulo + nome. O botão "Alterar" vira um link verde discreto à direita. O caso de lead órfão e o botão "Direcionar p/ Master" continuam existindo, apenas em versão compacta.

5. **Barra de ações no rodapé**
   - Linha divisória fina no lugar do bloco cinza.
   - À esquerda: "Ver Ficha" e "Workspace" compactos. À direita: ícones de WhatsApp e excluir.

Tudo isso vale nas duas aparências (Clara e Tecnológica), com o modo escuro usando fundos translúcidos em vez de blocos claros.

## O que não muda

Funções de clique, alteração de status e etapa, reatribuição de parceiro, abertura da ficha/workspace, WhatsApp, exclusão, dados e permissões.

## Detalhes técnicos

- Arquivo único: `src/components/AdminDashboard.tsx`, bloco do cartão de lead (linhas ~3580-3797).
- Header (~3581-3610): `space-y-3` → `space-y-2.5`; CNPJ `text-[11px] text-slate-500 dark:text-zinc-500` sem `mt-0.5`; select de status para `py-0.5 px-2 text-[10px]`.
- Progresso (~3626-3661): remover wrapper `bg-slate-50 p-2.5 rounded-xl border` e a linha de título; barra passa a `h-1 gap-0.5 mb-1.5`, trilho `bg-slate-200 dark:bg-white/10`; select da etapa mantém handler `handleUpdateEtapa`.
- Dados (~3664-3683): `grid grid-cols-2 gap-3 sm:divide-x sm:divide-slate-200/70 dark:sm:divide-white/5` sem cartões internos; rótulos `text-[10px] uppercase tracking-wider text-slate-500 dark:text-zinc-500`; valor `text-sm font-bold text-slate-900 dark:text-white`; badges do Certificado usando `pf-badge-success | pf-badge-warning | pf-badge-neutral`.
- Parceiro (~3686-3735): linha `flex items-center gap-2` sem fundo/borda; ícone com `bg-emerald-500/10 rounded-md p-1`; "Alterar" vira `text-xs text-emerald-600 dark:text-emerald-500 hover:underline`; variante órfão usa `pf-badge-danger` + link "Reatribuir"; `onClick={() => setAssigningLead(lead)}` preservado nos três casos.
- Rodapé (~3756-3797): substituir `bg-slate-50 px-3.5 py-2.5 border-t border-slate-100` por `px-4 pb-3 pt-3 mt-1 border-t border-slate-200/70 dark:border-white/5 flex justify-between items-center`; "Ver Ficha" e "Workspace" em `h-8 text-xs` agrupados à esquerda; ícones à direita mantendo `href`, `disabled` e `handleDeleteRecord`.
- Validação: `bunx tsgo --noEmit`, build e captura da aba Leads nas duas aparências.
