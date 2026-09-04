# Modelo comercial híbrido + assinatura de contrato por link público

Confirmando o entendimento: a Etapa 4 passa a ser unificada — qualquer modelo (Avulso ou Assessoria) é assinado pelo cliente em um link público do domínio da PROSFEC (`/contrato/{leadId}`), e o sistema atua apenas como vitrine comercial e gerador/registrador de contrato. Nenhum checkout, nenhuma execução de serviço dentro do sistema.

## Etapa 1 — Vitrine de planos após a simulação

Novo componente `src/components/PlanSelectionView.tsx`, exibido na tela de resultado do Simulador (`src/components/Simulador.tsx`), logo após o resultado da simulação.

- Grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`, estética Fintech Premium (`bg-white rounded-xl border border-slate-200 shadow-sm`).
- Card 1 — Avulso: "Investimento sob consulta" · Diagnóstico de crédito e recomendação de soluções.
- Card 2 — Essential: R$ 497,00/mês · Diagnóstico Estratégico, Estruturação Completa, Conta Digital/Gateway Carto, Monitoramento 12 meses.
- Card 3 — Growth (destaque, borda verde primária): R$ 797,00/mês · tudo do Essential + Auditoria Fiscal + Site + Automação de WhatsApp.
- Card 4 — Corporate: R$ 1.497,00/mês · tudo do Growth + Auditoria Financeira + Projeto Bancos Suíços. Estética `bg-slate-900` com texto branco.
- Os 4 botões dizem "Falar com Especialista" e abrem o WhatsApp do parceiro vinculado ao lead (mesma resolução já usada hoje no Simulador: WhatsApp do parceiro indicador, com fallback para o número institucional quando o lead não tem parceiro), com a mensagem: "Olá, acabei de fazer a simulação na PROSFEC e gostaria de agendar uma reunião para definirmos o formato de assessoria para minha empresa."

## Etapa 2 — Controle do parceiro (LeadWorkspaceModal, Passo 4)

Na aba "contrato" de `src/components/LeadWorkspaceModal.tsx`, nova seção "Definição de Contrato e Assinatura":

- Select com: Modelo Avulso, Assessoria Essential, Assessoria Growth, Assessoria Corporate.
- Ao salvar, grava no lead: `modeloContratacao` ("avulso" | "assessoria"), `planoEscolhido` (nome do plano) e `valorMensalidade` (0 no avulso).
- Input readonly com o link `window.location.origin + "/contrato/" + lead.id` e botão "Copiar Link".
- Badge de status de assinatura reaproveitando `contratoAssinado`.

## Etapa 3 — Rota pública `/contrato/$leadId`

Novo arquivo `src/routes/contrato.$leadId.tsx`, acesso público, sem login.

- Carrega os dados mínimos do lead por endpoint público de leitura (ver detalhes técnicos).
- Contrato dinâmico: `modeloContratacao === "avulso"` renderiza o texto do contrato padrão já existente no Passo 4; `"assessoria"` renderiza o novo modelo "Assessoria de 12 Meses", injetando nome do plano e valor da mensalidade.
- Ao final, o componente existente `src/components/SignaturePad.tsx`, com campos de nome completo e CPF do signatário.
- "Assinar e Concordar": busca o IP em `https://api.ipify.org?format=json` e grava assinatura (Base64), timestamp, IP, nome, CPF e user-agent; marca `contratoAssinado = true` e avança a etapa do lead para 5 quando ela ainda estiver abaixo disso.
- Tela de sucesso: "Contrato assinado com sucesso. Aguarde o contato da nossa equipe."
- Se o lead ainda não tem `modeloContratacao` definido, a página mostra aviso de contrato ainda não disponível.

## Etapa 4 — Notificação para o Admin

No registro da assinatura, cria documento em `notificacoes`: "NOVO CONTRATO ASSINADO: {Razão Social} assinou o contrato do plano {Plano/Avulso}. O link de faturamento na InfinitePay pode ser gerado."

## Detalhes técnicos

- Como o Portal do Cliente foi removido, as regras do Firestore exigem usuário autenticado para ler/gravar leads. A página pública, portanto, não fala direto com o Firestore: usa dois endpoints no backend existente (`src/lib/prosfec-server.ts`), servidos pelo catch-all `src/routes/api/$.ts`, com os helpers REST já existentes e token de serviço:
  - `GET /api/public/contrato/:leadId` — retorna só o necessário para exibir o contrato (razão social, CNPJ, endereço, sócio, modelo, plano, valor, se já assinado).
  - `POST /api/public/contrato/:leadId/assinar` — valida payload, grava assinatura/IP/timestamp no lead, ajusta etapa e cria a notificação do Admin.
- Nenhum dado sensível além dos campos do próprio contrato é exposto pelo endpoint público.
- Campos novos no lead tipados em `src/types.ts` e nas interfaces locais do Workspace.
- Sem alterações em comissões, preços, diagnóstico, RedeBE ou fluxos de pagamento.

## Validação

1. Simular um lead e conferir os 4 cards e o redirecionamento ao WhatsApp do parceiro.
2. No Workspace, definir o modelo, copiar o link e abrir em aba anônima.
3. Assinar e verificar registro (assinatura, IP, data), etapa 5, notificação no Admin e tela de sucesso.
4. Typecheck e build.
