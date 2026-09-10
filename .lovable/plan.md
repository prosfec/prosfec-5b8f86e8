# Acelerar o diagnóstico da IA para caber no tempo do servidor

## Situação verificada

- A chave da IA (`GEMINI_API_KEY`) **já está cadastrada** nos secrets do projeto. Não é preciso pedir uma nova; se você quiser trocá-la por outra, eu abro o formulário seguro.
- O diagnóstico faz **duas chamadas seguidas** à IA: a Etapa 1 (auditoria em JSON, hoje com espera de até 45s + tentativa extra de 20s) e a Etapa 2 (redação do laudo, sem limite de tamanho de resposta). Somadas, elas passam do tempo que o servidor aceita e a resposta é cortada.
- O texto enviado à IA hoje leva o resultado inteiro da consulta (só são removidos HTML, PDF e resposta crua), podendo chegar a 60 mil caracteres.
- Observação técnica importante: `gemini-1.5-flash` foi descontinuado pelo Google e responderia com erro. O equivalente atual mais rápido é `gemini-2.5-flash-lite` (com o "raciocínio interno" desligado), com `gemini-2.0-flash` como reserva — nenhum modelo "pro" será usado.

## O que será feito

### 1. Enviar só o que importa
Antes de montar o texto para a IA, extrair da consulta apenas os blocos vitais: score, dívidas/negativações, protestos, pendências financeiras, situação cadastral/fiscal e apontamentos do Bacen. Campos nulos, vazios, listas longas e histórico irrelevante são descartados. Limite rígido de conteúdo bem menor (cerca de 12 mil caracteres) e apenas a consulta mais recente por padrão.

### 2. Modelos rápidos e resposta curta
- Ordem de modelos: `gemini-2.5-flash-lite` → `gemini-2.0-flash`.
- Desligar o raciocínio interno (principal causa de lentidão do 2.5).
- Etapa 1: `maxOutputTokens: 800`, espera máxima de 8 segundos, sem segunda tentativa longa.
- Etapa 2: resposta limitada e espera máxima de 8 segundos, com o texto do laudo enxugado para caber.

### 3. Não estourar o tempo do servidor
Controlar o tempo total da rota: se a soma das etapas passar do limite seguro, a rota devolve imediatamente um aviso claro de demora (em formato de dados, nunca página de erro), liberando o botão para nova tentativa.

### 4. Mensagem de erro continua clara
A blindagem atual permanece: motivo real exibido na tela (chave, limite de uso, demora, recusa da IA) e trava liberada em qualquer falha.

## Detalhes técnicos

Arquivo único: `src/lib/prosfec-server.ts`, rota `POST /api/credit/diagnostico-prosfec`.

- `generateContentWithFallback()`: lista de modelos passa a `["gemini-2.5-flash-lite", "gemini-2.0-flash"]`, timeout padrão 8s, `thinkingConfig: { thinkingBudget: 0 }` e `maxOutputTokens` aplicados via config recebida.
- Novo `extractVitalReport(resultado)` substituindo a limpeza por lista negra: whitelist de chaves (`score`, `dividas`, `negativacoes`, `protestos`, `pendencias_financeiras`, `situacao_cadastral`, `scr`/`bacen`), poda de nulos/vazios e corte de arrays longos.
- `buildConsultationsBlock(1, 12_000)` nas duas etapas.
- Etapa 1: `maxOutputTokens: 800`, uma única tentativa; retry reduzido só para erro de tamanho, com 6s.
- Etapa 2: `maxOutputTokens` limitado e prompt encurtado, mantendo os blocos `json_servicos` e `json_subetapas`.
- Guarda de tempo total com `Date.now()` no início da rota; ao ultrapassar o orçamento, erro `GEMINI_TIMEOUT` (504) e lock marcado como falha.

Sem mudanças visuais, de cobrança, do fluxo RedeBE ou das regras do banco.
