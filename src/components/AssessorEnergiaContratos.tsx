import React from "react";

/** Dias corridos do Termo de Capacitação; o contrato definitivo libera depois deles. */
export const DIAS_CAPACITACAO_ENERGIA = 22;
const DIA_MS = 24 * 60 * 60 * 1000;

export interface DadosPrestador {
  nome?: string;
  cpf?: string;
  cnpj?: string;
  email?: string;
  whatsapp?: string;
  cidade?: string;
}

export function diasDesdeCapacitacao(aceitoEm?: string | null): number {
  if (!aceitoEm) return 0;
  const t = new Date(aceitoEm).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.floor((Date.now() - t) / DIA_MS);
}

export function contratoDefinitivoLiberado(aceitoEm?: string | null): boolean {
  return !!aceitoEm && diasDesdeCapacitacao(aceitoEm) >= DIAS_CAPACITACAO_ENERGIA;
}

const v = (x?: string, ph = "") => (x && String(x).trim()) || ph;
const dataBR = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : new Date().toLocaleDateString("pt-BR"));

const CONTRATANTE =
  "DCS SOLUCOES TECNOLOGICAS E SERVICOS FINANCEIROS LTDA, inscrita no CNPJ sob nº 65.668.670/0001-26, com sede em RUA DOS AZULÕES, nº 1, EDIF OFFICE TOWER, SETOR COLUNA 1, SALA 501, RENASCENÇA, São Luís - MA, CEP: 65075-060, doravante denominada CONTRATANTE.";

function Qualificacao({ p }: { p: DadosPrestador }) {
  return (
    <>
      <p><strong>CONTRATANTE:</strong> {CONTRATANTE}</p>
      <p>
        <strong>CONTRATADO(A):</strong> {v(p.nome, "[NOME]")}, inscrito(a) no CPF/CNPJ sob nº {v(p.cnpj || p.cpf, "[CPF/CNPJ]")}, com endereço em {v(p.cidade, "[CIDADE/UF]")}, e-mail {v(p.email, "[E-MAIL]")} e telefone {v(p.whatsapp, "[TELEFONE]")}, doravante denominado(a) PRESTADOR(A).
      </p>
    </>
  );
}

const H = ({ children }: { children: React.ReactNode }) => (
  <h4 className="font-extrabold uppercase text-foreground pt-2">{children}</h4>
);

export function TermoCapacitacaoEnergia({ prestador, aceitoEm }: { prestador: DadosPrestador; aceitoEm?: string | null }) {
  return (
    <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
      <h3 className="font-black text-sm text-foreground">TERMO DE CAPACITAÇÃO INICIAL, PRÁTICA COMERCIAL, VALIDAÇÃO E REMUNERAÇÃO — PROSFEC ENERGY</h3>
      <Qualificacao p={prestador} />
      <p><strong>1. Período inicial.</strong> As partes estabelecem uma etapa inicial de capacitação e avaliação comercial, com duração total de 22 (vinte e dois) dias corridos, dividida em:</p>
      <p>I — <strong>Capacitação:</strong> 7 (sete) dias corridos, destinados à apresentação dos serviços da PROSFEC Energy, dos procedimentos comerciais, das ferramentas disponibilizadas, dos critérios de qualificação de clientes, das regras de conduta e do modelo de remuneração;</p>
      <p>II — <strong>Prática comercial:</strong> 15 (quinze) dias corridos, subsequentes à capacitação, destinados à aplicação prática dos conhecimentos, ao acompanhamento de oportunidades comerciais e à avaliação da qualidade da execução dos serviços.</p>
      <p><strong>2. Finalidade da etapa inicial.</strong> O período inicial tem por finalidade verificar a adaptação técnica e comercial do PRESTADOR ao objeto contratado, considerando a compreensão dos serviços, a qualidade das informações transmitidas aos potenciais clientes, a utilização adequada dos sistemas disponibilizados, o acompanhamento das oportunidades comerciais e o cumprimento das obrigações contratuais.</p>
      <p><strong>3. Remuneração fixa durante o período inicial.</strong> Durante os 22 (vinte e dois) dias iniciais, não será devido o pagamento fixo mensal de R$ 1.850,00 (mil oitocentos e cinquenta reais), ficando o início dessa remuneração condicionado à confirmação da continuidade da prestação dos serviços após a etapa inicial e à formalização correspondente, quando necessária.</p>
      <p><strong>3.1.</strong> A disposição anterior não implica renúncia a valores legalmente devidos por serviços efetivamente prestados, nem afasta obrigações tributárias, trabalhistas ou civis eventualmente aplicáveis conforme a natureza real da relação entre as partes.</p>
      <p><strong>4. Comissões durante o período inicial.</strong> As regras de comissionamento previstas neste contrato serão aplicáveis desde o início das atividades comerciais, inclusive durante a capacitação e a prática comercial, observados os critérios contratuais de apuração, validação e ativação dos contratos, bem como os percentuais, a base de cálculo e os prazos de pagamento estabelecidos neste instrumento e em seu anexo de remuneração.</p>
      <p><strong>4.1.</strong> As comissões efetivamente adquiridas pelo PRESTADOR serão apuradas e pagas conforme as condições contratuais aplicáveis, inclusive se a relação contratual for encerrada ao término do período inicial, respeitados os direitos legalmente assegurados.</p>
      <p><strong>5. Critérios de validação.</strong> Ao final do período inicial, a CONTRATANTE poderá avaliar a continuidade da parceria com base nos critérios descritos nesta cláusula e comunicar ao PRESTADOR a decisão de prosseguir com a contratação ou encerrá-la, observadas as disposições de rescisão deste instrumento e a quitação dos valores devidos.</p>
      <p><strong>6. Autonomia civil.</strong> A capacitação e a avaliação comercial não estabelecem, por si só, vínculo empregatício, controle de jornada ou obrigação de disponibilidade em horários fixos. O PRESTADOR mantém autonomia na organização de seus horários, métodos e meios de execução, respeitados os resultados contratados, os padrões comerciais acordados e as obrigações de confidencialidade, proteção de dados e conduta profissional.</p>
      <p><strong>7. Continuidade contratual.</strong> A continuidade da prestação de serviços após o período inicial ficará sujeita à confirmação entre as partes, passando a remuneração fixa mensal de R$ 1.850,00 (mil oitocentos e cinquenta reais) a ser aplicável a partir da data de início da etapa regular, observadas as demais condições financeiras e contratuais.</p>
      <p><strong>8. Encerramento da etapa inicial.</strong> Caso a contratação não tenha continuidade, permanecerão exigíveis as comissões adquiridas e os demais valores eventualmente devidos nos termos deste contrato e da legislação aplicável, sem prejuízo das obrigações que, por sua natureza, sobrevivam ao encerramento da relação contratual.</p>
      <p className="pt-2">São Luís - MA, {dataBR(aceitoEm)}.</p>
    </div>
  );
}

export function ContratoPrestacaoEnergia({ prestador, aceitoEm }: { prestador: DadosPrestador; aceitoEm?: string | null }) {
  const L = (t: string, i: number) => <p key={i}>{t}</p>;
  return (
    <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
      <h3 className="font-black text-sm text-foreground">CONTRATO DE PRESTAÇÃO DE SERVIÇOS COMERCIAIS AUTÔNOMOS — PROSFEC ENERGY</h3>
      <p>Pelo presente instrumento particular, as partes abaixo identificadas:</p>
      <Qualificacao p={prestador} />
      <p>As partes resolvem celebrar o presente Contrato de Prestação de Serviços Comerciais Autônomos, mediante as cláusulas seguintes.</p>
      <H>Cláusula 1ª — Do objeto</H>
      {[
        "1.1. O presente contrato tem por objeto a prestação autônoma de serviços comerciais relacionados à PROSFEC Energy, compreendendo atividades de prospecção, identificação de potenciais clientes, apresentação de soluções de energia solar por assinatura, qualificação de oportunidades, acompanhamento comercial, follow-up e apoio à condução das oportunidades até a formalização e ativação dos contratos.",
        "1.2. Os serviços serão executados conforme os procedimentos comerciais, as informações técnicas e os limites de atuação disponibilizados pela CONTRATANTE.",
        "1.3. O(A) PRESTADOR(A) não possui poderes para representar juridicamente a CONTRATANTE, assumir obrigações em seu nome, conceder descontos, alterar condições comerciais, prometer resultados ou firmar compromissos não expressamente autorizados.",
        "1.4. A celebração e a ativação de contratos com clientes dependem das etapas de validação e aprovação estabelecidas pela operação responsável.",
      ].map(L)}
      <H>Cláusula 2ª — Da natureza da contratação e da autonomia</H>
      {[
        "2.1. A relação contratual possui natureza civil de prestação de serviços autônomos, não constituindo, por si só, contrato de emprego.",
        "2.2. O(A) PRESTADOR(A) terá autonomia para organizar seus horários, métodos de execução e rotina de trabalho, respeitados os compromissos assumidos, os prazos acordados, a legislação aplicável e os requisitos objetivos de qualidade e segurança da operação.",
        "2.3. Não haverá controle de jornada, exigência de cumprimento de horário diário fixo ou obrigação de permanência on-line em período predeterminado, sem prejuízo da comunicação necessária à execução dos serviços contratados.",
        "2.4. O(A) PRESTADOR(A) poderá atender outros clientes e desenvolver outras atividades profissionais, desde que respeite as obrigações de confidencialidade, proteção de dados, prevenção de conflitos de interesse e demais deveres previstos neste instrumento.",
        "2.5. O(A) PRESTADOR(A) poderá aceitar ou recusar novas demandas que não estejam abrangidas pelos serviços já contratados, observadas as obrigações específicas previamente assumidas.",
        "2.6. Metas comerciais, indicadores de desempenho, padrões de qualidade e regras de comissionamento poderão ser utilizados para mensurar resultados, sem que, isoladamente, representem controle de jornada ou subordinação jurídica.",
        "2.7. As partes reconhecem que a caracterização da relação jurídica dependerá também das condições efetivas da prestação dos serviços, não bastando a denominação deste contrato.",
      ].map(L)}
      <H>Cláusula 3ª — Das obrigações do(a) prestador(a)</H>
      <p>São obrigações do(a) PRESTADOR(A):</p>
      {[
        "a) Executar os serviços com diligência, boa-fé, profissionalismo e observância da legislação aplicável;",
        "b) Realizar a prospecção e o atendimento comercial de maneira ética, respeitosa e transparente;",
        "c) Fornecer aos potenciais clientes informações comerciais corretas e atualizadas, utilizando os materiais oficiais disponibilizados;",
        "d) Não garantir economia, aprovação, contratação, prazo ou resultado que não tenha sido formalmente confirmado;",
        "e) Registrar as informações pertinentes às oportunidades trabalhadas no CRM disponibilizado, observadas as regras de acesso e proteção de dados;",
        "f) Manter confidenciais os dados comerciais, documentos, informações de clientes, procedimentos internos e materiais não públicos da CONTRATANTE;",
        "g) Utilizar os Leads e os recursos disponibilizados exclusivamente para as finalidades autorizadas;",
        "h) Informar erros, suspeitas de fraude, incidentes de segurança e inconsistências relevantes de que tenha conhecimento;",
        "i) Não receber valores de clientes em nome da CONTRATANTE, salvo autorização expressa e procedimento formal específico;",
        "j) Não alterar contratos, propostas, preços ou condições de contratação sem autorização;",
        "k) Devolver ou eliminar, conforme orientação legítima da CONTRATANTE e a legislação aplicável, os documentos e dados sob sua guarda ao término da relação.",
      ].map(L)}
      <H>Cláusula 4ª — Das obrigações da contratante</H>
      <p>São obrigações da CONTRATANTE:</p>
      {[
        "a) Disponibilizar as informações comerciais, os materiais e as orientações necessários à prestação dos serviços;",
        "b) Conceder, quando previsto na operação, acesso ao CRM, aos Leads e às ferramentas comerciais pertinentes;",
        "c) Disponibilizar treinamento e informações sobre os produtos, procedimentos e critérios de validação comercial;",
        "d) Informar as regras vigentes de remuneração e comissionamento, inclusive alterações futuras, com antecedência razoável;",
        "e) Apurar e pagar os valores devidos conforme as condições e os prazos deste contrato;",
        "f) Disponibilizar demonstrativo de cálculo das comissões, quando houver remuneração variável;",
        "g) Tratar os dados pessoais do(a) PRESTADOR(A) e dos clientes conforme a legislação aplicável;",
        "h) Informar alterações relevantes nos procedimentos operacionais que afetem a execução dos serviços.",
      ].map(L)}
      <H>Cláusula 5ª — Da remuneração fixa contratual</H>
      {[
        "5.1. Pela prestação dos serviços contratados, a CONTRATANTE pagará ao(à) PRESTADOR(A) o valor mensal de R$ 1.850,00 (mil oitocentos e cinquenta reais), sujeito às condições contratuais e à efetiva prestação dos serviços no período correspondente.",
        "5.2. O pagamento será realizado até o dia [DIA] do mês subsequente ao período de referência, mediante apresentação do documento fiscal ou recibo legalmente aplicável e cumprimento das formalidades tributárias pertinentes.",
        "5.3. O valor previsto nesta cláusula constitui remuneração civil contratual pelos serviços prestados, não sendo denominado salário ou benefício trabalhista neste instrumento.",
        "5.4. Em caso de início ou encerramento do contrato durante o mês, o valor será calculado proporcionalmente aos dias de vigência e de efetiva prestação dos serviços, conforme critério previamente acordado, ressalvados valores já adquiridos e outras disposições legais aplicáveis.",
        "5.5. A remuneração fixa não substitui nem absorve as comissões que forem devidas nos termos da cláusula seguinte.",
        "5.6. Eventuais despesas extraordinárias somente serão reembolsadas quando previamente autorizadas pela CONTRATANTE e comprovadas documentalmente.",
      ].map(L)}
      <H>Cláusula 6ª — Do comissionamento</H>
      {[
        "6.1. Além da remuneração fixa, o(a) PRESTADOR(A) poderá receber comissão variável conforme o desempenho comercial mensal, observadas as seguintes faixas de referência:",
        "Produção mensal de 15.000 kWh: 5%;",
        "Produção mensal de 20.000 kWh: 7%;",
        "Produção mensal de 30.000 kWh: 9%.",
        "6.2. A faixa aplicável será determinada de acordo com a produção mensal elegível e validada, conforme os critérios objetivos do plano de comissionamento vigente, previamente disponibilizado e aceito pelas partes.",
        "6.3. A base monetária sobre a qual incidirá o percentual deverá constar de anexo comercial assinado pelas partes, especificando a fórmula de cálculo, o valor econômico de referência por kWh, o tratamento de contratos com diferentes condições e a regra de enquadramento entre as faixas.",
        "6.4. As partes reconhecem que kWh é uma unidade de energia e, isoladamente, não constitui valor monetário. Portanto, o percentual não poderá ser calculado sem a definição expressa da base econômica aplicável.",
        "6.5. Para fins de comissionamento, serão considerados somente contratos que atendam aos critérios de validação e ativação estabelecidos na operação e que estejam devidamente registrados nos sistemas oficiais.",
        "6.6. A mera indicação de um Lead, realização de contato, envio de proposta ou existência de contrato pendente não gera, isoladamente, direito à comissão.",
        "6.7. Contratos cancelados ou não validados não serão considerados para comissionamento, observadas as regras de aquisição do direito à comissão, os valores já devidos e a legislação aplicável.",
        "6.8. A CONTRATANTE disponibilizará demonstrativo contendo, sempre que aplicável, os contratos considerados, a produção validada, a base de cálculo, o percentual aplicado e o valor final da comissão.",
        "6.9. O pagamento das comissões será realizado até o dia [DIA] do mês subsequente à apuração, respeitadas as condições de validação e os prazos de confirmação da operação.",
        "6.10. Alterações no plano de comissionamento deverão ser formalizadas por escrito e não poderão eliminar retroativamente comissões já adquiridas.",
        "6.11. Divergências de cálculo deverão ser comunicadas por escrito, com indicação dos contratos ou valores questionados, para conferência e eventual correção.",
      ].map(L)}
      <H>Cláusula 7ª — Dos leads, do CRM e das ferramentas</H>
      {[
        "7.1. Os Leads, dados comerciais, materiais, sistemas, credenciais e demais recursos disponibilizados pela CONTRATANTE destinam-se exclusivamente à execução dos serviços contratados.",
        "7.2. O(A) PRESTADOR(A) deverá manter as credenciais sob sigilo, não compartilhá-las com terceiros não autorizados e comunicar imediatamente eventual acesso indevido.",
        "7.3. O(A) PRESTADOR(A) não poderá vender, copiar para fins não autorizados, transferir ou utilizar a base de Leads em benefício próprio ou de terceiros.",
        "7.4. Os registros comerciais deverão ser mantidos atualizados e corretos, respeitando as regras de acesso e as finalidades autorizadas.",
        "7.5. Encerrado o contrato, os acessos poderão ser revogados e os materiais, documentos e dados deverão ser devolvidos ou eliminados conforme as instruções da CONTRATANTE e a legislação aplicável.",
      ].map(L)}
      <H>Cláusula 8ª — Da confidencialidade</H>
      {[
        "8.1. São confidenciais as informações comerciais, estratégicas, financeiras, operacionais, técnicas, cadastrais e contratuais não públicas às quais o(a) PRESTADOR(A) tiver acesso em razão deste contrato.",
        "8.2. O(A) PRESTADOR(A) compromete-se a não divulgar, reproduzir ou utilizar tais informações para finalidade estranha à execução dos serviços, salvo autorização expressa ou obrigação legal.",
        "8.3. A obrigação não abrange informações comprovadamente públicas, legitimamente conhecidas antes do acesso ou cuja divulgação seja exigida por autoridade competente, observado o dever de comunicação quando legalmente permitido.",
        "8.4. O dever de confidencialidade permanecerá vigente após o encerramento do contrato enquanto as informações mantiverem natureza confidencial ou estiverem protegidas por lei.",
      ].map(L)}
      <H>Cláusula 9ª — Da proteção de dados pessoais</H>
      {[
        "9.1. As partes comprometem-se a observar a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais — LGPD).",
        "9.2. O(A) PRESTADOR(A) tratará dados pessoais somente para as finalidades autorizadas e conforme as instruções legítimas aplicáveis à operação, mantendo medidas de segurança compatíveis com os riscos.",
        "9.3. É vedado utilizar dados de clientes ou Leads para finalidades próprias, compartilhá-los sem autorização ou mantê-los além do necessário, ressalvadas as hipóteses legais.",
        "9.4. Incidentes de segurança, perda de dispositivos, exposição de dados ou acessos indevidos deverão ser comunicados imediatamente à CONTRATANTE.",
        "9.5. Cada parte responderá pelas obrigações legais e pelos danos que lhe forem atribuíveis, conforme sua atuação, suas responsabilidades e a legislação aplicável.",
      ].map(L)}
      <H>Cláusula 10ª — Da conduta comercial e da responsabilidade</H>
      {[
        "10.1. O(A) PRESTADOR(A) deverá utilizar somente informações oficiais e condições comerciais autorizadas pela CONTRATANTE.",
        "10.2. É vedado prometer economia específica, aprovação garantida, resultado financeiro certo ou qualquer condição não confirmada pela operação responsável.",
        "10.3. Cada parte responderá pelos danos diretos comprovadamente causados por sua conduta ilícita, dolo, culpa ou descumprimento contratual, conforme a legislação aplicável.",
        "10.4. Não haverá transferência automática de responsabilidade por qualquer prejuízo à outra parte. A apuração deverá considerar a conduta, o nexo causal, a extensão do dano e as circunstâncias do caso.",
        "10.5. Nenhuma disposição deste instrumento afasta direitos ou responsabilidades que sejam legalmente indisponíveis.",
      ].map(L)}
      <H>Cláusula 11ª — Dos tributos e das obrigações legais</H>
      {[
        "11.1. Cada parte cumprirá as obrigações fiscais, previdenciárias e cadastrais que lhe forem legalmente atribuídas.",
        "11.2. Quando o(a) PRESTADOR(A) atuar como pessoa física, os pagamentos estarão sujeitos às retenções, contribuições e formalidades exigidas pela legislação aplicável, conforme o enquadramento concreto.",
        "11.3. Quando atuar por pessoa jurídica, o(a) PRESTADOR(A) deverá manter seu cadastro regular e emitir a documentação fiscal correspondente, observadas as regras tributárias aplicáveis.",
        "11.4. A adoção de CPF ou CNPJ não altera, por si só, a natureza jurídica efetiva da relação nem afasta obrigações legais eventualmente incidentes.",
      ].map(L)}
      <H>Cláusula 12ª — Da vigência</H>
      {[
        `12.1. O presente contrato terá prazo indeterminado, iniciando-se em ${dataBR(aceitoEm)}.`,
        "12.2. A continuidade da prestação de serviços dependerá do interesse das partes e da observância das obrigações assumidas neste instrumento.",
        "12.3. Qualquer alteração contratual deverá ser formalizada por escrito, inclusive por aditivo eletrônico com comprovação de aceite.",
      ].map(L)}
      <H>Cláusula 13ª — Da rescisão</H>
      {[
        "13.1. Qualquer parte poderá encerrar o contrato mediante comunicação escrita com antecedência de 15 (quinze) dias.",
        "13.2. O contrato poderá ser encerrado imediatamente em caso de fraude, violação grave de confidencialidade, uso indevido de dados, desvio de recursos, falsificação de registros ou outro descumprimento grave devidamente fundamentado.",
        "13.3. No encerramento, a CONTRATANTE deverá apurar e pagar os valores fixos proporcionais e as comissões já adquiridas, conforme as regras contratuais e a legislação aplicável.",
        "13.4. Contratos em andamento na data do encerramento serão tratados conforme os critérios objetivos de atribuição, validação e aquisição de comissão previstos no anexo comercial, sem perda automática de valores já adquiridos.",
        "13.5. As partes deverão providenciar a devolução de materiais, a revogação de acessos e o tratamento adequado dos dados sob sua responsabilidade.",
        "13.6. O encerramento não afasta obrigações de confidencialidade, proteção de dados, prestação de contas e pagamento de valores vencidos.",
      ].map(L)}
      <H>Cláusula 14ª — Da ausência de poderes de representação</H>
      {[
        "14.1. O(A) PRESTADOR(A) não poderá assumir obrigações, celebrar contratos em nome da CONTRATANTE, receber pagamentos ou conceder condições comerciais em nome desta sem autorização expressa.",
        "14.2. Caso a atividade concreta venha a caracterizar representação comercial autônoma ou outra modalidade sujeita a legislação específica, as partes deverão revisar este instrumento e cumprir os requisitos legais correspondentes.",
      ].map(L)}
      <H>Cláusula 15ª — Das comunicações e dos registros</H>
      {[
        "15.1. As comunicações contratuais poderão ocorrer pelos e-mails e números de telefone indicados na qualificação das partes, desde que seja possível comprovar seu envio e conteúdo.",
        "15.2. Avisos de rescisão, alterações de remuneração e notificações relativas a descumprimentos deverão ser registrados por meio que permita demonstrar seu recebimento.",
        "15.3. As partes comprometem-se a manter seus dados cadastrais atualizados durante a vigência do contrato.",
      ].map(L)}
      <H>Cláusula 16ª — Das disposições gerais</H>
      {[
        "16.1. A tolerância de uma parte quanto a eventual descumprimento não implicará renúncia de direitos ou alteração automática deste contrato.",
        "16.2. Se alguma disposição for considerada inválida, as demais permanecerão vigentes na medida permitida pela legislação.",
        "16.3. Este contrato e seus anexos formalmente aceitos constituem o acordo entre as partes sobre o objeto aqui descrito.",
        "16.4. As partes declaram que tiveram oportunidade de ler, compreender e esclarecer as disposições contratuais antes da assinatura.",
      ].map(L)}
      <H>Cláusula 17ª — Do foro</H>
      <p>17.1. Fica eleito o foro da comarca de São Luís - MA, ressalvadas as regras legais de competência obrigatória e os direitos de acesso à Justiça.</p>
      <p>E, por estarem de acordo, as partes aceitam o presente instrumento eletronicamente.</p>
      <p>São Luís - MA, {dataBR(aceitoEm)}.</p>
      <H>Anexo I — Plano de remuneração e comissionamento</H>
      {[
        "1. Remuneração fixa mensal: R$ 1.850,00.",
        "2. Meta mínima de produção para início do comissionamento: 15.000 kWh/mês.",
        "3. Faixas de referência: 15.000 kWh/mês: 5%; 20.000 kWh/mês: 7%; 30.000 kWh/mês: 9%.",
        "4. Base monetária de cálculo: [DESCREVER O VALOR ECONÔMICO APLICÁVEL E SUA FÓRMULA].",
        "5. Regra de enquadramento: [DEFINIR SE O PERCENTUAL INCIDE SOBRE TODA A BASE DO MÊS OU SOMENTE SOBRE FAIXAS INCREMENTAIS].",
        "6. Critérios de validação e ativação: [DESCREVER].",
        "7. Data de fechamento da apuração: [DIA].",
        "8. Data de pagamento: [DIA].",
        "9. Procedimento para contestação do demonstrativo: [PRAZO E CANAL].",
        "As partes declaram que leram e aceitaram este anexo, que integra o contrato principal.",
      ].map(L)}
    </div>
  );
}

/** Modal bloqueante de aceite obrigatório. */
export function AceiteContratoModal({
  titulo,
  children,
  onAceitar,
  salvando,
}: {
  titulo: string;
  children: React.ReactNode;
  onAceitar: () => void;
  salvando: boolean;
}) {
  const [li, setLi] = React.useState(false);
  return (
    <div className="fixed inset-0 z-[200] bg-foreground/60 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="bg-card text-card-foreground w-full max-w-3xl max-h-[92vh] rounded-2xl border border-border shadow-2xl flex flex-col">
        <div className="p-5 border-b border-border">
          <h2 className="font-black text-base text-foreground">{titulo}</h2>
          <p className="text-xs text-muted-foreground mt-1">Leia o documento completo. O aceite é obrigatório para continuar usando o painel.</p>
        </div>
        <div className="flex-1 overflow-y-auto p-5 bg-muted/40">{children}</div>
        <div className="p-5 border-t border-border space-y-3">
          <label className="flex items-start gap-2 text-xs text-foreground cursor-pointer">
            <input type="checkbox" checked={li} onChange={(e) => setLi(e.target.checked)} className="mt-0.5" />
            <span>Declaro que li, compreendi e concordo com todas as cláusulas deste documento.</span>
          </label>
          <button
            type="button"
            disabled={!li || salvando}
            onClick={onAceitar}
            className="w-full min-h-[44px] rounded-xl bg-primary text-primary-foreground text-sm font-extrabold disabled:opacity-50 cursor-pointer"
          >
            {salvando ? "Registrando aceite..." : "Li e Aceito"}
          </button>
        </div>
      </div>
    </div>
  );
}
