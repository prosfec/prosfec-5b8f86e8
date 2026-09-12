# Página pública de Proposta e Checkout do cliente

Nova página aberta por link (sem cadastro e sem senha) onde o cliente final vê o plano de ação
montado pela equipe, paga e envia os links dos documentos. Nada do fluxo atual muda: consulta,
PDF do diagnóstico, catálogo, comissões, contratos e painéis continuam exatamente como estão.

## Endereço e segurança

- Endereço: `https://prosfec.com.br/proposta/{identificador-do-lead}`.
- O identificador do lead já é um código longo e aleatório, e funciona como a chave de acesso.
- A página busca os dados sempre pelo servidor, nunca direto do banco pelo navegador.
- A página mostra apenas: nome/empresa do cliente, serviços recomendados, valores e o link de
  pagamento de cada serviço. Nada do parceiro, da comissão, do saldo ou dos dados internos aparece.
- O cliente só consegue gravar uma coisa: os links de documentação que ele mesmo enviar.
- A página é marcada para não aparecer em buscadores.

## O que o cliente vê (três blocos)

**Bloco 1 — Seu plano de ação**
Logo PROSFEC no topo, nome da empresa e a lista dos serviços recomendados pela equipe (nome,
breve descrição e valor), com o total. Quando a equipe ainda não incluiu serviços, a página abre
normalmente mostrando "Proposta em preparação — nossa equipe está finalizando seu plano de ação",
sem bloco de pagamento e sem bloco de documentos.

**Bloco 2 — Pagamento**
Cada serviço com link de checkout cadastrado no Catálogo de Serviços de Saneamento & Adequação
ganha um botão de destaque "Realizar Pagamento", abrindo o link daquele serviço em nova aba.
Serviços sem link cadastrado aparecem com a observação "pagamento combinado com a equipe".

**Bloco 3 — Envio da documentação**
Um campo de link por documento, com nome fixo:

- Documento de identidade (RG/CNH)
- CPF do responsável
- Contrato Social / MEI
- Comprovante de endereço da empresa
- Cartão CNPJ
- Últimos extratos bancários
- Outros documentos (opcional)

Cada campo aceita um link de nuvem (Google Drive, OneDrive, Dropbox). Ao clicar em
"Enviar Documentação", os links são gravados no cadastro do lead e a tela confirma o envio.
O cliente pode reabrir o link depois, ver o que já enviou e completar o que faltou.

## No painel do parceiro

No workspace do lead, um botão "Copiar Link da Proposta para o Cliente" copia o endereço pronto
para colar no WhatsApp, com confirmação visual "Link copiado". O botão fica junto das ações do
lead, sem mudar nada do restante da ficha.

## Detalhes técnicos

- Nova rota de página: `src/routes/proposta.$leadId.tsx`, no mesmo padrão de
  `src/routes/contrato.$leadId.tsx` (`head()` próprio com título/descrição e `robots: noindex`).
- Novas rotas de servidor em `src/lib/prosfec-server.ts`, ao lado das rotas públicas já existentes:
  - `GET /api/public/proposta/:leadId` — `sanitizeLeadId` + `getDocRest("leads/{id}")`; devolve
    apenas `nomeEmpresa/razaoSocial`, `nomeContato`, `cnpj` mascarado, `servicosRecomendados`
    (nome, descrição, valor e `hublaLink` resolvido) e `documentosCliente` já enviados.
    Reaproveita `getHublaLinkForService` do catálogo (`configuracoes` / `customServices`) para o
    link de checkout de cada serviço. 404 quando o lead não existe.
  - `POST /api/public/proposta/:leadId/documentos` — valida cada link (string, começa com
    `https://`, até 500 caracteres, apenas as chaves conhecidas da lista fixa) e grava em
    `documentosCliente` + `documentosClienteAtualizadoEm` via `patchDocRest`, sem tocar em
    nenhum outro campo do lead.
- `src/types.ts`: novo campo opcional `documentosCliente?: Record<string, string>` e
  `documentosClienteAtualizadoEm?: string` na interface `Lead`.
- `src/components/LeadWorkspaceModal.tsx`: botão "Copiar Link da Proposta para o Cliente" usando
  `navigator.clipboard.writeText(`${window.location.origin}/proposta/${lead.id}`)`.
- Sem alteração em `firestore.rules` ou `storage.rules`: a leitura e a gravação da proposta passam
  pelo servidor, que já acessa o banco com credencial própria.
- Validação: `bunx tsgo --noEmit` e build.

## Fora de escopo

Consulta de crédito, anexo do PDF, catálogo de preços, comissões, saldo, contratos, autenticação,
painel administrativo, simulador e site público.
