# Auditoria da IA do simulador e das regras por banco

## O que foi verificado

- Rota da IA: `POST /api/credit/diagnostico-simulador` em `src/lib/prosfec-server.ts` (linhas ~1264–1657).
- Catálogo de linhas: `src/utils/creditLineRules.ts` (`GOVERNMENT_CREDIT_LINES`, `validateCreditLineConditions`).
- Catálogo de bancos: `src/utils/BankRulesManager.ts`.

## Falhas encontradas (confirmadas no código)

1. **A IA não recebe as regras reais do banco.** O prompt descreve categorias em texto genérico ("bancos públicos operam prazos maiores"), mas o objeto `bankRules` já calculado (carência, prazo, taxa, esteira do banco informado) nunca é injetado no prompt. A IA chuta prazos e o código só corta depois.
2. **A conferência da resposta cobre só 3 linhas.** Há limite/carência/prazo validados apenas para PRONAMPE, FAMPE e FGI_PEAC. FUNGETUR, FINEP_INOV, FNE_FNO_FCO, BNDES_PEQ e LINHA_BANCARIA_CORP saem da IA sem nenhuma checagem.
3. **Duas tabelas de regras que não conversam.** A rota usa números fixos no meio do código em vez do catálogo oficial `GOVERNMENT_CREDIT_LINES`, e os valores divergem: FUNGETUR limitado a R$ 1,5 mi na rota contra R$ 15 mi no catálogo; FINEP e Fundos Regionais a R$ 3 mi contra R$ 10 mi. A função pronta `validateCreditLineConditions` nunca é chamada.
4. **Limite do MEI/FAMPE usa critério diferente.** FAMPE calcula 60% do faturamento enquanto todas as demais usam 30%.
5. **Cobertura de bancos incompleta.** Bradesco, Santander e Cooperativas só têm regra de PRONAMPE; Itaú declara suportar FAMPE mas não tem a regra; BB declara FINEP e FUNGETUR sem regra; BNB/BASA não tem FUNGETUR. Quando falta a regra da linha, o sistema devolve silenciosamente os números do PRONAMPE daquele banco — ex.: Itaú + FUNGETUR vira carência 12 / prazo 48, que está errado.
6. **O banco escolhido pode não operar a linha recomendada.** A lista `linhasSuportadas` existe mas nunca é consultada; a IA pode recomendar FUNGETUR em um banco que não opera a linha.
7. **Perfil da empresa pouco aproveitado.** Selo Emprega + Mulher e linha governamental já ativa são enviados, mas não alteram carência, prazo nem limite; a taxa não varia por porte, setor ou região. O comparativo de mercado é fixo em 38% a.a. para qualquer perfil.

## Melhorias propostas (somente backend do simulador)

### 1. Fonte única de regras
Passar a rota a consultar `GOVERNMENT_CREDIT_LINES` para limites, carência, prazo e faixa de taxa de toda linha, eliminando os números fixos espalhados. Corrigir os tetos divergentes de FUNGETUR, FINEP e Fundos Regionais para os do catálogo.

### 2. Injetar as regras do banco no prompt
Incluir no prompt um bloco com os dados reais do banco informado: nome normalizado, categoria, linhas que ele opera, carência padrão/máxima, prazo padrão/máximo, taxa estimada e a esteira de aprovação. A IA passa a escolher dentro do que o banco de fato pratica em vez de generalizar por categoria.

### 3. Validação completa da resposta
Aplicar, para **todas** as linhas, o corte por catálogo e por banco (carência, prazo, taxa dentro da faixa, limite dentro do teto), reusando `validateCreditLineConditions`. Se a linha recomendada não constar em `linhasSuportadas` do banco, trocar para a melhor linha suportada ou marcar a operação como "via outra instituição", explicando no parecer.

### 4. Completar o catálogo de bancos
Preencher as regras faltantes por linha (Itaú/FAMPE, BB/FUNGETUR e FINEP, BNB e BASA/FUNGETUR, Bradesco, Santander e Cooperativas nas linhas que operam) e, quando a regra da linha realmente não existir, deixar de devolver os números do PRONAMPE — usar os padrões do catálogo da linha.

### 5. Ajustes finos por perfil
- Alinhar o limite FAMPE aos mesmos 30% do faturamento das demais linhas, respeitando os tetos de MEI/ME/EPP.
- Selo Emprega + Mulher: aplicar o benefício de prazo previsto no PRONAMPE e citá-lo no parecer.
- Linha governamental ativa: descontar a operação vigente da capacidade antes de sugerir o novo limite.
- Comparativo de mercado: variar a taxa de referência por porte em vez do valor fixo de 38% a.a.

### 6. Parecer mais aderente ao perfil
Ampliar o parecer técnico para citar porte, setor, região, banco e capacidade remanescente, mantendo o mesmo formato JSON já consumido pela tela — sem alteração visual.

## Fora do escopo

Nenhuma mudança em interface, cobrança, autenticação, regras do Firestore, área do parceiro ou do administrador. O formato da resposta do simulador permanece o mesmo.

## Validação

`bunx tsgo --noEmit`, build limpo e uma simulação de teste por perfil (MEI, ME com banco privado, empresa de turismo, empresa do Nordeste) conferindo carência, prazo e limite.
