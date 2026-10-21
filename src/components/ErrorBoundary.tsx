import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught application error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-4 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-white mb-2">
              Infinity Engineering Stock CRM
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mb-6">
              An unexpected rendering error occurred. We have caught it to prevent a blank screen.
            </p>
            {this.state.error && (
              <div className="mb-6 p-3 bg-slate-950 border border-slate-800 rounded-lg text-left text-xs font-mono text-rose-400 overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={() => {
                localStorage.removeItem('infinity-engineering-auth-v3');
                window.location.reload();
              }}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Application & Reset Session
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
