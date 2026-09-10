import React from "react";
import { AlertTriangle, MessageCircle, RotateCcw } from "lucide-react";
import { reportLovableError } from "../lib/lovable-error-reporting";

interface Props {
  children: React.ReactNode;
  whatsappUrl?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * Protege apenas a tela de resultado do simulador: se qualquer leitura falhar
 * (dados do consultor ausentes, campo vazio vindo do link de indicação etc.),
 * o lead vê um aviso amigável em vez da tela "Esta página não carregou".
 */
export class SimulationResultBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error ?? "Erro desconhecido"),
    };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error("Simulation result render error:", error, info);
    try {
      reportLovableError(error instanceof Error ? error : new Error(String(error)), {
        boundary: "simulation_result",
      });
    } catch {
      // Relatório de erro é best-effort.
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const whatsappUrl =
      this.props.whatsappUrl && this.props.whatsappUrl !== "#"
        ? this.props.whatsappUrl
        : "https://wa.me/5598987353253";

    return (
      <div className="p-6 md:p-10 text-left">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 flex flex-col items-start gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
              <AlertTriangle className="w-5 h-5" />
            </span>
            <h3 className="font-display font-extrabold text-lg text-slate-900">
              Sua simulação foi registrada, mas não conseguimos exibir o resultado agora
            </h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Seus dados foram enviados com segurança. Fale com um consultor pelo WhatsApp para
            receber o resultado completo, ou refaça a simulação.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#00A86B] text-white text-sm font-bold hover:bg-[#0A3D2E] transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              Falar com um consultor
            </a>
            {this.props.onReset && (
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, message: "" });
                  this.props.onReset?.();
                }}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Refazer simulação
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default SimulationResultBoundary;
