# Etapa 1 — Ingestão fiel dos dados da RedeBE para a PROSFEC IA

Mudança exclusivamente de bastidores. Nada de tela, preço, contrato, cobrança, permissões ou regras comerciais muda.

## O que o código faz hoje (verificado)

- O resultado da consulta é gravado inteiro no registro da consulta (coleção `consultas_realizadas`, campo `resultado`), junto com documento, produto e data.
- Na geração do diagnóstico, o sistema busca as consultas pelo CNPJ da empresa e pelos CPFs dos sócios, ordena da mais recente para a mais antiga e usa até 6.
- Antes de mandar para a IA, o resultado passa por um **filtro agressivo** (`extractVitalReport`): só aceita nomes de campo que combinem com uma lista fixa de palavras (score, rating, protesto, dívida etc.), desce no máximo 4 níveis, corta listas nas 15 primeiras ocorrências, corta textos em 600 caracteres e descarta qualquer valor `0`, `false` ou vazio.
- Depois disso ainda há um corte por tamanho do texto final (20.000 caracteres na 1ª tentativa e 8.000 na 2ª), cortando o conteúdo pelo meio.

Ou seja: hoje a IA recebe um resumo filtrado, e informação real pode sumir silenciosamente — inclusive apontamentos com valor zero, ocorrências além da 15ª e blocos aninhados mais profundos.

## O que será feito

### 1. Normalizador dedicado da RedeBE

Criar no backend uma função `normalizeRedeBEResult()` que aceita os formatos que o sistema realmente pode ter guardado: objeto, lista, texto JSON, e conteúdo dentro de `data`, `resultado`, `retorno` ou `RedeBE`.

Ela organiza, **somente quando existirem de fato na resposta**: identificação (documento, nome, data, protocolo), score, rating, restrições, negativações, protestos, SCR/BACEN, cheques sem fundo, CADIN, ações judiciais e demais categorias encontradas — inclusive categorias não previstas na lista, que são preservadas como estão.

Regras rígidas: não inventar campo, não calcular score, não estimar rating, não criar valor derivado. Dado ausente fica ausente (`null`), nunca vira 0 nem "não informado".

### 2. Evidência original preservada

O retorno passa a ter duas partes: `normalized` (estrutura organizada) e `raw` (o resultado original, sem poda). Nenhum corte acontece antes da normalização — o filtro por lista de nomes deixa de ser o mecanismo que decide o que a IA vê.

### 3. A IA recebe os dois blocos

O contexto enviado passa a conter, por consulta, o bloco de dados normalizados e o bloco de resultado original como evidência, mantendo a identificação atual de SÓCIO/EMPRESA. O conteúdo comercial do prompt, as regras de risco cruzado e a recomendação de serviços permanecem exatamente como estão.

Onde ainda for preciso respeitar o limite técnico do modelo, a redução passa a ser feita por consultas inteiras e por profundidade da evidência bruta, na ordem da mais recente para a mais antiga — nunca cortando o texto no meio de um registro.

### 4. Regra de fidelidade acrescentada ao contexto

Acrescentar (sem substituir nada do prompt atual) a instrução: os dados da RedeBE são a fonte primária de evidência; não inventar, estimar ou completar valores ausentes; quando a informação não estiver presente, informar que não foi identificada; os dados normalizados devem ser conferidos contra a evidência original.

### 5. Registros técnicos de conferência

Registrar apenas no servidor, sem documento completo, token ou dado pessoal: consultas localizadas e quantas foram usadas, tamanho aproximado do bruto e do normalizado, presença ou ausência de score, rating, restrições, protestos e SCR/BACEN, quantidade de categorias encontradas e tamanho do contexto enviado à IA.

## Validação

Rodar o fluxo real de um lead com consulta já existente e confirmar: consulta encontrada, bruto preservado, normalização processada, campos reais identificados, os dois blocos chegando à IA, nenhum campo preenchido artificialmente, nenhum corte antes da normalização e o diagnóstico continuando a funcionar.

Ao final entrego o relatório técnico pedido: arquivo que recebe o resultado, arquivo que recupera a consulta, função que fazia o filtro, função nova de normalização, campos encontrados no teste, tamanhos aproximados do bruto e do contexto, e o que não puder ser validado será dito explicitamente.

## Fora de escopo

Interface, PDF, simulador, cobrança, contratos, autenticação, regras do banco, área administrativa e de parceiros, e qualquer API fora do caminho consulta → diagnóstico.

## Observação

O problema relatado antes — laudos antigos sem aparecer — segue em aberto e não é tratado aqui. Posso retomá-lo depois desta etapa.
