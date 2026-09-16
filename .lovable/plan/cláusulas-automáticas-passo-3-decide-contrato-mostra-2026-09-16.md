# Cláusulas automáticas: Passo 3 decide, contrato mostra

Ajuste do que já foi construído: o parceiro deixa de escolher serviços e cláusulas no Passo 4. As cláusulas passam a ser puxadas automaticamente dos serviços que o ADM já adicionou no Passo 3.

## Como fica

### Preços e Serviços (somente ADM)
Sem mudança: cada serviço tem nome, valor, descrição e o texto de cláusulas com selo de versão. Continua visível apenas para o ADM.

### Passo 3 (somente ADM adiciona serviços)
Continua exatamente como está hoje: título do serviço, descrição e valor. Nenhum texto de cláusula aparece aqui. Ao adicionar um serviço ao lead, o sistema já guarda em silêncio o texto de cláusulas e a versão vigente daquele serviço, para uso no contrato.

### Passo 4 (volta ao formato anterior)
- Remover o painel "Contratos Avulsos e Termos Aditivos".
- Fica novamente só: definição do plano, botão salvar, link público de assinatura e, quando houver, o recibo de assinatura (quem assinou, CPF mascarado, data, IP).
- O recibo passa a listar também os contratos avulsos e aditivos já assinados, em leitura pura, sem seleção de serviços nem cláusulas.

### Link público do cliente
- O contrato avulso é montado automaticamente a partir dos serviços do lead: cláusulas gerais, depois um bloco por serviço com a cláusula escrita em "Preços e Serviços", valor e condições, e o total.
- Serviços sem cláusula própria usam o bloco genérico.
- Depois de assinado, o contrato fica congelado: mudar o texto em "Preços e Serviços" não altera o documento já assinado.
- Se o ADM adicionar um serviço novo depois da assinatura, o link do cliente passa a exibir sozinho um Termo Aditivo apenas com esse serviço, referenciando o contrato original, que permanece intacto.

## Detalhes técnicos

- `src/components/LeadWorkspaceModal.tsx`: remover o uso e o import de `ContratosAvulsosPanel` no Passo 4; manter o bloco de plano/link/recibo como estava. Ao adicionar serviço no Passo 3, copiar `clausulas`, `templateId` e `templateVersao` do catálogo para o item de `servicosRecomendados` (sem exibi-los).
- `src/components/ContratosAvulsosPanel.tsx`: arquivo deixa de ser usado; remover.
- `src/utils/serviceUtils.ts`: em `sanitizeAndSyncServicosList`, propagar `clausulas`/`templateId`/`templateVersao` do catálogo para o serviço do lead somente enquanto o serviço não estiver congelado em contrato assinado.
- `src/lib/prosfec-server.ts` (`GET /api/public/contrato/:leadId`): substituir a leitura de documentos em rascunho por derivação automática —
  - sem contrato avulso assinado: documento virtual `avulso` com todos os serviços do lead que tenham valor, cláusulas congeladas na resposta;
  - com contrato avulso assinado: documento virtual `aditivo` com os serviços do lead que não constam no contrato assinado nem em aditivos assinados; se não houver serviço novo, nenhum documento pendente.
- `POST /api/public/contrato/:leadId/assinar`: ao assinar um documento derivado, gravar o documento definitivo em `contratos` (tipo, serviços com texto/versão congelados, total, dados do cliente, assinatura, `contratoOrigemId` no aditivo) e notificar o Admin. Contratos com status `assinado` continuam imutáveis.
- `src/routes/contrato.$leadId.tsx`: sem mudança estrutural — continua listando os documentos que o endpoint devolver (Assessoria, Avulso, Aditivos) e abrindo direto quando há só um.
- `firestore.rules`: manter a coleção `contratos` restrita à equipe; o cliente acessa só pelos endpoints públicos.

## Validação

`bunx tsgo --noEmit`, build limpo e teste: ADM adiciona 3 serviços no Passo 3, cliente abre o link e vê um contrato com as 3 cláusulas, assina; ADM adiciona um 4º serviço e o cliente passa a ver só o termo aditivo, com o contrato original inalterado.
