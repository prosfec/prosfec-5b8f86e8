# Redesign visual do resultado "Análise de Elegibilidade e Enquadramento"

Somente aparência. Nenhuma regra, cálculo, dado salvo, endpoint ou nomenclatura muda.

## Onde fica

O bloco atual está no Passo 1 do Workspace do Lead (`src/components/LeadWorkspaceModal.tsx`, trecho "Análise de Elegibilidade e Enquadramento"). Hoje ele é um cartão branco com seis quadradinhos cinzas iguais, duas listas com bolinhas e dois parágrafos corridos.

## Referência visual reaproveitada

A tela de resultado da simulação pública (`src/components/Simulador.tsx`) já tem o padrão aprovado:

- faixa escura verde (`bg-brand-primary`) com número grande e medalha de score em vidro fosco;
- faixa de recomendação em degradê verde escuro com etiquetas, nome da linha, justificativa e caixa lateral de parcela;
- grade de indicadores em cartões verde-claro com rótulo microscópico, número forte e legenda.

O redesign reusa exatamente essas superfícies, cores, cantos, sombras e tipografia (Sora/Manrope), mais os ícones lucide já usados (TrendingUp, Sparkles, Building, Check, AlertTriangle, ArrowRight).

## Nova hierarquia do bloco

1. **Destaque superior** — faixa verde escura com previsão de crédito máximo em número grande, medalha de score de elegibilidade, etiqueta de classificação de aderência e situação cadastral com ponto colorido.
2. **Programa recomendado** — faixa em degradê verde, no padrão da simulação: nome da linha, etiqueta do código, banco/instituição quando houver, nível de aderência, justificativa resumida e caixa lateral com limite, prazo, carência e taxa.
3. **Indicadores** — grade responsiva (2 colunas no celular, 3–4 no desktop) de cartões premium: previsão de crédito máximo, perfil de aprovação, situação cadastral, score de elegibilidade, condições simuladas e capacidade de captação. Cada um com ícone, rótulo em caixa alta, número em destaque e etiqueta de status.
4. **Principais alertas** — cada alerta vira um aviso próprio com cor por severidade: vermelho (impeditivo), âmbar (atenção), verde (condição atendida). A severidade é deduzida apenas do texto já existente; nenhum alerta é criado, removido ou reescrito.
5. **Próximos passos** — as recomendações atuais viram uma lista numerada de ações, com círculos numerados verdes. Ao final, um chamado destacado "Iniciar Diagnóstico Financeiro PROSFEC" que apenas navega para a etapa de diagnóstico já existente no Workspace, usando o mesmo handler de troca de etapa (sem nova rota, sem nova regra de liberação — se a etapa estiver bloqueada, o botão respeita o mesmo bloqueio de hoje).
6. **Parecer técnico** — bloco próprio com título, etiqueta de classificação de aderência e o texto em coluna de leitura confortável, em vez de parágrafo apertado.
7. **Rodapé** — "Simulação de DD/MM/AAAA — origem: ..." permanece igual, em estilo discreto de metadado.

## Comportamento preservado

- Todos os campos continuam opcionais: se o lead antigo não tiver score, capacidade, alertas ou condições, a seção correspondente simplesmente não aparece (igual a hoje).
- O comparativo de taxa de mercado continua suspenso e não é reintroduzido.
- Textos, valores, formatações de moeda e datas ficam idênticos.

## Detalhes técnicos

- Arquivo único alterado: `src/components/LeadWorkspaceModal.tsx`, apenas JSX e classes Tailwind do bloco de elegibilidade.
- Nenhuma alteração em `src/App.tsx`, `src/types.ts`, `src/lib/prosfec-server.ts`, motor de elegibilidade, Firestore, Storage ou autenticação.
- Ícones vindos de `lucide-react`, já usado no arquivo.
- Responsividade: `grid-cols-2 md:grid-cols-3 xl:grid-cols-4`, `min-w-0`, quebra de texto controlada, sem rolagem horizontal no celular.
- Validação final: `bunx tsgo --noEmit`, build e conferência visual do Passo 1 em desktop e mobile.
