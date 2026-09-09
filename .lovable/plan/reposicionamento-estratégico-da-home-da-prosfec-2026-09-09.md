# Reposicionamento estratégico da Home da PROSFEC

Etapa 1: transformar a página inicial de "site de simulação de Pronampe" em "inteligência financeira e creditícia para empresas", sem tocar em simulador, parceiros, admin, APIs, Firestore ou autenticação.

## Nova ordem da Home

1. Navbar (sem alteração)
2. Hero reposicionado
3. Bloco de confiança/autoridade (Segurança, mais enxuto)
4. Como podemos ajudar sua empresa? (4 pilares) — novo
5. Qual é o momento da sua empresa? (4 caminhos) — novo
6. Diagnóstico PROSFEC — novo
7. Como a PROSFEC atua (jornada em 5 etapas) — reformulação do "Como Funciona"
8. Benefícios da assessoria — reformulação do "Consultoria"
9. Soluções específicas em 3 categorias — reformulação do "Novidades"/"Elegibilidade"
10. Simulador / primeira análise (mesmo componente, nova moldura de título)
11. Programa de Parceiros (mesmo componente, mais abaixo, nova chamada)
12. FAQ atualizado
13. CTA final — novo
14. Footer (sem alteração)

## O que muda em cada peça

**Hero** — headline "Sua empresa precisa de crédito, mas não sabe qual é o melhor caminho?", texto de apoio sobre análise da estrutura financeira e creditícia, CTA principal "Quero analisar minha empresa" (leva ao simulador já existente) e CTA secundário "Conhecer nossas soluções" (rola até os pilares). A lista de linhas governamentais deixa de ocupar o topo e vira um detalhe discreto; o cartão lateral passa a mostrar visão de diagnóstico (potencial, rating/score, pendências) em vez de só limite Pronampe.

**Pilares** — Estruturação de Crédito, Reabilitação Financeira e Creditícia, Fomento e Capital, Gestão Financeira Estratégica, cada um com descrição e exemplos curtos, em cartões limpos.

**Momento da empresa** — 4 cartões com CTA: "Preciso de crédito", "Estou com dificuldade para conseguir crédito", "Quero capital para crescer", "Quero organizar e acompanhar minhas finanças". Os três primeiros levam ao simulador existente; o de gestão financeira abre o WhatsApp já configurado no projeto. Nenhuma API nova.

**Diagnóstico** — seção dedicada listando o que o diagnóstico revela (potencial de crédito, perfil, rating/score, restrições, capacidade de pagamento, oportunidades, correções, próximos passos) com CTA "Solicitar Diagnóstico" apontando para o mesmo fluxo do simulador.

**Como a PROSFEC atua** — timeline moderna: Análise, Diagnóstico, Estratégia, Execução, Acompanhamento.

**Benefícios** — "Mais do que buscar crédito. Preparar sua empresa para crescer.", com os 8 benefícios do briefing e linguagem sem qualquer promessa de aprovação.

**Soluções específicas** — três grupos (Crédito e Fomento, Reabilitação Creditícia, Gestão Financeira) apresentados como uma estrutura única, sem dezenas de cartões soltos.

**Simulador** — mesmo componente e mesma lógica; ganha o título "Comece entendendo o potencial da sua empresa" e deixa de ser o protagonista visual.

**Parceiros** — mesmo fluxo, movido para baixo, com chamada "Você atende empresas e quer oferecer uma estrutura financeira mais completa?" e botão "Conhecer o Programa de Parceiros".

**FAQ** — perguntas revisadas: o que é a PROSFEC, se é banco, se garante aprovação (não), tipos de crédito analisados, o que é o Diagnóstico, empresa negativada, Pronampe, acompanhamento financeiro e como funciona a contratação.

**CTA final** — "Descubra o próximo passo financeiro da sua empresa." com "Quero analisar minha empresa" e "Falar com a PROSFEC" (WhatsApp existente).

## Detalhes técnicos

- Arquivos alterados: `src/App.tsx` (ordem das seções), `src/components/Hero.tsx`, `ComoFunciona.tsx`, `Consultoria.tsx`, `Novidades.tsx`, `Elegibilidade.tsx`, `Seguranca.tsx`, `FAQ.tsx`, `Parceiros.tsx` (apenas cabeçalho/chamada) e `src/routes/index.tsx` (título e descrição alinhados ao novo posicionamento).
- Novos componentes de apresentação: `Pilares.tsx`, `MomentoEmpresa.tsx`, `DiagnosticoSection.tsx`, `Beneficios.tsx`, `SolucoesEspecificas.tsx`, `CTAFinal.tsx`.
- Reuso de `handleScrollToSimulador` e de `buildWhatsAppUrl` com o número já configurado; nenhum número novo, nenhuma rota, API, regra de Firestore ou fluxo de autenticação alterados.
- Nenhum dado, número ou depoimento inventado: a prova social é institucional (processo, segurança, método).
- Ao final: typecheck, build e conferência visual da Home (CTAs, simulador e navegação funcionando).
