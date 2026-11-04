'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('UI boundary caught an error', error, info.componentStack); }
  render() {
    if (this.state.error) return <div role="alert" className="card flex flex-col items-center p-10 text-center"><AlertTriangle className="h-7 w-7 text-amber-500" /><h2 className="mt-4 text-base font-semibold">This view could not be displayed</h2><p className="mt-2 text-sm text-muted">No data was changed. Reload the view or contact your administrator if the problem persists.</p><Button className="mt-5" onClick={() => this.setState({ error: null })}>Try again</Button></div>;
    return this.props.children;
  }
}
