# Destravar o Diagnóstico PROSFEC IA (erro 503)

## O que está acontecendo

O botão dispara a geração, o servidor chega até a etapa de auditoria da IA e essa etapa falha. Hoje o código apenas registra a falha internamente e devolve sempre a mesma mensagem genérica ("A auditoria da IA não pôde validar os dados da consulta"), com status 503. Por isso não é possível saber, pela tela nem pelo retorno, se o problema foi a chave da IA, limite de uso, tempo esgotado, resposta inválida ou relatório grande demais.

Pontos confirmados no código atual:

- A chave da IA é lida só na hora do uso; se estiver ausente, o erro vira a mesma mensagem genérica de 503.
- A chamada à IA tem tempo limite de 30 segundos e tenta dois modelos; qualquer erro final é engolido por um aviso interno.
- O relatório bruto de cada consulta é enviado inteiro para a IA (só são removidos o HTML, o PDF e a resposta crua), o que pode estourar o limite de conteúdo quando o relatório é extenso.
- Quando essa etapa falha, a trava da operação precisa ficar liberada para nova tentativa.

## O que será feito

1. **Erro claro em vez de 503 genérico**
   - Preservar a causa real da falha da IA e devolvê-la no retorno da rota, com o código correto: configuração ausente da chave e falhas do provedor viram erro de servidor (500), limite de uso vira 429 com aviso de tentar em instantes, tempo esgotado vira 504 e resposta inválida da IA continua sendo tratada como falha de conteúdo.
   - Registrar no log do servidor a causa detalhada (modelo usado, status do provedor, mensagem), sem expor chave nem dados pessoais.
   - A mensagem mostrada ao parceiro passa a dizer o motivo em linguagem simples e o que fazer.

2. **Verificação da chave antes de começar**
   - Checar a configuração da chave logo no início da rota. Se faltar, responder imediatamente com mensagem explícita de configuração ausente, sem consumir trava nem tentar chamar a IA.

3. **Proteção contra relatório grande demais**
   - Limitar o conteúdo enviado à IA: usar as consultas mais recentes primeiro, remover campos pesados adicionais e cortar o texto acima de um tamanho seguro, com indicação de que houve corte.
   - Se ainda assim a IA recusar por tamanho, refazer uma única tentativa com a versão reduzida antes de declarar falha.

4. **Trava sempre liberada**
   - Garantir que qualquer falha dessa etapa marque a operação como falha e libere nova tentativa imediata, e que o botão volte a ficar clicável.

## Detalhes técnicos

Arquivo: `src/lib/prosfec-server.ts`, rota `POST /api/credit/diagnostico-prosfec`.

- `getGeminiAI()`: erro de chave ausente ganha `statusCode: 500` e marcador `code: "GEMINI_KEY_MISSING"`; checagem antecipada com `hasEnv("GEMINI_API_KEY")` antes de criar a trava.
- `generateContentWithFallback()`: propagar `status`/`code` do provedor no erro lançado, diferenciar `GEMINI_TIMEOUT`, e aumentar o tempo limite da Etapa 1 para 60s.
- Bloco da Etapa 1: substituir o `console.warn` + erro genérico por mapeamento de status (`500` chave/config, `429` cota, `504` timeout, `502` provedor, `503` apenas para JSON inválido), mantendo a mensagem original da causa em `error` e o detalhe em log.
- `consultationsSummary`: ordenar por `dataConsulta` decrescente, limitar quantidade, remover campos binários/extensos e aplicar corte por tamanho no JSON serializado antes de montar o prompt.
- Manter o comportamento atual de não salvar laudo estimado; só muda o diagnóstico do erro, o preparo do payload e a liberação da trava.

Nenhuma mudança visual, nenhuma alteração em regras do banco, cobrança, RedeBE ou catálogo de preços.
