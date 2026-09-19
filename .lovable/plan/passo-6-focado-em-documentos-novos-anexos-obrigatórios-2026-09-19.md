# Passo 6 focado em documentos + novos anexos obrigatórios

## 1. Passo 6 muda de cara quando a empresa é apta

Quando o lead estiver marcado como **"Empresa apta para análise de crédito bancária"** (selo já existente, definido pelo ADM):

- O título do Passo 6 passa a ser **"Ficha Documental & Projeto Empresarial"**, com texto de apoio focado em coletar a documentação e lançar a proposta (sem falar em melhoria de perfil).
- O **Checklist de Estruturação & Adequação (PROSFEC IA)** deixa de ser exibido, junto com sua barra de progresso de sub-etapas.
- Continuam visíveis: a **Ficha de Rating & Documentos do Cliente**, a **Simulação & Proposta de Linha Governamental** e a **Linha do Tempo & Histórico Auditável**.
- O indicador "Progresso da Estruturação" do cabeçalho passa a mostrar o progresso da ficha documental nesse modo.

Quando o lead **não** estiver apto, o Passo 6 continua exatamente como está hoje, com título "Estruturação da Operação & Melhoria de Perfil de Crédito" e o checklist completo.

Nada é apagado: as sub-etapas gravadas continuam no banco e voltam a aparecer se o selo de aptidão for removido.

## 2. Novos documentos na ficha (para os dois fluxos)

### Anexos Obrigatórios da Empresa
- **PGDAS — Declaração do mês atual e recibo (Simples Nacional)** — opcional
- **DEFIS — Declaração e recibo (Simples Nacional)** — opcional
- **Extrato Bancário PJ — últimos 90 dias** — obrigatório

Cada um com campo de link individual, mesmo padrão dos atuais, com a orientação de colar o link que abre o PDF liberado para visualização. Os opcionais ficam marcados como "Opcional".

### Documentos por sócio
Na aba de cada sócio cadastrado, dois campos novos, ambos obrigatórios:
- **IRPF — Declaração**
- **IRPF — Recibo de entrega**

## 3. Progresso da ficha

O percentual de preenchimento passa a contar também o Extrato Bancário PJ e, por sócio, a declaração e o recibo de IRPF. PGDAS e DEFIS não entram na conta por serem opcionais. Fichas antigas simplesmente aparecem com percentual menor até os novos links serem informados — nenhum dado existente é alterado.

## 4. Conferência

- Abrir o Passo 6 de um lead apto e de um lead não apto, confirmando título, seções exibidas e o funcionamento da proposta.
- Preencher, abrir e limpar os novos links em computador e celular.
- Confirmar que salvar rascunho e enviar a ficha não apagam links já existentes.

## Escopo técnico

- `src/types.ts`: novos campos em `DadosRatingCNPJ` (`pgdasPdf`, `defisPdf`, `extratoBancarioPjPdf`) e em `SocioRatingCPF` (`irpfDeclaracao`, `irpfRecibo`).
- `src/components/FichaRatingCreditoForm.tsx`: novos `DocLinkInput` nas duas seções e inclusão dos obrigatórios em `calculateProgress`.
- `src/components/LeadWorkspaceModal.tsx`: leitura de `lead.aptoMesaCredito` no bloco do Passo 6 para trocar título/descrição, ocultar a Seção 1 (checklist) e ajustar o indicador do cabeçalho.
- Sem mudanças em regras, gravação, comissões, etapas ou no Catálogo de Serviços.
