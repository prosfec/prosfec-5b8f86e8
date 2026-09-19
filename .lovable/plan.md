# Um contrato próprio para cada plano de Assessoria

Hoje existe um único texto fixo de Contrato de Assessoria no sistema, igual para Essential, Growth e Corporate. A mudança dá a cada plano o seu próprio contrato, escrito pelo ADM.

## No painel do ADM

Em "Preços & Serviços", no bloco "Valores de Mensalidade (Assessoria)", cada plano ganha, logo abaixo do campo de preço, uma caixa grande de texto: **"Contrato do plano — Essential / Growth / Corporate"**.

- Nessa caixa o ADM escreve o contrato completo daquele plano (objeto, escopo, prazo, pagamento, obrigações, rescisão, êxito, LGPD, foro — o que ele quiser).
- Salva junto com os demais preços, pelo mesmo botão de salvar.
- Cada texto guarda uma versão própria: ao alterar e salvar, a versão sobe, e contratos já assinados continuam com o texto antigo congelado.
- "Restaurar Padrões" limpa os três textos.

## Para o cliente, no link de assinatura

- O contrato de assessoria passa a ser montado com o texto do plano escolhido na ficha do lead.
- O sistema continua gerando automaticamente, em volta desse texto: o cabeçalho com as partes (PROSFEC — DCS SOLUCOES TECNOLOGICAS E SERVICOS FINANCEIROS LTDA / DCS Tech & Finance, CNPJ e sede já cadastrados) e os dados do cliente vindos da ficha (razão social, CNPJ, endereço, representante e CPF informados na assinatura); o quadro com plano, mensalidade, prazo de 12 meses, valor total, início e término; e o bloco final de assinatura eletrônica (nome, CPF, data/hora, IP, dispositivo, versão do contrato).
- Se o plano estiver com a caixa vazia no painel, nenhum contrato de assessoria é exibido ao cliente — só os contratos de serviço.
- A leitura obrigatória ("Li e concordo com este documento") por documento e a assinatura única no final continuam exatamente como estão hoje.

## Regras mantidas

- Contrato assinado é imutável; mudar o texto no painel não altera o que já foi assinado.
- Contratos de serviço (avulsos e aditivos) não mudam.
- Preços, comissões, etapas e faturamento mensal não mudam.

## Detalhes técnicos

- `src/utils/serviceUtils.ts`: novo tipo `ContratosAssessoria = { essential: { texto: string; versao: number }, growth: {...}, corporate: {...} }`, com `DEFAULT_CONTRATOS_ASSESSORIA` (textos vazios, versão 0), `normalizeContratosAssessoria(raw)` (sanitiza texto, limite de tamanho, coage versão) e helper `contratoAssessoriaPorPlano(planoEscolhido, contratos)` reaproveitando a lógica de match de `buildPlanoValores`.
- `src/components/AdminDashboard.tsx`: estado `editContratosAssessoria`; `<textarea>` por plano dentro do bloco existente de mensalidades; `handleSavePrices` grava `contratosAssessoria` em `configuracoes/precos_consultas`, incrementando `versao` apenas quando o texto mudou; `handleResetToDefaults` volta ao padrão vazio; `fetchData` carrega o campo. Desabilitado para `userRole === "contador"`, como os demais campos.
- `src/lib/prosfec-server.ts` (`GET /api/public/contrato/:leadId`): ao montar o documento `assessoria`, ler `configuracoes/precos_consultas` via `getDocRest`, resolver o texto do plano do lead e devolver `corpoContrato` + `contratoVersao` no documento. Quando o lead for assessoria e o texto resolvido estiver vazio, o documento principal não é incluído na lista (o `404` de "contrato não disponibilizado" continua valendo só quando não sobrar nenhum documento).
- `POST /api/public/contrato/:leadId/assinar`: ao assinar o documento principal de assessoria, gravar no lead o texto e a versão vigentes (`contratoAssessoriaTexto`, `contratoAssessoriaVersao`) junto do bloco de assinatura, congelando o documento. O endpoint passa a devolver o texto congelado, quando existir, em vez do texto atual do painel.
- `src/components/AssessoriaContractText.tsx`: passa a receber `corpoContrato` e `contratoVersao`; mantém cabeçalho das partes, quadro de plano/valor/prazo e blocos de assinatura eletrônica/aceite gerados pelo sistema, e renderiza o corpo digitado no lugar das cláusulas fixas atuais, com quebras de linha preservadas e títulos de linha em caixa alta destacados. As constantes fixas de entregáveis por plano deixam de ser usadas.
- `src/routes/contrato.$leadId.tsx`: repassa `corpoContrato`/`contratoVersao` do documento ao componente.

## Validação

`bunx tsgo --noEmit`, build limpo e teste: escrever o contrato do Essential no painel, abrir o link público de um lead Essential e conferir cabeçalho, corpo digitado, quadro de valores e assinatura única; conferir que um lead Growth sem texto não exibe contrato de assessoria.
