import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[GymFlow ErrorBoundary] Uncaught runtime UI error:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('view');
        window.history.replaceState({}, '', url.toString());
      } catch {
        // Ignore in restricted iframe
      }
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl backdrop-blur-xl animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-2xl mx-auto shadow-inner">
              <AlertTriangle className="w-8 h-8 text-amber-400" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white tracking-tight font-['Outfit']">
                Instabilidade Temporária na Interface
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Seus dados e academias continuam salvos com segurança. Ocorreu uma oscilação na renderização da tela.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-zinc-950/80 border border-zinc-800/80 rounded-xl text-left max-h-28 overflow-y-auto">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono block mb-1">
                  Detalhes Técnicos:
                </span>
                <code className="text-[11px] text-rose-400 font-mono break-all">
                  {this.state.error.message || 'Erro inesperado de execução'}
                </code>
              </div>
            )}

            <button
              onClick={this.handleReload}
              className="w-full py-3 px-4 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Recarregar Painel
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
