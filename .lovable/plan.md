# Um contrato próprio para cada serviço

Hoje, todos os serviços recomendados ao cliente são reunidos em um único documento ("Contrato de Prestação de Serviços Avulsos") e as cláusulas de cada serviço ficam listadas dentro da Cláusula 6ª. A mudança transforma cada serviço do catálogo em um contrato completo e independente.

## Como fica para o cliente

Na página pública de assinatura (`/contrato/{leadId}`):

- A lista de documentos passa a mostrar um contrato por serviço, com o nome do serviço no título (ex.: "Contrato de Prestação de Serviços — Dossiê Bancário & Projeto").
- Cada documento é um contrato completo: partes (PROSFEC/DCS Tech & Finance e os dados da ficha do cliente), objeto, valor, pagamento, obrigações, LGPD, assinatura eletrônica e foro.
- Dentro de cada contrato, logo abaixo da descrição do serviço, entra o texto de cláusulas específicas escrito no catálogo do ADM.
- O cliente abre cada contrato, marca "Li e concordo com este documento" em cada um, e assina uma única vez no final da página — exatamente como hoje.
- O recibo final (nome, CPF mascarado, data, IP, dispositivo) continua igual e passa a valer para todos os contratos assinados naquela sessão.

## Regras mantidas

- Dados da CONTRATADA sempre gerados automaticamente com a razão social e CNPJ já cadastrados no sistema.
- Dados do CONTRATANTE vindos da ficha do lead (razão social, CNPJ, endereço) e o representante/CPF informados no momento da assinatura.
- Contrato assinado é imutável; serviço incluído depois da assinatura gera um novo documento próprio (termo aditivo daquele serviço), sem alterar os já assinados.
- Serviços sem custo inicial (êxito) continuam gerando contrato normalmente, com o valor indicado como "Sem custo inicial (êxito)".
- Contratos já assinados no passado continuam exibidos como estão, sem reescrita.
- O contrato de Assessoria mensal e o contrato principal de consultoria não mudam.

## Detalhes técnicos

- `src/lib/prosfec-server.ts` → `derivarDocumentoPendente`: em vez de retornar um único documento com N serviços, retorna um documento por serviço pendente (`avulso_auto__<idServico>` / `aditivo_auto__<idServico>`), cada um com `servicos: [servico]`, `valorTotal` do serviço, `titulo` com o nome do serviço, e `tipo` = `avulso` ou `aditivo` conforme já exista contrato base assinado. A resolução de cláusulas (catálogo → serviço → padrão → genérica) e o congelamento de `templateId`/`templateVersao` permanecem.
- `GET /api/public/contrato/:leadId`: passa a concatenar a lista de pendentes (array) em vez de um item único.
- `POST /api/public/contrato/:leadId/assinar`: a rotina que grava os contratos pendentes passa a iterar sobre a lista derivada, criando um documento em `contratos` por serviço, com o mesmo bloco de assinatura (nome, CPF, data, IP, dispositivo) e uma única notificação ao ADM no final.
- `src/components/AvulsoServicoContractText.tsx` e `AditivoContractText.tsx`: adaptados para o caso de serviço único — cabeçalho com o nome do serviço, bloco "Do Objeto" com a descrição do serviço seguida imediatamente das cláusulas específicas, e quadro de valor simples em vez de tabela multi-serviço. Textos jurídicos gerais preservados.
- `src/routes/contrato.$leadId.tsx`: já suporta N documentos com leitura obrigatória e assinatura única; ajuste apenas no título exibido por documento e no rótulo do botão ("Assinar todos os documentos (N)").
- Validação: `bunx tsgo --noEmit`, build e conferência visual da página pública em desktop e mobile.
