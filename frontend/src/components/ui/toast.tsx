'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, X, XCircle } from 'lucide-react';

interface ToastItem { id: number; title: string; description?: string; kind: 'success' | 'error' }
const ToastContext = createContext<{ toast: (title: string, description?: string, kind?: 'success' | 'error') => void }>({ toast: () => undefined });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const toast = useCallback((title: string, description?: string, kind: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setItems((current) => [...current, { id, title, description, kind }]);
    window.setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 4500);
  }, []);
  const value = useMemo(() => ({ toast }), [toast]);
  return <ToastContext.Provider value={value}>{children}<div aria-live="polite" className="fixed bottom-5 end-5 z-[120] flex w-[calc(100%-2.5rem)] max-w-sm flex-col gap-2">{items.map((item) => <div key={item.id} className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4 shadow-lift animate-fade-up">{item.kind === 'success' ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />}<div className="min-w-0 flex-1"><p className="text-sm font-semibold">{item.title}</p>{item.description && <p className="mt-0.5 text-xs leading-5 text-muted">{item.description}</p>}</div><button className="text-muted hover:text-ink" aria-label="Dismiss notification" onClick={() => setItems((current) => current.filter(({ id }) => id !== item.id))}><X className="h-4 w-4" /></button></div>)}</div></ToastContext.Provider>;
}

export const useToast = () => useContext(ToastContext);
