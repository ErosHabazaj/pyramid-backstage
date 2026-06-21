import { Component, type ErrorInfo, type ReactNode } from 'react';

// App-wide safety net: a thrown render error shows a recoverable card instead
// of white-screening the whole site (e.g. a flaky camera/scanner error).
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-dvh items-center justify-center px-5">
          <div className="w-full max-w-sm rounded-2xl border-2 border-ink bg-surface p-6 shadow-[6px_6px_0_0_var(--color-ink)]">
            <h1 className="font-display text-lg font-bold">Something glitched</h1>
            <p className="mt-1 text-sm text-muted">
              Hit a snag rendering this view. Reload to get back in.
            </p>
            <pre className="mt-3 max-h-28 overflow-auto rounded-md border border-line bg-surface-2 p-2 text-[11px] text-faint">
              {this.state.error.message}
            </pre>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 w-full cursor-pointer rounded-md border-2 border-ink bg-info px-3 py-2 text-sm font-semibold text-white shadow-[3px_3px_0_0_var(--color-ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_var(--color-ink)]"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
