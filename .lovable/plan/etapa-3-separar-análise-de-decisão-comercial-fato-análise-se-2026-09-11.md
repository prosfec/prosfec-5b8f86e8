# Etapa 3 — Separar análise de decisão comercial (FATO → ANÁLISE → SERVIÇO → LAUDO)

Alteração de bastidores no caminho consulta → diagnóstico. Nada muda na tela, no preço do catálogo, na cobrança, nos contratos, nas permissões ou nas demais áreas.

## Como funciona hoje (verificado)

A geração tem duas chamadas à IA e as quatro responsabilidades estão misturadas:

- **Etapa 1 (IA)** extrai os números da consulta **e ao mesmo tempo** classifica elegibilidade, consolida rating, estima capacidade de captação (PRONAMPE e geral) e escolhe os serviços (`servicosNecessariosIds`).
- **Etapa 2 (IA)** escreve o laudo **e também** monta os dois blocos finais: a lista de serviços com preço (`json_servicos`) e o plano de ação do Passo 6 (`json_subetapas`).

Ou seja: a mesma resposta que deveria só ler o relatório também decide o que vender e por quanto. É exatamente aí que nascem as recomendações que não correspondem aos fatos e os preços que não batem com o catálogo.

## O novo fluxo

```text
FATO      IA lê a consulta RedeBE e devolve SOMENTE números e fatos
ANÁLISE   O sistema calcula risco, rating consolidado e elegibilidade
SERVIÇO   O sistema escolhe os serviços por regras fixas, com preço do catálogo
LAUDO     A IA escreve o texto, recebendo tudo já decidido
```

### 1. FATO — a IA só extrai

A Etapa 1 passa a ser exclusivamente extração. Saem do que a IA responde: escolha de serviços, classificação de elegibilidade, rating consolidado e estimativa de capacidade de captação.

Permanecem apenas fatos apurados na consulta, por titular (empresa e cada sócio): score, rating informado pelo bureau, valor e quantidade de negativações, valor e quantidade de protestos, cheques sem fundo, ações judiciais, apontamentos e prejuízo no SCR/BACEN, situação fiscal e cadastral, e a lista de apontamentos encontrados. Continua valendo a regra de fidelidade: o que não constar na consulta fica como não identificado, nunca estimado.

### 2. ANÁLISE — cálculo no sistema

O sistema (não a IA) calcula, a partir dos fatos:

- Consolidação empresa + sócios, aplicando a regra de risco cruzado: apontamento grave em sócio rebaixa o rating consolidado e zera o potencial de captação.
- Rating consolidado e classificação de elegibilidade (Alta, Média, Baixa, Crítica) por faixas fixas de restrições e score.
- Lista de fatores críticos de bloqueio, montada a partir dos apontamentos reais.
- Capacidade de captação: só é apresentada quando houver base real; caso contrário fica ausente (não vira R$ 0,00 no texto).

Como esse cálculo é determinístico, o mesmo relatório sempre produz a mesma classificação.

### 3. SERVIÇO — regras fixas, sem IA

A escolha dos serviços deixa de ser da IA. O sistema aplica um mapa fixo fato → serviço sobre o catálogo oficial, por exemplo:

- protesto identificado → serviço de baixa de protesto;
- negativação (Pefin/Refin) identificada → serviço de reabilitação/limpa nome;
- apontamento ou prejuízo no SCR/BACEN → serviço de saneamento de SCR;
- pendência fiscal/cadastral → serviço de regularização;
- sem restrição alguma → apenas serviços preventivos/estruturantes (melhoria de rating e score, estruturação).

Cada serviço recomendado carrega o **motivo factual** que o disparou. Serviço sem fato correspondente não entra, em nenhuma hipótese. O preço vem sempre do catálogo oficial; a IA nunca informa valor.

Se o catálogo ativo não tiver o serviço correspondente a um fato, o serviço é omitido e o fato fica registrado como apontamento no laudo.

### 4. LAUDO — a IA só redige

A Etapa 2 passa a receber, pronto: fatos, análise consolidada e lista de serviços aprovados com preços. Ela escreve apenas o texto do laudo, com a instrução de não acrescentar, remover nem reprecificar serviço algum, e de não citar número que não esteja nos fatos.

Os dois blocos finais (`json_servicos` e `json_subetapas`) deixam de depender do que a IA escreveu: passam a ser montados pelo sistema a partir dos serviços aprovados e da ordem de execução das regras. Se a IA citar no texto algo fora da lista aprovada, os blocos estruturados continuam corretos e a divergência é registrada no log do servidor.

### 5. Conferência

O log do servidor passa a registrar, por geração: fatos apurados por titular, resultado da análise (rating, elegibilidade, fatores de bloqueio), serviços aprovados com o fato que os disparou, e serviços citados pela IA que foram ignorados — sem dado pessoal completo.

## Detalhes técnicos

Arquivo único: `src/lib/prosfec-server.ts`, rota `POST /api/credit/diagnostico-prosfec`.

- Etapa 1: `buildStage1Prompt` e o `responseSchema` reduzidos aos campos de fato (por titular, com um array `titulares` além do consolidado bruto). Removidos do schema: `servicosNecessariosIds`, `classificacaoElegibilidade`, `capacidadeTomadaPronampe`, `capacidadeTomadaGeral`, `ratingConsolidado`. A normalização defensiva de nomes de chave existente é mantida e estendida aos campos por titular.
- Nova função pura `analisarRisco(fatos, leadData)` → `{ ratingConsolidado, classificacaoElegibilidade, scoreNumerico, probabilidadeInadimplenciaPercent, fatoresCriticosBloqueio, capacidade }`, com a regra de risco cruzado aplicada em código.
- Nova função pura `selecionarServicos(fatos, analise, activeServicesCatalog)` → lista `{ id, nome, valor, justificativa, fatoOrigem }`, casando fato → serviço por id conhecido e, como reserva, por palavras-chave no nome do serviço do catálogo ativo.
- `auditResult` (objeto gravado hoje no Firestore e lido por `FintechDiagnosisView.tsx`) mantém exatamente as mesmas chaves de saída — passa a ser montado a partir de fato + análise, em vez de vir direto da IA. Nenhuma alteração no componente da tela.
- Etapa 2: prompt recebe `FATOS`, `ANÁLISE` e `SERVIÇOS APROVADOS`; as instruções de escolha e omissão de serviço saem do prompt (agora são código). O molde dos dois blocos finais sai do prompt.
- `json_servicos` e `json_subetapas` passam a ser gerados no servidor; a extração desses blocos do texto da IA continua existindo apenas para comparação/log e para remover os blocos do texto exibido.
- A validação atual de laudo truncado passa a checar tamanho e seções mínimas do texto (não mais a presença dos dois blocos JSON, que agora são do sistema). Laudo vazio ou truncado continua sendo rejeitado, sem sobrescrever laudo anterior.
- Normalização da RedeBE (Etapa 1 do trabalho anterior), vínculo por `leadId` (Etapa 2), modelos Gemini, limites de tempo e locks permanecem como estão.

## Validação

Verificação de tipos e build, mais três cenários conferidos nos logs: empresa limpa (nenhum serviço corretivo recomendado), empresa com protesto/negativação (serviço correspondente presente com o fato de origem) e empresa limpa com sócio restritivo (rating rebaixado, potencial zerado, apontamento do sócio listado).

## Fora de escopo

Tela do diagnóstico, PDF, simulador, cobrança, contratos, autenticação, regras do banco, área administrativa e de parceiros, e qualquer rota fora do caminho consulta → diagnóstico.
