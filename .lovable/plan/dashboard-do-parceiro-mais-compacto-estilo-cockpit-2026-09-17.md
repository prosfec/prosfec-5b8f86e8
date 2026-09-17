# Dashboard do Parceiro mais compacto (estilo cockpit)

Objetivo: reduzir espaços vazios e tamanhos de fonte no painel do parceiro em telas grandes, para caber mais informação sem rolagem. Alteração apenas visual — nenhum dado, cálculo, saldo ou comissão muda.

## O que muda

1. **Cartão do usuário (verde escuro, lateral)**
   - Menos espaçamento interno e altura mínima menor.
   - Nome e e-mail em corpo menor; ID mais discreto.
   - "Sua Comissão" e "Chave Pix" ficam lado a lado em uma faixa única e baixa, com rótulos reduzidos.

2. **"Seu Link Exclusivo de Indicação"**
   - Vira uma faixa horizontal: título + descrição curta à esquerda, campo do link e botão "Copiar" à direita na mesma linha em telas grandes.
   - Texto longo de explicação encurtado visualmente (uma linha) e altura do botão reduzida.
   - Em telas pequenas continua empilhado como hoje.

3. **Indicadores (Total Indicados, Em Atendimento, Crédito Aprovado)**
   - Espaçamento interno menor e números um grau menores, mantendo negrito.
   - Ícones levemente menores para manter a proporção.

4. **Saldos e Comissões**
   - "Saldo Geral" e "Saldo Painel de Oportunidade" continuam lado a lado, porém mais baixos: cabeçalho compacto, valor e botão na mesma linha, botões menores.
   - "Suas Comissões & Repasses" deixa de ocupar uma faixa alta própria: passa a ficar na mesma linha dos saldos em telas grandes (três colunas), com valores liberados e pendentes alinhados horizontalmente e altura equivalente aos demais cards.

5. **Estilo geral**
   - Cantos menos arredondados nesses blocos (aparência mais profissional).
   - Preferência por alinhamento lado a lado onde hoje há empilhamento.

## Detalhes técnicos

- Arquivo único: `src/components/PartnerPortal.tsx`.
- Alterações restritas a JSX/classes Tailwind nos blocos: `renderProfileCard` (~4084), card do link de indicação (~4877), grid de métricas (~5117), grid de saldos (~5162) e card de comissões (~5267).
- O card de comissões é movido para dentro do grid dos saldos, virando `lg:grid-cols-3`; nenhuma variável, handler (`setShowRechargeModal`, `setPayoutModalOrigin`, `copyReferralLink`) ou cálculo é tocado.
- Escalas alvo: padding `p-5/p-6` → `p-4`; números `text-3xl/4xl` → `text-2xl`; `rounded-2xl/3xl` → `rounded-xl`; botões `min-h-[44px]` → `h-9/h-10` no desktop, mantendo alvo tocável no mobile.
- Nada muda nas abas Funil Kanban Vendas, Painel de Oportunidade, Passo 6 ou modais.

## Validação

- `bunx tsgo --noEmit` e build limpo.
- Conferência visual em desktop (1604px) e mobile, garantindo que nada fique sobreposto ou cortado.
