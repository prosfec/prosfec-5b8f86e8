import React from "react";

/** Impede que dados inesperados da Receita derrubem a página inteira (tela branca). */
export class FichaCnpjErrorBoundary extends React.Component<
  { children: React.ReactNode; onClose: () => void },
  { erro: boolean }
> {
  override state = { erro: false };
  static getDerivedStateFromError() {
    return { erro: true };
  }
  override componentDidCatch(error: unknown) {
    console.error("Falha ao exibir Ficha CNPJ:", error);
  }
  override render() {
    if (!this.state.erro) return this.props.children;
    return (
      <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center p-4 z-[130]">
        <div className="bg-card text-card-foreground rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl border border-border">
          <p className="font-bold text-sm">Não foi possível exibir a Ficha Oficial agora.</p>
          <p className="text-xs text-muted-foreground mt-2">A Receita Federal retornou dados incompletos. Tente novamente em instantes.</p>
          <button
            type="button"
            onClick={() => { this.setState({ erro: false }); this.props.onClose(); }}
            className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }
}
