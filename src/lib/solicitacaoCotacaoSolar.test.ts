import { describe, expect, it } from 'vitest';
import { ehSolicitacaoCotacaoSolar, estadoSolicitacaoCotacaoSolar, TEXTO_SOLICITACAO_LEGADA } from './solicitacaoCotacaoSolar';

describe('eventos de solicitação de cotação', () => {
  it('reconhece novas solicitações pelo tipo e antigas pela mensagem exata', () => {
    expect(ehSolicitacaoCotacaoSolar({ tipo: 'solicitacao_cotacao' })).toBe(true);
    expect(ehSolicitacaoCotacaoSolar({ papel: 'parceiro', texto: TEXTO_SOLICITACAO_LEGADA })).toBe(true);
    expect(ehSolicitacaoCotacaoSolar({ papel: 'parceiro', texto: 'Preciso de uma simulação solicitada à Mesa' })).toBe(false);
    expect(ehSolicitacaoCotacaoSolar({ papel: 'adm', texto: TEXTO_SOLICITACAO_LEGADA })).toBe(false);
  });
  it('identifica solicitação pendente e libera montagem para atendimento aberto', () => {
    expect(estadoSolicitacaoCotacaoSolar({ status: 'atendimento', cotacaoEnergiaStatus: 'solicitada' })).toMatchObject({ codigo: 'pendente', podeMontar: true });
  });
  it('identifica publicação e preserva a possibilidade de montar outras ofertas', () => {
    expect(estadoSolicitacaoCotacaoSolar({ status: 'atendimento', cotacaoEnergiaStatus: 'respondida' })).toMatchObject({ codigo: 'respondida', podeMontar: true });
  });
  it('bloqueia montagem após escolha de proposta', () => {
    expect(estadoSolicitacaoCotacaoSolar({ status: 'atendimento', propostaEnergiaEscolhida: { ofertaId: 'oferta-1' } }).podeMontar).toBe(false);
  });
  it.each(['concluido', 'cancelado', 'arquivado'])('bloqueia montagem para lead %s', status => {
    expect(estadoSolicitacaoCotacaoSolar({ status, cotacaoEnergiaStatus: 'respondida' }).podeMontar).toBe(false);
  });
});