// @ts-nocheck
import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Mail, 
  Phone, 
  Lock, 
  MapPin, 
  CreditCard, 
  ArrowLeft, 
  Sparkles, 
  Handshake,
  Check,
  Building2,
  FileText,
  X
} from "lucide-react";
import { motion } from "motion/react";
import { collection, addDoc, getDocs, query, where, doc, getDoc, limit } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import { TermosDeUsoContent } from "./TermosDeUsoContent";

interface UserRegistrationFormProps {
  onBackToHome: () => void;
  onGoToLogin?: () => void;
}

// CPF Validator
function validateCPF(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, "");
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i)) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i)) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10))) return false;

  return true;
}

// Phone Validator
function validatePhone(phone: string): boolean {
  const clean = phone.replace(/\D/g, "");
  return clean.length >= 10 && clean.length <= 11;
}

export default function UserRegistrationForm({ onBackToHome, onGoToLogin }: UserRegistrationFormProps) {
  // Form fields
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cpf, setCpf] = useState("");
  const [cidade, setCidade] = useState("");
  const [chavePix, setChavePix] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmSenha, setConfirmSenha] = useState("");
  const [plano, setPlano] = useState<"Consultor Starter" | "Consultor Executive">("Consultor Starter");
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Parent partner (Master) info
  const [masterId, setMasterId] = useState<string | null>(null);
  const [masterNome, setMasterNome] = useState<string | null>(null);
  const [masterWhatsapp, setMasterWhatsapp] = useState<string | null>(null);
  const [loadingMaster, setLoadingMaster] = useState<boolean>(true);

  // States
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Check URL search parameters or localStorage for referrer/Master
    const params = new URLSearchParams(window.location.search);
    const refParam = params.get("ref") || params.get("master") || params.get("indicador") || params.get("parceiro");
    
    const rawRefId = refParam || localStorage.getItem("lca_referred_by");
    const savedRefId = rawRefId ? rawRefId.replace(/[\u200B-\u200D\uFEFF\u00A0\u2060]/g, "").trim() : "";
    const savedRefNome = localStorage.getItem("lca_referred_by_nome");
    const savedRefWhatsapp = localStorage.getItem("lca_referred_by_whatsapp");

    if (savedRefId) {
      setMasterId(savedRefId);
      if (savedRefNome) setMasterNome(savedRefNome);
      if (savedRefWhatsapp) setMasterWhatsapp(savedRefWhatsapp);

      // Fetch master partner details from Firestore to guarantee updated name
      const loadMasterDetails = async () => {
        try {
          const docSnap = await getDoc(doc(db, "parceiros", savedRefId));
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data?.nome) setMasterNome(data.nome);
            if (data?.whatsapp) setMasterWhatsapp(data.whatsapp);
          }
        } catch (err) {
          console.warn("Error loading master details for registration form:", err);
        } finally {
          setLoadingMaster(false);
        }
      };
      loadMasterDetails();
    } else {
      setLoadingMaster(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Form validations
    if (!nome.trim() || !email.trim() || !senha.trim() || !confirmSenha.trim()) {
      setErrorMsg("Por favor, preencha todos os campos obrigatórios (*).");
      return;
    }

    if (senha !== confirmSenha) {
      setErrorMsg("As senhas informadas não coincidem.");
      return;
    }

    if (senha.length < 6) {
      setErrorMsg("A senha deve conter no mínimo 6 caracteres.");
      return;
    }

    if (!aceitouTermos) {
      setErrorMsg("Você precisa ler e aceitar os termos de uso e credenciamento para continuar.");
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      // Check for email uniqueness in Firestore
      const q = query(
        collection(db, "parceiros"),
        where("email", "==", normalizedEmail),
        limit(1)
      );
      const checkSnap = await getDocs(q);

      if (!checkSnap.empty) {
        setErrorMsg("Este e-mail já está cadastrado no sistema PROSFEC.");
        setLoading(false);
        return;
      }

      // Etapa B-2: cria a conta no Firebase Auth — nenhuma senha vai ao Firestore.
      let novoAuthUid = "";
      try {
        const cred = await createUserWithEmailAndPassword(auth, normalizedEmail, senha);
        novoAuthUid = cred.user.uid;
      } catch (authErr: any) {
        if (authErr?.code === "auth/email-already-in-use") {
          setErrorMsg("Este e-mail já possui uma conta de acesso. Faça login ou use 'Esqueci minha senha'.");
        } else if (authErr?.code === "auth/weak-password") {
          setErrorMsg("A senha deve ter no mínimo 6 caracteres.");
        } else {
          setErrorMsg("Não foi possível criar seu acesso. Tente novamente.");
        }
        setLoading(false);
        return;
      }

      // Prepare user document (independent registration linked to Master, with no paid subscription requirement)
      const isExecutive = plano === "Consultor Executive";
      const newUserDoc = {
        nome: nome.trim(),
        email: normalizedEmail,
        whatsapp: whatsapp.trim() || "",
        cpf: cpf.trim() || "",
        cidade: cidade.trim() || "",
        chavePix: chavePix.trim() || "",
        authUid: novoAuthUid,
        plano: plano,                                  // Selected category: "Consultor Starter" or "Consultor Executive"
        comissao: isExecutive ? 1.5 : 0.5,             // Commission percentage: 0.5% or 1.5%
        status: "ativo",                               // Immediately active, no subscription required!
        isTeamMember: !!masterId,
        parentPartnerId: masterId || "",
        parentPartnerNome: masterNome || "",
        aceitouTermos: true,
        dataCriacao: new Date().toISOString(),
        dataUltimoAcesso: new Date().toISOString(),
        interesse: "cadastro_usuario_direto"
      };

      await addDoc(collection(db, "parceiros"), newUserDoc);

      setSuccess(true);
    } catch (err) {
      console.error("Error creating user registration:", err);
      try {
        handleFirestoreError(err, OperationType.WRITE, "parceiros");
      } catch (fErr) {
        setErrorMsg("Erro ao salvar cadastro no banco de dados. Por favor, tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between font-sans selection:bg-emerald-500 selection:text-white relative overflow-x-hidden">
      {/* Dynamic Background Glow Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-emerald-600/15 blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-teal-600/10 blur-[120px] pointer-events-none rounded-full" />

      {/* Header Bar matching landing page */}
      <header className="relative z-10 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0A3D2E] to-[#00A86B] flex items-center justify-center text-white font-black shadow-lg shadow-emerald-900/30 border border-emerald-500/30">
              P
            </div>
            <div>
              <span className="font-display font-black text-lg text-white tracking-tight block leading-none">
                PROSFEC
              </span>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block mt-0.5">
                Crédito & Fomento Empresarial
              </span>
            </div>
          </div>

          <button
            onClick={onBackToHome}
            className="px-3.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar ao Site
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-xl mx-auto">
          {success ? (
            /* Success Screen */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-800/90 border border-emerald-500/40 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-xl text-center space-y-6"
            >
              <div className="w-20 h-20 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto text-4xl font-extrabold shadow-lg shadow-emerald-950/50">
                <Check className="w-10 h-10 text-emerald-400" />
              </div>

              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Cadastro Concluído
                </span>
                <h2 className="text-2xl sm:text-3xl font-display font-black text-white">
                  Bem-vindo à PROSFEC!
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
                  Seu cadastro foi realizado com sucesso e seu perfil já está <strong className="text-emerald-400">ativo no sistema</strong>. Não há cobrança de taxa ou mensalidade.
                </p>
              </div>

              {masterNome && (
                <div className="bg-slate-900/60 border border-slate-700/80 p-4 rounded-2xl text-left text-xs text-slate-300 flex items-center gap-3">
                  <Handshake className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Vínculo de Atendimento</span>
                    <span className="font-extrabold text-white">Vinculado ao Gestor Master: {masterNome}</span>
                  </div>
                </div>
              )}

              <div className="pt-2 space-y-3">
                <button
                  onClick={() => {
                    if (onGoToLogin) {
                      onGoToLogin();
                    } else {
                      const url = new URL(window.location.href);
                      url.searchParams.set("portal-parceiro", "true");
                      window.location.href = url.toString();
                    }
                  }}
                  className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold rounded-2xl text-sm transition-all shadow-lg shadow-emerald-900/40 cursor-pointer flex items-center justify-center gap-2"
                >
                  <User className="w-4 h-4" />
                  Acessar Minha Conta / Login
                </button>

                <button
                  onClick={onBackToHome}
                  className="w-full py-3 bg-slate-900/80 hover:bg-slate-900 text-slate-400 hover:text-white border border-slate-700/60 font-bold rounded-2xl text-xs transition-all cursor-pointer"
                >
                  Voltar para a Página Inicial
                </button>
              </div>
            </motion.div>
          ) : (
            /* Registration Form Card */
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6"
            >
              {/* Card Header */}
              <div className="space-y-2 text-center sm:text-left">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] sm:text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Formulário de Cadastro
                  </span>

                  {masterNome && (
                    <span className="inline-flex items-center gap-1.5 bg-teal-500/10 border border-teal-500/30 text-teal-300 text-[10px] font-bold px-2.5 py-1 rounded-full">
                      <Handshake className="w-3 h-3 text-teal-400" />
                      Indicado por: {masterNome}
                    </span>
                  )}
                </div>

                <h1 className="text-xl sm:text-2xl font-display font-black text-white leading-tight">
                  Criar Conta de Usuário
                </h1>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Preencha os dados abaixo para se cadastrar na plataforma PROSFEC. Acesso gratuito, direto e sem vínculo de assinatura obrigatória.
                </p>
              </div>

              {/* Master Alert Banner */}
              {masterNome && (
                <div className="bg-emerald-950/40 border border-emerald-800/50 p-3.5 rounded-2xl text-xs text-emerald-200 flex items-start gap-3">
                  <Handshake className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-emerald-300 block">Convite do Gestor Master</strong>
                    <span>Você está se cadastrando sob a rede do parceiro Master <strong className="text-white">{masterNome}</strong>. Seus relatórios e simulações serão acompanhados com suporte direto.</span>
                  </div>
                </div>
              )}

              {/* Error Alert Box */}
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-rose-950/60 border border-rose-800/80 p-4 rounded-2xl text-xs text-rose-200 flex items-start gap-3"
                >
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{errorMsg}</div>
                </motion.div>
              )}

              {/* Main Registration Form */}
              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Nome Completo / Razão social *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="Nome completo ou Razão Social"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs text-white !text-white placeholder-slate-500 outline-none font-medium transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    E-mail *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="seu.email@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs text-white !text-white placeholder-slate-500 outline-none font-medium transition-all"
                    />
                  </div>
                </div>

                {/* Plano de Repasse */}
                <div className="space-y-2 pt-1">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider block">
                    Plano de Repasse *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Starter Option */}
                    <div
                      onClick={() => setPlano("Consultor Starter")}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-2 ${
                        plano === "Consultor Starter"
                          ? "bg-emerald-950/60 border-emerald-500 ring-1 ring-emerald-500/50 shadow-md shadow-emerald-950/50"
                          : "bg-slate-900/60 border-slate-700 hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-white flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${plano === "Consultor Starter" ? "bg-emerald-400 animate-ping" : "bg-slate-500"}`} />
                          Starter (0,5%)
                        </span>
                        {plano === "Consultor Starter" && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-300 leading-snug">
                        Comissão de <strong className="text-emerald-300">0,5%</strong> sobre contratos faturados.
                      </p>
                    </div>

                    {/* Executive Option */}
                    <div
                      onClick={() => setPlano("Consultor Executive")}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-2 ${
                        plano === "Consultor Executive"
                          ? "bg-emerald-950/60 border-emerald-500 ring-1 ring-emerald-500/50 shadow-md shadow-emerald-950/50"
                          : "bg-slate-900/60 border-slate-700 hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-white flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${plano === "Consultor Executive" ? "bg-emerald-400 animate-ping" : "bg-slate-500"}`} />
                          Executive (1,5%)
                        </span>
                        {plano === "Consultor Executive" && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-300 leading-snug">
                        Comissão de <strong className="text-emerald-300">1,5%</strong> sobre contratos faturados.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                      Senha de Acesso *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type="password"
                        required
                        placeholder="Mínimo 6 caracteres"
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs text-white !text-white placeholder-slate-500 outline-none font-medium transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                      Confirmar Senha *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type="password"
                        required
                        placeholder="Repita a senha"
                        value={confirmSenha}
                        onChange={(e) => setConfirmSenha(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs text-white !text-white placeholder-slate-500 outline-none font-medium transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Terms checkbox & Reader button */}
                <div className="pt-2 space-y-2">
                  <div className="flex items-start gap-2.5 text-xs text-slate-300">
                    <input
                      type="checkbox"
                      id="aceitouTermosCheckbox"
                      checked={aceitouTermos}
                      onChange={(e) => setAceitouTermos(e.target.checked)}
                      className="mt-0.5 rounded accent-emerald-500 w-4 h-4 shrink-0 cursor-pointer"
                    />
                    <label htmlFor="aceitouTermosCheckbox" className="leading-snug cursor-pointer">
                      Declaro que li e concordo com os{" "}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setShowTermsModal(true);
                        }}
                        className="text-emerald-400 hover:text-emerald-300 font-extrabold underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <FileText className="w-3 h-3" />
                        Termos de Credenciamento e Uso PROSFEC
                      </button>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-[#0A3D2E] via-[#00A86B] to-emerald-500 hover:from-emerald-700 hover:to-teal-500 text-white font-black rounded-2xl text-xs sm:text-sm transition-all shadow-xl shadow-emerald-950/60 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 mt-4 uppercase tracking-wider"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processando Cadastro...
                    </>
                  ) : (
                    "Concluir Cadastro de Usuário"
                  )}
                </button>
              </form>

              {/* Login Helper Footer Link */}
              <div className="pt-4 border-t border-slate-700/60 text-center">
                <p className="text-xs text-slate-400">
                  Já possui um cadastro ativo?{" "}
                  <button
                    onClick={() => {
                      if (onGoToLogin) {
                        onGoToLogin();
                      } else {
                        const url = new URL(window.location.href);
                        url.searchParams.set("portal-parceiro", "true");
                        window.location.href = url.toString();
                      }
                    }}
                    className="text-emerald-400 hover:text-emerald-300 font-extrabold underline cursor-pointer"
                  >
                    Clique aqui para fazer Login
                  </button>
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Terms Modal Overlay */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl shadow-emerald-950/80 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Termos de Credenciamento e Uso</h3>
                  <p className="text-[10px] text-slate-400">PROSFEC — Sistema de Estruturação de Crédito Empresarial</p>
                </div>
              </div>
              <button
                onClick={() => setShowTermsModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4 text-xs text-slate-300 leading-relaxed font-sans scrollbar-thin scrollbar-thumb-slate-700">
              <TermosDeUsoContent variant="dark" />
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-4">
              <span className="text-[10px] text-slate-400">
                Ao clicar em "Concordar e Aceitar", os termos serão marcados no seu formulário.
              </span>
              <button
                onClick={() => {
                  setAceitouTermos(true);
                  setShowTermsModal(false);
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-[#0A3D2E] via-[#00A86B] to-emerald-500 hover:from-emerald-600 hover:to-teal-500 text-white font-extrabold rounded-xl text-xs transition-all shadow-lg shadow-emerald-950/50 flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Check className="w-4 h-4" />
                Concordar e Aceitar Termos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer info matching landing styling */}
      <footer className="relative z-10 border-t border-slate-800 bg-slate-950/80 py-4 px-4 text-center text-[10px] text-slate-500">
        <p>© {new Date().getFullYear()} PROSFEC — Estruturação de Crédito & Fomento Empresarial. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
