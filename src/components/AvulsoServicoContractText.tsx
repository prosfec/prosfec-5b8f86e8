// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contrato de Prestação de Serviços Avulsos: cláusulas gerais + um bloco de
 * cláusulas específicas por serviço contratado. As cláusulas de cada serviço
 * são congeladas no momento da geração do contrato.
 */

import React from "react";
import { CLAUSULA_GENERICA_AVULSO } from "../utils/serviceUtils";

export const CONTRATADA_TEXTO_AVULSO =
  "DCS SOLUCOES TECNOLOGICAS E SERVICOS FINANCEIROS LTDA (DCS Tech & Finance), pessoa jurídica de direito privado, inscrita no CNPJ/MF sob o nº 65.668.670/0001-26, com sede no Edif Office Tower Setor Coluna 1 Sala 501, Renascença, São Luís - MA, CEP: 65075-060, doravante denominada CONTRATADA (PROSFEC)";

export interface ContratoServicoItem {
  id?: string;
  nome?: string;
  valor?: number;
  descricao?: string;
  clausulas?: string;
  templateId?: string;
  templateVersao?: number;
}

interface Props {
  razaoSocial?: string;
  cnpj?: string;
  endereco?: string;
  representante?: string;
  representanteCpf?: string;
  servicos?: ContratoServicoItem[];
  valorTotal?: number;
  numeroContrato?: string;
  dataGeracao?: string;
}

export const brl = (v: any) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

export const H = ({ children }: { children: React.ReactNode }) => (
  <h3 className="font-bold uppercase text-slate-900 pt-2">{children}</h3>
);

/** Renderiza o texto livre das cláusulas do serviço, uma linha por parágrafo. */
export function ClausulasServico({ texto }: { texto?: string }) {
  const linhas = String(texto || CLAUSULA_GENERICA_AVULSO)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return (
    <>
      {linhas.map((linha, i) => (
        <p key={i}>{linha}</p>
      ))}
    </>
  );
}

export default function AvulsoServicoContractText({
  razaoSocial,
  cnpj,
  endereco,
  representante,
  representanteCpf,
  servicos = [],
  valorTotal,
  numeroContrato,
  dataGeracao,
}: Props) {
  const empresa = String(razaoSocial || "").trim() || "[Razão Social]";
  const doc = String(cnpj || "").trim() || "[CNPJ]";
  const sede = String(endereco || "").trim() || "[Endereço]";
  const rep = String(representante || "").trim() || "[Representante Legal]";
  const repCpf = String(representanteCpf || "").trim() || "[CPF]";
  const lista = Array.isArray(servicos) ? servicos : [];
  const total =
    typeof valorTotal === "number"
      ? valorTotal
      : lista.reduce((acc, s) => acc + Number(s?.valor || 0), 0);

  return (
    <article className="text-sm text-slate-700 text-justify space-y-4 leading-relaxed">
      <h2 className="text-base font-extrabold uppercase text-slate-900 text-center">
        Contrato de Prestação de Serviços Avulsos
      </h2>

      {(numeroContrato || dataGeracao) && (
        <p className="text-center text-[11px] text-slate-500">
          {numeroContrato ? `Contrato nº ${numeroContrato}` : ""}
          {numeroContrato && dataGeracao ? " — " : ""}
          {dataGeracao ? `Emitido em ${new Date(dataGeracao).toLocaleString("pt-BR")}` : ""}
        </p>
      )}

      <p>
        Pelo presente instrumento particular, as partes abaixo qualificadas têm entre si justo e
        contratado o seguinte:
      </p>

      <H>Cláusula 1ª – Das Partes</H>
      <p>
        <strong>CONTRATANTE:</strong> {empresa}, inscrita no CNPJ nº {doc}, com sede em {sede}, neste
        ato representada por seu representante legal {rep}, CPF nº {repCpf}.
      </p>
      <p>
        <strong>CONTRATADA:</strong> {CONTRATADA_TEXTO_AVULSO}.
      </p>

      <H>Cláusula 2ª – Do Objeto</H>
      <p>
        2.1. O presente contrato tem por objeto a prestação, pela CONTRATADA, dos serviços avulsos
        relacionados no quadro de valores desta avença, executados de forma independente e autônoma
        em relação a qualquer contrato de assessoria mensal eventualmente mantido entre as partes.
      </p>
      <p>
        2.2. Cada serviço contratado é regido pelas cláusulas gerais deste instrumento e,
        cumulativamente, pelas cláusulas específicas constantes da Cláusula 6ª.
      </p>

      <H>Cláusula 3ª – Do Quadro de Valores</H>
      {lista.length === 0 ? (
        <p>Nenhum serviço vinculado a este contrato.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border border-slate-200">
            <thead>
              <tr className="bg-slate-50 text-slate-600 uppercase tracking-wider">
                <th className="text-left p-2 border-b border-slate-200">Serviço</th>
                <th className="text-right p-2 border-b border-slate-200 w-32">Valor</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((s, i) => (
                <tr key={s?.id || i} className="border-b border-slate-100">
                  <td className="p-2 align-top">
                    <span className="font-semibold text-slate-900">{s?.nome || "Serviço"}</span>
                    {s?.templateId && (
                      <span className="block text-[10px] text-slate-400">
                        {s.templateId}_V{Number(s.templateVersao || 1)}
                      </span>
                    )}
                  </td>
                  <td className="p-2 text-right align-top font-bold text-slate-900">
                    {Number(s?.valor || 0) > 0 ? brl(s?.valor) : "Sem custo inicial (êxito)"}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50">
                <td className="p-2 font-bold uppercase text-slate-700">Total</td>
                <td className="p-2 text-right font-extrabold text-slate-900">{brl(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <H>Cláusula 4ª – Do Pagamento</H>
      <p>
        4.1. Os valores acima são devidos na contratação, salvo disposição específica em contrário
        prevista nas cláusulas do respectivo serviço, e poderão ser pagos por PIX, transferência
        bancária ou link de pagamento disponibilizado pela CONTRATADA.
      </p>
      <p>
        4.2. O atraso sujeitará a CONTRATANTE a multa moratória de 2% (dois por cento), juros de mora
        de 1% (um por cento) ao mês pro rata die e correção monetária pelo IPCA.
      </p>

      <H>Cláusula 5ª – Das Obrigações da Contratante</H>
      <p>
        5.1. A CONTRATANTE obriga-se a fornecer documentos e informações verídicos, completos e
        tempestivos, a atender às solicitações complementares em até 48 (quarenta e oito) horas úteis
        e a adotar as providências recomendadas pela CONTRATADA.
      </p>
      <p>
        5.2. A CONTRATADA assume obrigação de meio, e não de resultado, não respondendo por decisões
        de instituições financeiras, credores, bureaus de crédito ou órgãos públicos.
      </p>

      <H>Cláusula 6ª – Das Cláusulas Específicas por Serviço</H>
      {lista.length === 0 ? (
        <p>Não há cláusulas específicas por ausência de serviços vinculados.</p>
      ) : (
        lista.map((s, i) => (
          <section key={s?.id || `cl-${i}`} className="space-y-2">
            <h4 className="font-bold text-slate-900">
              6.{i + 1}. {s?.nome || "Serviço"}
              {s?.templateId ? (
                <span className="ml-2 text-[10px] font-normal text-slate-400">
                  ({s.templateId}_V{Number(s.templateVersao || 1)})
                </span>
              ) : null}
            </h4>
            <ClausulasServico texto={s?.clausulas} />
          </section>
        ))
      )}

      <H>Cláusula 7ª – Da Confidencialidade e Proteção de Dados (LGPD)</H>
      <p>
        7.1. A CONTRATADA tratará os dados pessoais e empresariais da CONTRATANTE estritamente para a
        finalidade de execução dos serviços contratados, nos termos da Lei nº 13.709/2018, adotando
        medidas técnicas de segurança e mantendo o dever de sigilo, vedada a comercialização com
        terceiros.
      </p>

      <H>Cláusula 8ª – Da Inclusão de Novos Serviços</H>
      <p>
        8.1. A contratação de serviços adicionais após a assinatura deste contrato será formalizada
        por meio de TERMO ADITIVO DE INCLUSÃO DE SERVIÇO AVULSO, que integrará este instrumento para
        todos os fins, permanecendo o presente contrato inalterado em seu conteúdo original.
      </p>

      <H>Cláusula 9ª – Da Assinatura Eletrônica e do Foro</H>
      <p>
        9.1. As partes reconhecem a plena validade e eficácia jurídica da assinatura deste contrato
        por meios eletrônicos e digitais, nos termos da MP nº 2.200-2/2001 e da Lei nº 14.063/2020,
        sendo registrados data, hora, endereço IP e dispositivo do signatário.
      </p>
      <p>
        9.2. Fica eleito o foro da comarca de São Luís - MA para dirimir eventuais litígios
        decorrentes deste instrumento, com renúncia expressa a qualquer outro.
      </p>
    </article>
  );
}
