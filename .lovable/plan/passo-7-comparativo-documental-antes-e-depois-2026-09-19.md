# Passo 7 — Comparativo documental Antes e Depois

## Objetivo
Transformar o Passo 7 em uma entrega documental fiel aos relatórios reais, sem executar nova consulta nem gerar resultado por inteligência artificial.

## Comportamento por tipo de lead

### Lead não marcado como apto
- Exibir os mesmos itens de **Relatórios e Consultas Efetuadas** do diagnóstico.
- Para cada consulta, montar uma comparação em duas colunas:
  - **Antes:** PDF original já anexado à consulta no diagnóstico.
  - **Depois:** PDF final correspondente, anexado manualmente pelo ADM no Passo 7.
- Manter uma relação individual: cada relatório “Antes” terá exatamente o seu próprio relatório “Depois”.
- Disponibilizar em ambos os lados as mesmas ações de visualizar e baixar o PDF.
- Permitir somente ao ADM anexar, substituir ou remover o PDF “Depois”; o parceiro terá acesso apenas à visualização e ao download.
- Exibir estados claros quando o PDF inicial ou final ainda não estiver disponível.
- Não chamar RedeBE, não consumir saldo e não criar uma nova consulta.

### Lead marcado como apto
- Exibir uma confirmação de que a documentação foi validada e aceita pela Mesa de Operações PROSFEC e seguirá para análise de crédito bancária.
- Abaixo do aviso, espelhar os PDFs iniciais existentes em **Relatórios e Consultas Efetuadas**, com visualização e download.
- Não mostrar comparação “Depois”, controles de upload, métricas de evolução ou geração de dossiê.

## Persistência e histórico
- Guardar o PDF “Depois” no mesmo registro da consulta correspondente, com campos próprios de URL, nome, tamanho, data e responsável pelo envio.
- Usar um arquivo separado no armazenamento para não substituir nem alterar o PDF “Antes”.
- Preservar todos os relatórios, resultados brutos, dossiês antigos e campos já gravados; o novo Passo 7 apenas deixa de exibir e acionar o comparativo artificial atual.
- Ao anexar o PDF “Depois”, atualizar a listagem e notificar o parceiro de que o resultado final está disponível.

## Ajustes de tela
- Substituir o painel atual de homologação e métricas presumidas pelo comparativo documental.
- Reaproveitar o visualizador de PDF já utilizado no diagnóstico, adaptando seu título para indicar **Antes** ou **Depois**.
- Carregar os relatórios também ao abrir diretamente o Passo 7, sem exigir visita anterior ao diagnóstico.
- Manter o layout em duas colunas no computador e empilhado no celular.

## Segurança
- Manter leitura dos relatórios limitada ao fluxo autenticado já existente.
- Manter upload, substituição e remoção do PDF “Depois” restritos ao ADM/equipe, conforme as regras atuais de banco e armazenamento.
- Não expor o resultado bruto da consulta no navegador.

## Detalhes técnicos
- Generalizar o anexo de relatório para suportar o documento original e o resultado final com caminhos e metadados independentes.
- Incluir os metadados do PDF “Depois” na resposta autenticada que lista as consultas do lead.
- Remover da interface do Passo 7 o acionamento da rota de diagnóstico pós-estruturação; a rota e os dados históricos podem permanecer sem uso para compatibilidade.
- Preservar chaves técnicas, IDs de consultas e dados históricos existentes.

## Validação
- Testar lead não apto como ADM: listar relatórios, abrir “Antes”, anexar/substituir/remover “Depois” e abrir o novo PDF.
- Testar lead não apto como parceiro: visualizar/baixar ambos sem controles administrativos.
- Testar lead apto: mostrar aviso de validação e somente os PDFs iniciais.
- Confirmar que nenhuma ação do Passo 7 chama a API de consulta ou debita saldo.
- Validar estados sem PDF, múltiplos relatórios, recarga da tela, computador e celular.
