# Atualização para a versão atual + melhorias para lançar hoje

## O que encontrei no arquivo enviado

O `prosfec-2.zip` é uma evolução real do projeto espelhado. Comparando arquivo a arquivo com o que está no ar aqui:

**Módulos totalmente novos (4.000+ linhas):**
- `AdminServicosContabilidadeTab.tsx` (697 linhas) — catálogo de serviços contábeis no admin
- `AdminPedidosContabilidadeTab.tsx` (886 linhas) — gestão de pedidos contábeis
- `PartnerServicosContabilidadeTab.tsx` (1.070 linhas) — contratação de serviços pelo parceiro
- `FintechDiagnosisView.tsx` (748 linhas) — nova visão de diagnóstico fintech
- `RTBAuditoriaViewerModal.tsx` (333 linhas) — visualizador de auditoria RTB
- `utils/markdownRenderer.tsx` (193 linhas) — renderização de markdown nos laudos

**Arquivos que cresceram bastante:**
- `AdminDashboard.tsx`: 7.723 → 8.281 linhas
- `PartnerPortal.tsx`: 11.562 → 12.245 linhas
- `LeadWorkspaceModal.tsx`: 4.297 → 4.661 linhas
- `TrackingPortal.tsx`: 3.254 → 3.480 linhas
- `FichaRatingCreditoForm.tsx`: 1.564 → 1.769 linhas
- `utils/serviceUtils.ts`: 139 → 437 linhas
- `types.ts`: 350 → 436 linhas

**Backend (`server.ts`: 2.115 → 2.812 linhas), rotas novas:**
- `POST /api/webhooks/lastlink` e `GET /api/webhooks/lastlink` — integração de pagamentos LastLink (o fluxo Hubla continua existindo em paralelo)
- `POST /api/contabilidade/solicitar-servico` — solicitação de serviço contábil
- `POST /api/credit/analise-rtb-ccb` — análise RTB/CCB por IA
- `POST /.netlify/functions/solicitar-servico-contabilidade` — alias Netlify

**Outros:** `firestore.rules` novo, `firestore.indexes.json`, scripts de seed e migração, e uma nova variável de ambiente `PLACES_API_KEY`.

## Fase 1 — Sincronizar o espelho com a versão nova

1. Copiar os 6 componentes/utilitários novos para `src/components/` e `src/utils/`, com `// @ts-nocheck` no topo (mesmo padrão dos demais arquivos espelhados).
2. Substituir os arquivos alterados pela versão nova: `App.tsx`, `AdminDashboard.tsx`, `PartnerPortal.tsx`, `LeadWorkspaceModal.tsx`, `TrackingPortal.tsx`, `FichaRatingCreditoForm.tsx`, `FichaRatingAdmViewer.tsx`, `FunnelAnalyticsDashboard.tsx`, `DiagnosticStep3Viewer.tsx`, `types.ts`, `utils.ts`, `utils/serviceUtils.ts`, `utils/commissionUtils.ts` e os demais componentes com diferenças menores.
3. Ajustar imports de caminho: no zip o `firebase.ts` importa `../firebase-applet-config.json`; aqui o arquivo fica em `src/`, então o import continua `./firebase-applet-config.json`.
4. Não trazer o `testConnection()` automático do novo `firebase.ts` — ele dispara uma leitura ao Firestore em todo carregamento e polui o console; manter a versão atual do arquivo.
5. Portar o `server.ts` novo (2.812 linhas) para `src/lib/prosfec-server.ts`, preservando as três melhorias de segurança já aplicadas aqui:
   - as rotas proxy `/api/proxy/integrador-catalogo`, `/api/proxy/supplier-consulta` e `/api/proxy/places-search`
   - a leitura de tokens exclusivamente por variável de ambiente (sem fallback hardcoded)
   - o `PartnerPortal.tsx` chamando os proxies locais em vez das APIs externas com chave no navegador
6. Adicionar `firestore.rules` e `firestore.indexes.json` na raiz do repositório para versionamento.
7. Cadastrar a nova variável `PLACES_API_KEY` como secret (usarei o valor presente no código enviado, ou o oficial se você preferir informar).
8. Verificar o build e subir o preview.

## Fase 2 — Redesign dos painéis (direção já aprovada)

Aplicar a direção **Luminous Glass Enterprise** escolhida anteriormente, agora sobre a base atualizada:

- Tokens de design em `src/styles.css`: paleta `#fcfdfd` / `#ffffff` / `#02241a` / `#00A86B`, sombras suaves (`--shadow-card`, `--shadow-elevated`), raio de canto generoso.
- Tipografia Space Grotesk (títulos) + DM Sans (corpo), carregada por `<link>` no `__root.tsx`.
- **Admin:** topnav fixo com backdrop-blur no lugar da sidebar escura, grid de KPIs com ícones e variação percentual, tabela de leads em card arredondado com filtros, badges de status com bolinha colorida, hover nas linhas e paginação limpa.
- **Parceiro:** login em card branco centralizado com fundo suave, dashboard com topnav leve, KPIs em cards e cards de serviço (Pronampe, FINEP, BNDES, Caça Leads, Contabilidade) com hover elevado.
- Aplicar o mesmo padrão visual às novas abas de Contabilidade, para que não destoem.
- Nenhuma regra de negócio, rota ou fluxo de dados é alterada nesta fase.

## Fase 3 — Checklist de lançamento

1. Testar ao vivo as rotas críticas: catálogo do integrador, saldo do fornecedor, consulta CNPJ, Places, diagnóstico IA, e as novas rotas de contabilidade e RTB/CCB.
2. Conferir os fluxos de webhook (Hubla e LastLink) respondendo corretamente.
3. Percorrer no navegador: home → login parceiro → dashboard → contratar serviço contábil → login admin → gestão de pedidos.
4. Revisar metadados de SEO da página inicial.
5. Publicar.

## Ponto de atenção sobre segurança

O `firestore.rules` que veio no zip tem `allow read, write: if true` em praticamente todas as coleções — incluindo `parceiros`, `leads`, `recargas` e `solicitacoes_comissao`. Na prática, qualquer pessoa com a chave pública do Firebase consegue ler e escrever nesses dados direto do navegador. As regras de contabilidade até chamam `isAdmin()`, mas terminam com `|| true`, o que anula a verificação.

Isso não bloqueia o lançamento de hoje, mas é a maior vulnerabilidade em aberto. Sugiro tratar logo depois, junto com a migração para Firebase Auth que discutimos antes. Se você quiser que eu já endureça as regras nesta rodada, me avise — mas isso exige que os parceiros existam no Firebase Auth, senão o acesso deles quebra.

## Decisão que preciso de você

O redesign da Fase 2 mexe visualmente em `AdminDashboard.tsx` e `PartnerPortal.tsx`, que juntos têm mais de 20 mil linhas e acabaram de ser atualizados. Fazer as duas fases hoje é possível, mas se o objetivo principal for colocar a versão nova no ar com segurança, o caminho mais rápido é Fase 1 + Fase 3 hoje e a Fase 2 em seguida. Aprove como está para fazer tudo, ou me diga se prefere adiar o redesign.
