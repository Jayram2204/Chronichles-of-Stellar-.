import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallbackTitle?: string;
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
    console.error('[ErrorBoundary] Uncaught exception:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-[#15051e] border border-[#ff0055] rounded-lg font-mono text-xs text-[#ff0055]">
          <h3 className="font-bold text-sm mb-1 uppercase">
            ⚠️ {this.props.fallbackTitle || 'Subsystem Failure Detected'}
          </h3>
          <p className="text-[#d2c9ff] opacity-80 mb-2">
            An unexpected error occurred in this module. Engine output halted.
          </p>
          <pre className="p-2 bg-[#090314] rounded border border-[#ff0055]/30 overflow-x-auto text-[10px] text-red-300">
            {this.state.error?.toString()}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-3 px-3 py-1 bg-[#ff0055] hover:bg-[#ff3377] text-white font-bold rounded transition text-[10px] uppercase"
          >
            Re-initialize Subsystem
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
