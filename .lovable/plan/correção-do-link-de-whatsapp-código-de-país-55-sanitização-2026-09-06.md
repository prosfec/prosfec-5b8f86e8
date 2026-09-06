# Correção do link de WhatsApp (código de país 55 + sanitização)

## Problema confirmado

O botão "Iniciar Prospecção no WhatsApp" do Caça Leads (`PartnerPortal.tsx`, ~linha 8158) monta o link apenas com `place.telefone.replace(/\D/g, "")` — sem garantir o prefixo `55`. O mesmo padrão frágil se repete em ~25 pontos do sistema (Admin, Ficha do Lead, Footer, Simulador, etc.), e alguns locais já fazem `"55" + numero` à força (`wa.me/55${...}` nas linhas 8946/9069/11071 do PartnerPortal e 561 de FichaRatingCreditoForm), o que gera número duplicado (`5555...`) quando o dado já vem com DDI.

## Solução

### 1. Helper central em `src/utils.ts`

Criar duas funções exportadas:

```ts
// Normaliza telefone BR para formato WhatsApp: só dígitos, com DDI 55 garantido
export function formatWhatsAppPhone(phone: string): string {
  const clean = (phone || "").replace(/\D/g, "");
  if (!clean) return "";
  return clean.startsWith("55") ? clean : `55${clean}`;
}

// Monta URL oficial wa.me com mensagem codificada (opcional)
export function buildWhatsAppUrl(phone: string, message?: string): string {
  const num = formatWhatsAppPhone(phone);
  if (!num) return "#";
  return `https://wa.me/${num}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}
```

### 2. Aplicar o helper em todos os pontos de WhatsApp

Substituir as montagens manuais de URL por `buildWhatsAppUrl(...)`:

- **`PartnerPortal.tsx`** — Caça Leads (~7427 e ~8158, os dois botões de prospecção), contato com membros da equipe (~8946, ~9069, ~11071, removendo o `55` fixo), subcontas (~9618).
- **`AdminDashboard.tsx`** — todos os botões de WhatsApp de leads e parceiros (~3339, ~3597, ~3760, ~4060, ~4255, ~5952, ~6845, ~6938, ~7257, ~7417, ~7448).
- **`FichaRatingCreditoForm.tsx`** (~561), **`FichaRatingAdmViewer.tsx`** (~246), **`Footer.tsx`** (~133), **`App.tsx`** (~504, ~560, ~595), **`PlanSelectionView.tsx`** (~110), **`Simulador.tsx`** (~959, ~988) — quando o telefone for dinâmico.
- Números fixos já completos (ex: `5598987353253` da PROSFEC) permanecem como estão.

### 3. Validação

- `tsgo --noEmit` + build.
- Teste no preview: abrir Caça Leads e conferir que o href do botão gera `https://wa.me/55...` mesmo com telefone no formato `(98) 98765-4321` ou já com `55`.

## Escopo

Somente a geração dos links de WhatsApp. Nenhuma mudança de layout, regra de negócio ou backend.
