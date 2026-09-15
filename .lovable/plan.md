# Motor de elegibilidade do simulador — plano revisado

Escopo: somente backend do simulador (`POST /api/credit/diagnostico-simulador` em `src/lib/prosfec-server.ts` e os catálogos em `src/utils/creditLineRules.ts` / `src/utils/BankRulesManager.ts`). Nenhuma alteração de interface, cobrança, autenticação ou regras do Firestore. O JSON de resposta permanece exatamente o mesmo.

## 1. Fontes de verdade

| Domínio | Fonte única | Observação |
| --- | --- | --- |
| Regras de cada programa (limite, carência, prazo, faixa de taxa, finalidade, público) | `GOVERNMENT_CREDIT_LINES` em `src/utils/creditLineRules.ts` | Nenhuma tabela paralela será criada; os números fixos hoje espalhados na rota passam a ler daqui |
| Condições praticadas por instituição, por linha | `BankRulesManager` em `src/utils/BankRulesManager.ts` | Continua sendo a única fonte de condição bancária |
| Validação de faixas | `validateCreditLineConditions` (já existe, hoje não é chamada) | Passa a ser chamada na saída |

Cada programa mantém **suas próprias** regras de limite. Nada será uniformizado entre FAMPE, PRONAMPE, FGI, FUNGETUR, FINEP, BNDES ou Fundos Constitucionais.

## 2. Regras que serão alteradas nesta entrega

Apenas alterações **estruturais**, sem mexer em nenhum número oficial:

1. A rota deixa de usar tetos e prazos escritos no meio do código e passa a ler de `GOVERNMENT_CREDIT_LINES`. Onde a rota e o catálogo divergirem hoje, o valor **não** será corrigido nesta entrega: a divergência será registrada na lista do item 3 e o motor usará o valor do catálogo apenas depois da confirmação da fonte oficial. Até lá, mantém-se o valor atualmente praticado na rota e a divergência fica sinalizada em log.
2. `BankRulesManager.getBankRules` deixa de devolver as regras de PRONAMPE quando a linha pedida não está cadastrada para aquele banco. Passa a devolver um resultado explícito de "condição bancária não confirmada".
3. `linhasSuportadas` passa a ser respeitada: instituição que não opera a linha não recebe condições daquela linha.
4. A conferência da resposta da IA passa a valer para **todas** as linhas, não só PRONAMPE, FAMPE e FGI_PEAC.

Nenhum percentual de faturamento, teto, carência ou taxa de programa será modificado neste passo.

## 3. Pontos que exigem validação externa antes de qualquer mudança de número

Para cada item abaixo é preciso registrar fonte oficial, URL, data da verificação, regra/limite e vigência. Enquanto não houver esse registro, o valor atual permanece:

- FUNGETUR — teto por operação (rota usa R$ 1,5 mi; catálogo indica R$ 15 mi).
- FINEP Inovacred — teto (rota R$ 3 mi; catálogo R$ 10 mi) e faixa de taxa.
- FNE / FNO / FCO — teto (rota R$ 3 mi; catálogo R$ 10 mi), carência e prazo por fundo e por finalidade.
- FAMPE — critério de limite por porte (MEI / ME / EPP) e percentual aplicável.
- PRONAMPE — teto por CNPJ, percentual da receita bruta, carência e prazo vigentes; regra de empresa com menos de 12 meses; benefício associado ao selo Emprega + Mulher.
- FGI PEAC — vigência do programa, teto e cobertura de garantia.
- BNDES MPME e crédito corporativo — condições de repasse.
- Benchmark de mercado usado no comparativo (hoje 38% a.a. fixo).
- Programas hoje ausentes do catálogo que o usuário citou (ex.: ProCred 360) — só entram com fonte registrada.

Proposta: um arquivo de registro de proveniência junto ao catálogo, com um bloco por regra (`fonte`, `url`, `verificadoEm`, `regra`, `vigencia`), preenchido conforme cada item for confirmado.

## 4. Arquitetura do motor — três camadas separadas

```text
DADOS DA EMPRESA
      |
[1] ELEGIBILIDADE DETERMINÍSTICA  -> porte, faturamento, região, setor,
      |                              finalidade, linha já ativa
[2] REGRAS DA INSTITUIÇÃO         -> opera a linha? condição cadastrada?
      |                              carência/prazo/taxa praticados
[3] IA (INTERPRETAÇÃO)            -> redação do parecer e priorização
      |                              entre linhas JÁ APROVADAS pelas camadas 1 e 2
      v
RESPOSTA (mesmo JSON de hoje)
```

A IA **não** define limite, prazo, carência nem taxa. Ela recebe o conjunto de linhas já filtradas, com os números já calculados pelas camadas 1 e 2, e produz: escolha entre as opções ofertadas, classificação de aderência, justificativa comercial, parecer técnico e lista de documentos. Qualquer número que a IA devolva divergindo do calculado é descartado em favor do determinístico.

## 5. Classificação de aderência

O motor passa a produzir um grau de aderência, transportado nos campos de texto já existentes do JSON (sem novo campo obrigatório na interface):

- **ALTA ADERÊNCIA** — elegibilidade confirmada pelos dados e banco com condição cadastrada para a linha.
- **ADERÊNCIA CONDICIONADA** — elegível, mas dependente de comprovação (CADASTUR, enquadramento de inovação, região, margem restante de linha ativa) ou de condição bancária não confirmada.
- **NECESSITA DIAGNÓSTICO** — dados insuficientes para afirmar elegibilidade (faturamento ausente, porte incoerente, empresa nova sem capital informado, banco não informado).
- **BAIXA ADERÊNCIA** — dados disponíveis indicam que a empresa não se enquadra na linha.

## 6. Estratégia de fallback

- Banco **não opera** a linha: a linha não é recomendada para aquele banco. O motor apresenta a melhor linha que o banco opera, ou mantém a linha e sinaliza "operação via outra instituição". Nunca herda condições de outra linha.
- Banco opera a linha mas **não há condição cadastrada**: usa os padrões do próprio programa (catálogo) e marca como **ADERÊNCIA CONDICIONADA**, informando que a condição específica daquela instituição não está confirmada. Sem fallback silencioso para PRONAMPE.
- **IA indisponível ou resposta inválida**: o resultado determinístico das camadas 1 e 2 é devolvido normalmente, com textos padrão — como já acontece hoje.
- **Dados insuficientes**: resultado com classificação NECESSITA DIAGNÓSTICO, sem número inventado.

## 7. Estratégia de validação da resposta da IA

1. Resposta obrigatoriamente em JSON com o schema já definido.
2. `creditLineCode` precisa estar entre as linhas que as camadas 1 e 2 liberaram; fora disso, a escolha é substituída pela melhor opção determinística.
3. Limite, taxa, carência e prazo são **sempre** os calculados pelo motor; os valores vindos da IA são ignorados (e a divergência registrada em log para acompanhamento).
4. `validateCreditLineConditions` é executada sobre o conjunto final; erro de faixa derruba o resultado para o determinístico.
5. Textos passam por limite de tamanho e verificação de que não citam números conflitantes com os calculados.
6. Falha de parsing, schema ou validação cai no caminho determinístico, sem erro visível ao cliente.

## 8. Comparativo de mercado

A taxa fixa de 38% a.a. deixa de ser apresentada como fato. Duas opções, a decidir com o usuário: (a) apresentar como estimativa rotulada, com data e critério; ou (b) suspender o comparativo até haver benchmark com fonte e data registradas.

## 9. Validação técnica

`bunx tsgo --noEmit`, build limpo e simulações de teste por perfil (MEI, ME com banco privado, empresa de turismo, empresa do Nordeste, empresa com linha ativa, empresa com dados incompletos), conferindo que nenhum número passou a divergir do que é praticado hoje.
