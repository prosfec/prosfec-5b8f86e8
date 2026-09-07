# Plano: Sidebar real de tela cheia no Portal do Parceiro

## Objetivo
Substituir o layout de "blocos flutuantes" do `PartnerPortal.tsx` por uma estrutura idêntica à do `AdminDashboard.tsx`: sidebar fixa tocando topo e rodapé + área de conteúdo rolável à direita. Apenas JSX/classes serão alterados; toda a lógica (useState, handlers, chamadas Firebase/API, helpers de WhatsApp) permanece intacta.

## Estrutura atual (diagnóstico)
- Raiz: `soft-ui min-h-screen flex flex-col` com header verde full-width e `<main className="max-w-7xl mx-auto">` — causa do efeito flutuante.
- A "navegação" é um cartão solto dentro de `flex flex-col lg:flex-row gap-6` (linha 4709), junto do cartão de perfil, usando truques de `order-*` e `contents` para mobile.
- Cartão "Seu Link Exclusivo" (linha 4909) está com fundo `bg-[#0A3D2E]` verde-escuro.

## Estrutura alvo (espelhando AdminDashboard)

```text
<div flex h-screen overflow-hidden bg-slate-50>          (somente visão autenticada)
  <aside w-72 h-full bg-white border-r flex flex-col>    (desktop: fixa, do topo ao rodapé)
    Branding PROSFEC + cartão de Perfil (mantém verde-escuro, como destaque)
    Navegação (Dashboard, Leads, Caça Leads, Equipe, Serviços, Perfil, Contrato)
    Rodapé da sidebar: botões Sair / Voltar ao Site
  <div flex-1 flex flex-col h-full min-w-0>
    <header sticky top-0 bg-white border-b>              (sino de notificações + hamburger mobile)
    <main flex-1 overflow-y-auto p-4 md:p-8>
      Cartão Link Exclusivo (agora branco)
      Conteúdo das abas (inalterado)
```

## Ação 1 — Sidebar real
- O branch autenticado passa a renderizar `<div className="flex h-screen overflow-hidden bg-slate-50">`.
- A coluna esquerda vira `<aside className="hidden lg:flex w-72 h-full bg-white border-r border-gray-200 flex-col shrink-0">`, recebendo (nesta ordem): logotipo, cartão de perfil (verde-escuro preservado), menu de navegação e, no rodapé, os botões Sair/Voltar ao Site.
- Mobile: a sidebar vira drawer (overlay + painel `w-72` deslizante), aberto por um botão hamburger no header — mesmo padrão já usado no AdminDashboard. Remove os truques de `order-*`/`contents` da coluna antiga.

## Ação 2 — Área de conteúdo
- Coluna direita: `<div className="flex-1 flex flex-col h-full min-w-0">` contendo o header (agora branco, sticky, com sino de notificações e hamburger mobile) e `<main className="flex-1 overflow-y-auto p-4 md:p-8">` com todo o conteúdo das abas.
- As telas não autenticadas (login/cadastro, bloqueio, carregando) continuam centralizadas como hoje — fora do layout de sidebar.

## Ação 3 — Fim dos cartões verde-escuros
- Cartão "Seu Link Exclusivo": `bg-white text-slate-800 rounded-2xl shadow-sm border border-slate-200`; o campo da URL vira caixa clara (`bg-slate-50`); o verde `#00A86B` fica apenas no botão "Copiar Link".
- Demais blocos internos ainda preenchidos em verde-escuro (ex.: linhas 5320/5328 no Dashboard, 6291–6299 e 6375 em outras abas) serão convertidos para branco/`bg-slate-50` com borda sutil.
- Exceção mantida: o cartão de Perfil do parceiro permanece verde-escuro como elemento de destaque na sidebar.

## O que NÃO muda
- Nenhuma lógica, estado, handler `onClick`, chamada Firebase/API, cálculo de comissão ou helper de WhatsApp.
- `AdminDashboard.tsx` e demais páginas não são tocados.

## Verificação
- `bunx tsgo --noEmit` e `bun run build`.
- Conferência visual (desktop e mobile) das abas Dashboard, Meus Leads e Caça Leads.
