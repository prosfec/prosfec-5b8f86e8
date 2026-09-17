# Remover Hubla e Lastlink do sistema e preparar o caminho da InfinityPay

Objetivo: nenhuma menção a Hubla ou Lastlink na tela, nos textos e no código; pagamentos continuam confirmados manualmente exatamente como hoje; fica pronta uma rota de webhook da InfinityPay, desligada, para configuração futura.

## O que muda

### 1. Textos e telas
- **Preços e Serviços (ADM):** o campo "Link de Checkout LastLink" e a coluna "Link Checkout LastLink" passam a se chamar "Link de Pagamento (opcional)", com exemplo neutro no campo.
- **Comissões e Saques (ADM):** o texto de apoio e o cartão "Aguardando Hubla" passam a falar apenas em compensação — "Aguardando compensação" e "Pix liberado após 48h úteis e Cartão após 15 dias corridos", sem citar plataforma.
- **Ficha do lead (Passos 3 e 6):** o selo de pago deixa de mostrar "Hubla" (passa a "Pago" / "Pago (Manual)") e o botão de link externo perde o texto "Contratar via Hubla", virando "Abrir link de pagamento" — só aparece quando o serviço realmente tem link cadastrado.
- **Painel do parceiro:** removido o rótulo "Gestão Anual (Hubla) & Teste Grátis" e o comentário interno equivalente.

### 2. Configurações de afiliado Hubla
- Removidos os campos de códigos de checkout por plano (Starter / Executive / Master) do painel do parceiro, junto com a leitura do código do parceiro-pai e a gravação desses códigos no cadastro.
- Removida a captura desses códigos pelo link de indicação na página inicial (nenhuma marcação salva no navegador).
- Os parâmetros de indicação normais (quem indicou) continuam funcionando igual.

### 3. Links de pagamento dos serviços
- A tabela fixa de links da Hubla embutida no código é removida; nenhum link é sugerido automaticamente.
- O link do serviço passa a ser apenas o que o ADM cadastrar no catálogo. Serviços já cadastrados continuam com o link que têm (leitura compatível com o campo antigo).

### 4. Regras do banco
- Removidas as permissões das coleções de eventos/logs `hubla_events` e `webhook_logs_lastlink`, que não são mais usadas.

### 5. InfinityPay — caminho preparado (desligado)
- Nova rota pública `POST /api/public/webhooks/infinitypay`, inerte: valida a assinatura contra um segredo (`INFINITYPAY_WEBHOOK_SECRET`) e, enquanto o segredo não existir, responde 503 "integração não configurada" sem gravar nada.
- Também `GET` na mesma rota apenas para teste de disponibilidade.
- Nada de confirmação automática de pagamento: quando a integração for ligada no futuro, basta preencher o trecho marcado de processamento. Hoje tudo continua manual.

## O que NÃO muda
- Confirmação manual de pagamento no Passo 6 (Pix 48h / Cartão 15 dias) e o cálculo de liberação de saque.
- Regras de comissão, saldo, saque e catálogo de serviços.
- Contratos, assinatura, proposta pública e consultas.
- Dados já gravados nos leads (valores, links, histórico) não são apagados.

## Detalhes técnicos
- `src/utils/serviceUtils.ts`: remove `HUBLA_SERVICE_LINKS` e o fallback por id; `getHublaLinkForService` vira `getPaymentLinkForService`; grava/normaliza em `linkPagamento` mantendo leitura de `hublaLink` legado.
- `src/types.ts`: `hublaLink` marcado como legado e adicionado `linkPagamento`; removidos `hublaCode*` de Partner.
- `src/components/AdminDashboard.tsx`: rótulos, estado `newServHublaLink` → `newServLinkPagamento`, remoção do import de `HUBLA_SERVICE_LINKS` e das reinserções automáticas; textos do painel financeiro.
- `src/components/PartnerPortal.tsx`: remove estados/handlers de `hublaCode*`, `parentHublaCodes` e `extractHublaCode`; comentários e rótulos.
- `src/components/LeadWorkspaceModal.tsx`: renomeia variáveis/labels e usa `getPaymentLinkForService`.
- `src/App.tsx`: remove `extractHublaCode` e as chaves `lca_referred_by_hubla_*`.
- `src/lib/prosfec-server.ts`: `pick(serv?.linkPagamento) || pick(serv?.hublaLink)` na proposta pública; nova rota de webhook InfinityPay.
- `firestore.rules`: remove os dois matches obsoletos.
- Ao final: `bunx tsgo --noEmit` e build limpo.
