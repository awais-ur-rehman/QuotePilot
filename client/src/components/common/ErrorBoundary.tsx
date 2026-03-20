import { Component, type ReactNode } from "react";

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex items-center justify-center h-screen bg-slate-50">
          <div className="bg-white border border-red-200 rounded-[8px] p-8 max-w-md text-center"
               style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
            <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-lg">!</span>
            </div>
            <h2 className="text-sm font-semibold text-slate-900 mb-2">Something went wrong</h2>
            <p className="text-xs text-slate-500 font-mono mb-4 break-all">
              {this.state.error.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary text-xs px-4 py-2"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
