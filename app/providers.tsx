"use client";

import { SerwistProvider } from "@serwist/turbopack/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { Toaster } from "sonner";
import { useHydrateStores } from "@/lib/store/hydration";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 1 } } }));
  useHydrateStores();
  return (
    <SerwistProvider swUrl="/serwist/sw.js" disable={process.env.NODE_ENV !== "production"} reloadOnOnline={false}>
      <QueryClientProvider client={client}>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            className: "font-display",
            style: {
              background: "var(--surface)",
              color: "var(--on-surface)",
              border: "1px solid var(--color-paper-300)",
            },
          }}
        />
      </QueryClientProvider>
    </SerwistProvider>
  );
}
