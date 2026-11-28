import { ArrowUpRight, CheckCircle2, Clock3, FileText, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { estadoSolicitacaoCotacaoSolar } from '../lib/solicitacaoCotacaoSolar';
import { tipoFichaSolar, urlPdfSegura, type LeadSolar } from '../lib/validacaoFichaSolar';

type Props = { lead: LeadSolar; nota: Record<string, any> } & (
  { mesa: true; onMontar: () => void } | { mesa?: false; onMontar?: never }
);

export function CardSolicitacaoCotacaoEnergia(props: Props) {
  const { lead, nota } = props;
  const estado = estadoSolicitacaoCotacaoSolar(lead);
  const distribuidora = nota['distribuidora'] || lead['ficha']?.distribuidora || lead['concessionaria'] || 'Não informada';
  const titular = nota['titular'] || lead['ficha']?.nomeCompleto || lead['nomeRepresentante'] || lead['nomeEmpresa'] || 'Não informado';
  const fatura = lead['documentos']?.contaLuz?.url;
  const data = new Date(nota['data']);
  const enviadaEm = Number.isNaN(data.getTime()) ? '' : data.toLocaleString('pt-BR');

  return <article className="cotacao-evento" aria-label="Solicitação de cotação à Mesa">
    <header className="cotacao-evento-head">
      <span className="cotacao-evento-icon"><Zap aria-hidden="true" /></span>
      <div className="min-w-0">
        <span className="cotacao-evento-marca">PROSFEC ENERGY · MESA DE OPERAÇÕES</span>
        <h3>Solicitação de cotação</h3>
      </div>
    </header>
    <div className="cotacao-evento-body">
      <p className="cotacao-evento-meta">Enviada por <strong>{nota['autor'] || 'Parceiro'}</strong>{enviadaEm && <> · <time dateTime={data.toISOString()}>{enviadaEm}</time></>}</p>
      <dl className="cotacao-evento-dados">
        <div><dt>Distribuidora de energia</dt><dd>{distribuidora}</dd></div>
        <div><dt>Titular / representante · {tipoFichaSolar(lead)}</dt><dd>{titular}</dd></div>
      </dl>
      {urlPdfSegura(fatura) ? <Button asChild variant="outline" className="cotacao-evento-fatura">
        <a href={fatura} target="_blank" rel="noopener noreferrer"><FileText aria-hidden="true" /> Ver fatura anexada <ArrowUpRight aria-hidden="true" /></a>
      </Button> : <p className="cotacao-evento-meta">Fatura não disponível na ficha atual.</p>}
      <div className={`cotacao-evento-status cotacao-evento-status-${estado.codigo}`} role="status">
        {estado.codigo === 'pendente' ? <Clock3 aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
        <span>{estado.texto}</span>
      </div>
      {props.mesa && <Button className="cotacao-evento-montar" disabled={!estado.podeMontar} onClick={props.onMontar}>
        <Zap aria-hidden="true" /> Montar Proposta / Simulação <ArrowUpRight aria-hidden="true" />
      </Button>}
    </div>
  </article>;
}