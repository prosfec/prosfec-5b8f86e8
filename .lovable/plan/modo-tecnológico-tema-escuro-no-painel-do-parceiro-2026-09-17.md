# Modo Tecnológico (tema escuro) no Painel do Parceiro

Botão para alternar entre "Claro" e "Tecnológico" no painel do parceiro, com tema escuro sofisticado (grafite profundo, cartões cinza-escuro com borda sutil, verde mais luminoso). O modo claro atual continua sendo o padrão e não muda em nada.

## O que o parceiro vê

1. **Botão de alternância**
  - Fica no rodapé do menu lateral, logo acima de "Sair do Portal" (no celular, dentro da mesma gaveta).
  - Mostra ícone de Sol ("Claro") ou Lua ("Tecnológico") com o rótulo do modo atual.
  - A escolha é lembrada no navegador; ao voltar, o painel abre no mesmo modo. Sem preferência salva, abre no modo claro.
2. **Modo Tecnológico**
  - Fundo geral em grafite bem profundo; menu lateral e cabeçalho no mesmo tom escuro com linha divisória translúcida.
  - Cartões brancos passam a cinza-escuro com um anel sutil no lugar da sombra.
  - Números e títulos em branco gelo; rótulos e textos secundários em cinza claro.
  - Botões verdes ficam mais luminosos para contrastar.
  - Cartão do usuário e "Saldo Disponível" continuam escuros, ganhando um leve halo verde para se separarem do fundo.
  - Campos de texto, seleções e o campo do link de indicação ficam escuros com texto branco.
  - Tabelas, colunas do funil, etiquetas e janelas (modais) acompanham o mesmo tema.
3. **Alcance**
  - Só o painel do parceiro. Home, painel do ADM, páginas públicas de contrato e proposta permanecem como estão.
  - Nenhuma regra de negócio, saldo, comissão, consulta, rota ou chamada de dados é alterada; é apenas aparência.

## Detalhes técnicos

- `src/styles.css`: adicionar `@custom-variant dark (&:where(.dark, .dark *));` (Tailwind v4 usa `prefers-color-scheme` por padrão, então o variant por classe precisa ser declarado) e um bloco de overrides com escopo `.dark .soft-ui` — superfícies (`bg-white`, `bg-slate-50`), bordas, sombras neutralizadas em favor de `ring`, e correção das regras existentes que hoje forçam texto escuro em `input/select/textarea` e autofill claro.
- `src/components/PartnerPortal.tsx`:
  - estado `theme` (`"light" | "dark"`) com leitura/gravação em `localStorage` (`prosfec_partner_theme`) e efeito que adiciona/remove a classe `dark` em `document.documentElement`, removendo-a ao sair do painel para não vazar para outras páginas;
  - botão de alternância no rodapé da sidebar (desktop e gaveta mobile), usando `Sun`/`Moon` do lucide-react;
  - classes `dark:` nos blocos principais já mapeados: shell (4294), header (4297), sidebar/nav, cartão de perfil (4090), link de indicação (4880-4915), métricas (5106), saldos e comissões (5148-5290), Passo 6 (5292) e cartão "Saldo Disponível" (5797).
- Os ajustes de mobile (gaveta, kanban com rolagem por coluna, modais subindo da base, alvos de toque de 44px) e o layout compacto do desktop permanecem exatamente como estão.

## Validação

- `bunx tsgo --noEmit` e build limpo.
- Conferência visual do Dashboard do parceiro nos dois modos, verificando contraste de números, campos e botões.  
  
Plano 100% aprovado! Execução técnica impecável. A solução de isolar a classe `dark` no ciclo de vida do PartnerPortal para não vazar o tema para as rotas públicas foi genial, assim como a configuração do `@custom-variant dark` direto no CSS. Pode implementar a Aparência Tecnológica com essas especificações, garantindo o contraste perfeito dos textos e botões.