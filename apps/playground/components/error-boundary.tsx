"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-arsenal-background p-8 text-center">
          <div>
            <h1 className="text-2xl font-semibold">Something went wrong</h1>
            <p className="mt-2 text-arsenal-secondary">Refresh the page or contact support.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
