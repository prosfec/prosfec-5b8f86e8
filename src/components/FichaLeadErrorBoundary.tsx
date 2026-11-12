import React from "react";

/** Isola a Ficha & Documentos: qualquer falha de exibição fecha só a ficha, nunca a página inteira. */
export class FichaLeadErrorBoundary extends React.Component<
  { children: React.ReactNode; onClose: () => void },
  { erro: boolean }
> {
  override state = { erro: false };
  static getDerivedStateFromError() {
    return { erro: true };
  }
  override componentDidCatch(error: unknown) {
    console.error("Falha ao exibir Ficha & Documentos:", error);
  }
  override render() {
    if (!this.state.erro) return this.props.children;
    return (
      <div translate="no" className="notranslate fixed inset-0 bg-slate-900/70 flex items-center justify-center p-4 z-[130]">
        <div className="bg-card text-card-foreground rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl border border-border">
          <p className="font-bold text-sm">A ficha precisa ser reaberta.</p>
          <p className="text-xs text-muted-foreground mt-2">Seus dados e documentos já enviados estão salvos. Feche e abra a ficha novamente.</p>
          <button
            type="button"
            onClick={() => { this.setState({ erro: false }); this.props.onClose(); }}
            className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold cursor-pointer"
          >
            Fechar Ficha
          </button>
        </div>
      </div>
    );
  }
}
