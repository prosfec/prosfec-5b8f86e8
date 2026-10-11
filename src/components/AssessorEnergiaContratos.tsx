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
      <h3 className="font-black text-sm text-foreground">TERMO DE CONTRATO DE PRESTAÇÃO DE SERVIÇOS COMERCIAIS AUTÔNOMOS — PROSFEC ENERGY</h3>
      <p>Pelo presente instrumento particular, as partes abaixo identificadas:</p>
      <p><strong>CONTRATANTE:</strong> {CONTRATANTE.replace(", doravante denominada CONTRATANTE.", "")}, neste ato representada na forma de seus atos constitutivos.</p>
      <p>
        <strong>PRESTADOR:</strong> {v(prestador.nome, "[NOME COMPLETO OU RAZÃO SOCIAL]")}, inscrito no CPF/CNPJ sob nº {v(prestador.cnpj || prestador.cpf, "[CPF/CNPJ]")}, com endereço em {v(prestador.cidade, "[ENDEREÇO]")}, e-mail {v(prestador.email, "[E-MAIL]")} e telefone {v(prestador.whatsapp, "[TELEFONE]")}.
      </p>
      <p>Resolvem celebrar o presente Contrato de Prestação de Serviços Comerciais Autônomos, conforme as cláusulas e condições seguintes.</p>
      <H>Cláusula 1 — Objeto do contrato</H>
      {[
        "1.1. O presente contrato tem por objeto a prestação autônoma de serviços comerciais relacionados à PROSFEC Energy, incluindo:",
        "a) prospecção e identificação de potenciais clientes interessados em soluções de energia por assinatura;",
        "b) apresentação comercial dos serviços e das condições disponibilizadas pela CONTRATANTE;",
        "c) qualificação de oportunidades comerciais e levantamento de informações necessárias à contratação;",
        "d) acompanhamento de propostas e relacionamento comercial com potenciais clientes;",
        "e) apoio ao processo de formalização, validação e ativação dos contratos;",
        "f) registro e atualização das informações comerciais nos sistemas disponibilizados pela CONTRATANTE;",
        "g) demais atividades comerciais relacionadas ao objeto contratual, previamente acordadas entre as partes.",
        "1.2. O PRESTADOR não possui poderes para representar juridicamente a CONTRATANTE, assumir obrigações em seu nome, conceder descontos não autorizados ou alterar condições comerciais sem autorização expressa.",
      ].map(L)}
      <H>Cláusula 2 — Natureza da contratação e autonomia</H>
      {[
        "2.1. A contratação possui natureza civil e tem como finalidade a prestação autônoma dos serviços descritos neste instrumento, observadas as disposições legais aplicáveis.",
        "2.2. O PRESTADOR terá autonomia para organizar seus horários, métodos e meios de execução, respeitados os compromissos assumidos, os prazos comerciais acordados e os padrões de qualidade e segurança aplicáveis aos serviços.",
        "2.3. Não haverá controle de jornada, exigência de cumprimento de horário fixo ou obrigação de disponibilidade permanente por parte do PRESTADOR.",
        "2.4. O PRESTADOR poderá prestar serviços a terceiros, desde que essa atividade não implique conflito de interesses, violação de confidencialidade, utilização indevida de informações da CONTRATANTE ou descumprimento das obrigações assumidas neste contrato.",
        "2.5. A participação em capacitações, a utilização dos sistemas comerciais e a observância dos procedimentos necessários à execução dos serviços não deverão ser utilizadas para impor subordinação incompatível com a natureza autônoma da contratação.",
        "2.6. As partes reconhecem que a natureza jurídica da relação será determinada pelas condições efetivamente praticadas, não apenas pela denominação atribuída a este instrumento.",
      ].map(L)}
      <H>Cláusula 3 — Capacitação inicial, prática comercial e validação</H>
      {[
        "3.1. O início da prestação dos serviços compreenderá uma etapa inicial de 22 (vinte e dois) dias corridos, dividida em:",
        "I — Capacitação: 7 (sete) dias corridos destinados à apresentação dos serviços, procedimentos comerciais, ferramentas, critérios de qualificação de clientes, regras de conduta e modelo de remuneração;",
        "II — Prática comercial: 15 (quinze) dias corridos subsequentes, destinados à aplicação prática dos conhecimentos e à avaliação da qualidade dos serviços executados.",
        "3.2. A avaliação poderá considerar a compreensão dos serviços, a qualidade das informações transmitidas aos clientes, a utilização dos sistemas comerciais, o acompanhamento das oportunidades e o cumprimento das obrigações contratuais.",
        "3.3. Ao término da etapa inicial, a CONTRATANTE poderá confirmar a continuidade da contratação ou optar pelo encerramento contratual, observadas as disposições de rescisão e o pagamento dos valores devidos.",
        "3.4. Durante os 22 (vinte e dois) dias iniciais, não será devido o pagamento fixo mensal previsto na Cláusula 4, ficando seu início condicionado à confirmação da continuidade contratual. Essa condição não afasta o pagamento de comissões adquiridas nem de outros valores legalmente devidos.",
        "3.5. As regras de comissionamento previstas neste contrato serão aplicáveis desde o início das atividades, inclusive durante a capacitação e a prática comercial, observados os critérios de elegibilidade e apuração.",
        "3.6. A etapa inicial não constitui período de experiência regido pela legislação trabalhista nem afasta eventual enquadramento jurídico decorrente das condições reais da prestação dos serviços.",
      ].map(L)}
      <H>Cláusula 4 — Remuneração fixa e ajuda de custo</H>
      {[
        "4.1. Confirmada a continuidade da contratação após a etapa inicial, o PRESTADOR fará jus ao pagamento mensal fixo de R$ 1.850,00 (mil oitocentos e cinquenta reais), denominado pelas partes ajuda de custo fixa mensal, nos termos deste contrato.",
        "4.2. O pagamento será realizado até o quinto dia útil de cada mês, referente ao período mensal anterior, observadas as condições de início da remuneração previstas na Cláusula 3.",
        "4.3. O pagamento será efetuado por transferência bancária ou outro meio acordado entre as partes, mediante apresentação de nota fiscal ou recibo legalmente aplicável, conforme a natureza jurídica do PRESTADOR.",
        "4.4. A remuneração fixa não substitui as comissões previstas no Anexo I, que serão apuradas e pagas separadamente.",
        "4.5. A denominação “ajuda de custo” não altera, por si só, a natureza jurídica do pagamento, que será determinada conforme sua finalidade, os fatos da contratação e a legislação aplicável.",
      ].map(L)}
      <H>Cláusula 5 — Comissionamento</H>
      {[
        "5.1. Além da remuneração fixa, quando aplicável, o PRESTADOR poderá receber comissões variáveis conforme a produção comercial mensal validada, observadas as faixas e os percentuais estabelecidos no Anexo I.",
        "5.2. A meta mínima para início do comissionamento será de 15.000 kWh por mês, considerando o volume de energia correspondente aos contratos elegíveis atribuídos ao PRESTADOR e devidamente validados.",
        "5.3. O fechamento mensal da produção para apuração das comissões ocorrerá todo dia 10, e o pagamento das comissões apuradas será realizado todo dia 25, conforme o Anexo I.",
        "5.4. A comissão será calculada de forma progressiva, conforme as faixas de produção e o valor econômico correspondente ao volume de energia comercializado, expresso em kWh.",
        "5.5. A CONTRATANTE disponibilizará demonstrativo da apuração, permitindo a conferência da produção validada, das faixas aplicadas e dos valores de comissão.",
        "5.6. As comissões adquiridas e os demais valores devidos não poderão ser eliminados exclusivamente em razão do encerramento posterior do contrato, observadas as regras contratuais e a legislação aplicável.",
      ].map(L)}
      <H>Cláusula 6 — Obrigações do prestador</H>
      <p>São obrigações do PRESTADOR:</p>
      {[
        "a) executar os serviços com diligência, boa-fé e profissionalismo;",
        "b) transmitir informações corretas e autorizadas sobre os serviços e as condições comerciais;",
        "c) não prometer economia, aprovação, descontos ou resultados garantidos sem respaldo nas condições oficiais da operação;",
        "d) manter atualizados os registros comerciais sob sua responsabilidade;",
        "e) proteger os dados, documentos, credenciais e informações a que tiver acesso;",
        "f) utilizar os sistemas, materiais e informações da CONTRATANTE exclusivamente para as finalidades autorizadas;",
        "g) não receber valores de clientes em nome da CONTRATANTE sem autorização formal;",
        "h) comunicar irregularidades, reclamações relevantes ou problemas identificados durante a execução dos serviços;",
        "i) cumprir as normas aplicáveis de proteção de dados, confidencialidade e integridade comercial;",
        "j) responder pelos atos que praticar em desacordo com este contrato ou com a legislação aplicável.",
      ].map(L)}
      <H>Cláusula 7 — Obrigações da contratante</H>
      <p>São obrigações da CONTRATANTE:</p>
      {[
        "a) disponibilizar informações e materiais comerciais necessários à execução dos serviços;",
        "b) fornecer acesso às ferramentas e aos sistemas autorizados, quando aplicável;",
        "c) informar as condições comerciais vigentes e os critérios operacionais de validação das operações;",
        "d) realizar os pagamentos devidos nos prazos estabelecidos;",
        "e) disponibilizar demonstrativos de produção e comissionamento;",
        "f) comunicar alterações relevantes nos procedimentos comerciais;",
        "g) tratar os dados pessoais aos quais tiver acesso em conformidade com a legislação aplicável.",
      ].map(L)}
      <H>Cláusula 8 — Validação dos contratos e produção</H>
      {[
        "8.1. Para fins de apuração de produção, serão considerados os contratos atribuídos ao PRESTADOR e registrados nos sistemas oficiais da CONTRATANTE, desde que atendam aos critérios de contratação, validação e ativação aplicáveis à operação.",
        "8.2. Leads, propostas não aceitas e contratos pendentes de validação não serão contabilizados como produção validada.",
        "8.3. O volume em kWh deverá ser comprovável por registro operacional, documentação ou informação fornecida pela empresa responsável pela operação de energia.",
        "8.4. Eventuais cancelamentos, estornos ou ajustes serão tratados conforme as regras de elegibilidade, os direitos já adquiridos e a legislação aplicável.",
      ].map(L)}
      <H>Cláusula 9 — Confidencialidade</H>
      {[
        "9.1. O PRESTADOR deverá manter sigilo sobre informações comerciais, financeiras, operacionais, estratégicas, contratuais e cadastrais da CONTRATANTE e de seus clientes.",
        "9.2. As informações confidenciais não poderão ser divulgadas, reproduzidas, comercializadas ou utilizadas para finalidade estranha à execução dos serviços sem autorização expressa.",
        "9.3. A obrigação de confidencialidade permanecerá vigente durante o contrato e após seu encerramento, enquanto as informações mantiverem natureza confidencial ou estiverem protegidas por lei.",
        "9.4. Não serão consideradas confidenciais as informações comprovadamente públicas, obtidas legitimamente de terceiros sem dever de sigilo ou cuja divulgação seja exigida por obrigação legal.",
      ].map(L)}
      <H>Cláusula 10 — Proteção de dados pessoais</H>
      {[
        "10.1. As partes comprometem-se a cumprir a Lei nº 13.709/2018 — Lei Geral de Proteção de Dados Pessoais (LGPD).",
        "10.2. O PRESTADOR utilizará os dados pessoais acessados exclusivamente para as finalidades autorizadas e relacionadas à execução dos serviços.",
        "10.3. O PRESTADOR deverá adotar medidas razoáveis de segurança, não compartilhar credenciais e comunicar prontamente qualquer incidente ou suspeita de acesso indevido.",
        "10.4. Encerrado o contrato, os dados e documentos deverão ser devolvidos, eliminados ou mantidos conforme instruções legítimas da CONTRATANTE e exigências legais aplicáveis.",
      ].map(L)}
      <H>Cláusula 11 — Responsabilidade e conduta comercial</H>
      {[
        "11.1. Cada parte responderá pelos danos que causar à outra ou a terceiros em decorrência de ação ou omissão ilícita, dolo, culpa ou descumprimento contratual, conforme a legislação aplicável.",
        "11.2. O PRESTADOR não poderá alterar contratos, assumir obrigações financeiras, oferecer garantias em nome da CONTRATANTE ou divulgar informações comerciais não autorizadas.",
        "11.3. Nenhuma disposição deste instrumento exclui responsabilidade legal que não possa ser afastada por acordo entre as partes.",
      ].map(L)}
      <H>Cláusula 12 — Tributos e regularidade</H>
      {[
        "12.1. Cada parte será responsável pelas obrigações tributárias e acessórias que lhe couberem, conforme sua natureza jurídica e a legislação aplicável.",
        "12.2. O PRESTADOR deverá fornecer os documentos fiscais ou recibos legalmente exigíveis para o pagamento dos valores contratados.",
        "12.3. A contratação de pessoa física ou jurídica não afasta a aplicação das normas legais pertinentes à situação concreta.",
      ].map(L)}
      <H>Cláusula 13 — Prazo e vigência</H>
      {[
        "13.1. O presente contrato entra em vigor na data de sua assinatura e terá prazo indeterminado, salvo se as partes estipularem prazo específico por escrito.",
        "13.2. A etapa inicial de capacitação e prática comercial observará o disposto na Cláusula 3.",
        "13.3. A continuidade da prestação após a etapa inicial dependerá da confirmação entre as partes, observadas as condições deste instrumento.",
      ].map(L)}
      <H>Cláusula 14 — Rescisão</H>
      {[
        "14.1. Qualquer parte poderá encerrar o contrato mediante comunicação escrita com antecedência de 15 (quinze) dias, salvo acordo diverso entre as partes ou hipótese legal de encerramento imediato.",
        "14.2. O contrato poderá ser encerrado imediatamente em caso de violação grave de confidencialidade, fraude, uso indevido de dados, prática ilícita ou descumprimento contratual relevante, observada a legislação aplicável.",
        "14.3. No encerramento, serão apurados e pagos os valores fixos devidos, quando aplicáveis, as comissões adquiridas e os demais valores exigíveis até a data de término, respeitadas as regras contratuais e legais.",
        "14.4. O encerramento não afasta as obrigações de confidencialidade, proteção de dados, prestação de contas e outras que, por sua natureza, devam permanecer vigentes.",
      ].map(L)}
      <H>Cláusula 15 — Comunicações e alterações</H>
      {[
        "15.1. As comunicações formais relativas a este contrato poderão ser realizadas por e-mail ou outro canal escrito acordado entre as partes.",
        "15.2. Alterações de remuneração, percentuais, critérios de produção ou demais condições essenciais deverão ser formalizadas por escrito e aceitas por ambas as partes.",
        "15.3. A tolerância de uma parte quanto ao descumprimento pontual de obrigação não implicará renúncia de direito nem alteração automática do contrato.",
      ].map(L)}
      <H>Cláusula 16 — Disposições gerais</H>
      {[
        "16.1. O Anexo I integra este contrato para todos os fins.",
        "16.2. Caso alguma disposição seja considerada inválida ou inexequível, as demais permanecerão vigentes na extensão permitida pela legislação.",
        "16.3. Este instrumento não autoriza qualquer das partes a assumir obrigações em nome da outra, salvo autorização expressa.",
        "16.4. Se a forma concreta de atuação caracterizar representação comercial ou outra modalidade regulada por legislação específica, as partes deverão observar os requisitos legais correspondentes, independentemente do título atribuído a este contrato.",
      ].map(L)}
      <H>Cláusula 17 — Foro</H>
      <p>17.1. As partes elegem o foro da comarca de São Luís - MA para dirimir controvérsias decorrentes deste contrato, respeitadas as regras legais de competência aplicáveis.</p>
      <p>E, por estarem de acordo, as partes firmam o presente termo eletronicamente.</p>
      <Assinaturas prestador={prestador} aceitoEm={aceitoEm} />
      <H>Anexo I — Plano de remuneração e comissionamento</H>
      {[
        "Este Anexo integra o Contrato de Prestação de Serviços Comerciais Autônomos da PROSFEC Energy e estabelece as condições de remuneração e apuração de comissões.",
        "1. Ajuda de custo fixa mensal",
        "Após a conclusão da etapa inicial de capacitação e prática comercial e a confirmação da continuidade contratual, será devido ao PRESTADOR o valor fixo mensal de R$ 1.850,00 (mil oitocentos e cinquenta reais), conforme as condições do contrato principal.",
        "O pagamento será efetuado até o quinto dia útil de cada mês, referente ao período mensal anterior.",
        "Durante os 22 (vinte e dois) dias iniciais, aplica-se a condição de remuneração prevista no contrato principal, sem prejuízo das comissões adquiridas e dos demais valores legalmente devidos.",
        "2. Meta mínima para comissionamento",
        "A meta mínima para início do comissionamento será de 15.000 kWh por mês, considerando a produção comercial elegível e validada.",
        "3. Percentuais progressivos",
        "As comissões serão calculadas progressivamente, conforme as seguintes faixas:",
        "• Parcela de produção entre 15.000 e 19.999 kWh: 5%;",
        "• Parcela de produção entre 20.000 e 29.999 kWh: 7%;",
        "• Parcela de produção a partir de 30.000 kWh: 9%.",
        "Os percentuais serão aplicados exclusivamente sobre a parcela correspondente a cada faixa, observada a base econômica em reais vinculada ao volume de energia comercializado.",
        "4. Cálculo das comissões",
        "As comissões serão calculadas com base no valor econômico correspondente ao volume de energia comercializado, expresso em kWh, aplicando-se progressivamente os percentuais previstos neste Anexo sobre cada faixa de produção mensal.",
        "5. Validação da produção",
        "Serão consideradas para apuração as operações comerciais atribuídas ao PRESTADOR e devidamente validadas, conforme os registros dos sistemas oficiais da CONTRATANTE e os critérios operacionais aplicáveis.",
        "Leads, propostas não aceitas e contratos pendentes de validação não serão contabilizados como produção validada.",
        "6. Fechamento e pagamento das comissões",
        "O fechamento mensal da produção será realizado todo dia 10, considerando o período de apuração anterior.",
        "O pagamento das comissões apuradas será realizado todo dia 25, conforme os registros de produção validada e as condições deste Anexo.",
        "Caso alguma das datas recaia em dia não útil, o procedimento será realizado no primeiro dia útil subsequente.",
        "7. Demonstrativo e contestação",
        "A CONTRATANTE disponibilizará demonstrativo da produção e das comissões apuradas.",
        "O PRESTADOR poderá contestar o demonstrativo no prazo de 5 (cinco) dias úteis a partir de sua disponibilização, por meio do canal oficial indicado pela CONTRATANTE, apresentando os fundamentos da divergência.",
        "A contestação não impedirá o pagamento dos valores incontroversos já devidos.",
        "8. Disposições finais",
        "Este Anexo integra o contrato principal. Qualquer alteração dos percentuais, faixas de produção, base econômica ou critérios de apuração dependerá de formalização escrita e aceitação de ambas as partes.",
      ].map(L)}
      <Assinaturas prestador={prestador} aceitoEm={aceitoEm} />
    </div>
  );
}

function Assinaturas({ prestador, aceitoEm }: { prestador: DadosPrestador; aceitoEm?: string | null }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3 pt-3">
      <div className="rounded-lg border border-primary/40 bg-primary/5 p-3">
        <p className="font-extrabold text-foreground">CONTRATANTE</p>
        <p>DCS SOLUCOES TECNOLOGICAS E SERVICOS FINANCEIROS LTDA — PROSFEC ENERGY</p>
        <p>CNPJ 65.668.670/0001-26</p>
        <p className="mt-1 font-bold text-primary">✔ Assinado eletronicamente pela PROSFEC</p>
      </div>
      <div className="rounded-lg border border-border p-3">
        <p className="font-extrabold text-foreground">PRESTADOR</p>
        <p>{v(prestador.nome, "[NOME/RAZÃO SOCIAL]")}</p>
        <p>CPF/CNPJ {v(prestador.cnpj || prestador.cpf, "[CPF/CNPJ]")}</p>
        <p className="mt-1 font-bold text-foreground">
          {aceitoEm ? `✔ Aceite eletrônico em ${new Date(aceitoEm).toLocaleString("pt-BR")}` : "Aguardando aceite eletrônico"}
        </p>
      </div>
      <p className="sm:col-span-2">São Luís - MA, {dataBR(aceitoEm)}.</p>
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
