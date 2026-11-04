'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { ToastProvider } from '@/components/ui/toast';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } } }));
  return <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange><QueryClientProvider client={queryClient}><ToastProvider>{children}</ToastProvider></QueryClientProvider></ThemeProvider>;
}
