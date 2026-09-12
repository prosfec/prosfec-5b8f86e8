# Proposta pública espelhando o Passo 6 do painel

A página pública `/proposta/{lead}` passa a mostrar a mesma proposta técnica que o parceiro
vê no Passo 6, em modo somente leitura, mantendo o pagamento por serviço e ampliando o
formulário final para completar cadastro + documentos em um único envio.

## Título e estrutura

Título geral da página: **Estruturação da Operação & Melhoria de Perfil de Crédito**.
Três blocos em esteira:

**Bloco 1 — Simulação & Proposta de Linha Governamental (somente leitura)**
Mesmo visual do painel: cabeçalho com o nome e o código da linha governamental, cartão escuro
com Parcela Inicial, Parcela Final, Total de Juros e Custo Total, e a tabela mês a mês
(mês, tipo carência/amortização, amortização, juros, parcela). Os parâmetros (valor desejado,
carência, amortização, sistema, taxa anual) aparecem como texto fixo — sem campo editável,
sem slider, sem botão de salvar. O cliente lê, mas não altera nada da configuração de crédito.
Se o parceiro ainda não vinculou a proposta, o bloco mostra "Simulação em preparação".

**Bloco 2 — Serviços e pagamento**
Permanece exatamente como está hoje: lista de serviços recomendados, valor de cada um, total e
botão "Realizar Pagamento" por serviço com o link do Catálogo de Saneamento & Adequação.

**Bloco 3 — Completar Cadastro e Documentação (editável)**
Primeiro os dados cadastrais que estiverem faltando (somente os vazios aparecem): e-mail,
telefone/WhatsApp, endereço da empresa, cidade, estado e CEP. Abaixo, os campos de link por
documento que já existem. Um único botão no final: **Salvar Dados e Documentos**.
Campos já preenchidos no cadastro não aparecem e não podem ser sobrescritos pelo cliente.

## Detalhes técnicos

- `src/lib/prosfec-server.ts`, `GET /api/public/proposta/:leadId`: além do que já retorna,
  incluir `proposta.simulacao` a partir de `lead.propostaNegociada` + `lead.creditLineCode` /
  `creditLineName` (valorDesejado, carenciaMeses, amortizacaoMeses, sistemaAmortizacao,
  taxaAnual, pagarJurosCarencia, parcelaInicial, parcelaFinal, totalJuros, totalPago,
  dataSimulacao) e `proposta.cadastro` com apenas os campos **faltantes** (`email`, `whatsapp`,
  `enderecoEmpresa`, `cidade`, `estado`, `cep`), mais os valores já presentes marcados como
  preenchidos. Nenhum dado interno de parceiro, comissão ou saldo é exposto.
- Tabela de amortização: calculada no cliente a partir dos parâmetros da simulação, com a mesma
  lógica de SAC/PRICE já usada no Passo 6 (extraída para um helper compartilhado se necessário),
  para não enviar centenas de linhas pela API.
- `POST /api/public/proposta/:leadId/documentos` passa a aceitar também `cadastro`:
  valida tipo e tamanho, aceita apenas as 6 chaves permitidas, **grava apenas quando o campo
  estiver vazio no lead** e nunca toca em etapa, serviços, simulação, saldo ou comissões.
  Continua gravando `documentosCliente` + `documentosClienteAtualizadoEm` e notificando a equipe.
- `src/routes/proposta.$leadId.tsx`: novo título, bloco 1 de leitura com os cartões/tabela,
  bloco 3 com os campos cadastrais faltantes acima dos links e um único botão de envio.
- `src/types.ts`: campos opcionais `enderecoEmpresa`, `cidade`, `estado`, `cep` e
  `cadastroClienteAtualizadoEm` no `Lead`.
- Validação: `bunx tsgo --noEmit` e build.

## Fora de escopo

Passo 6 do painel do parceiro, consulta de crédito, anexo de PDF, catálogo de preços, comissões,
saldo, contratos, autenticação, regras do banco, painel administrativo e site público.
