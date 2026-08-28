# Pivot Prosfec: Portal do Cliente → Concierge B2B no PartnerPortal

## Regras do trabalho

1. Etapas pequenas, uma por vez. Ao final de cada uma, indicar o que testar antes de liberar a próxima.
2. NÃO remover componentes, rotas ou lógica do Portal do Cliente atual (`TrackingPortal.tsx`, `FichaRatingCreditoForm.tsx`, `/api/portal/buscar-lead`, etc.) até confirmação explícita separada — essa remoção será o último bloco, só depois que o Concierge no PartnerPortal estiver validado.
3. Reaproveitar o design system aprovado (tokens em `src/styles.css`, utilitários `panel`, `stat-tile`, `field-shell`, etc.) e o padrão de "link de nuvem" já usado em `FichaRatingCreditoForm.tsx`.
4. Usar UMA única biblioteca para geração de PDF (diagnóstico e contrato).

## Macro-etapas

```text
PartnerPortal
└── LeadWorkspaceModal / tela de detalhes do lead
    ├── Aba/seção "Concierge" com status/tracking do cliente
    ├── Aba/seção "Diagnóstico" reaproveitando FichaRatingCreditoForm
    ├── Aba/seção "Documentos e contratos" com link de nuvem + PDF
    └── Ações do consultor (solicitar documentos, aprovar, gerar PDF)
```

### Etapa 1 — Status/Tracking do cliente dentro do PartnerPortal
Criar uma nova seção na tela de detalhes do lead no PartnerPortal que mostre o mesmo status/etapas hoje visíveis no Portal do Cliente, mas sob a ótica do consultor/parceiro. Reaproveitar `LeadStepTimeline` e os dados do lead já carregados.

### Etapa 2 — Ficha de Rating/Diagnóstico no PartnerPortal
Incorporar a visualização/edição da ficha de rating na tela do lead, reutilizando `FichaRatingCreditoForm.tsx` (modo consultor). Manter o padrão de link de nuvem para documentos.

### Etapa 3 — Documentos e contratos
Centralizar os documentos do lead (anexos de rating, contratos, comprovantes) em uma única seção, com:
- links de nuvem para novos documentos,
- fallback para base64 legado,
- ações de aprovar/rejeitar/sinalizar link inacessível,
- geração de PDF unificada.

### Etapa 4 — Geração de PDF unificada
Escolher e configurar uma única biblioteca (a definir na Etapa 1 ou 2) para gerar PDF de diagnóstico e de contrato. Substituir eventuais abordagens divergentes existentes.

### Etapa 5 — Remoção do Portal do Cliente antigo
Só após validação completa no PartnerPortal: remover `TrackingPortal.tsx`, a rota `/portal-cliente`, as rotas `/api/portal/*` e atualizar links. Exige confirmação explícita.

## Próxima ação

Confirmar se a Etapa 1 (status/tracking do cliente no PartnerPortal) é o ponto de partida desejado, ou se prefere começar por outra etapa.
