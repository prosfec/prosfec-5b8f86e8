# Corrigir o salvamento da Ficha de Sócios na simulação pública

## Problema confirmado

Na tela de resultado da simulação, o formulário de sócios grava direto no banco pelo navegador (`updateDoc` em `src/components/Simulador.tsx`, linha 864). Como o visitante não está autenticado, as regras bloqueiam a escrita e aparece "Erro ao salvar os dados no sistema".

A gravação da simulação já foi migrada para uma rota pública de servidor; a ficha de sócios ficou para trás.

## O que será feito

1. Nova rota pública no servidor: `POST /api/public/leads/socios`, com os mesmos privilégios usados pela rota de simulação.
   - Recebe: identificador do lead, lista de sócios e endereço do sócio principal.
   - Valida: identificador válido, nome preenchido e CPF com 11 dígitos (checagem de dígito verificador) em cada sócio; limite de 2 sócios; limpeza de campos vazios.
   - Grava apenas os campos permitidos: `socios`, `enderecoSocioPrincipal`, `etapa: 3`, `status: "em atendimento"`, `updated_at`.
   - Só grava se o lead existir; recusa criação de documentos novos por essa rota.
   - Nunca sobrescreve dados financeiros, comissões, documentos ou diagnóstico.
2. No formulário de sócios, remover a chamada direta ao banco e enviar os dados para a nova rota, mantendo as validações de CPF já existentes no navegador.
3. Tratamento de erro: mensagem amigável mantida, mas registrando o motivo real no console; sucesso continua exibindo a confirmação atual e o webhook de etapa concluída.

## Detalhes técnicos

- `src/lib/prosfec-server.ts`: rota registrada junto às demais `/api/public/leads/*`, reutilizando `sanitizeLeadId`, `getDocRest`, `patchDocRest` e `cleanForFirestore`. Resposta sempre JSON (`{ success, error? }`).
- `src/components/Simulador.tsx`: `handleSociosSubmit` passa a usar `fetch` com timeout curto e leitura defensiva do JSON; imports de `doc/updateDoc` removidos se ficarem sem uso.
- Sem alterações em regras do banco, autenticação, layout, comissões ou nos painéis Admin/Parceiro.

## Validação

- Verificação de tipos e build.
- Simulação de ponta a ponta pela página inicial: concluir a simulação, preencher a ficha de sócios e confirmar que o lead avança para a etapa 3 com status "em atendimento".
