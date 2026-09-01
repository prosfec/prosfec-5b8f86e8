# Limpeza do Dossiê Rating do Admin para o fluxo por pasta única

## Objetivo

Enxugar o `Dossiê Rating (ADM)` para que **Pasta de Documentos do Cliente** seja a única referência documental da tela, sem alterar dados existentes no Firestore nem remover o parecer e as ações administrativas.

## Alterações

### 1. Remover a experiência granular legada

Em `src/components/FichaRatingAdmViewer.tsx`:

- remover a contagem “X de Y docs anexados” e toda a **Esteira de Rating** baseada nos arquivos individuais;
- remover as abas e conteúdos de **Documentos Sócios (CPF)** e **Documentos Empresa (CNPJ & PDFs)**;
- remover cards de Foto Frente/Verso, selfie, título, Cartão CNPJ, Contrato Social, comprovante, faturamento, DRE, balanço e CCB;
- remover preview, aprovação/rejeição, motivo de recusa, sinalização de link inacessível e download em lote por documento;
- remover da interface do Dossiê o card/modal RTB atualmente acoplado à aba CNPJ, sem apagar `analiseRTB` nem os dados legados do lead.

### 2. Deixar a pasta única como referência documental

- manter em destaque o bloco **Pasta de Documentos do Cliente**, com URL, estado de ausência e botão **Abrir pasta**;
- retirar o botão legado **Baixar Dossiê Completo**, pois ele tenta baixar os anexos unitários; a ação documental passa a ser exclusivamente **Abrir pasta** dentro desse bloco;
- manter o andamento do Passo 6, pois ele representa serviços/estruturação e não arquivos individuais.

### 3. Preservar e desacoplar o core administrativo

- exibir diretamente a área **Parecer Técnico & Nota Pós-Serviço**, sem aba e sem bloqueio baseado na existência de arquivos granulares;
- preservar nota, classificação de risco, capacidade sugerida, melhorias aplicadas, parecer, analista, salvar rascunho e concluir rating;
- preservar **Ficha Liberada** e o status/observações gerais;
- preservar **Cobrar Pendências WhatsApp**, adaptando a mensagem para solicitar acesso/correção da pasta única e usar as observações administrativas, sem listar arquivos ausentes ou rejeitados;
- manter as gravações e os campos legados no Firestore para compatibilidade histórica, mas sem expô-los nessa tela.

### 4. Limpeza técnica localizada

- remover estados, helpers, imports e tipos usados exclusivamente pela UI granular (`activeTab`, sócio selecionado, preview, validações unitárias, download em lote e modal RTB);
- ajustar a fase salva para não depender da contagem de anexos antigos: conclusão continua definida pelo parecer final; os demais estados seguem o status administrativo e o andamento do serviço;
- não alterar `LeadWorkspaceModal.tsx`, além de confirmar que ele continua renderizando o mesmo `FichaRatingAdmViewer` na aba exclusiva do Admin.

## Validação

- validar build/typecheck após a limpeza;
- abrir o Workspace de um lead no Admin e confirmar que o Dossiê mostra pasta única, Passo 6, ações, parecer e status geral;
- confirmar ausência completa de contagem/esteira/abas/cards de documentos e ausência de textos do antigo Portal do Cliente;
- testar **Abrir pasta**, **Ficha Liberada**, WhatsApp, salvar rascunho e concluir rating.

## Fora de escopo

- nenhuma exclusão ou migração de dados do Firestore;
- nenhuma mudança no formulário do parceiro, nas regras do Firebase ou no restante do Workspace.
