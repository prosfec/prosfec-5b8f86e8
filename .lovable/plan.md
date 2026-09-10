# Corrigir a quebra de tela ao concluir a simulação por link de indicação

## O que eu já verifiquei

- Abrir a home pelo link de indicação (`?ref=...`), tanto no site publicado quanto no ambiente de teste, **não** quebra a tela: a página carrega normal e sem erro no console.
- A leitura do parâmetro do link e a busca dos dados do parceiro já estão protegidas: se o parceiro não existir ou a busca falhar, o erro é capturado e o site segue com o número institucional.
- Você indicou que a quebra acontece **ao enviar / ver o resultado** da simulação, e só no site publicado.

Ou seja, o problema não está na abertura do link, e sim na **tela de resultado**, quando ela passa a exibir informações ligadas ao consultor (nome, WhatsApp, faixa de planos, código de rastreio, ficha dos sócios).

Ainda **não** está confirmado qual leitura exata provoca a quebra, porque não há registro do erro guardado. Por isso o primeiro passo é reproduzir e capturar a mensagem real.

## Passos

### 1. Reproduzir e capturar o erro (primeiro)
Percorrer a simulação inteira usando um link de indicação real, até a tela de resultado, e registrar a mensagem exata do erro e o ponto que quebra. Só depois aplicar as correções abaixo, ajustadas ao que for encontrado.

### 2. Blindar a tela de resultado
- Tratar todos os dados do consultor (nome, WhatsApp, identificador) como possivelmente ausentes, com uso de valores neutros e do atendimento institucional quando faltarem.
- Garantir que o resultado da simulação, o código de rastreio, o porte da empresa e a lista de sócios sejam exibidos mesmo quando algum campo vier vazio, em vez de interromper a tela.
- Garantir que o bloco de planos e o botão de WhatsApp funcionem com ou sem consultor vinculado.

### 3. Rede de proteção na simulação
- Envolver a tela de resultado em uma proteção própria: se algo falhar ali, o lead vê um aviso amigável com opção de falar no WhatsApp e refazer, em vez da tela "Esta página não carregou".
- Garantir que uma falha ao gravar os dados no banco não derrube a exibição do resultado.

### 4. Validar
Refazer a simulação completa por link de indicação e sem link, conferindo que o resultado aparece nos dois casos, e conferir que não sobra nenhum erro no console.

## Detalhes técnicos

- `src/components/Simulador.tsx`: seção de resultado (a partir de ~2400) — `referredByPartnerNome`/`referredByPartnerWhatsapp` chegam como `string | null` e são repassados a `PlanSelectionView`, que tipa `string | undefined`; revisar `simulationResult.*` (ex.: `nivelPreparacao.toUpperCase()`), `createdLeadId` e os acessos a `formData`/sócios sem proteção. Adicionar um error boundary local ao redor do bloco de resultado.
- `src/components/PlanSelectionView.tsx` e `src/components/LeadConciergeTracker.tsx`: normalizar props ausentes.
- `src/App.tsx`: manter o comportamento atual de captura do `ref` e o fallback institucional; sem mudanças de regra de negócio.
- Sem alterações em autenticação, comissões, regras do banco ou layout.
