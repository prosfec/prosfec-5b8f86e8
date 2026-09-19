// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Termo Aditivo de Inclusão de Serviço Avulso. Vincula-se ao Contrato Avulso
 * já assinado, sem alterar o instrumento original. Com um único serviço, o
 * termo traz a descrição do serviço seguida das cláusulas específicas.
 */

import React from "react";
import AvulsoServicoContractTextModule, {
  CONTRATADA_TEXTO_AVULSO,
  ClausulasServico,
  H,
  brl,
  valorServicoTexto,
  type ContratoServicoItem,
} from "./AvulsoServicoContractText";

void AvulsoServicoContractTextModule;

interface Props {
  razaoSocial?: string;
  cnpj?: string;
  endereco?: string;
  representante?: string;
  representanteCpf?: string;
  servicos?: ContratoServicoItem[];
  valorTotal?: number;
  numeroContrato?: string;
  contratoOrigemId?: string;
  contratoOrigemData?: string;
  dataGeracao?: string;
}

export default function AditivoContractText({
  razaoSocial,
  cnpj,
  endereco,
  representante,
  representanteCpf,
  servicos = [],
  valorTotal,
  numeroContrato,
  contratoOrigemId,
  contratoOrigemData,
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

  const unico = lista.length === 1;
  const servico = unico ? lista[0] : null;
  const nomeServico = String(servico?.nome || "Serviço").trim();

  return (
    <article className="text-sm text-slate-700 text-justify space-y-4 leading-relaxed">
      <h2 className="text-base font-extrabold uppercase text-slate-900 text-center">
        {unico
          ? `Termo Aditivo — ${nomeServico}`
          : "Termo Aditivo de Inclusão de Serviço Avulso"}
      </h2>

      {(numeroContrato || dataGeracao) && (
        <p className="text-center text-[11px] text-slate-500">
          {numeroContrato ? `Termo aditivo nº ${numeroContrato}` : ""}
          {numeroContrato && dataGeracao ? " — " : ""}
          {dataGeracao ? `Emitido em ${new Date(dataGeracao).toLocaleString("pt-BR")}` : ""}
        </p>
      )}

      <H>Cláusula 1ª – Das Partes</H>
      <p>
        <strong>CONTRATANTE:</strong> {empresa}, inscrita no CNPJ nº {doc}, com sede em {sede}, neste
        ato representada por seu representante legal {rep}, CPF nº {repCpf}.
      </p>
      <p>
        <strong>CONTRATADA:</strong> {CONTRATADA_TEXTO_AVULSO}.
      </p>

      <H>Cláusula 2ª – Do Contrato Originário</H>
      <p>
        2.1. O presente termo é aditivo ao Contrato de Prestação de Serviços Avulsos
        {contratoOrigemId ? ` nº ${contratoOrigemId}` : ""}
        {contratoOrigemData
          ? `, assinado eletronicamente em ${new Date(contratoOrigemData).toLocaleString("pt-BR")}`
          : ""}
        , cujas cláusulas gerais permanecem íntegras, válidas e inalteradas.
      </p>

      {unico ? (
        <>
          <H>Cláusula 3ª – Do Objeto e das Cláusulas Específicas do Serviço</H>
          <p>
            3.1. Por este termo, as partes incluem no escopo contratado o serviço{" "}
            <strong>{nomeServico}</strong>
            {servico?.templateId ? ` (${servico.templateId}_V${Number(servico.templateVersao || 1)})` : ""}
            , pelo valor de <strong>{valorServicoTexto(servico?.valor)}</strong>.
          </p>
          {String(servico?.descricao || "").trim() && (
            <p>
              <strong>Descrição do serviço:</strong> {String(servico?.descricao).trim()}
            </p>
          )}
          <p>3.2. O serviço incluído rege-se pelas cláusulas específicas abaixo:</p>
          <div className="space-y-2 border-l-2 border-slate-200 pl-3">
            <ClausulasServico texto={servico?.clausulas} />
          </div>
        </>
      ) : (
        <>
          <H>Cláusula 3ª – Do Objeto do Aditivo</H>
          <p>
            3.1. Por este termo, as partes incluem no escopo contratado os serviços abaixo, com os
            respectivos valores e cláusulas específicas:
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-slate-200">
              <thead>
                <tr className="bg-slate-50 text-slate-600 uppercase tracking-wider">
                  <th className="text-left p-2 border-b border-slate-200">Serviço incluído</th>
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
                  <td className="p-2 font-bold uppercase text-slate-700">Total do aditivo</td>
                  <td className="p-2 text-right font-extrabold text-slate-900">{brl(total)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <H>Cláusula 4ª – Das Cláusulas Específicas dos Serviços Incluídos</H>
          {lista.map((s, i) => (
            <section key={s?.id || `ad-${i}`} className="space-y-2">
              <h4 className="font-bold text-slate-900">
                4.{i + 1}. {s?.nome || "Serviço"}
                {s?.templateId ? (
                  <span className="ml-2 text-[10px] font-normal text-slate-400">
                    ({s.templateId}_V{Number(s.templateVersao || 1)})
                  </span>
                ) : null}
              </h4>
              <ClausulasServico texto={s?.clausulas} />
            </section>
          ))}
        </>
      )}

      <H>Cláusula {unico ? "4ª" : "5ª"} – Da Ratificação</H>
      <p>
        {unico ? "4.1." : "5.1."} Ficam ratificadas todas as demais cláusulas e condições do contrato
        originário que não conflitem com este termo aditivo, que a ele se integra para todos os fins de
        direito.
      </p>

      <H>Cláusula {unico ? "5ª" : "6ª"} – Da Assinatura Eletrônica e do Foro</H>
      <p>
        {unico ? "5.1." : "6.1."} As partes reconhecem a validade da assinatura eletrônica deste termo,
        nos termos da MP nº 2.200-2/2001 e da Lei nº 14.063/2020, com registro de data, hora, IP e
        dispositivo.
      </p>
      <p>
        {unico ? "5.2." : "6.2."} Fica eleito o foro da comarca de São Luís - MA, com renúncia a
        qualquer outro.
      </p>
    </article>
  );
}
