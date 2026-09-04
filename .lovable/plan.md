# Correção de UI na Etapa 4 (Termos e Contratos) — LeadWorkspaceModal.tsx

## Objetivo
Limpar a interface da Etapa 4 no `src/components/LeadWorkspaceModal.tsx`, removendo código legado do Google Drive e deixando o foco exclusivamente no seletor de plano e na cópia do link público de assinatura nativa.

## Escopo
Alterar **apenas** o markup/estilo do `LeadWorkspaceModal.tsx`. Nenhuma lógica de negócio, handler, chamada de API, preço de estruturação, comissão ou integração será modificada.

## Ações

### 1. Remover código legado do Google Drive
- Excluir o bloco visual "LINK DA PASTA DO DRIVE (CONTRATOS ASSINADOS GOV.BR)" (input, botão "Salvar", badge "Anexado" e texto explicativo).
- Esse fluxo deixou de fazer sentido porque a assinatura agora é nativa no sistema.

### 2. Exibir o link de assinatura de forma destacada
- Manter o bloco "Definição de Contrato e Assinatura".
- Após a mensagem de sucesso "Definição salva. O link de assinatura já pode ser enviado ao cliente.", renderizar um `div` com:
  - Input readonly contendo `window.location.origin + '/contrato/' + lead.id`, com estilo visual desabilitado (`bg-slate-50`).
  - Botão "Copiar Link" ao lado direito.
  - Ao clicar, usar `navigator.clipboard.writeText` e trocar o texto do botão para "Copiado!" por 2 segundos (já implementado em `handleCopiarLinkContrato`).
- O link também deve continuar visível quando `lead.modeloContratacao` já existir no banco (condição já presente).

### 3. Limpeza visual do fluxo antigo
- Remover o bloco inferior cinza pontilhado com o texto: "O cliente assina este termo eletronicamente no link de acompanhamento no Passo 4...".
- Esse texto faz referência ao antigo Portal do Cliente, que foi removido do projeto.

### 4. Consistência de preço (verificação)
- Confirmar que a opção "Assessoria Essential" no select está com o valor de R$ 497,00/mês (conforme última revisão comercial aprovada). Se ainda estiver 597, ajustar para 497.

## Validação
- `bunx tsgo --noEmit` sem erros.
- Build OK.
- Verificar no preview que a Etapa 4 exibe apenas: seletor de plano + botão Salvar + link de assinatura (quando houver definição salva) + recibo de assinatura (quando já assinado) + botão de avanço para o Passo 5.
