# Restaurar a exibição dos diagnósticos salvos

## Situação verificada

Conferi o código e os registros de erro do preview antes de propor este plano:

- Não há erro de execução nem falha de build no momento (registro de build: "build OK", nenhum erro de tela registrado).
- A tela do diagnóstico não filtra nem esconde laudos: ela é exibida sempre que o laudo tem texto salvo. Não existe nenhuma exigência dos campos novos (rating, score, inadimplência) para o laudo aparecer.
- Encontrei, porém, um ponto real de perda de conteúdo: na leitura dos números, quando o laudo tem o bloco de auditoria, o sistema **zera** contagens e valores de negativações e protestos que vieram da consulta real sempre que a auditoria não traz aquele número. Em laudos antigos (sem os campos novos) isso apaga informação que existia.
- Também existe um caminho de gravação pública (simulação da home) que, em um caso específico, **regrava o cadastro inteiro** em vez de atualizar campos, o que apagaria o diagnóstico já salvo daquele cliente.

O motivo exato do "sumiram de toda a base" ainda não está confirmado: pode ser perda de dados na base ou apenas os números aparecendo vazios. Por isso a primeira etapa do plano é conferir os dados reais.

## Etapa 1 — Conferir a base antes de mexer

- Consultar quantos cadastros ainda possuem laudo salvo e quando foram gerados.
- Comparar com a quantidade esperada e identificar se algum cadastro teve o conteúdo sobrescrito.
- Se houver perda real de dados, informar quais cadastros e desde quando, antes de qualquer correção de tela.

## Etapa 2 — Tolerância a laudos antigos na exibição

- Passar a usar os números da auditoria apenas quando eles realmente existirem no laudo; quando não existirem, manter o que veio da consulta de crédito, em vez de zerar.
- Campos ausentes continuam mostrando "Não informado", nunca zeram nem escondem o laudo.
- Garantir que a data de geração, o texto do laudo, os serviços recomendados e o plano de ação apareçam mesmo em laudos gravados antes da última alteração.

## Etapa 3 — Impedir novas sobrescritas do cadastro

- Trocar a regravação total do cadastro pela atualização apenas dos campos enviados, no caminho público da simulação, para que o laudo, os sócios e o histórico nunca sejam apagados por uma nova simulação.

## Etapa 4 — Validação

- Abrir um cadastro com laudo antigo e um com laudo novo e confirmar que ambos aparecem completos.
- Gerar um diagnóstico novo e conferir que ele aparece na hora, com os cards preenchidos.
- Rodar verificação de tipos e build.

## Fora de escopo

- Nenhuma mudança nas regras do prompt da análise, nos preços, no fluxo de consulta de crédito ou no visual dos painéis.
