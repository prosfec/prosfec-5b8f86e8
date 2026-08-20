# Plano de redesign dos painéis PROSFEC

## Contexto

O usuário escolheu a direção **Luminous Glass Enterprise** para o redesign do painel administrativo e da área do parceiro. Estilo: Enterprise Clean. Paleta: #fcfdfd, #ffffff, #02241a, #00A86B. Tipografia: Space Grotesk (títulos) + DM Sans (corpo). Layout do admin: topnav + cards.

## Escopo

Aplicar a nova identidade visual somente nos componentes de interface dos painéis de serviço, sem alterar regras de negócio, autenticação, rotas ou lógica de dados:

- `src/components/AdminDashboard.tsx` — login admin + dashboard admin
- `src/components/PartnerPortal.tsx` — login parceiro + dashboard parceiro
- `src/routes/__root.tsx` — adicionar Google Fonts (Space Grotesk + DM Sans)
- `src/styles.css` — adicionar tokens semânticos de cor, fonte, sombra e borda

## Passos

1. **Tokens de design em `src/styles.css`**
   - Adicionar variáveis CSS para as cores escolhidas: `--prosfec-bg`, `--prosfec-card`, `--prosfec-primary`, `--prosfec-accent`.
   - Adicionar tokens de sombra: `--shadow-card`, `--shadow-elevated`, `--shadow-glow`.
   - Adicionar tokens de tipografia: `--font-heading` (Space Grotesk), `--font-body` (DM Sans).
   - Garantir compatibilidade com o tema existente do projeto, sem quebrar componentes shadcn.

2. **Carregamento de fontes em `src/routes/__root.tsx`**
   - Incluir `<link>` para Google Fonts (preconnect + stylesheet) no `head()`.
   - Usar as famílias `Space Grotesk` (500, 700) e `DM Sans` (400, 500, 700).

3. **Redesign de `src/components/AdminDashboard.tsx`**
   - **Login admin:** manter o card centralizado, mas aplicar fundo sutil com gradiente/clara, tipografia Space Grotesk no título, inputs arredondados, botão com sombra glow verde.
   - **Dashboard admin:** substituir sidebar escura por topnav fixo com backdrop-blur, logotipo PROSFEC, links de navegação e avatar do usuário.
   - Adicionar grid de KPIs (4 cards) com ícones, variação percentual e hover elevado.
   - Transformar a tabela de leads em card arredondado com header, filtros, status badges com bolinha colorida, hover nas linhas e paginação limpa.
   - Preservar todas as funcionalidades atuais: filtros, exportação, modais, sincronização, sair.

4. **Redesign de `src/components/PartnerPortal.tsx`**
   - **Login parceiro:** aplicar layout clean com card centralizado/branco, fundo claro sutil, tipografia premium, botão verde com sombra.
   - **Dashboard parceiro:** usar topnav leve, KPIs em cards, cards de serviço (Pronampe, FINEP, BNDES, Caça Leads) com ícones, sombras e hover.
   - Manter todos os formulários, simuladores e integrações existentes.

5. **Verificação**
   - Rodar build de desenvolvimento (`build:dev` ou `bun run dev`) para confirmar ausência de erros.
   - Capturar screenshots do admin e do portal do parceiro para validar a aplicação visual.

## Fora de escopo

- Não alterar `firestore.rules`, autenticação Firebase, lógica de server functions, endpoints de API ou segurança nesse plano.
- Não adicionar novas funcionalidades de produto.
- Não migrar dados ou configurações manuais do Firebase Console.

## Resultado esperado

Painéis admin e parceiro com aparência de SaaS enterprise premium, hierarquia visual clara, espaçamento consistente e micro-interações suaves, mantendo 100% das funcionalidades atuais.
