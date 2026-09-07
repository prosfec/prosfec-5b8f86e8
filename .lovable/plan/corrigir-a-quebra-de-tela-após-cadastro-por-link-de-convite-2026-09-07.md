# Corrigir a quebra de tela após cadastro por Link de Convite de Equipe

## Situação verificada hoje no sistema

- O link de convite gerado pelo Gestor é `...?cadastro=true&ref=<id-do-gestor>` (Portal do Parceiro, área de Equipe).
- A tela de cadastro já lê o `ref` da URL (e também `master`, `indicador`, `parceiro`) e já grava o vínculo: `parentPartnerId`, `parentPartnerNome`, `isTeamMember: true`, plano escolhido e teste de 3 dias.
- Após salvar, a tela mostra a mensagem de sucesso e só então oferece o botão de entrar no painel — a gravação já é aguardada antes disso.
- O painel do parceiro considera o usuário "logado" a partir do que ficou guardado no navegador (sessão). Se essa informação existir sem os dados completos do parceiro, várias partes da tela leem campos que não existem e a tela quebra.

O que ainda **não** está confirmado é qual leitura exata provoca a quebra, porque não há registro do erro guardado. Por isso o primeiro passo é reproduzir e capturar a mensagem.

## Passos

### 1. Reproduzir e capturar o erro (primeiro)
Simular um cadastro por link de convite em ambiente de teste e registrar a mensagem exata de erro no console, identificando o ponto que quebra. Só depois aplicar as correções abaixo, ajustadas ao que for encontrado.

### 2. Blindar os dados do convite durante o preenchimento
- Guardar o identificador do gestor assim que a página abre e mantê-lo até o envio, mesmo que a tela seja redesenhada.
- Manter uma cópia local (no navegador) do identificador do gestor vindo pelo link, para não se perder se a pessoa recarregar a página no meio do cadastro.
- Se o link trouxer um gestor que não existe mais, avisar em vez de criar um cadastro com vínculo inválido.

### 3. Garantir hierarquia completa e ordem correta
- Confirmar que o cadastro só é dado como concluído depois que a gravação termina de verdade.
- Garantir que, vindo de convite, o vínculo com o gestor e a marcação de membro de equipe sejam sempre gravados; caso o vínculo não possa ser gravado, o cadastro não avança silenciosamente.

### 4. Proteção contra tela quebrada no painel
- Se o sistema reconhecer a pessoa como logada mas ainda não tiver os dados do cadastro, mostrar uma tela de "Carregando…" em vez de tentar exibir o painel.
- Se os dados não vierem (cadastro ainda não encontrado), mostrar um aviso amigável com botão de tentar novamente / sair, em vez de tela em branco.
- Corrigir as leituras de campos que hoje assumem que o cadastro e o plano sempre existem.

## Detalhes técnicos

- `src/components/UserRegistrationForm.tsx`: manter `masterId` em estado + `localStorage`, validar existência do documento do gestor, e manter `await addDoc` antes de `setSuccess(true)`.
- `src/components/PartnerPortal.tsx`: o estado inicial vem de `sessionStorage` (`partner_authenticated` / `partner_data`); tratar `JSON.parse` com try/catch e adicionar guarda `isAuthenticated && !currentPartner` → tela de carregamento/erro antes do bloco autenticado (a partir da linha ~4228). Revisar os acessos diretos `currentPartner.x` e `partner.plano.toUpperCase()` sem proteção, além do retorno antecipado de `getSubscriptionStatus` que não devolve `expiryDate`/`isExempt`.
- Sem mudanças de layout, de regras de comissão ou de backend.
