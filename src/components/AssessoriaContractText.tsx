// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Texto jurídico do Contrato de Assessoria (12 meses), com injeção dinâmica
 * dos dados do lead. Usado apenas quando modeloContratacao === "assessoria".
 */

import React from "react";

/** Dados da CONTRATADA (PROSFEC). */
const CONTRATADA = {
  razaoSocial: "PROSFEC ASSESSORIA EMPRESARIAL LTDA",
  documento: "CNPJ nº 57.918.146/0001-06",
  endereco: "Imperatriz/MA — Brasil",
};

const PRAZO = "12 (doze) meses";
const FORMA_PAGAMENTO = "Recorrente via Cartão de Crédito / InfinitePay";
const GATEWAY_PAGAMENTO = "InfinitePay";

const ENTREGAVEIS_ESSENTIAL = [
  "Diagnóstico Estratégico Inicial",
  "Adequação de Perfil e Dossiê Completo",
  "Implantação de Gateway de pagamento com Sistema de Gestão Financeira integrado",
  "Monitoramento Contínuo por 12 meses",
];

const ENTREGAVEIS_GROWTH = [
  "Todos os itens do plano Essential",
  "Auditoria Fiscal e Contábil",
  "Criação de Site Institucional",
  "Implantação de Automação de WhatsApp",
];

const ENTREGAVEIS_CORPORATE = [
  "Todos os itens do plano Growth",
  "Auditoria Financeira profunda",
  "Projeto Comercial Estruturado (Bancos Suíços)",
  "Atendimento Master com SLA de 12 horas",
];

function entregaveisPorPlano(plano?: string): string[] {
  const p = String(plano || "").toLowerCase();
  if (p.includes("corporate")) return ENTREGAVEIS_CORPORATE;
  if (p.includes("growth")) return ENTREGAVEIS_GROWTH;
  return ENTREGAVEIS_ESSENTIAL;
}

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

interface AssessoriaContractTextProps {
  razaoSocial?: string;
  cnpj?: string;
  endereco?: string;
  planoEscolhido?: string;
  valorMensalidade?: number;
}

export default function AssessoriaContractText({
  razaoSocial,
  cnpj,
  endereco,
  planoEscolhido,
  valorMensalidade,
}: AssessoriaContractTextProps) {
  const plano = capitalizar(planoEscolhido);
  const mensal = Number(valorMensalidade || 0);
  const total = mensal * 12;
  const entregaveis = entregaveisPorPlano(planoEscolhido);
  const enderecoCliente = String(endereco || "").trim() || "endereço não informado";

  return (
    <article className="text-sm text-slate-700 text-justify space-y-4 leading-relaxed">
      <h2 className="text-base font-extrabold uppercase text-slate-900 text-center">
        Contrato de Prestação de Serviços de Assessoria Financeira Corporativa
      </h2>

      <p>Pelo presente instrumento particular, de um lado:</p>
      <p>
        <strong>CONTRATADA:</strong> PROSFEC, {CONTRATADA.razaoSocial}, inscrita no{" "}
        {CONTRATADA.documento}, com sede em {CONTRATADA.endereco}, doravante denominada CONTRATADA;
      </p>
      <p>e, de outro lado:</p>
      <p>
        <strong>CONTRATANTE:</strong> {razaoSocial || "—"}, inscrita no CNPJ sob nº {cnpj || "—"},
        com sede em {enderecoCliente}, doravante denominada CONTRATANTE.
      </p>

      <h3 className="font-bold uppercase text-slate-900 pt-2">Cláusula Primeira – Do Objeto</h3>
      <p>
        1.1. O presente contrato tem por objeto a prestação, pela CONTRATADA, de serviços de
        Assessoria Financeira e Creditícia Corporativa.
      </p>
      <p>
        1.2. A Assessoria constitui serviço estratégico e não se confunde com instituição
        financeira.
      </p>

      <h3 className="font-bold uppercase text-slate-900 pt-2">
        Cláusula Segunda – Do Plano Contratado e do Escopo
      </h3>
      <p>2.1. A CONTRATANTE adere ao seguinte plano:</p>
      <p>
        <strong>Plano Selecionado:</strong> {plano}
        <br />
        <strong>Prazo Contratual:</strong> {PRAZO}
        <br />
        <strong>Investimento Mensal:</strong> {formatBRL(mensal)}
        <br />
        <strong>Valor Total do Contrato:</strong> {formatBRL(total)}
      </p>
      <p>
        <strong>Escopo de Serviços:</strong>
      </p>
      <ul className="list-disc pl-6 space-y-1">
        {entregaveis.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h3 className="font-bold uppercase text-slate-900 pt-2">
        Cláusula Terceira – Da Obrigação de Meio
      </h3>
      <p>
        3.1. A atuação da CONTRATADA constitui obrigação de meio. Fica expressamente estabelecido
        que a CONTRATADA não garante aprovação de crédito ou alteração exata de Score/Rating.
      </p>

      <h3 className="font-bold uppercase text-slate-900 pt-2">
        Cláusula Quarta – Do Prazo e Rescisão Antecipada
      </h3>
      <p>4.1. O contrato terá prazo determinado de {PRAZO}.</p>
      <p>
        4.2. Considerando os altos custos iniciais de implantação, a rescisão unilateral e imotivada
        pela CONTRATANTE antes do término do prazo estará sujeita a uma multa rescisória
        correspondente a 50% (cinquenta por cento) do valor das mensalidades vincendas até o término
        do contrato.
      </p>

      <h3 className="font-bold uppercase text-slate-900 pt-2">
        Cláusula Quinta – Da Assinatura Eletrônica
      </h3>
      <p>
        5.1. As partes reconhecem como válida a formalização eletrônica deste contrato. Para
        comprovação da autoria e integridade, serão registrados o endereço IP, Data/Hora e dados do
        signatário (MP nº 2.200-2/2001 e Lei nº 14.063/2020).
      </p>

      <div className="border-t border-slate-200 pt-4">
        <h3 className="font-bold uppercase text-slate-900">Dados da Contratação</h3>
        <p className="mt-2">
          <strong>Plano:</strong> {plano}
          <br />
          <strong>Valor Mensal:</strong> {formatBRL(mensal)}
          <br />
          <strong>Valor Total ({PRAZO}):</strong> {formatBRL(total)}
          <br />
          <strong>Forma de Pagamento:</strong> {FORMA_PAGAMENTO}
          <br />
          <strong>Gateway:</strong> {GATEWAY_PAGAMENTO}
        </p>
      </div>
    </article>
  );
}
