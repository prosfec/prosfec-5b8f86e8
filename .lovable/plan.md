# Página inicial 100% escura (Full Dark SaaS), compacta e sem gambiarra de CSS

Levar o visual escuro do topo para todo o restante da página pública (Segurança, Soluções, Momento da Empresa, Diagnóstico, Como Atuamos, Benefícios, Soluções Específicas, Simulador, Parceiros, FAQ, Chamada final, Rodapé e barra fixa do celular).

Mudança puramente estética: textos, links, ordem das seções, SEO, animações, responsividade e todo o funcionamento do simulador ficam intactos.

## Exigências técnicas incorporadas

1. **Sem sobrescrita de utilitários no CSS.** As cores mudam **no JSX de cada componente** (`bg-white` → `bg-[#0B0F14]`, `text-slate-600` → `text-zinc-400`, etc.). O `styles.css` só recebe o que utilitário não resolve: `:-webkit-autofill`, `option` e o bloco `prefers-reduced-motion`. Os remapeamentos genéricos de `bg-*`/`text-*` hoje existentes no escopo `.home-premium` serão **removidos**, não ampliados.
2. **Logotipos em fundo escuro.** Auditoria dos componentes da Home: não há tags `<img>` de logotipos institucionais — as marcas aparecem como texto e ícones SVG, que passam a herdar cor clara. Se algum `<img>` de logotipo for encontrado durante a execução, recebe `filter invert grayscale brightness-200 opacity-70 hover:opacity-100`.
3. **Autofill e dropdowns do simulador.** Regras para `input:-webkit-autofill` (sombra interna escura, texto branco, `transition` longa) e `option { background:#18181b; color:#fff }`, escopadas em `.home-simulator`, sem afetar o simulador aberto em janela dentro dos painéis internos.
4. **Barra fixa do celular.** Passa a ter `bg-[#0B0F14]/80 backdrop-blur-md border-t border-white/10` no lugar de `bg-white border-gray-100 shadow-2xl`, mantendo os dois botões e o comportamento atuais.

## O que muda visualmente

- **Fundo único** `#0B0F14` em todas as seções; separações por linha branca a 10%, sem faixas claras.
- **Compactação**: `py-16 md:py-24` → `py-12 md:py-16`; cabeçalhos com `mb-8`; grades com `gap-4`/`gap-6`.
- **Cartões**: `bg-white/[0.02]` + `border border-white/10`, sem sombra; hover mantém a elevação leve com borda esverdeada.
- **Tipografia**: títulos `text-white font-bold tracking-tight`; textos `text-zinc-400`; rótulos superiores `text-emerald-400 text-xs font-bold uppercase tracking-[0.2em]`; etiquetas e ícones ajustados.
- **Simulador**: caixa `bg-zinc-900/50 border border-white/10`; campos `bg-zinc-950 border-white/10 text-white placeholder:text-zinc-600 focus:ring-emerald-500`; barra de progresso e etapas preservadas.
- **FAQ**: sem caixas — fundo transparente, cada pergunta com `border-b border-white/10`, pergunta `text-zinc-200`, resposta `text-zinc-400`.
- **Rodapé e janelas de Termos/Privacidade** alinhados ao mesmo preto com bordas translúcidas e texto legível.

## Arquivos

`src/App.tsx` (raiz, wrapper do simulador, barra fixa mobile), `Seguranca.tsx`, `Pilares.tsx`, `MomentoEmpresa.tsx`, `DiagnosticoSection.tsx`, `ComoFunciona.tsx`, `Beneficios.tsx`, `SolucoesEspecificas.tsx`, `Parceiros.tsx`, `FAQ.tsx`, `CTAFinal.tsx`, `Footer.tsx`, `Simulador.tsx` (somente ramo `!isModalMode`), e limpeza + regras pontuais em `src/styles.css`.

Nada de lógica, estado, Firebase, rotas ou `head()` é alterado.

## Validação

- Typecheck e build.
- Captura em desktop e celular: topo, todas as seções, simulador em uso (incluindo um campo preenchido pelo autofill e um dropdown aberto), FAQ aberto, rodapé e barra fixa — conferindo ausência de faixas claras, textos apagados e rolagem horizontal.
