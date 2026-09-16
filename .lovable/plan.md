# Melhorias operacionais — o que realmente pesa hoje

Varredura feita no painel ADM, painel do parceiro, ficha do lead, páginas públicas do cliente e no servidor. Abaixo só o que tem impacto real no atendimento. Cada ponto foi confirmado no código.

## Os 6 pontos relevantes

### 1. Aviso só existe dentro do sistema (sino)
Todo aviso hoje é um sininho interno. Não sai e-mail nem WhatsApp automático para ninguém.
Consequência: se o cliente assina o contrato às 22h ou o cliente envia a documentação, o ADM e o parceiro só descobrem quando entram no painel. Além disso, se a gravação do aviso falhar, o sistema segue em frente e ninguém é informado — a falha é engolida em silêncio.

**Proposta:** avisar por e-mail (e opcionalmente WhatsApp) os eventos críticos: contrato assinado, documentação enviada pelo cliente, consulta concluída aguardando PDF e serviço marcado como pago. E registrar quando o aviso falha, em vez de ignorar.

### 2. Nenhuma visão de "lead parado"
O sistema guarda o histórico de mudança de etapa, mas nenhuma tela usa isso. Não existe "há quantos dias este lead está na mesma etapa" nem uma fila de atrasados.
Consequência: lead esquecido no Passo 3 por 20 dias não aparece em lugar nenhum.

**Proposta:** mostrar na ficha e na lista "há X dias nesta etapa", com destaque amarelo/vermelho por tempo, e um filtro "Parados há mais de N dias" no ADM e no painel do parceiro.

### 3. O cliente não tem como responder
A página de acompanhamento do cliente é só leitura. Ele vê que há documento rejeitado, mas não tem onde reenviar nem onde falar com a equipe. Tudo volta para o WhatsApp manual.

**Proposta:** no link do cliente, permitir reenviar o link do documento pendente e deixar um recado curto, que cai como aviso para o ADM e o parceiro.

### 4. Parceiro não tem extrato de saldo nem aviso de saldo baixo
O parceiro vê só o número do saldo. Não há extrato de consumo (o que foi gasto, em qual lead, quando) nem alerta quando o saldo está acabando.
Consequência: consulta falha por saldo e gera atendimento evitável.

**Proposta:** aba de extrato no painel do parceiro (data, lead, valor, saldo resultante) e aviso automático quando o saldo cai abaixo de um limite definido pelo ADM.

### 5. As listas carregam a base inteira
O ADM carrega todos os leads, todos os parceiros e todos os comunicados de uma vez; a paginação é só visual. O painel do parceiro faz o mesmo.
Consequência: conforme a base cresce, o painel demora cada vez mais para abrir e consome consulta de banco à toa.

**Proposta:** carregar por página de verdade, com busca no servidor. É a mudança que mais protege o sistema no médio prazo.

### 6. Histórico não diz quem fez
O histórico de etapas registra apenas "Admin" ou "Parceiro", sem nome ou e-mail. Só o ajuste manual de saldo registra o responsável de verdade.
Consequência: em divergência, não dá para saber quem alterou.

**Proposta:** gravar nome e e-mail do usuário logado em toda mudança de etapa, status, serviço e valor.

## Outros achados menores (registrados, não urgentes)
- Duplicidade de CNPJ só é verificada na simulação pública; cadastro manual pelo ADM ou parceiro pode criar lead repetido.
- Pagamento de serviço depende de marcação manual — não há confirmação automática do checkout.
- Algumas falhas no ADM não mostram nada na tela (reativar membro da equipe, atualização em lote, recarregar lista após editar o lead).

## Ordem sugerida de execução
1. Aviso por e-mail dos eventos críticos (item 1) — maior ganho imediato
2. Tempo parado e filtro de atrasados (item 2)
3. Extrato e alerta de saldo do parceiro (item 4)
4. Canal de resposta do cliente (item 3)
5. Autoria real no histórico (item 6)
6. Paginação no servidor (item 5)

## Nota técnica
Nada aqui exige mudar o fluxo de consulta RedeBE, o contrato de assessoria, as cláusulas ou as regras de crédito. Os itens 1, 4 e 5 tocam `src/lib/prosfec-server.ts`; os itens 2, 3 e 6 tocam telas (`AdminDashboard.tsx`, `PartnerPortal.tsx`, `LeadWorkspaceModal.tsx`, `proposta.$leadId.tsx`). O item 1 precisa de um serviço de envio de e-mail configurado.

Este documento é o diagnóstico. Confirme quais itens quer executar e em qual ordem, que eu preparo o plano de implementação do primeiro.
