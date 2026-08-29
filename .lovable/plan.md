# Etapa final — Remoção completa do Portal do Cliente

Migração para o modelo 100% B2B Concierge: o cliente final deixa de ter qualquer interface, link ou credencial no sistema. Todo o atendimento passa a acontecer dentro do PartnerPortal / Admin.

## O que será removido

### 1. Páginas e componentes do cliente
- `src/components/TrackingPortal.tsx` (portal completo: login, primeiro acesso, timeline do cliente).
- `src/components/FichaRatingCreditoForm.tsx` (só era usado dentro do TrackingPortal).
- `src/lib/portal-save.ts` (gravação via proxy usada só pelo portal).
- `src/routes/portal-cliente.tsx` (rota `/portal-cliente`).

### 2. Redirecionamentos legados
- Em `src/App.tsx`: remover o import do TrackingPortal, a renderização condicional do portal e o redirect dos parâmetros antigos (`?acompanhamento=`, `?tracking=`, `?status=`, `?leadTrack=`).

### 3. Links de acompanhamento (todos os blocos)
- `src/components/Simulador.tsx`: blocos de "link de acompanhamento em tempo real" após criar lead e ao detectar CNPJ já cadastrado — substituídos por uma mensagem de que um consultor entrará em contato.
- `src/components/PartnerPortal.tsx`: campos de copiar link do portal exibidos após o cadastro do lead (2 ocorrências).
- `src/components/AdminDashboard.tsx`: geração/cópia do link, botão "abrir portal" na lista de leads e o link dentro da mensagem de WhatsApp.
- `src/components/FichaRatingAdmViewer.tsx`: link do portal na mensagem enviada ao cliente.
- `src/components/LeadWorkspaceModal.tsx`: campo de link do portal do cliente.

### 4. UI de senha do cliente
- Remover nos painéis os campos de definir/redefinir senha do portal e os badges "Senha cadastrada / Primeiro acesso pendente" (`AdminDashboard.tsx`, e equivalentes no PartnerPortal, se houver).
- Os dados já gravados no banco (`clienteSenhaHash`, `clienteAuthUid`) **não** são apagados — nenhuma migração de dados neste bloco.

### 5. Rotas de API do backend (`src/lib/prosfec-server.ts`)
- `POST /api/auth/cliente-login` (a que está gerando erro em produção)
- `POST /api/auth/cliente-provision`
- `POST /api/portal/buscar-lead`
- `POST /api/portal/salvar-lead`
- `GET /api/portal/precos`
- Helpers de hash/verificação de senha de cliente que ficarem sem uso após a remoção.

### 6. Header / Footer
- Verificar e remover qualquer link para área do cliente. Hoje o Footer só tem o link `/admin` e a Navbar só tem "Área do Parceiro" — ambos permanecem.

## Detalhes técnicos
- `src/routeTree.gen.ts` é gerado automaticamente: será regenerado pelo build ao apagar `src/routes/portal-cliente.tsx`.
- `src/routes/sitemap[.]xml.ts` não lista `/portal-cliente`; nada a fazer lá.
- As `firestore.rules` continuam como estão nesta etapa (as regras de cliente ficam inertes). Se quiser limpá-las depois, faço em um bloco separado.
- Após as remoções: typecheck + build, e verificação de que Simulador, PartnerPortal, AdminDashboard e LeadWorkspaceModal continuam renderizando sem imports quebrados.

## O que testar depois
1. Home e Simulador: criar/simular um lead e confirmar que não aparece mais nenhum link de acompanhamento.
2. `/portal-cliente` deve retornar 404.
3. PartnerPortal: cadastrar lead e abrir o Workspace (aba Concierge inclusive) sem erros.
4. Admin: abrir lead, checar que a seção de senha do cliente sumiu e o WhatsApp não envia link do portal.
