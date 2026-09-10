# Corrigir a quebra de tela com HTML e garantir erro em JSON no diagnóstico

## O que está acontecendo

Ao gerar o diagnóstico, o servidor devolveu uma página de erro em HTML e a tela tentou ler isso como dados, quebrando com "Unexpected token '<'".

Verificado no código:

- Na geração do diagnóstico a resposta é lida direto como dados (`res.json()`), sem checar se o servidor respondeu corretamente. O mesmo ocorre no botão do dossiê pós-estruturação. Já a consulta de crédito faz a leitura protegida (lê o texto primeiro) — é esse padrão que falta nos outros dois pontos.
- A entrada da API não tem proteção própria: se algo falhar antes de a rota rodar (ou se o processo do servidor cair/estourar tempo), a resposta que chega ao navegador é a página HTML do provedor, e não um aviso em formato de dados.
- A etapa 1 da IA hoje espera até 60 segundos e pode ainda tentar uma segunda vez, e depois vem a etapa 2. Somado, isso pode ultrapassar o tempo máximo permitido pelo servidor e provocar exatamente essa página HTML.

## O que será feito

### 1. Blindar a tela (nada mais quebra com HTML)

- Criar um leitor único de respostas que: lê o corpo como texto, tenta interpretar como dados e, se não for possível, registra o começo do conteúdo recebido no console e devolve uma mensagem amigável ("Falha na comunicação com o servidor. Tente novamente em instantes.").
- Usar esse leitor na geração do diagnóstico e no dossiê pós-estruturação.
- Quando o servidor responder com um motivo real (chave da IA, limite de uso, demora), esse motivo continua sendo exibido como hoje.
- O botão volta a ficar clicável em qualquer um desses casos.

### 2. Garantir que o servidor sempre responda em formato de dados

- Envolver a entrada da API (inclusive a criação do aplicativo interno) em proteção total: qualquer falha inesperada vira uma resposta em formato de dados com status 500 e uma mensagem curta, nunca uma página HTML.
- Manter o registro completo do erro no log do servidor, sem expor chaves nem dados pessoais.

### 3. Reduzir o risco de estouro de tempo

- Diminuir o tempo de espera da etapa 1 da IA (60 → 45 segundos) e limitar a repetição com conteúdo reduzido a uma única tentativa mais curta (20 segundos), para o total ficar dentro do limite do servidor.
- Se o tempo acabar, a resposta será um aviso claro de demora ("A IA demorou demais para responder"), em formato de dados, com a trava liberada para nova tentativa.

### 4. Conferir a configuração da chave da IA

- Confirmar, por uma chamada real à rota, se a chave da IA está sendo lida no ambiente do servidor publicado. Se estiver ausente, a resposta será a mensagem específica de configuração ausente (já implementada) e eu aviso para cadastrá-la.

## Detalhes técnicos

- `src/components/LeadWorkspaceModal.tsx`: helper `parseJsonResponse(res)` (text-first + checagem de `content-type`), aplicado nas linhas ~869 e ~5016.
- `src/routes/api/$.ts`: `try/catch` em volta de `getApp()` e `handle(request)`, retornando `Response.json({ error }, { status: 500 })`.
- `src/lib/prosfec-server.ts`: ajuste dos tempos da etapa 1 (`generateContentWithFallback`) e da tentativa reduzida; catch externo já devolve `code` + `error` e marca a trava como falha.
- Sem mudanças visuais, de cobrança, do fluxo RedeBE ou das regras do banco.
