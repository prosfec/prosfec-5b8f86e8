import type { LeadSolar } from "./validacaoFichaSolar";

export const TEXTO_SOLICITACAO_LEGADA = "Simulação solicitada à Mesa. Dados básicos e conta de luz disponíveis na ficha.";

export function ehSolicitacaoCotacaoSolar(nota: Record<string, unknown>): boolean {
  return nota['tipo'] === 'solicitacao_cotacao' || (nota['papel'] === 'parceiro' && nota['texto'] === TEXTO_SOLICITACAO_LEGADA);
}

export function estadoSolicitacaoCotacaoSolar(lead: LeadSolar) {
  if (lead['status'] === 'concluido') return { codigo: 'concluida', texto: 'Atendimento concluído', podeMontar: false };
  if (['arquivado', 'cancelado'].includes(lead['status'])) return { codigo: 'encerrada', texto: 'Atendimento encerrado', podeMontar: false };
  if (lead['propostaEnergiaEscolhida']) return { codigo: 'respondida', texto: 'Proposta selecionada pelo parceiro', podeMontar: false };
  if (lead['cotacaoEnergiaStatus'] === 'respondida') return { codigo: 'respondida', texto: 'Simulação enviada pela Mesa', podeMontar: true };
  return { codigo: 'pendente', texto: 'Aguardando simulação da Mesa', podeMontar: true };
}