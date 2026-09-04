// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Texto jurídico completo do Contrato Avulso (100% êxito), com injeção dinâmica
 * dos dados do lead. Usado apenas quando modeloContratacao === "avulso".
 */

import React from "react";

const CONTRATADA_TEXTO =
  "DCS SOLUCOES TECNOLOGICAS E SERVICOS FINANCEIROS LTDA (DCS Tech & Finance), pessoa jurídica de direito privado, inscrita no CNPJ/MF sob o nº 65.668.670/0001-26, com sede no Edif Office Tower Setor Coluna 1 Sala 501, Renascença, São Luís - MA, CEP: 65075-060, doravante denominada PROSFEC";

interface AvulsoContractTextProps {
  razaoSocial?: string;
  cnpj?: string;
  endereco?: string;
  representante?: string;
  representanteCpf?: string;
}

export default function AvulsoContractText({
  razaoSocial,
  cnpj,
  endereco,
  representante,
  representanteCpf,
}: AvulsoContractTextProps) {
  const empresa = String(razaoSocial || "").trim() || "[Razão Social]";
  const doc = String(cnpj || "").trim() || "[CNPJ]";
  const sede = String(endereco || "").trim() || "[Endereço]";
  const rep = String(representante || "").trim() || "[Representante Legal]";
  const repCpf = String(representanteCpf || "").trim() || "[CPF]";

  const H = ({ children }: { children: React.ReactNode }) => (
    <h3 className="font-bold uppercase text-slate-900 pt-2">{children}</h3>
  );

  return (
    <article className="text-sm text-slate-700 text-justify space-y-4 leading-relaxed">
      <h2 className="text-base font-extrabold uppercase text-slate-900 text-center">
        Contrato de Prestação de Serviços de Consultoria e Assessoria em Crédito Empresarial PJ
      </h2>

      <p>
        Pelo presente instrumento particular, as partes abaixo qualificadas têm entre si justo e
        contratado o seguinte:
      </p>

      <H>Cláusula 1 – Das Partes</H>
      <p>
        <strong>CONTRATANTE:</strong> {empresa}, inscrita no CNPJ nº {doc}, com sede em {sede},
        neste ato representada por seu representante legal {rep}, CPF nº {repCpf}.
      </p>
      <p>
        <strong>CONTRATADO:</strong> {CONTRATADA_TEXTO}.
      </p>

      <H>Cláusula 2 – Do Objeto e Natureza dos Serviços</H>
      <p>
        2.1. O presente contrato tem por objeto a prestação de serviços profissionais de consultoria
        e assessoria técnica em crédito empresarial pelo CONTRATADO à CONTRATANTE, compreendendo
        análise de elegibilidade, diagnóstico cadastral e financeiro, organização documental,
        montagem de dossiê técnico, orientação estratégica, protocolo e acompanhamento
        administrativo de propostas de crédito junto a instituições financeiras e agentes parceiros
        (incluindo linhas como PRONAMPE, Proger, FINEP, FAMP, BNDES e repasses bancários).
      </p>
      <p>
        2.2. Reabilitação de Crédito. O CONTRATADO prestará serviços de consultoria e assessoria
        voltados à reabilitação de crédito da CONTRATANTE, compreendendo o diagnóstico da situação
        cadastral e financeira, a identificação de restrições junto a órgãos de proteção ao crédito e
        bureaus, e a elaboração de plano de ação para regularização e reestabelecimento da
        capacidade de crédito empresarial.
      </p>
      <p>
        2.3. Melhoria de Rating e Score. O escopo dos serviços inclui estratégias e orientações
        direcionadas à melhoria do rating e do score da CONTRATANTE junto aos órgãos de proteção ao
        crédito e bureaus de crédito, mediante análise de indicadores financeiros, histórico de
        pagamentos, relacionamento com instituições financeiras e adoção de boas práticas de gestão
        cadastral e fiscal.
      </p>
      <p>
        2.4. Mapeamento de Pendências e Apontamentos. O CONTRATADO realizará o mapeamento de
        pendências, restrições e apontamentos passíveis de regularização, indicando as providências
        necessárias para correção cadastral, fiscal e financeira, sem, contudo, assumir obrigação de
        resultado quanto à aprovação futura de operações de crédito.
      </p>
      <p>
        Parágrafo Primeiro. Os serviços possuem natureza exclusivamente consultiva e técnica. O
        CONTRATADO não é instituição financeira, não realiza concessão direta de crédito, não atua
        como correspondente bancário exclusivo de agente financeiro e não garante a aprovação final
        do financiamento, cuja decisão é de competência soberana e exclusiva da instituição
        financeira escolhida.
      </p>
      <p>
        Parágrafo Segundo. A decisão quanto ao limite liberado, taxa de juros, prazo de amortização,
        carência e exigência de garantias ou avalistas compete unicamente ao agente financeiro
        concedente.
      </p>


      <H>Cláusula 3 – Dos Honorários de Êxito e Forma de Pagamento</H>
      <p>
        3.1. A remuneração do CONTRATADO adota o modelo 100% ÊXITO. A CONTRATANTE pagará ao
        CONTRATADO honorários de êxito correspondentes a 5% (cinco por cento) sobre o valor bruto do
        crédito efetivamente aprovado, contratado e liberado pela instituição financeira.
      </p>
      <p>
        §1º Fato Gerador: O fato gerador da obrigação de pagamento é a efetiva disponibilização,
        crédito, liberação ou desembolso dos recursos na conta bancária da CONTRATANTE ou de seus
        sócios/garantidores por ela indicados.
      </p>
      <p>
        §2º Prazo de Pagamento: Os honorários deverão ser pagos pela CONTRATANTE em até 2 (dois)
        dias úteis contados da efetiva liberação dos recursos na conta, via PIX ou transferência
        bancária para a conta oficial do CONTRATADO.
      </p>
      <p>
        §3º Liberações Parciais: Em caso de liberação parcelada ou em tranches, os honorários de 5%
        incidirão proporcionalmente sobre o valor de cada parcela disponibilizada.
      </p>
      <p>
        §4º Isenção Prévia: Não haverá qualquer cobrança antecipada de taxa de cadastro, análise
        documental, consulta ou abertura de crédito antes da liberação efetiva do valor.
      </p>

      <H>Cláusula 4 – Dos Deveres da Contratante e Cooperação</H>
      <p>
        4.1. A CONTRATANTE compromete-se a: (i) fornecer informações autênticas e documentos
        verídicos; (ii) atender às solicitações complementares do CONTRATADO e do banco no prazo
        máximo de 48 horas úteis; (iii) comunicar ao CONTRATADO, em até 24 (vinte e quatro) horas, a
        aprovação, assinatura de CCB ou efetiva liberação do crédito na conta bancária; (iv) não
        realizar pleitos duplicados simultâneos com a mesma documentação sem a prévia orientação do
        CONTRATADO para evitar travamento cadastral no sistema bancário.
      </p>

      <H>Cláusula 5 – Da Cláusula Anti-Burla e Boa-Fé Contratual</H>
      <p>
        5.1. Caso a CONTRATANTE, após a montagem do dossiê, encaminhamento de proposta ou aprovação
        do crédito viabilizado pela assessoria do CONTRATADO, tente omitir a liberação dos recursos,
        cancelar este contrato de má-fé ou efetuar a contratação/desembolso diretamente com o agente
        financeiro para eximir-se do pagamento dos honorários, a comissão de 5% (cinco por cento)
        sobre o valor total viabilizado permanecerá integralmente devida.
      </p>
      <p>
        Parágrafo Único. Na hipótese descrita no caput, incidirá ainda multa compensatória
        infracontratual de 10% (dez por cento) sobre o valor total do crédito aprovado, sem prejuízo
        da cobrança judicial de honorários e perdas e danos.
      </p>

      <H>Cláusula 6 – Das Isenções de Responsabilidade</H>
      <p>
        6.1. O CONTRATADO não responde por: (i) reprovação de crédito decorrente de restrições
        cadastrais (SERASA, SPC, CADIN, SCR/BACEN), inconsistências fiscais ou falta de faturamento
        do CONTRATANTE; (ii) alteração unilateral de taxas, limites ou prazos promovida pelo agente
        financeiro; (iii) atrasos decorrentes de trâmites internos operacionais das instituições
        bancárias.
      </p>

      <H>Cláusula 7 – Da Liquidez, Título Executivo e Mora</H>
      <p>
        7.1. O presente contrato, acompanhado do comprovante de liberação do crédito bancário,
        constitui título executivo extrajudicial (art. 784, III, do Código de Processo Civil),
        certo, líquido e exigível.
      </p>
      <p>
        7.2. O atraso no pagamento sujeitará a CONTRATANTE a: (a) multa moratória de 2% (dois por
        cento) sobre o valor devido; (b) juros de mora de 1% (um por cento) ao mês pro rata die; (c)
        correção monetária pelo IPCA; e (d) honorários advocatícios de cobrança de 20% (vinte por
        cento) sobre o montante em atraso.
      </p>

      <H>Cláusula 8 – Da Proteção de Dados (LGPD – Lei 13.709/2018)</H>
      <p>
        8.1. O CONTRATADO tratará os dados pessoais e empresariais da CONTRATANTE, seus sócios e
        garantidores estritamente para a finalidade de análise de elegibilidade, elaboração do
        dossiê e instrução do pleito junto às instituições financeiras.
      </p>
      <p>
        8.2. O CONTRATADO adota medidas técnicas de segurança para proteção dos dados e assume o
        dever de sigilo e confidencialidade, vedada qualquer comercialização com terceiros.
      </p>

      <H>Cláusula 9 – Da Validade da Assinatura Eletrônica e Foro</H>
      <p>
        9.1. As partes reconhecem expressamente a plena validade e eficácia jurídica da assinatura
        deste contrato por meios eletrônicos, digitais e biometria facial, nos termos da MP nº
        2.200-2/2001 e da Lei nº 14.063/2020.
      </p>
      <p>
        9.2. Fica eleito o foro da comarca de São Luís - MA para dirimir eventuais litígios
        decorrentes deste instrumento, com renúncia expressa a qualquer outro.
      </p>
    </article>
  );
}
