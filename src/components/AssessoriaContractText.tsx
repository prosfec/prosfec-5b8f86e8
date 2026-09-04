// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Texto jurídico do Contrato de Assessoria Financeira Corporativa (12 meses),
 * com injeção dinâmica dos dados do lead e do signatário.
 */

import React from "react";

/** Dados da CONTRATADA (PROSFEC). */
const CONTRATADA_TEXTO =
  "PROSFEC, DCS SOLUCOES TECNOLOGICAS E SERVICOS FINANCEIROS LTDA (DCS Tech & Finance), pessoa jurídica de direito privado inscrita no CNPJ/MF sob o nº 65.668.670/0001-26, com sede no Edif Office Tower Setor Coluna 1 Sala 501, Renascença, São Luís - MA, CEP: 65075-060";

const PRAZO = "12 (doze) meses";
const FORMA_PAGAMENTO = "Recorrente via Cartão de Crédito / InfinitePay";
const FORO = "São Luís/MA";
const VERSAO_CONTRATO = "v2 — Assessoria 12 meses";

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

function formatData(d: Date): string {
  return d.toLocaleDateString("pt-BR");
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
}: AssessoriaContractTextProps) {
  const plano = capitalizar(planoEscolhido);
  const mensal = Number(valorMensalidade || 0);
  const total = mensal * 12;
  const entregaveis = entregaveisPorPlano(planoEscolhido);
  const enderecoCliente = String(endereco || "").trim() || "endereço não informado";
  const rep = String(representante || "").trim() || "[a preencher na assinatura]";
  const repCpf = String(representanteCpf || "").trim() || "[a preencher na assinatura]";

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
        Contrato de Prestação de Serviços de Assessoria Financeira Corporativa
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
        Financeira Corporativa</strong>, conforme as condições abaixo.
      </p>

      <H>Cláusula 1ª – Do Objeto</H>
      <p>
        1.1. O presente contrato tem por objeto a prestação de serviços de Assessoria Financeira e
        Creditícia Corporativa, pelo prazo contratado, visando acompanhar, analisar e orientar a
        CONTRATANTE quanto à sua organização financeira, perfil creditício, relacionamento bancário
        e oportunidades de fomento.
      </p>
      <p>
        1.2. A Assessoria poderá envolver análises, orientações, acompanhamento, planejamento e
        execução de medidas compatíveis com o plano contratado e com a situação da CONTRATANTE.
      </p>

      <H>Cláusula 2ª – Do Plano e do Escopo</H>
      <p>2.1. A CONTRATANTE adere ao seguinte plano:</p>
      <p>
        <strong>Plano:</strong> {plano}
        <br />
        <strong>Mensalidade:</strong> {formatBRL(mensal)}
        <br />
        <strong>Prazo:</strong> {PRAZO}
        <br />
        <strong>Valor Total:</strong> {formatBRL(total)}
        <br />
        <strong>Forma de Pagamento:</strong> {FORMA_PAGAMENTO}
      </p>
      <p>
        <strong>Escopo contratado:</strong>
      </p>
      <ul className="list-disc pl-6 space-y-1">
        {entregaveis.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>
        2.2. O escopo acima integra este contrato e define os serviços abrangidos pela Assessoria.
      </p>
      <p>
        2.3. Quando previsto no plano, o Diagnóstico Estratégico Inicial estará incluído na
        Assessoria, constituindo a primeira etapa do acompanhamento.
      </p>
      <p>
        2.4. O diagnóstico servirá de base para a definição das prioridades e do plano de ação a ser
        acompanhado durante a vigência contratual.
      </p>

      <H>Cláusula 3ª – Da Obrigação de Meio</H>
      <p>
        3.1. A atuação da PROSFEC constitui obrigação de meio, não havendo garantia de resultado
        específico.
      </p>
      <p>3.2. A CONTRATADA não garante:</p>
      <p>I – aprovação ou liberação de crédito;</p>
      <p>II – determinado valor de crédito;</p>
      <p>III – aumento ou alteração específica de Score ou Rating;</p>
      <p>
        IV – exclusão de restrições, apontamentos ou pendências que dependam de terceiros,
        pagamento, negociação ou decisão administrativa ou judicial;
      </p>
      <p>V – aprovação em programas ou linhas de crédito específicas.</p>
      <p>
        3.3. As decisões de concessão de crédito, alteração de registros e demais resultados
        dependentes de terceiros permanecem exclusivamente sob responsabilidade das respectivas
        instituições ou órgãos.
      </p>

      <H>Cláusula 4ª – Das Responsabilidades da Contratada</H>
      <p>4.1. São responsabilidades da CONTRATADA:</p>
      <p>I – prestar os serviços previstos no plano contratado;</p>
      <p>II – realizar as análises e acompanhamentos pertinentes ao escopo;</p>
      <p>III – fornecer orientações e recomendações compatíveis com as informações disponíveis;</p>
      <p>IV – acompanhar a evolução das demandas durante a vigência contratual;</p>
      <p>V – manter sigilo sobre as informações recebidas da CONTRATANTE.</p>

      <H>Cláusula 5ª – Das Responsabilidades da Contratante</H>
      <p>5.1. São responsabilidades da CONTRATANTE:</p>
      <p>I – fornecer informações verdadeiras, completas e atualizadas;</p>
      <p>II – disponibilizar os documentos necessários;</p>
      <p>III – fornecer autorizações necessárias para consultas e procedimentos;</p>
      <p>IV – cumprir os pagamentos nas datas contratadas;</p>
      <p>V – responder às solicitações necessárias à execução dos serviços;</p>
      <p>
        VI – comunicar alterações relevantes em sua situação financeira, cadastral ou societária.
      </p>
      <p>
        5.2. A CONTRATADA não será responsabilizada por prejuízos decorrentes de informações
        incorretas, incompletas, desatualizadas ou omitidas pela CONTRATANTE.
      </p>

      <H>Cláusula 6ª – Dos Serviços Não Inclusos</H>
      <p>
        6.1. Serviços que não estejam expressamente previstos no plano contratado poderão ser
        cobrados separadamente.
      </p>
      <p>6.2. Poderão constituir serviços adicionais, entre outros:</p>
      <p>I – serviços jurídicos ou contenciosos;</p>
      <p>II – honorários advocatícios;</p>
      <p>III – honorários de êxito;</p>
      <p>IV – custas, taxas e despesas de terceiros;</p>
      <p>V – contratação de produtos ou operações financeiras;</p>
      <p>VI – serviços especializados não previstos no plano.</p>
      <p>6.3. Qualquer serviço adicional dependerá de prévia concordância da CONTRATANTE.</p>

      <H>Cláusula 7ª – Do Prazo e Pagamento</H>
      <p>
        7.1. O presente contrato terá prazo determinado de {PRAZO}, iniciando-se em {dataInicio} e
        encerrando-se em {dataTermino}.
      </p>
      <p>
        7.2. O pagamento será realizado de forma recorrente, conforme o meio de pagamento escolhido
        pela CONTRATANTE.
      </p>
      <p>
        7.3. A cobrança mensal corresponde às parcelas do contrato de 12 meses e não caracteriza
        contratação mensal independente.
      </p>
      <p>
        7.4. O atraso no pagamento poderá acarretar multa de 2% sobre o valor vencido e juros de 1%
        ao mês, além da suspensão dos serviços até a regularização.
      </p>

      <H>Cláusula 8ª – Da Rescisão Antecipada</H>
      <p>
        8.1. Em razão do prazo determinado e dos custos de implantação, diagnóstico, estruturação e
        disponibilização da Assessoria, a rescisão antecipada e imotivada pela CONTRATANTE antes do
        término dos 12 meses sujeitará a CONTRATANTE à multa correspondente a 50% (cinquenta por
        cento) das mensalidades vincendas.
      </p>
      <p>
        8.2. A multa será calculada sobre as parcelas que ainda não tiverem vencido na data da
        rescisão.
      </p>
      <p>8.3. A rescisão não elimina a obrigação de pagamento de valores já vencidos.</p>
      <p>8.4. A cláusula penal observará os limites previstos na legislação aplicável.</p>

      <H>Cláusula 9ª – Da Confidencialidade e Proteção de Dados</H>
      <p>
        9.1. A CONTRATADA compromete-se a manter sigilo sobre as informações e documentos recebidos
        em razão da execução dos serviços.
      </p>
      <p>
        9.2. As partes comprometem-se a observar a legislação aplicável à proteção de dados
        pessoais, especialmente a Lei nº 13.709/2018 – LGPD.
      </p>
      <p>
        9.3. A CONTRATANTE autoriza o tratamento dos dados necessários à execução dos serviços
        contratados, observadas as finalidades e bases legais aplicáveis.
      </p>

      <H>Cláusula 10ª – Da Plataforma PROSFEC</H>
      <p>
        10.1. Quando previsto no plano, a CONTRATANTE terá acesso à plataforma PROSFEC durante a
        vigência do contrato.
      </p>
      <p>
        10.2. A plataforma poderá disponibilizar informações, documentos, indicadores, tarefas,
        relatórios, comunicações e acompanhamento da evolução da Assessoria.
      </p>
      <p>10.3. O acesso é pessoal e não poderá ser compartilhado indevidamente com terceiros.</p>
      <p>
        10.4. A plataforma, sua tecnologia, metodologia, marca, estrutura e demais recursos
        permanecem de propriedade da PROSFEC ou de seus respectivos titulares.
      </p>

      <H>Cláusula 11ª – Da Assinatura Eletrônica</H>
      <p>
        11.1. As partes reconhecem como válida a assinatura e formalização eletrônica deste contrato
        por meio da plataforma PROSFEC.
      </p>
      <p>11.2. O sistema poderá registrar, para fins de comprovação da contratação:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>nome do signatário;</li>
        <li>CPF/CNPJ;</li>
        <li>data e horário;</li>
        <li>endereço IP;</li>
        <li>identificação da sessão ou dispositivo, quando disponível;</li>
        <li>versão do contrato aceita;</li>
        <li>registro eletrônico do aceite;</li>
        <li>ID da assinatura ou transação;</li>
        <li>demais informações técnicas disponíveis.</li>
      </ul>
      <p>
        11.3. Os registros eletrônicos poderão ser utilizados como elementos de comprovação da
        manifestação de vontade das partes, observada a legislação aplicável.
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
        <strong>Versão do Contrato:</strong> {VERSAO_CONTRATO}
      </p>

      <H>Cláusula 12ª – Das Disposições Finais</H>
      <p>
        12.1. A contratação da Assessoria não garante aprovação de crédito, concessão de
        financiamento ou qualquer resultado específico dependente de terceiros.
      </p>
      <p>
        12.2. A CONTRATANTE permanece responsável pelas decisões tomadas com base nas orientações
        recebidas e pela veracidade das informações fornecidas.
      </p>
      <p>
        12.3. Eventuais alterações deste contrato deverão ser formalizadas por meio eletrônico ou
        outro meio válido.
      </p>
      <p>
        12.4. Fica eleito o foro de {FORO}, ressalvadas as hipóteses de competência legal
        obrigatória, para dirimir eventuais questões decorrentes deste contrato.
      </p>
      <p>E, estando de acordo, as partes manifestam seu aceite eletrônico.</p>

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
          forma de pagamento, obrigação de meio, ausência de garantia de resultado e condições de
          rescisão antecipada.
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
