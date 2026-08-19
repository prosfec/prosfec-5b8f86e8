// @ts-nocheck
import React from "react";

interface TermosDeUsoContentProps {
  variant?: "dark" | "light";
}

export const TermosDeUsoContent: React.FC<TermosDeUsoContentProps> = ({ variant = "dark" }) => {
  const isDark = variant === "dark";

  const textColor = isDark ? "text-slate-300" : "text-slate-700";
  const headingColor = isDark ? "text-emerald-400" : "text-[#0A3D2E]";
  const subHeadingColor = isDark ? "text-white" : "text-slate-900";
  const bgBox = isDark ? "bg-emerald-950/40 border-emerald-800/40 text-emerald-200" : "bg-emerald-50 border-emerald-200 text-emerald-900";

  return (
    <div className={`space-y-6 text-xs leading-relaxed font-sans ${textColor}`}>
      {/* Header Banner */}
      <div className={`p-4 rounded-2xl border ${bgBox}`}>
        <h2 className={`font-black text-sm uppercase tracking-wide mb-1 ${subHeadingColor}`}>
          TERMOS DE USO DA PLATAFORMA PROSFEC
        </h2>
        <p className="text-[10px] opacity-80">
          <strong>Última atualização:</strong> 25/07/2026
        </p>
        <p className="mt-2 text-[11px] leading-relaxed">
          Bem-vindo(a) à Plataforma PROSFEC. O presente Termo de Uso estabelece as regras aplicáveis ao acesso e utilização da Plataforma PROSFEC, seus sistemas, ferramentas, conteúdos, treinamentos, funcionalidades e serviços disponibilizados aos usuários.
        </p>
        <p className="mt-1 text-[11px] font-bold">
          Ao criar uma conta, acessar a plataforma ou clicar em "Li e Aceito", o usuário declara que leu, compreendeu e concorda integralmente com todas as disposições deste documento.
        </p>
      </div>

      {/* CAPÍTULO I */}
      <div className="space-y-2">
        <h3 className={`font-extrabold text-xs uppercase tracking-wider ${headingColor}`}>
          CAPÍTULO I – DAS DEFINIÇÕES
        </h3>
        <p>Para fins deste Termo, consideram-se:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>PROSFEC:</strong> L P SILVA TECNOLOGIAS, CREDITOS E FINANCAS, pessoa jurídica de direito privado inscrita no CNPJ/MF sob o nº 28.522.665/0001-84, com sede em Netuno i / Rua Projetada, Bl.b Col.palmeiras, Recanto Dos Vinhais, São Luís - MA, responsável pela plataforma tecnológica destinada à gestão de processos, treinamentos, prospecção comercial, suporte operacional e disponibilização de ferramentas relacionadas aos serviços oferecidos.</li>
          <li><strong>Plataforma:</strong> Todo ambiente digital disponibilizado pela PROSFEC.</li>
          <li><strong>Usuário:</strong> Toda pessoa física ou jurídica cadastrada.</li>
          <li><strong>Consultor:</strong> Usuário autorizado a prestar serviços utilizando a metodologia PROSFEC.</li>
          <li><strong>Parceiro:</strong> Usuário que utiliza a plataforma para desenvolver atividades comerciais.</li>
          <li><strong>Afiliado:</strong> Usuário autorizado exclusivamente à divulgação da plataforma mediante recebimento de comissão.</li>
          <li><strong>Master:</strong> Usuário com permissões administrativas adicionais concedidas pela PROSFEC.</li>
        </ul>
      </div>

      {/* CAPÍTULO II */}
      <div className="space-y-2">
        <h3 className={`font-extrabold text-xs uppercase tracking-wider ${headingColor}`}>
          CAPÍTULO II – DO OBJETO
        </h3>
        <p>O presente Termo disciplina:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Acesso à plataforma;</li>
          <li>Utilização das ferramentas;</li>
          <li>Utilização dos treinamentos;</li>
          <li>Acesso aos conteúdos;</li>
          <li>Utilização da marca;</li>
          <li>Direitos e deveres dos usuários;</li>
          <li>Responsabilidades;</li>
          <li>Regras de utilização do sistema.</li>
        </ul>
      </div>

      {/* CAPÍTULO III */}
      <div className="space-y-2">
        <h3 className={`font-extrabold text-xs uppercase tracking-wider ${headingColor}`}>
          CAPÍTULO III – DO CADASTRO
        </h3>
        <p>O usuário declara que todas as informações fornecidas são verdadeiras.</p>
        <p>A PROSFEC poderá solicitar documentos para validação cadastral.</p>
        <p>É vedado:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Utilizar documentos de terceiros;</li>
          <li>Criar contas falsas;</li>
          <li>Utilizar informações inverídicas;</li>
          <li>Manter múltiplos cadastros sem autorização.</li>
        </ul>
        <p>O usuário responde civil e criminalmente pelas informações prestadas.</p>
      </div>

      {/* CAPÍTULO IV */}
      <div className="space-y-2">
        <h3 className={`font-extrabold text-xs uppercase tracking-wider ${headingColor}`}>
          CAPÍTULO IV – DA CONTA
        </h3>
        <p>Cada conta é: pessoal, individual e intransferível.</p>
        <p>É proibido:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Compartilhar login;</li>
          <li>Compartilhar senha;</li>
          <li>Vender contas;</li>
          <li>Emprestar acesso;</li>
          <li>Utilizar contas de terceiros.</li>
        </ul>
        <p>Toda atividade realizada na conta será considerada de responsabilidade do titular.</p>
      </div>

      {/* CAPÍTULO V */}
      <div className="space-y-2">
        <h3 className={`font-extrabold text-xs uppercase tracking-wider ${headingColor}`}>
          CAPÍTULO V – DO ACEITE ELETRÔNICO
        </h3>
        <p>
          O aceite eletrônico possui validade jurídica equivalente à assinatura física, nos termos da legislação brasileira.
        </p>
        <p>
          Ao clicar em "Li e Aceito", o usuário manifesta concordância integral com este Termo.
        </p>
      </div>

      {/* CAPÍTULO VI */}
      <div className="space-y-2">
        <h3 className={`font-extrabold text-xs uppercase tracking-wider ${headingColor}`}>
          CAPÍTULO VI – DA UTILIZAÇÃO DA PLATAFORMA
        </h3>
        <p>
          A PROSFEC concede ao usuário licença limitada, não exclusiva, revogável e intransferível para utilização da plataforma.
        </p>
        <p>A licença não transfere qualquer direito de propriedade intelectual.</p>
        <p>O acesso poderá ser limitado conforme o plano contratado.</p>
      </div>

      {/* CAPÍTULO VII */}
      <div className="space-y-2">
        <h3 className={`font-extrabold text-xs uppercase tracking-wider ${headingColor}`}>
          CAPÍTULO VII – DAS FUNCIONALIDADES
        </h3>
        <p>A plataforma poderá disponibilizar:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>CRM;</li>
          <li>Painel Financeiro;</li>
          <li>Simuladores;</li>
          <li>Ferramentas de prospecção;</li>
          <li>Consultas;</li>
          <li>Painéis administrativos;</li>
          <li>Treinamentos;</li>
          <li>Biblioteca;</li>
          <li>Inteligência Artificial;</li>
          <li>Área de documentos;</li>
          <li>Relatórios;</li>
          <li>Dashboards;</li>
          <li>Ferramentas futuras.</li>
        </ul>
        <p>Novas funcionalidades poderão ser incluídas ou removidas sem necessidade de autorização prévia.</p>
      </div>

      {/* CAPÍTULO VIII */}
      <div className="space-y-2">
        <h3 className={`font-extrabold text-xs uppercase tracking-wider ${headingColor}`}>
          CAPÍTULO VIII – DAS OBRIGAÇÕES DO USUÁRIO
        </h3>
        <p>O usuário compromete-se a:</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Agir com boa-fé;</li>
          <li>Respeitar a legislação brasileira;</li>
          <li>Preservar a reputação da PROSFEC;</li>
          <li>Utilizar a plataforma apenas para finalidades lícitas;</li>
          <li>Manter seus dados atualizados;</li>
          <li>Guardar o sigilo de sua senha;</li>
          <li>Respeitar todos os demais usuários.</li>
        </ol>
      </div>

      {/* CAPÍTULO IX */}
      <div className="space-y-2">
        <h3 className={`font-extrabold text-xs uppercase tracking-wider ${headingColor}`}>
          CAPÍTULO IX – DAS CONDUTAS PROIBIDAS
        </h3>
        <p>É expressamente proibido:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Copiar sistemas;</li>
          <li>Copiar códigos;</li>
          <li>Copiar layouts;</li>
          <li>Copiar materiais;</li>
          <li>Compartilhar conteúdos exclusivos;</li>
          <li>Reproduzir treinamentos;</li>
          <li>Comercializar documentos internos;</li>
          <li>Praticar engenharia reversa;</li>
          <li>Tentar invadir servidores;</li>
          <li>Utilizar robôs sem autorização;</li>
          <li>Explorar vulnerabilidades;</li>
          <li>Fraudar operações;</li>
          <li>Criar contas falsas;</li>
          <li>Utilizar documentos falsos;</li>
          <li>Divulgar informações falsas;</li>
          <li>Praticar concorrência desleal;</li>
          <li>Utilizar a plataforma para atividades ilícitas.</li>
        </ul>
      </div>

      {/* CAPÍTULO X */}
      <div className="space-y-2">
        <h3 className={`font-extrabold text-xs uppercase tracking-wider ${headingColor}`}>
          CAPÍTULO X – DA PROPRIEDADE INTELECTUAL
        </h3>
        <p>Todos os direitos relativos à plataforma pertencem exclusivamente à PROSFEC. Incluem-se:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Marca;</li>
          <li>Logotipo;</li>
          <li>Identidade visual;</li>
          <li>Software;</li>
          <li>Banco de dados;</li>
          <li>CRM;</li>
          <li>Simuladores;</li>
          <li>Dashboards;</li>
          <li>Algoritmos;</li>
          <li>Metodologia;</li>
          <li>Documentos;</li>
          <li>Vídeos;</li>
          <li>Treinamentos;</li>
          <li>Fluxos operacionais;</li>
          <li>Scripts;</li>
          <li>Inteligência Artificial;</li>
          <li>Conteúdos.</li>
        </ul>
        <p>Nenhum direito é transferido ao usuário. É proibida qualquer reprodução, modificação ou distribuição sem autorização formal.</p>
      </div>

      {/* CAPÍTULO XI */}
      <div className="space-y-2">
        <h3 className={`font-extrabold text-xs uppercase tracking-wider ${headingColor}`}>
          CAPÍTULO XI – DA UTILIZAÇÃO DA MARCA
        </h3>
        <p>A marca PROSFEC somente poderá ser utilizada conforme autorização da empresa. É proibido:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Alterar logotipos;</li>
          <li>Alterar identidade visual;</li>
          <li>Criar marcas derivadas;</li>
          <li>Utilizar a marca para campanhas não autorizadas;</li>
          <li>Representar oficialmente a empresa sem autorização.</li>
        </ul>
      </div>

      {/* CAPÍTULO XII */}
      <div className="space-y-2">
        <h3 className={`font-extrabold text-xs uppercase tracking-wider ${headingColor}`}>
          CAPÍTULO XII – DOS TREINAMENTOS
        </h3>
        <p>Todos os treinamentos possuem finalidade exclusivamente educacional.</p>
        <p>A PROSFEC não garante: resultados financeiros, fechamento de contratos, faturamento, sucesso comercial, aprovação de crédito, quantidade de clientes.</p>
        <p>O desempenho dependerá da atuação individual de cada usuário.</p>
      </div>

      {/* CAPÍTULO XIII */}
      <div className="space-y-2">
        <h3 className={`font-extrabold text-xs uppercase tracking-wider ${headingColor}`}>
          CAPÍTULO XIII – DOS LEADS
        </h3>
        <p>Os leads disponibilizados permanecem de propriedade exclusiva da PROSFEC. É vedado:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Copiar listas;</li>
          <li>Exportar dados;</li>
          <li>Vender contatos;</li>
          <li>Utilizar clientes para benefício próprio sem autorização;</li>
          <li>Compartilhar informações comerciais.</li>
        </ul>
      </div>

      {/* CAPÍTULO XIV */}
      <div className="space-y-2">
        <h3 className={`font-extrabold text-xs uppercase tracking-wider ${headingColor}`}>
          CAPÍTULO XIV – DA CONFIDENCIALIDADE
        </h3>
        <p>Toda informação disponibilizada ao usuário possui caráter confidencial. Incluem-se: treinamentos, documentos, materiais, estratégias, processos, scripts, inteligência artificial, modelos comerciais, listas de clientes, fluxos internos.</p>
        <p>A obrigação de confidencialidade permanece mesmo após o encerramento da conta.</p>
      </div>

      {/* CAPÍTULO XV */}
      <div className="space-y-2">
        <h3 className={`font-extrabold text-xs uppercase tracking-wider ${headingColor}`}>
          CAPÍTULO XV – DA PROTEÇÃO DE DADOS
        </h3>
        <p>A PROSFEC realizará o tratamento de dados conforme a Lei nº 13.709/2018 (LGPD).</p>
        <p>O usuário declara estar ciente de que seus dados poderão ser utilizados para: autenticação, suporte, segurança, emissão de documentos, comunicação, melhoria da plataforma, cumprimento de obrigações legais.</p>
        <p>Os detalhes do tratamento de dados constam na Política de Privacidade.</p>
      </div>

      {/* CAPÍTULO XVI */}
      <div className="space-y-2">
        <h3 className={`font-extrabold text-xs uppercase tracking-wider ${headingColor}`}>
          CAPÍTULO XVI – DOS PAGAMENTOS
        </h3>
        <p>Os planos poderão ser gratuitos ou pagos.</p>
        <p>As condições de cobrança observarão a Política Comercial vigente.</p>
        <p>O inadimplemento poderá ocasionar: bloqueio do acesso, suspensão de funcionalidades, cancelamento da conta.</p>
      </div>

      {/* CAPÍTULO XVII */}
      <div className="space-y-2">
        <h3 className={`font-extrabold text-xs uppercase tracking-wider ${headingColor}`}>
          CAPÍTULO XVII – DAS COMISSÕES
        </h3>
        <p>
          Quando aplicável, as comissões serão disciplinadas por documento próprio denominado <strong>Política Comercial</strong>, que poderá ser atualizado periodicamente.
        </p>
      </div>

      {/* CAPÍTULO XVIII */}
      <div className="space-y-2">
        <h3 className={`font-extrabold text-xs uppercase tracking-wider ${headingColor}`}>
          CAPÍTULO XVIII – DA DISPONIBILIDADE
        </h3>
        <p>A PROSFEC envidará esforços para manter a plataforma disponível, porém não garante funcionamento ininterrupto.</p>
        <p>Poderão ocorrer: manutenções, atualizações, interrupções, indisponividades temporárias.</p>
      </div>

      {/* CAPÍTULO XIX */}
      <div className="space-y-2">
        <h3 className={`font-extrabold text-xs uppercase tracking-wider ${headingColor}`}>
          CAPÍTULO XIX – DA SEGURANÇA
        </h3>
        <p>A PROSFEC adota medidas técnicas e administrativas destinadas à proteção das informações.</p>
        <p>Todavia, nenhum ambiente digital é absolutamente imune a falhas, razão pela qual o usuário reconhece os riscos inerentes ao uso da internet.</p>
      </div>

      {/* CAPÍTULO XX */}
      <div className="space-y-2">
        <h3 className={`font-extrabold text-xs uppercase tracking-wider ${headingColor}`}>
          CAPÍTULO XX – DA LIMITAÇÃO DE RESPONSABILIDADE
        </h3>
        <p>A PROSFEC não responde por:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Decisões tomadas pelos usuários;</li>
          <li>Negociações particulares;</li>
          <li>Perdas financeiras;</li>
          <li>Lucros cessantes;</li>
          <li>Expectativas comerciais;</li>
          <li>Recusas de crédito por instituições financeiras;</li>
          <li>Informações prestadas por terceiros;</li>
          <li>Indisponibilidades decorrentes de fatores externos.</li>
        </ul>
      </div>

      {/* CAPÍTULO XXI */}
      <div className="space-y-2">
        <h3 className={`font-extrabold text-xs uppercase tracking-wider ${headingColor}`}>
          CAPÍTULO XXI – DA SUSPENSÃO
        </h3>
        <p>A PROSFEC poderá suspender ou cancelar qualquer conta em caso de: fraude, uso indevido, descumprimento deste Termo, prática de ilícitos, quebra de confidencialidade, utilização indevida da marca, violação da legislação.</p>
        <p>A suspensão poderá ocorrer independentemente de aviso prévio, quando necessária para proteger a plataforma, os usuários ou terceiros.</p>
      </div>

      {/* CAPÍTULO XXII */}
      <div className="space-y-2">
        <h3 className={`font-extrabold text-xs uppercase tracking-wider ${headingColor}`}>
          CAPÍTULO XXII – DAS ALTERAÇÕES
        </h3>
        <p>A PROSFEC poderá alterar este Termo a qualquer momento.</p>
        <p>As alterações entrarão em vigor após sua publicação na plataforma.</p>
        <p>A continuidade do uso da plataforma será interpretada como concordância com a versão atualizada.</p>
      </div>

      {/* CAPÍTULO XXIII */}
      <div className="space-y-2">
        <h3 className={`font-extrabold text-xs uppercase tracking-wider ${headingColor}`}>
          CAPÍTULO XXIII – DA VIGÊNCIA
        </h3>
        <p>Este Termo permanecerá vigente enquanto houver utilização da plataforma.</p>
        <p>As cláusulas de confidencialidade, propriedade intelectual, proteção de dados e responsabilidade continuarão produzindo efeitos mesmo após o encerramento da conta.</p>
      </div>

      {/* CAPÍTULO XXIV */}
      <div className="space-y-2">
        <h3 className={`font-extrabold text-xs uppercase tracking-wider ${headingColor}`}>
          CAPÍTULO XXIV – DAS DISPOSIÇÕES GERAIS
        </h3>
        <p>A eventual tolerância ao descumprimento de qualquer cláusula não constituirá renúncia de direito.</p>
        <p>Caso qualquer disposição seja considerada inválida, as demais permanecerão plenamente vigentes.</p>
        <p>Este Termo não estabelece sociedade, representação, franquia, mandato, vínculo empregatício ou qualquer relação diversa daquela expressamente prevista.</p>
      </div>

      {/* CAPÍTULO XXV */}
      <div className="space-y-2">
        <h3 className={`font-extrabold text-xs uppercase tracking-wider ${headingColor}`}>
          CAPÍTULO XXV – DO FORO
        </h3>
        <p>Fica eleito o foro da comarca da sede da PROSFEC para dirimir quaisquer controvérsias decorrentes da utilização da plataforma, ressalvadas as hipóteses de competência obrigatória previstas em lei.</p>
      </div>

      {/* DECLARAÇÃO FINAL */}
      <div className={`p-4 rounded-2xl border ${bgBox} space-y-2`}>
        <h3 className={`font-black text-xs uppercase tracking-wider ${subHeadingColor}`}>
          DECLARAÇÃO FINAL
        </h3>
        <p className="font-bold">Ao clicar em "LI E ACEITO", o usuário declara que:</p>
        <ul className="list-disc pl-5 space-y-1 text-[11px]">
          <li>Leu integralmente este Termo;</li>
          <li>Compreendeu todas as cláusulas;</li>
          <li>Concorda com todas as condições estabelecidas;</li>
          <li>Compromete-se a cumprir integralmente este documento;</li>
          <li>Reconhece a validade jurídica do aceite eletrônico;</li>
          <li>Declara possuir capacidade civil para contratar ou estar devidamente representado quando agir em nome de pessoa jurídica.</li>
        </ul>
        <p className="text-[10px] font-semibold mt-2 pt-2 border-t border-emerald-500/20">
          Este Termo passa a produzir efeitos imediatamente após o aceite eletrônico do usuário.
        </p>
      </div>
    </div>
  );
};
