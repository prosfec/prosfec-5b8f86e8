# Simulador de elegibilidade: corrigir o resultado e espelhar no Passo 1 do lead

## O que a varredura encontrou

Verifiquei o caminho completo: formulário da Home → `POST /api/credit/diagnostico-simulador` (Gemini) → tela de resultado → gravação do lead → Passo 1 do Workspace.

**1. O resultado da IA perde informações que o próprio servidor já calculou.**
O servidor devolve, além da linha de crédito: capacidade total de captação, excedente de capacidade, economia mensal, economia total, taxa de mercado e parcela de mercado. Quando a IA responde (caminho normal), a tela monta o resultado sem esses campos. Eles só aparecem quando a IA falha e o cálculo de reserva assume. Ou seja: **o cliente vê menos informação justamente quando tudo funciona**.

**2. O "Score de Elegibilidade" (0 a 100) só existe no cálculo de reserva.**
O bloco do score, com os fatores positivos e os pontos de atenção, é calculado apenas no caminho de reserva. No caminho da IA ele simplesmente não é gerado, então o card do score não aparece na tela do cliente.

**3. O limite do cálculo de reserva não bate com a regra do servidor.**
Na reserva, empresas com mais de 12 meses recebem 60% do faturamento; o servidor e a legislação do PRONAMPE usam 30% (teto de R$ 500 mil). Isso faz o valor mudar conforme a IA responda ou não.

**4. O Passo 1 do Workspace mostra quase nada do que foi apurado.**
Hoje o bloco "Análise de Elegibilidade e Enquadramento" exibe só três cartões: previsão de crédito, perfil de aprovação e uma "Situação de Cadastro" **fixa no texto "Regularizada / Ativa"** — ela não lê o dado real do lead, então aparece como regular mesmo para CNPJ inapto. Alertas, recomendações, parecer técnico, taxa, carência, prazo e parcela já estão gravados no lead, mas não são exibidos.

**5. O que é gravado no lead ainda não inclui** o score de elegibilidade, os fatores do score nem os números de capacidade e economia.

## O que será feito

### A. Padronizar o resultado da simulação (caminhos IA e reserva iguais)
- Passar o cálculo do Score de Elegibilidade e dos fatores (positivos / atenção) para um ponto único, usado nos dois caminhos.
- No caminho da IA, aproveitar os campos que o servidor já devolve: capacidade total, excedente, economia mensal, economia total, taxa de mercado e parcela de mercado.
- Alinhar o limite do cálculo de reserva a 30% do faturamento (teto de R$ 500 mil), igual ao servidor.

Resultado: o cliente vê a mesma estrutura completa, com ou sem IA — score, capacidade, economia e enquadramento.

### B. Gravar no lead tudo o que a simulação apurou
Acrescentar à gravação: score de elegibilidade, fatores do score, capacidade total, excedente, economia mensal e total, taxa e parcela de mercado, além de taxa, carência, prazo e parcela da linha recomendada e da data/origem da simulação. Nada existente é removido.

### C. Espelhar a resposta do cliente no Passo 1 do Workspace
O bloco "Análise de Elegibilidade e Enquadramento" passa a mostrar, em modo leitura, o mesmo que o cliente recebeu:

- Linha de crédito recomendada e limite estimado.
- Score de elegibilidade (0 a 100) com a faixa correspondente e o perfil de aprovação.
- Condições: taxa anual, carência, prazo total e parcela estimada.
- Capacidade total de captação e excedente, quando houver.
- Economia estimada frente ao mercado, quando houver.
- Situação de cadastro **lida do dado real do lead** (substitui o texto fixo).
- Lista de principais alertas e de recomendações.
- Parecer técnico e resumo de perfil, quando existirem.
- Data da simulação e origem (IA ou cálculo interno).

Leads antigos, sem os campos novos, continuam abrindo normalmente: cada informação ausente simplesmente não é exibida, e os três cartões atuais permanecem.

## Detalhes técnicos

- `src/components/Simulador.tsx`: extrair o cálculo do score/fatores para uma função reutilizada nos dois caminhos; no ramo da IA, copiar `capacidadeTotal`, `excedenteCapacidade`, `economiaMensal`, `economiaTotal`, `taxaMercadoAnual` e `parcelaMercado` da resposta da API para o `SimulationResult`; ajustar o limite de reserva de `faturamento * 0.6` para `faturamento * 0.3`.
- `src/App.tsx` (`handleLeadCaptured`): incluir no `leadDoc` `scoreElegibilidade`, `scoreFatores`, `capacidadeTotal`, `excedenteCapacidade`, `economiaMensal`, `economiaTotal`, `taxaMercadoAnual`, `parcelaMercado`, `taxaAnualSimulada`, `carenciaSimulada`, `prazoSimulado`, `parcelaSimulada`, `dataUltimaSimulacao` e `fonteSimulacao`.
- `src/types.ts`: campos opcionais correspondentes na interface `Lead`.
- `src/components/LeadWorkspaceModal.tsx` (bloco ~2930–2964): ampliar o cartão do Passo 1 em modo leitura, com renderização condicional por campo; a "Situação de Cadastro" passa a ler `lead.situacaoCadastral`.
- Sem alteração no prompt, no schema ou na rota `/api/credit/diagnostico-simulador`; sem alteração em cobrança, consulta de crédito, catálogo, contratos, permissões ou regras do banco.
- Validação: `bunx tsgo --noEmit` e build; simulação de teste na Home conferindo o resultado e, em seguida, o Passo 1 do lead gerado.

## Fora de escopo

Passos 2 a 8 do Workspace, consulta de crédito, anexo de PDF, painel administrativo, área de parceiros, proposta pública e site público fora do simulador.
