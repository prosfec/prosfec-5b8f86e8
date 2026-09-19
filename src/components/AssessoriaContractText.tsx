// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contrato de Assessoria Financeira Corporativa (12 meses).
 * O corpo do contrato é escrito pelo Administrador, por plano, no painel
 * "Preços & Serviços". O sistema gera automaticamente o cabeçalho das partes,
 * o quadro de plano/valores e os blocos de assinatura eletrônica.
 */

import React from "react";

/** Dados da CONTRATADA (PROSFEC). */
const CONTRATADA_TEXTO =
  "PROSFEC, DCS SOLUCOES TECNOLOGICAS E SERVICOS FINANCEIROS LTDA (DCS Tech & Finance), pessoa jurídica de direito privado inscrita no CNPJ/MF sob o nº 65.668.670/0001-26, com sede no Edif Office Tower Setor Coluna 1 Sala 501, Renascença, São Luís - MA, CEP: 65075-060";

const PRAZO = "12 (doze) meses";
const FORMA_PAGAMENTO = "Recorrente via Cartão de Crédito / InfinitePay";

function capitalizar(texto?: string): string {
  const t = String(texto || "").trim();
  if (!t) return "Assessoria Essential";
  return t
    .split(" ")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function formatBRL(n: number): string {
  return Number(n || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function formatData(d: Date): string {
  return d.toLocaleDateString("pt-BR");
}

/** Renderiza o corpo digitado pelo ADM preservando parágrafos e destacando títulos. */
function CorpoDigitado({ texto }: { texto: string }) {
  const linhas = String(texto || "").split(/\r?\n/);
  return (
    <>
      {linhas.map((linha, i) => {
        const t = linha.trim();
        if (!t) return <div key={i} className="h-2" />;
        const semAcento = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const ehTitulo =
          t.length <= 120 &&
          /[A-Za-zÁ-Úá-ú]/.test(t) &&
          semAcento === semAcento.toUpperCase();
        if (ehTitulo) {
          return (
            <h3 key={i} className="font-bold uppercase text-slate-900 pt-2">
              {t}
            </h3>
          );
        }
        return <p key={i}>{t}</p>;
      })}
    </>
  );
}

interface AssessoriaContractTextProps {
  leadId?: string;
  razaoSocial?: string;
  cnpj?: string;
  endereco?: string;
  planoEscolhido?: string;
  valorMensalidade?: number;
  representante?: string;
  representanteCpf?: string;
  assinado?: boolean;
  assinaturaData?: string | null;
  assinaturaIp?: string | null;
  corpoContrato?: string | null;
  contratoVersao?: number | null;
}

export default function AssessoriaContractText({
  leadId,
  razaoSocial,
  cnpj,
  endereco,
  planoEscolhido,
  valorMensalidade,
  representante,
  representanteCpf,
  assinado,
  assinaturaData,
  assinaturaIp,
  corpoContrato,
  contratoVersao,
}: AssessoriaContractTextProps) {
  const plano = capitalizar(planoEscolhido);
  const mensal = Number(valorMensalidade || 0);
  const total = mensal * 12;
  const enderecoCliente = String(endereco || "").trim() || "endereço não informado";
  const rep = String(representante || "").trim() || "[a preencher na assinatura]";
  const repCpf = String(representanteCpf || "").trim() || "[a preencher na assinatura]";
  const corpo = String(corpoContrato || "").trim();
  const versaoContrato = `${plano} — v${Number(contratoVersao || 0)}`;

  const inicioDate = assinado && assinaturaData ? new Date(assinaturaData) : new Date();
  const terminoDate = new Date(inicioDate);
  terminoDate.setFullYear(terminoDate.getFullYear() + 1);
  const dataInicio = formatData(inicioDate);
  const dataTermino = formatData(terminoDate);
  const timestampAssinatura =
    assinado && assinaturaData ? new Date(assinaturaData).toLocaleString("pt-BR") : "—";
  const idAssinatura =
    assinado && assinaturaData ? `${leadId || "lead"}-${new Date(assinaturaData).getTime()}` : "—";

  const H = ({ children }: { children: React.ReactNode }) => (
    <h3 className="font-bold uppercase text-slate-900 pt-2">{children}</h3>
  );

  return (
    <article className="text-sm text-slate-700 text-justify space-y-4 leading-relaxed">
      <h2 className="text-base font-extrabold uppercase text-slate-900 text-center">
        Contrato de Prestação de Serviços de Assessoria Financeira Corporativa — {plano}
      </h2>

      <p>Pelo presente instrumento, de um lado:</p>
      <p>
        <strong>CONTRATADA:</strong> {CONTRATADA_TEXTO};
      </p>
      <p>e, de outro:</p>
      <p>
        <strong>CONTRATANTE:</strong> {razaoSocial || "—"}, inscrita no CNPJ sob nº {cnpj || "—"},
        com sede em {enderecoCliente}, representada por {rep}, CPF nº {repCpf};
      </p>
      <p>
        têm entre si contratado o presente <strong>Contrato de Prestação de Serviços de Assessoria
        Financeira Corporativa — {plano}</strong>, conforme as condições abaixo.
      </p>

      <H>Do Plano Contratado</H>
      <p>
        <strong>Plano:</strong> {plano}
        <br />
        <strong>Mensalidade:</strong> {formatBRL(mensal)}
        <br />
        <strong>Prazo:</strong> {PRAZO}
        <br />
        <strong>Valor Total:</strong> {formatBRL(total)}
        <br />
        <strong>Início:</strong> {dataInicio}
        <br />
        <strong>Término:</strong> {dataTermino}
        <br />
        <strong>Forma de Pagamento:</strong> {FORMA_PAGAMENTO}
      </p>

      {corpo ? (
        <div className="space-y-3">
          <CorpoDigitado texto={corpo} />
        </div>
      ) : (
        <p className="italic text-slate-500">
          O texto deste contrato ainda não foi disponibilizado.
        </p>
      )}

      <H>Da Assinatura Eletrônica</H>
      <p>
        As partes reconhecem como válida a assinatura e formalização eletrônica deste contrato por
        meio da plataforma PROSFEC, podendo o sistema registrar, para fins de comprovação da
        contratação: nome do signatário, CPF/CNPJ, data e horário, endereço IP, identificação da
        sessão ou dispositivo, versão do contrato aceita, registro eletrônico do aceite e ID da
        assinatura.
      </p>
      <p>
        <strong>Signatário:</strong> {rep}
        <br />
        <strong>CPF:</strong> {repCpf}
        <br />
        <strong>Data/Hora:</strong> {timestampAssinatura}
        <br />
        <strong>IP:</strong> {assinado ? assinaturaIp || "não capturado" : "—"}
        <br />
        <strong>ID da Assinatura:</strong> {idAssinatura}
        <br />
        <strong>Versão do Contrato:</strong> {versaoContrato}
      </p>

      <div className="border-t border-slate-200 pt-4">
        <h3 className="font-bold uppercase text-slate-900">Dados da Contratação</h3>
        <p className="mt-2">
          <strong>CONTRATANTE:</strong> {razaoSocial || "—"}
          <br />
          <strong>CNPJ:</strong> {cnpj || "—"}
          <br />
          <strong>REPRESENTANTE:</strong> {rep}
          <br />
          <strong>PLANO:</strong> {plano}
          <br />
          <strong>MENSALIDADE:</strong> {formatBRL(mensal)}
          <br />
          <strong>PRAZO:</strong> 12 meses
          <br />
          <strong>VALOR TOTAL:</strong> {formatBRL(total)}
          <br />
          <strong>INÍCIO:</strong> {dataInicio}
          <br />
          <strong>TÉRMINO:</strong> {dataTermino}
          <br />
          <strong>FORMA DE PAGAMENTO:</strong> {FORMA_PAGAMENTO}
        </p>
      </div>

      <div className="border-t border-slate-200 pt-4">
        <h3 className="font-bold uppercase text-slate-900">Aceite Eletrônico</h3>
        <p className="mt-2">
          Ao realizar o aceite eletrônico, a CONTRATANTE declara que leu e concorda com todas as
          condições deste contrato, especialmente quanto ao escopo dos serviços, prazo de 12 meses,
          forma de pagamento e condições de rescisão.
        </p>
        <p className="mt-2">
          <strong>Status:</strong> {assinado ? "ASSINADO" : "Aguardando aceite"}
          <br />
          <strong>Data/Hora:</strong> {timestampAssinatura}
          <br />
          <strong>IP:</strong> {assinado ? assinaturaIp || "não capturado" : "—"}
        </p>
      </div>
    </article>
  );
}
