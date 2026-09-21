import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';
import * as Sentry from '@sentry/react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
    try {
      Sentry.captureException(error, {
        extra: {
          componentStack: errorInfo.componentStack,
        },
      });
    } catch {
      // Ignore if Sentry is not initialized
    }
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div 
          id="error-boundary-fallback" 
          className="min-h-screen bg-sand text-marine flex items-center justify-center p-6"
        >
          <div className="max-w-md w-full bg-white border border-stone rounded-2xl p-8 shadow-sm text-center">
            <div className="w-14 h-14 bg-crimson/10 text-crimson rounded-2xl flex items-center justify-center mx-auto mb-5">
              <AlertOctagon className="w-7 h-7" />
            </div>
            
            <h2 className="text-xl font-bold text-marine mb-2">
              Une erreur est survenue — veuillez rafraîchir la page
            </h2>
            
            <p className="text-sm text-marine/70 mb-6 leading-relaxed">
              Le système de gestion de stock La Grotte a rencontré une anomalie. Vos données locales et synchronisations récentes restent protégées.
            </p>

            {this.state.error && (
              <div className="bg-sand p-3 rounded-xl border border-stone/60 text-left mb-6 overflow-hidden">
                <p className="font-mono text-xs text-crimson font-medium break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                id="error-boundary-reload-button"
                onClick={() => window.location.reload()}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-marine text-white rounded-xl text-sm font-semibold hover:bg-marine-dark transition-colors focus-visible:ring-2 focus-visible:ring-ochre"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Recharger la page</span>
              </button>
              
              <button
                id="error-boundary-retry-button"
                onClick={this.handleReset}
                className="px-4 py-2.5 border border-stone bg-white text-marine rounded-xl text-sm font-medium hover:bg-sand transition-colors focus-visible:ring-2 focus-visible:ring-ochre"
              >
                Réessayer
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
