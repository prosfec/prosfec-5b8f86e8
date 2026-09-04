# Modelo comercial híbrido + assinatura de contrato por link público (rev. oferta inteligente)

A Etapa 4 é unificada — qualquer modelo (Avulso ou Assessoria) é assinado pelo cliente em um link público do domínio da PROSFEC (`/contrato/{leadId}`), e o sistema atua apenas como vitrine comercial e gerador/registrador de contrato. Nenhum checkout, nenhuma execução de serviço dentro do sistema.

## Etapa 1 — Vitrine de planos após a simulação (oferta inteligente)

Novo componente `src/components/PlanSelectionView.tsx`, exibido na tela de resultado do Simulador (`src/components/Simulador.tsx`), logo após o resultado da simulação.

- **Oferta inteligente (renderização condicional por porte):** a tela exibe SEMPRE apenas 2 cards — o Card Avulso + UM card de Assessoria escolhido pelo porte do lead (`lead.porte`):
  - MEI → Avulso + Assessoria Essential (R$ 497,00/mês).
  - ME → Avulso + Assessoria Growth (R$ 797,00/mês).
  - EPP, LTDA, S/A ou qualquer porte superior/indefinido → Avulso + Assessoria Corporate (R$ 1.497,00/mês).
- **Grid dos 2 cards:** `grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto gap-6` — cards grandes, centralizados e premium.
- **Copy sem a marca "Carto":** em todos os textos dos planos, substituída por "Gateway de pagamento com Sistema de Gestão Financeira integrado".
- Conteúdo dos planos:
  - Avulso: "Investimento sob consulta" · Diagnóstico de crédito e recomendação de soluções.
  - Essential: R$ 497,00/mês · Diagnóstico Estratégico, Estruturação Completa, Gateway de pagamento com Sistema de Gestão Financeira integrado, Monitoramento 12 meses.
  - Growth (destaque, borda verde primária): R$ 797,00/mês · tudo do Essential + Auditoria Fiscal + Site + Automação de WhatsApp.
  - Corporate: R$ 1.497,00/mês · tudo do Growth + Auditoria Financeira + Projeto Bancos Suíços. Estética `bg-slate-900` com texto branco.
- Os botões dizem "Falar com Especialista" e abrem o WhatsApp do parceiro vinculado ao lead (mesma resolução já usada hoje no Simulador: WhatsApp do parceiro indicador, com fallback para o número institucional quando o lead não tem parceiro), com a mensagem: "Olá, acabei de fazer a simulação na PROSFEC e gostaria de agendar uma reunião para definirmos o formato de assessoria para minha empresa."
- Nenhum botão leva a checkout.

## Etapa 2 — Controle do parceiro (LeadWorkspaceModal, Passo 4)

Na aba "contrato" de `src/components/LeadWorkspaceModal.tsx`, nova seção "Definição de Contrato e Assinatura" (inalterada nesta revisão):

- Select com: Modelo Avulso, Assessoria Essential, Assessoria Growth, Assessoria Corporate.
- Ao salvar, grava no lead: `modeloContratacao` ("avulso" | "assessoria"), `planoEscolhido` (nome do plano) e `valorMensalidade` (0 no avulso; 497/797/1497 conforme o plano).
- Input readonly com o link `window.location.origin + "/contrato/" + lead.id` e botão "Copiar Link".
- Badge de status de assinatura reaproveitando `contratoAssinado`.

## Etapa 3 — Rota pública `/contrato/$leadId`

Novo arquivo `src/routes/contrato.$leadId.tsx`, acesso público, sem login (inalterado nesta revisão).

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
- Sem alterações em comissões, preços de estruturação, diagnóstico, RedeBE ou fluxos de pagamento.

## Validação

1. Simular leads de cada porte (MEI, ME, EPP/outros) e conferir que apenas 2 cards aparecem (Avulso + a assessoria correta), com o redirecionamento ao WhatsApp do parceiro.
2. Conferir que nenhum texto menciona "Carto".
3. No Workspace, definir o modelo, copiar o link e abrir em aba anônima.
4. Assinar e verificar registro (assinatura, IP, data), etapa 5, notificação no Admin e tela de sucesso.
5. Typecheck e build.
