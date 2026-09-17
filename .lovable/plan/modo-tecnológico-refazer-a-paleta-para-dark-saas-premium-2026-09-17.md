# Modo Tecnológico: refazer a paleta para "Dark SaaS Premium"

O tema escuro atual ficou azulado, com textos apagados e um bloco branco em volta do menu lateral. A correção troca toda a paleta escura para preto/grafite (zinc) com alto contraste, no padrão Linear/Vercel/Stripe.

Tudo continua sendo apenas visual e apenas no Portal do Parceiro. Modo claro, Home, painel ADM e páginas públicas não mudam. Nenhuma regra de negócio, rota ou dado é alterado.

## O que muda

1. Fundos
  - Fundo geral do portal: preto profundo (zinc-950).
  - Cartões e painéis: grafite (zinc-900), sem sombra, apenas uma borda ultrafina translúcida (branco 10%).
2. Menu lateral
  - Sai o bloco branco que envolve os links de navegação: o contêiner fica transparente, sem borda e sem sombra.
  - Item ativo: verde neon suave (fundo verde translúcido + texto verde claro), no lugar do verde sólido atual.
  - Itens inativos: cinza claro, com texto branco e fundo levemente claro ao passar o mouse.
  - Ícones e setas do menu acompanham o mesmo cinza claro.
3. Tipografia (fim das letras apagadas)
  - Títulos, nomes e valores (saldo, comissão): branco puro.
  - Rótulos, descrições e subtítulos: cinza claro brilhante (zinc-400).
  - Textos muito discretos hoje (cinza fraco): sobem para zinc-500, nunca abaixo disso.
  - Avisos coloridos ficam luminosos: verde claro, âmbar claro, vermelho claro, azul claro — inclusive quando o texto está sobre fundo colorido suave.
4. Botões e campos
  - Botões secundários (Copiar, Sincronizar, Via Master): fundo grafite, texto branco, borda branca 10%, hover mais claro.
  - Botões principais verdes: verde vivo com texto branco, hover ainda mais claro.
  - Campos de texto, seletores e áreas de texto: fundo preto, borda branca 10%, texto branco, placeholder cinza médio.
5. Nada de tons "slate"/"gray" no escuro — a escala usada passa a ser cinza-chumbo (zinc) em todo o tema.

## Detalhes técnicos

Arquivo único: `src/styles.css`, bloco `.dark .soft-ui` (linhas ~641-769), reescrito por completo.

- Superfícies: raiz `#09090b`; `bg-white`/`bg-slate-50`/`bg-slate-100` → `#18181b` + `box-shadow: none` + `border: 1px solid rgba(255,255,255,0.10)`.
- `aside` → `#09090b` com borda direita branca 10%.
- Nova regra `.dark .soft-ui nav .soft-card` → `background: transparent; border: none; box-shadow: none; padding` preservado.
- `.soft-nav-item-active` → `background: rgba(16,185,129,0.10); color: #34d399;` (inclusive ícones/setas internos via `color: inherit`).
- `.soft-nav-item` inativo → `color:#a1a1aa`; hover `background: rgba(255,255,255,0.05); color:#fff`.
- Texto: `text-slate-9/8/7` e `text-gray-9/8` → `#ffffff`; `text-slate-6/5` → `#a1a1aa`; `text-slate-4/3` → `#71717a`.
- Acentos: `text-emerald-*` → `#34d399`; `text-amber-*`/`text-orange-*` → `#fbbf24`; `text-rose-*`/`text-red-*` → `#fb7185`; `text-blue-*`/`text-indigo-*` → `#60a5fa`.
- Botões: `bg-emerald-5/6/7` → `#10b981`, hover `#34d399`, texto branco. Secundários (`bg-white`/`bg-slate-100` em `button`) → `#27272a`, borda branca 10%, hover `#3f3f46`.
- Tonalidades `bg-*-50` permanecem como vidro colorido translúcido (12%) com borda da mesma cor a 20%.
- Inputs/select/textarea → `#09090b`, borda `rgba(255,255,255,0.10)`, texto branco, placeholder `#71717a`; `option` `#18181b`; autofill preto/branco.
- Cartões já escuros no claro (perfil, `#0A3D2E`) mantêm o halo verde.
- A regra mobile no fim do arquivo não é tocada.

Após a edição: typecheck e build.  
  
Plano 100% aprovado, excelente leitura estética e técnica! A paleta Zinc (#09090b e #18181b) combinada com as bordas translúcidas de 10% é exatamente o padrão Vercel/Linear que procuramos. A solução de remapear as escalas de Slate/Gray para Zinc centralmente no `styles.css` e deixar o fundo do nav transparente foi brilhante. Pode mandar bala na execução!