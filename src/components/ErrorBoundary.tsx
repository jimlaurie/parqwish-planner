"use client";

import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        className="flex min-h-screen items-center justify-center p-6"
        style={{ backgroundColor: "var(--color-bg-deep)", color: "var(--color-text-primary)" }}
      >
        <div
          className="mx-auto max-w-md rounded-2xl p-8 text-center shadow-lg"
          style={{ backgroundColor: "var(--color-bg-card)" }}
        >
          <div className="mb-4 text-5xl">🏰</div>
          <h1
            className="mb-2 text-2xl font-bold"
            style={{ color: "var(--color-gold)" }}
          >
            Something went wrong
          </h1>
          <p className="mb-6 opacity-70">
            A little pixie dust got loose. Let&apos;s try that again.
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() =>
                this.setState({ hasError: false, error: null, showDetails: false })
              }
              className="rounded-full px-6 py-2 font-semibold text-black transition-opacity hover:opacity-80"
              style={{ backgroundColor: "var(--color-gold)" }}
            >
              Try Again
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Full reload is intentional in error recovery */}
            <a
              href="/"
              className="rounded-full border px-6 py-2 font-semibold transition-opacity hover:opacity-80"
              style={{ borderColor: "var(--color-gold)", color: "var(--color-gold)" }}
            >
              Go Home
            </a>
          </div>

          {this.state.error && (
            <div className="mt-6 text-left text-sm">
              <button
                onClick={() =>
                  this.setState((s) => ({ showDetails: !s.showDetails }))
                }
                className="opacity-50 hover:opacity-70"
              >
                {this.state.showDetails ? "▾ Hide details" : "▸ Show details"}
              </button>
              {this.state.showDetails && (
                <pre
                  className="mt-2 max-h-48 overflow-auto rounded-lg p-3 text-xs opacity-70"
                  style={{ backgroundColor: "var(--color-bg-darker)" }}
                >
                  {this.state.error.message}
                  {this.state.error.stack && `\n\n${this.state.error.stack}`}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
