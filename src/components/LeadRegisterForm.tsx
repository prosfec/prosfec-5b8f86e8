// @ts-nocheck
import React, { useState, useEffect } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { 
  formatCurrencyBRL, 
  triggerWebhookSimulation, 
  validateCNPJ, 
  validateCPF, 
  validatePhone,
  formatCNPJ,
  formatPhone,
  formatCPF,
  fetchCNPJ,
  buildLeadMultilevelFirestorePayload
} from "../utils";
import { 
  Briefcase, 
  MapPin, 
  User, 
  Users, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  X,
  Plus,
  Loader2,
  Download,
  FileText,
  ShieldCheck
} from "lucide-react";

interface Partner {
  id: string;
  nome: string;
  whatsapp: string;
  email: string;
  cidade: string;
  interesse: string;
  status: string;
  dataCriacao: string;
  cpf?: string;
  dataNascimento?: string;
  chavePix?: string;
  plano?: string;
  aceitouTermos?: boolean;
}

interface LeadRegisterFormProps {
  currentPartner: Partner;
  onSuccess?: (message: string, docId?: string) => void;
  onCancel: () => void;
  hideCredentialsSection?: boolean;
  initialData?: {
    nomeEmpresa?: string;
    telefone?: string;
    categoria?: string;
    endereco?: string;
    website?: string;
    cnpj?: string;
    razaoSocial?: string;
    porte?: string;
  };
}

export default function LeadRegisterForm({ 
  currentPartner, 
  onSuccess, 
  onCancel,
  hideCredentialsSection = false,
  initialData
}: LeadRegisterFormProps) {
  const [regLeadLoading, setRegLeadLoading] = useState(false);
  const [regLeadError, setRegLeadError] = useState<string | null>(null);

  // Form Fields State
  const [leadNome, setLeadNome] = useState(initialData?.nomeEmpresa || "");
  const [leadWhatsapp, setLeadWhatsapp] = useState(initialData?.telefone || "");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadCnpj, setLeadCnpj] = useState(initialData?.cnpj || "");
  const [leadRazaoSocial, setLeadRazaoSocial] = useState(initialData?.razaoSocial || initialData?.nomeEmpresa || "");
  const [leadFaturamento, setLeadFaturamento] = useState("");
  const [govbrLogin, setGovbrLogin] = useState("");
  const [govbrSenha, setGovbrSenha] = useState("");
  const [serasaLogin, setSerasaLogin] = useState("");
  const [serasaSenha, setSerasaSenha] = useState("");
  const [certificadoSenha, setCertificadoSenha] = useState("");
  const [certificadoFileName, setCertificadoFileName] = useState("");
  const [certificadoFileBase64, setCertificadoFileBase64] = useState("");

  const handleCertificadoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validação estrita do tamanho do arquivo: limite de 1MB (certificados reais costumam ter menos de 100KB)
      const maxSizeBytes = 1024 * 1024;
      if (file.size > maxSizeBytes) {
        alert("O arquivo selecionado é muito grande! Certificados digitais A1 (.pfx / .p12) costumam ter menos de 100KB. Por favor, envie um arquivo válido de até 1MB.");
        e.target.value = ""; // Limpa a seleção
        return;
      }

      setCertificadoFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setCertificadoFileBase64(base64 || "");
      };
      reader.readAsDataURL(file);
    }
  };
  const [leadRamo, setLeadRamo] = useState(initialData?.categoria || "");
  const [leadPorte, setLeadPorte] = useState("ME");
  const [leadBancoPrincipal, setLeadBancoPrincipal] = useState("Banco do Brasil");
  const [leadMenosDe12Meses, setLeadMenosDe12Meses] = useState(false);
  const [leadCapitalSocial, setLeadCapitalSocial] = useState("");
  const [leadMediaReceitaMensal, setLeadMediaReceitaMensal] = useState("");

  const [isConsultingCnpj, setIsConsultingCnpj] = useState(false);
  const [cnpjInfoMessage, setCnpjInfoMessage] = useState<string | null>(null);

  // Auto-fetch CNPJ info via BrasilAPI
  useEffect(() => {
    const cleanCnpj = leadCnpj.replace(/\D/g, "");
    if (cleanCnpj.length === 14) {
      const runFetch = async () => {
        setIsConsultingCnpj(true);
        setCnpjInfoMessage(null);
        try {
          const info = await fetchCNPJ(cleanCnpj);
          
          let parsedPorte = "ME";
          if (info.porte) {
            const p = String(info.porte).toUpperCase();
            if (p.includes("MICRO") || p.includes("MEI") || p === "01" || p === "ME") {
              parsedPorte = p.includes("INDIVIDUAL") || p.includes("MEI") ? "MEI" : "ME";
            } else if (p.includes("PEQUENO") || p === "03" || p === "EPP") {
              parsedPorte = "EPP";
            }
          }

          setLeadRazaoSocial(info.razao_social || info.nome_fantasia || leadRazaoSocial);
          setLeadPorte(parsedPorte);
          
          // Also set city/state in address block if returned
          if (info.cep) {
            setEndCep(info.cep.replace(/^(\d{5})(\d{3})$/, "$1-$2"));
          }
          if (info.logradouro) setEndLogradouro(info.logradouro);
          if (info.numero) setEndNumero(info.numero);
          if (info.bairro) setEndBairro(info.bairro);
          if (info.municipio) setEndCidade(info.municipio);
          if (info.uf) setEndUf(info.uf);
          if (info.complemento) setEndComplemento(info.complemento);

          // E-mail and phone from CNPJ too if exists and not set
          if (info.email && !leadEmail) setLeadEmail(info.email);
          if (info.ddd_telefone_1 && !leadWhatsapp) {
            const cleanPhone = info.ddd_telefone_1.replace(/\D/g, "");
            setLeadWhatsapp(formatPhone(cleanPhone));
          }

          setCnpjInfoMessage("✅ CNPJ e endereço consultados e preenchidos automaticamente!");
        } catch (err: any) {
          console.warn("CNPJ lookup failed/rate-limited in LeadRegisterForm", err);
          setCnpjInfoMessage("⚠️ Consulta automática indisponível. Digite os dados manualmente.");
        } finally {
          setIsConsultingCnpj(false);
        }
      };
      runFetch();
    } else {
      setCnpjInfoMessage(null);
    }
  }, [leadCnpj]);

  // Socio 1
  const [socio1Nome, setSocio1Nome] = useState("");
  const [socio1Cpf, setSocio1Cpf] = useState("");
  const [socio1Birth, setSocio1Birth] = useState("");
  const [socio1Mae, setSocio1Mae] = useState("");
  const [socio1Telefone, setSocio1Telefone] = useState("");
  const [socio1Rg, setSocio1Rg] = useState("");
  const [socio1Orgao, setSocio1Orgao] = useState("");
  const [socio1Participacao, setSocio1Participacao] = useState("100");

  // Socio 2
  const [hasSocio2, setHasSocio2] = useState(false);
  const [socio2Nome, setSocio2Nome] = useState("");
  const [socio2Cpf, setSocio2Cpf] = useState("");
  const [socio2Birth, setSocio2Birth] = useState("");
  const [socio2Telefone, setSocio2Telefone] = useState("");
  const [socio2Participacao, setSocio2Participacao] = useState("");

  // Endereço
  const [endCep, setEndCep] = useState("");
  const [endLogradouro, setEndLogradouro] = useState("");
  const [endNumero, setEndNumero] = useState("");
  const [endBairro, setEndBairro] = useState("");
  const [endCidade, setEndCidade] = useState("");
  const [endUf, setEndUf] = useState("SP");
  const [endComplemento, setEndComplemento] = useState("");

  const handleCreateLeadWithSocios = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegLeadError(null);

    // Validate main lead details
    if (!leadNome.trim() || !leadWhatsapp.trim() || !leadEmail.trim() || !leadCnpj.trim() || !leadRazaoSocial.trim() || !leadRamo.trim()) {
      setRegLeadError("Por favor, preencha todos os campos obrigatórios da empresa e contato.");
      return;
    }

    if (!validateCNPJ(leadCnpj)) {
      setRegLeadError("O CNPJ informado é inválido. Por favor, verifique os números digitados.");
      return;
    }

    if (!validatePhone(leadWhatsapp)) {
      setRegLeadError("O WhatsApp de contato informado é inválido. Por favor, digite um número de telefone real com DDD.");
      return;
    }

    // Validate Socio 1 (only if CPF or Phone is provided)
    if (socio1Cpf.trim() && !validateCPF(socio1Cpf)) {
      setRegLeadError("O CPF do Sócio Principal informado é inválido.");
      return;
    }

    if (socio1Telefone.trim() && !validatePhone(socio1Telefone)) {
      setRegLeadError("O Telefone do Sócio Principal informado é inválido. Digite um número de telefone real com DDD.");
      return;
    }

    // Validate Socio 2 if enabled
    if (hasSocio2) {
      if (socio2Cpf.trim() && !validateCPF(socio2Cpf)) {
        setRegLeadError("O CPF do Segundo Sócio informado é inválido.");
        return;
      }
      if (socio2Telefone.trim() && !validatePhone(socio2Telefone)) {
        setRegLeadError("O Telefone do Segundo Sócio informado é inválido. Digite um número de telefone real com DDD.");
        return;
      }
    }

    setRegLeadLoading(true);

    try {
      const docId = "PRF-" + Math.floor(100000 + Math.random() * 900000);
      const valFaturamento = parseFloat(leadFaturamento) || 0;
      const valCapital = parseFloat(leadCapitalSocial) || 0;
      const valMediaReceita = parseFloat(leadMediaReceitaMensal) || 0;

      // PRONAMPE 2026 guidelines calculations
      let calculatedLimit = 0;
      const effectiveAnnualRevenue = leadMenosDe12Meses 
        ? valMediaReceita * 12 
        : valFaturamento;

      if (leadMenosDe12Meses) {
        const opt1 = valCapital * 0.5;
        const opt2 = (valMediaReceita * 12) * 0.5;
        calculatedLimit = Math.max(opt1, opt2);
      } else {
        calculatedLimit = valFaturamento * 0.6; // Pronampe standard is up to 60% faturamento anual
      }
      calculatedLimit = Math.min(calculatedLimit, 500000);

      // Prep score eligibility
      let prepScore: "alto" | "medio" | "baixo" = "alto";
      const alerts: string[] = [];
      const recs: string[] = [];

      if (leadPorte === "MEI" && effectiveAnnualRevenue > 81000) {
        prepScore = "baixo";
        alerts.push(`Faturamento de ${formatCurrencyBRL(effectiveAnnualRevenue)} ultrapassa o limite legal anual de R$ 81.000,00 para MEI.`);
        recs.push("Será preciso solicitar o desenquadramento de MEI e migrar para ME (Microempresa) antes de protocolar o Pronampe.");
      } else if (leadPorte === "ME" && effectiveAnnualRevenue > 360000) {
        prepScore = "medio";
        alerts.push(`Faturamento de ${formatCurrencyBRL(effectiveAnnualRevenue)} excede o limite de R$ 360.000,00 para Microempresa.`);
        recs.push("Sua empresa se enquadra na faixa de EPP (Empresa de Pequeno Porte). Nós ajudamos você no reenquadramento e upgrade tributário.");
      } else if (leadPorte === "EPP" && effectiveAnnualRevenue > 4800000) {
        prepScore = "baixo";
        alerts.push(`Faturamento de ${formatCurrencyBRL(effectiveAnnualRevenue)} excede o teto legal de R$ 4,8 milhões para EPP.`);
        recs.push("O Pronampe é restrito a empresas com receita de até R$ 4,8M. Fale com nossa assessoria para outras linhas corporativas específicas.");
      }

      if (leadMenosDe12Meses) {
        if (prepScore === "alto") prepScore = "medio";
        alerts.push("Empresa aberta há menos de 12 meses possui regras de limite proporcional diferenciadas conforme regulamento do Pronampe.");
        recs.push("Apresentaremos balancete de abertura assinado pelo contador para comprovação de aporte de capital social.");
      }

      if (alerts.length === 0) {
        alerts.push("CNPJ regularizado e limpo! Excelente elegibilidade para liberação rápida de crédito.");
        recs.push("Para agilizar a liberação, faça o login com sua conta gov.br Ouro/Prata e configure o compartilhamento de dados no portal da Receita Federal.");
        recs.push("Fale com nossos consultores para identificar os bancos parceiros que possuem taxas promocionais ativas hoje.");
      }

      const sociosList = [
        {
          nome: socio1Nome,
          cpf: socio1Cpf,
          dataNascimento: socio1Birth,
          participacao: parseFloat(socio1Participacao) || 100,
          nomeMae: socio1Mae,
          telefone: socio1Telefone,
          rg: socio1Rg,
          orgaoEmissor: socio1Orgao,
          cargo: "Sócio Administrador"
        }
      ];

      if (hasSocio2 && socio2Nome && socio2Cpf) {
        sociosList.push({
          nome: socio2Nome,
          cpf: socio2Cpf,
          dataNascimento: socio2Birth,
          participacao: parseFloat(socio2Participacao) || 0,
          nomeMae: "",
          telefone: socio2Telefone,
          rg: "",
          orgaoEmissor: "",
          cargo: "Sócio"
        });
      }

      const endPrincipal = {
        cep: endCep,
        logradouro: endLogradouro,
        numero: endNumero,
        bairro: endBairro,
        cidade: endCidade,
        uf: endUf,
        complemento: endComplemento
      };

      const newLeadDoc = {
        nome: leadNome,
        whatsapp: leadWhatsapp,
        email: leadEmail,
        cnpj: leadCnpj,
        cidade: endCidade || "Não informado",
        interesse: "simulação",
        status: "novo",
        etapa: 3, // Directly starts at stage 3: Ficha Preenchida
        dataCriacao: new Date().toISOString(),
        razaoSocial: leadRazaoSocial,
        porte: leadPorte,
        dataAbertura: "",
        ramo: leadRamo,
        menosDe12Meses: leadMenosDe12Meses,
        capitalSocial: valCapital,
        mediaReceitaMensal: valMediaReceita,
        faturamentoAnual: valFaturamento,
        cargo: "Sócio-Diretor",
        situacaoCadastral: "Ativa",
        possuiDeclaracaoFaturamento: true,
        autorizaCompartilhamentoEcac: true,
        possuiRestricaoSerasa: false,
        possuiDividasTributarias: false,
        bancoPrincipal: leadBancoPrincipal,
        objetivoRecurso: "Capital de Giro",
        tempoParaCaptacao: "Imediato",
        limiteEstimado: calculatedLimit,
        nivelPreparacao: prepScore,
        principaisAlertas: alerts,
        recomendações: recs,
        parceiroId: currentPartner.id,
        parceiroNome: currentPartner.nome,
        parceiroPlano: currentPartner.plano,
        parentPartnerId: (currentPartner as any).parentPartnerId || "",
        parentPartnerNome: (currentPartner as any).parentPartnerNome || "",
        socios: sociosList,
        enderecoSocioPrincipal: endPrincipal,
        govbrLogin,
        govbrSenha,
        serasaLogin,
        serasaSenha,
        certificadoSenha,
        certificadoFileName,
        certificadoFileBase64
      };

      // Calculate multilevel commission snapshot based on partner hierarchy
      const commissionPayload = buildLeadMultilevelFirestorePayload(
        newLeadDoc,
        [],
        currentPartner
      );

      const finalLeadDoc = {
        ...newLeadDoc,
        ...commissionPayload
      };

      // Create document in Firestore
      await setDoc(doc(db, "leads", docId), finalLeadDoc);

      // Trigger Webhook
      triggerWebhookSimulation("lead_simulation_completed", {
        ...newLeadDoc,
        id: docId,
        result: {
          limiteEstimado: calculatedLimit,
          nivelPreparacao: prepScore,
          principaisAlertas: alerts,
          recomendações: recs
        }
      });

      if (typeof onSuccess === "function") {
        onSuccess(`Sucesso! Lead ${leadRazaoSocial} registrado e qualificado no portal PROSFEC na Etapa 3. ID: ${docId}`, docId);
      }
    } catch (err) {
      console.error("Error creating lead with partners:", err);
      setRegLeadError("Erro ao registrar a ficha de crédito. Por favor, tente novamente.");
    } finally {
      setRegLeadLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-b border-slate-200 pb-4">
        <div className="min-w-0">
          <span className="text-[10px] bg-[#0A3D2E] text-white font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider font-mono">
            Cadastro do Lead & Ficha do CNPJ
          </span>
          <h4 className="font-display font-extrabold text-lg text-slate-900 mt-2 flex items-center gap-2">
            📋 Cadastrar Lead & Simulação Inicial
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Insira os dados cadastrais da empresa (CNPJ e contato) para realizar o cadastro inicial básico e gerar a simulação do Pronampe 2026. Os dados detalhados do sócio e endereço podem ser completados posteriormente pelo cliente.
          </p>
        </div>
        <button 
          onClick={onCancel}
          className="min-h-11 min-w-11 grid place-items-center rounded-lg hover:bg-white transition-colors text-slate-500 hover:text-slate-900 border border-transparent hover:border-slate-200"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {regLeadError && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{regLeadError}</span>
        </div>
      )}

      <form onSubmit={handleCreateLeadWithSocios} className="space-y-6">
        {/* Seção 1: Dados do Cliente e Empresa */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-5">
          <h5 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
            <Briefcase className="w-4 h-4 text-slate-400" />
            1. Dados Cadastrais da Empresa e Contato
          </h5>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 block">Razão Social *</label>
              <input
                type="text"
                placeholder="Razão Social Ltda"
                value={leadRazaoSocial}
                onChange={(e) => setLeadRazaoSocial(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#0A3D2E]"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 block">CNPJ *</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="00.000.000/0001-00"
                  value={leadCnpj}
                  onChange={(e) => setLeadCnpj(formatCNPJ(e.target.value))}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#0A3D2E] pr-10"
                  required
                />
                {isConsultingCnpj && (
                  <div className="absolute right-3 top-3 flex items-center">
                    <Loader2 className="w-4 h-4 text-[#0A3D2E] animate-spin" />
                  </div>
                )}
              </div>
              {cnpjInfoMessage && (
                <p className="text-[10px] font-extrabold mt-1 text-emerald-800 leading-tight">
                  {cnpjInfoMessage}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 block">Nome do Solicitante / Cliente *</label>
              <input
                type="text"
                placeholder="Nome Completo"
                value={leadNome}
                onChange={(e) => setLeadNome(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#0A3D2E]"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 block">WhatsApp de Contato *</label>
              <input
                type="tel"
                placeholder="(11) 99999-9999"
                value={leadWhatsapp}
                onChange={(e) => setLeadWhatsapp(formatPhone(e.target.value))}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#0A3D2E]"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 block">E-mail *</label>
              <input
                type="email"
                placeholder="cliente@email.com"
                value={leadEmail}
                onChange={(e) => setLeadEmail(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#0A3D2E]"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 block">Ramo de Atividade *</label>
              <input
                type="text"
                placeholder="Ex: Comércio, Tecnologia, Serviços"
                value={leadRamo}
                onChange={(e) => setLeadRamo(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#0A3D2E]"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 block">Porte da Empresa *</label>
              <select
                value={leadPorte}
                onChange={(e) => setLeadPorte(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#0A3D2E]"
              >
                <option value="MEI">MEI (Microempreendedor Individual)</option>
                <option value="ME">ME (Microempresa)</option>
                <option value="EPP">EPP (Empresa de Pequeno Porte)</option>
                <option value="Médio">Médio / Grande Porte</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 block">Banco de Preferência *</label>
              <select
                value={leadBancoPrincipal}
                onChange={(e) => setLeadBancoPrincipal(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#0A3D2E]"
              >
                <option value="Banco do Brasil">Banco do Brasil</option>
                <option value="Caixa Econômica">Caixa Econômica Federal</option>
                <option value="Itaú">Itaú Unibanco</option>
                <option value="Bradesco">Bradesco</option>
                <option value="Santander">Santander</option>
                <option value="Sicoob">Sicoob</option>
                <option value="Sicredi">Sicredi</option>
                <option value="Outro">Outro Banco Homologado</option>
              </select>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-4">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={leadMenosDe12Meses}
                onChange={(e) => setLeadMenosDe12Meses(e.target.checked)}
                className="w-4 h-4 rounded text-[#0A3D2E] focus:ring-[#0A3D2E]"
              />
              <span className="text-xs font-extrabold text-[#0A3D2E]">
                Empresa aberta há menos de 12 meses? (Pronampe Proporcional)
              </span>
            </label>

            {leadMenosDe12Meses ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 block">Capital Social Registrado (R$) *</label>
                  <input
                    type="number"
                    placeholder="Ex: 50000"
                    value={leadCapitalSocial}
                    onChange={(e) => setLeadCapitalSocial(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0A3D2E]"
                    required={leadMenosDe12Meses}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 block">Média de Faturamento Mensal (R$) *</label>
                  <input
                    type="number"
                    placeholder="Ex: 15000"
                    value={leadMediaReceitaMensal}
                    onChange={(e) => setLeadMediaReceitaMensal(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0A3D2E]"
                    required={leadMenosDe12Meses}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 block">Faturamento Anual Bruto Declarado (R$) *</label>
                <input
                  type="number"
                  placeholder="Ex: 240000"
                  value={leadFaturamento}
                  onChange={(e) => setLeadFaturamento(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0A3D2E]"
                  required={!leadMenosDe12Meses}
                />
              </div>
            )}
          </div>
        </div>

        {/* Seção 2: Endereço Sócio / Empresa (Opcional - Preenchimento Automático via CNPJ) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-5">
          <h5 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-slate-400" />
            2. Endereço da Empresa / Sócio Principal (Opcional - Consulta CNPJ)
          </h5>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 block">CEP</label>
              <input
                type="text"
                placeholder="00000-000"
                value={endCep}
                onChange={(e) => setEndCep(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#0A3D2E]"
              />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 block">Logradouro / Rua</label>
              <input
                type="text"
                placeholder="Rua, Avenida, etc."
                value={endLogradouro}
                onChange={(e) => setEndLogradouro(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#0A3D2E]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 block">Número</label>
              <input
                type="text"
                placeholder="123"
                value={endNumero}
                onChange={(e) => setEndNumero(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#0A3D2E]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 block">Bairro</label>
              <input
                type="text"
                placeholder="Centro"
                value={endBairro}
                onChange={(e) => setEndBairro(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#0A3D2E]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 block">Cidade</label>
              <input
                type="text"
                placeholder="São Paulo"
                value={endCidade}
                onChange={(e) => setEndCidade(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#0A3D2E]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 block">UF</label>
              <select
                value={endUf}
                onChange={(e) => setEndUf(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#0A3D2E]"
              >
                <option value="AC">AC</option><option value="AL">AL</option>
                <option value="AM">AM</option><option value="AP">AP</option>
                <option value="BA">BA</option><option value="CE">CE</option>
                <option value="DF">DF</option><option value="ES">ES</option>
                <option value="GO">GO</option><option value="MA">MA</option>
                <option value="MG">MG</option><option value="MS">MS</option>
                <option value="MT">MT</option><option value="PA">PA</option>
                <option value="PB">PB</option><option value="PE">PE</option>
                <option value="PI">PI</option><option value="PR">PR</option>
                <option value="RJ">RJ</option><option value="RN">RN</option>
                <option value="RO">RO</option><option value="RR">RR</option>
                <option value="RS">RS</option><option value="SC">SC</option>
                <option value="SE">SE</option><option value="SP">SP</option>
                <option value="TO">TO</option>
              </select>
            </div>

            <div className="md:col-span-2 lg:col-span-3 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 block">Complemento</label>
              <input
                type="text"
                placeholder="Sala 4, Bloco B"
                value={endComplemento}
                onChange={(e) => setEndComplemento(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#0A3D2E]"
              />
            </div>
          </div>
        </div>

        {/* Seção 3: Sócio 1 (Principal) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-5">
          <h5 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
            <User className="w-4 h-4 text-slate-400" />
            3. Informações do Sócio Administrador (Opcional nesta etapa inicial)
          </h5>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 block">Nome Completo do Sócio</label>
              <input
                type="text"
                placeholder="Nome conforme Receita"
                value={socio1Nome}
                onChange={(e) => setSocio1Nome(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#0A3D2E]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 block">CPF do Sócio</label>
              <input
                type="text"
                placeholder="000.000.000-00"
                value={socio1Cpf}
                onChange={(e) => setSocio1Cpf(formatCPF(e.target.value))}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#0A3D2E]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 block">Data de Nascimento</label>
              <input
                type="date"
                value={socio1Birth}
                onChange={(e) => setSocio1Birth(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#0A3D2E]"
              />
            </div>
          </div>
        </div>

        {/* Seção 4: Sócio 2 (Opcional) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <h5 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-400" />
              4. Segundo Sócio (Opcional)
            </h5>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasSocio2}
                onChange={(e) => setHasSocio2(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-[#0A3D2E] focus:ring-[#0A3D2E]"
              />
              <span className="text-[11px] font-bold text-[#0A3D2E]">
                Empresa possui outro sócio?
              </span>
            </label>
          </div>

          {hasSocio2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 block">Nome Completo *</label>
                <input
                  type="text"
                  placeholder="Nome do segundo sócio"
                  value={socio2Nome}
                  onChange={(e) => setSocio2Nome(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#0A3D2E]"
                  required={hasSocio2}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 block">CPF *</label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={socio2Cpf}
                  onChange={(e) => setSocio2Cpf(formatCPF(e.target.value))}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#0A3D2E]"
                  required={hasSocio2}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 block">Data de Nascimento *</label>
                <input
                  type="date"
                  value={socio2Birth}
                  onChange={(e) => setSocio2Birth(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#0A3D2E]"
                  required={hasSocio2}
                />
              </div>
            </div>
          )}
        </div>

        {/* Seção 5: Credenciais de Acesso Opcionais */}
        {!hideCredentialsSection && (
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h5 className="text-xs font-extrabold text-[#0A3D2E] uppercase tracking-wider flex items-center gap-1.5">
              🔑 5. Credenciais de Acesso Opcionais (e-CAC / SERASA)
            </h5>
            <p className="text-[11px] text-slate-500 font-medium">
              Preencha os dados de acesso do cliente se desejar que nossa assessoria realize o download automatizado do faturamento fiscal (Gov.br) e a consulta de restrições de crédito (SERASA).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* GOV.BR */}
              <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-3">
                <span className="text-[10px] bg-blue-600 text-white font-black px-2 py-0.5 rounded-sm uppercase tracking-wider font-mono">
                  Acesso Gov.br (e-CAC)
                </span>
                <div className="space-y-2 mt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 block">CPF / Usuário Gov.br</label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={govbrLogin}
                      onChange={(e) => setGovbrLogin(e.target.value)}
                      className="w-full text-xs px-3.5 py-2 bg-white border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#0A3D2E]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 block">Senha Gov.br</label>
                    <input
                      type="text"
                      placeholder="Senha gov.br"
                      value={govbrSenha}
                      onChange={(e) => setGovbrSenha(e.target.value)}
                      className="w-full text-xs px-3.5 py-2 bg-white border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#0A3D2E]"
                    />
                  </div>
                </div>
              </div>

              {/* SERASA */}
              <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-3">
                <span className="text-[10px] bg-rose-600 text-white font-black px-2 py-0.5 rounded-sm uppercase tracking-wider font-mono">
                  Acesso SERASA Experian
                </span>
                <div className="space-y-2 mt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 block">CPF / CNPJ / Usuário SERASA</label>
                    <input
                      type="text"
                      placeholder="Login SERASA"
                      value={serasaLogin}
                      onChange={(e) => setSerasaLogin(e.target.value)}
                      className="w-full text-xs px-3.5 py-2 bg-white border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#0A3D2E]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 block">Senha SERASA</label>
                    <input
                      type="text"
                      placeholder="Senha SERASA"
                      value={serasaSenha}
                      onChange={(e) => setSerasaSenha(e.target.value)}
                      className="w-full text-xs px-3.5 py-2 bg-white border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#0A3D2E]"
                    />
                  </div>
                </div>
              </div>

              {/* CERTIFICADO DIGITAL A1 */}
              <div className="md:col-span-2 p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-3">
                <span className="text-[10px] bg-[#00A86B] text-white font-black px-2 py-0.5 rounded-sm uppercase tracking-wider font-mono">
                  Certificado Digital A1
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 block">Senha do Certificado A1</label>
                    <input
                      type="text"
                      placeholder="Senha do certificado"
                      value={certificadoSenha}
                      onChange={(e) => setCertificadoSenha(e.target.value)}
                      className="w-full text-xs px-3.5 py-2 bg-white border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#0A3D2E]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 block">Arquivo do Certificado Digital (.pfx / .p12)</label>
                    <div className="relative flex items-center gap-2">
                      <input
                        type="file"
                        accept=".pfx,.p12"
                        onChange={handleCertificadoFileChange}
                        className="hidden"
                        id="lead-cert-file"
                      />
                      <label
                        htmlFor="lead-cert-file"
                        className="flex-1 text-xs px-3.5 py-2 bg-white border border-dashed border-slate-300 rounded-xl hover:border-[#0A3D2E] transition-all flex items-center justify-between cursor-pointer font-medium text-slate-600 truncate"
                      >
                        <span className="truncate">{certificadoFileName || "Selecionar arquivo..."}</span>
                        <FileText className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* SEGURANÇA E LGPD COMENTÁRIO */}
              <div className="md:col-span-2 p-4 rounded-2xl border border-sky-100 bg-sky-50/50 flex gap-3 text-sky-950">
                <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-sky-900">Segurança da Informação e Conformidade LGPD</h4>
                  <p className="text-[11px] leading-relaxed text-sky-800 font-medium">
                    Em total conformidade com a <strong>LGPD (Lei Geral de Proteção de Dados)</strong>, a <strong>PROSFEC</strong> assegura que todas as credenciais coletadas neste formulário (incluindo senhas de acesso e o arquivo do certificado digital) são protegidas por <strong>estrito sigilo profissional e criptografia</strong>. 
                    Estes dados são utilizados unicamente para consultas automatizadas e oficiais nos órgãos emissores, com a finalidade exclusiva de realizar a análise diagnóstica, enquadramento e <strong>estruturação de melhorias personalizadas no perfil de crédito</strong> de sua empresa, facilitando a liberação do Pronampe 2026.
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={regLeadLoading}
            className="px-6 py-2.5 bg-[#0A3D2E] hover:bg-[#00A86B] text-white text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
          >
            {regLeadLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                Registrar Ficha de Crédito Completa
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
