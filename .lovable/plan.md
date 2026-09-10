# Simulador da Home: tratar CNPJ já cadastrado (upsert)

## Situação atual

- Ao concluir a simulação, `src/App.tsx` (`handleLeadCaptured`) grava direto no Firestore com `setDoc(doc(db, "leads", lead.id))`, sempre com um ID novo. Se o mesmo CNPJ simular de novo, nasce um lead duplicado.
- A verificação de duplicidade que existe hoje no `src/components/Simulador.tsx` (`checkDuplicateLead`) roda no navegador do visitante e é bloqueada pelas regras do banco (o público só pode criar, não ler). Por isso ela falha em silêncio e nunca detecta o CNPJ existente.

## O que será feito

### 1. Nova rota pública de gravação inteligente (upsert)

Criar `POST /api/public/leads/simulacao` em `src/lib/prosfec-server.ts`, executada com a identidade de serviço (mesma abordagem REST já usada nas outras rotas):

- Valida o payload (CNPJ com 14 dígitos, nome, contato). Sem CNPJ válido, responde erro em JSON.
- Busca na coleção `leads` por `cnpj` (tanto formatado quanto só números).
- **Se existe:** atualiza o lead com os dados novos (faturamento, contato, dados da empresa, resultado da simulação) e acrescenta uma entrada em `historicoSimulacoes` com data, limite estimado e nível de preparação. Campos de operação já em andamento **não** são sobrescritos: `status`, `etapa`, `valorAprovado`, `pendencias`, documentos e os campos de comissão. `parceiroId`/`parceiroNome` só são gravados se o lead ainda não tiver consultor vinculado — assim uma indicação nova não rouba um lead já atribuído.
- **Se não existe:** cria o lead normalmente, com o mesmo formato de documento de hoje, mais o primeiro registro em `historicoSimulacoes`.
- Responde sempre em JSON: `{ success, leadId, atualizado: true|false }`.

### 2. Frontend sem fricção

- `src/App.tsx`: `handleLeadCaptured` passa a chamar a nova rota em vez de gravar direto. A resposta é lida com verificação de conteúdo (nunca `response.json()` cego), e qualquer falha de gravação é registrada no console sem interromper a tela.
- A tela de resultado continua sendo exibida em qualquer cenário — criação, atualização ou falha de rede. Nenhuma mensagem de erro de "registro duplicado" chega ao visitante.
- Se o backend indicar que o lead foi atualizado, a tela de resultado exibe um aviso discreto de que o cadastro da empresa foi atualizado (sem bloquear nada).

### 3. Aviso de cadastro existente durante o preenchimento

- Adicionar `GET /api/public/leads/existe?cnpj=` retornando apenas `{ existe, razaoSocial, dataCriacao }` — sem dados sensíveis.
- `Simulador.tsx` passa a consultar essa rota no lugar da consulta direta ao banco, fazendo o aviso "empresa já cadastrada" voltar a funcionar. Falha na consulta simplesmente não mostra aviso.

## Detalhes técnicos

- Rotas sob `/api/public/*` para não exigir sessão; ambas são somente-leitura de dados não sensíveis ou gravação validada.
- Reuso dos helpers existentes `runQueryRest`, `getDocRest`, `patchDocRest`, `createDocRest` e `cleanForFirestore`.
- `historicoSimulacoes` é um array limitado às últimas 10 entradas, via leitura + escrita no mesmo request.
- Nada muda em regras do Firestore, autenticação, comissões, painel do parceiro ou do admin.
- Validação final: `bunx tsgo --noEmit`, build e um teste do fluxo completo da Home (CNPJ novo e CNPJ repetido).
