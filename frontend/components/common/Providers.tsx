'use client';

import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SocketProvider } from '@/lib/socket/socket-provider';
import { useAuthStore } from '@/stores/auth-store';
import { ToastContainer } from '@/components/ui/Toast';
import { ConnectionDoctor } from '@/components/common/ConnectionDoctor';
import { CommandBar } from '@/components/common/CommandBar';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 30, // 30s
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <QueryClientProvider client={queryClient}>
      <SocketProvider>
        {children}
        <ToastContainer />
        <ConnectionDoctor />
        <CommandBar />
      </SocketProvider>
    </QueryClientProvider>
  );
}
