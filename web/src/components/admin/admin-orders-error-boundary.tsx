"use client";

import React from "react";

type Props = { children: React.ReactNode };

type State = { hasError: boolean };

export class AdminOrdersErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-900"
          role="alert"
        >
          <p className="font-semibold">Orders temporarily unavailable</p>
          <p className="mt-2 text-sm text-red-800">
            Something went wrong while rendering this page. Refresh the page or
            try again in a moment.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
