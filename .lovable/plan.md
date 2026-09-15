# Caça Leads — por que o "Buscar CNPJ" nunca encontra

## O que eu confirmei testando agora

A busca automática do CNPJ depende de ler os resultados de uma página de busca
pública (Yahoo). Testei essa chamada exatamente como o sistema faz:

- A busca responde com um redirecionamento para uma página de verificação anti-robô
  (nenhum resultado, nenhum CNPJ na resposta).
- Testei também Bing e DuckDuckGo: todos devolvem página de bloqueio, zero CNPJs.
- A base pública de busca por nome (Casa dos Dados) responde bloqueio por proteção
  Cloudflare.

Consequência: a descoberta automática **sempre volta vazia**, para qualquer
estabelecimento. Por isso a mensagem "Não localizamos automaticamente o CNPJ público
para este estabelecimento" aparece em 100% dos casos — não é um problema pontual de
um lead.

O que continua funcionando normalmente: quando o CNPJ é digitado, a consulta oficial
responde certo (testei a fonte pública de CNPJ: resposta 200 com os dados da empresa).
Ou seja, só o "adivinhar o CNPJ pelo nome" está quebrado.

## Solução proposta

Trocar a raspagem de buscador (morta) por uma cadeia de tentativas reais, nesta ordem,
parando na primeira que confirmar:

1. **CNPJ já visível** no nome, endereço ou site do estabelecimento (já existe hoje, mantém).
2. **Site do próprio estabelecimento** — o Caça Leads já recebe o site pelo Google.
   Ler a home e as páginas comuns de rodapé/contato e extrair o CNPJ.
3. **Busca com IA + pesquisa Google** usando a chave Gemini que o projeto já tem,
   pedindo apenas CNPJs candidatos (sem inventar dados da empresa).
4. **Confirmação obrigatória**: todo candidato passa por dígito verificador e é
   consultado na base oficial; só é aceito se a razão social/nome fantasia bater
   com o nome do estabelecimento. Nada é aceito "no chute".

Se nada confirmar, continua caindo no campo manual — que já existe e funciona — mas
com a mensagem ajustada para deixar claro que a Ficha Oficial sai na hora após digitar
o CNPJ, além de validar o número antes de consultar (hoje um CNPJ inválido só falha
depois da consulta).

## Detalhes técnicos

Arquivo principal: `src/lib/prosfec-server.ts`

- Substituir `discoverCnpjForBusiness` (linhas ~397-444): remover o bloco Yahoo e
  implementar as etapas 2 e 3 com timeouts curtos e execução em série, com log de
  qual etapa resolveu.
- Etapa site: `fetch` do `websiteUri` + `/contato`, `/sobre`, `/institucional`,
  limite de tamanho de resposta, `AbortSignal.timeout`, ignorar falhas silenciosamente.
- Etapa IA: chamada ao Gemini com `google_search`, reaproveitando o padrão de modelos
  já usado no arquivo (`gemini-3.6-flash` primeiro); saída restrita a lista de CNPJs.
- Nova validação de dígito verificador no servidor antes de consultar a base oficial,
  e comparação de similaridade entre `nomeEmpresa` e `razao_social`/`nome_fantasia`
  para aceitar o candidato (`/api/consulta-cnpj`, linhas ~473-502).
- Cache em memória já existente é mantido; incluir cache negativo curto por
  nome+cidade para não repetir a cadeia toda a cada clique.

Frontend `src/components/PartnerPortal.tsx` (`handleFetchCnpj`, ~2876-2955):
apenas ajuste de texto do aviso e validação do CNPJ digitado antes de enviar.
Nenhuma mudança em Firestore, regras, permissões ou no restante do Caça Leads.

## Observação adicional encontrada na varredura

Um dos modelos de IA usados como alternativa no projeto (`gemini-2.5-flash`) foi
descontinuado pelo Google e responde erro 404. Hoje ele não é o primeiro da lista, então
não quebra nada, mas posso limpar essa alternativa morta junto — me diga se quer.
