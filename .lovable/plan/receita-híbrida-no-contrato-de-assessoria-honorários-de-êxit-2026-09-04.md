# Receita híbrida no contrato de Assessoria: Honorários de Êxito

Adicionar a regra dos 5% de honorários de êxito do modelo Avulso ao contrato de Assessoria, mantendo a mensalidade como receita recorrente.

## Escopo

- Alterar apenas `src/components/AssessoriaContractText.tsx`.
- Não modificar `AvulsoContractText.tsx`, `src/routes/contrato.$leadId.tsx`, variáveis de injeção, `SignaturePad`, preços, comissões ou faturamento.

## Passos

1. **Copiar a cláusula de êxito do Avulso**
   - Origem: `src/components/AvulsoContractText.tsx`.
   - Trechos a copiar:
     - Cláusula 3 – Dos Honorários de Êxito e Forma de Pagamento (5% sobre o crédito liberado, fato gerador, prazo de 2 dias úteis, liberações parciais, isenção prévia).
     - Cláusula 5 – Da Cláusula Anti-Burla e Boa-Fé Contratual (comissão de 5% mantida em caso de omissão/má-fé + multa compensatória de 10%).

2. **Inserir no contrato de Assessoria**
   - Ponto de inserção: logo após a `Cláusula 8ª – Da Rescisão Antecipada` em `AssessoriaContractText.tsx`.
   - Texto de transição no topo da nova cláusula:
     > "Sem prejuízo do pagamento pontual das mensalidades pactuadas na Cláusula Segunda, caso o acompanhamento estratégico resulte na aprovação e efetiva liberação de crédito(s) em favor da CONTRATANTE, aplicar-se-ão as seguintes regras de honorários de êxito:"
   - A nova cláusula de êxito passa a ser a `Cláusula 9ª – Dos Honorários de Êxito e Forma de Pagamento`.
   - A subcláusula anti-burla vira `Cláusula 10ª – Da Cláusula Anti-Burla e Boa-Fé Contratual`.

3. **Renumeração simples das cláusulas seguintes**
   - Confidencialidade e Proteção de Dados: 9ª → 11ª.
   - Plataforma PROSFEC: 10ª → 12ª.
   - Assinatura Eletrônica: 11ª → 13ª.
   - Disposições Finais: 12ª → 14ª.
   - Atualizar os rótulos `<H>` e os números no corpo de cada cláusula renumera.

4. **Manutenção das variáveis**
   - Preservar `razaoSocial`, `cnpj`, `endereco`, `planoEscolhido`, `valorMensalidade`, `representante`, `representanteCpf`, `assinado`, `assinaturaData`, `assinaturaIp` e seus formatadores.
   - Não alterar a lógica de `SignaturePad` nem o fluxo de assinatura em `contrato.$leadId.tsx`.

## Validação

1. Typecheck (`bunx tsgo --noEmit` ou equivalente).
2. Build (`bun run build`).
3. Visual: abrir `/contrato/{leadId}` para um lead do tipo Assessoria e conferir a nova Cláusula 9ª/10ª, a renumeração e o recibo pós-assinatura.
