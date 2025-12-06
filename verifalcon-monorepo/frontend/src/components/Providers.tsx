"use client";

import { WagmiProvider, createConfig, http } from "wagmi";
import { bscTestnet } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";

// Custom BSC Testnet with reliable RPC endpoints
const bscTestnetCustom = {
  ...bscTestnet,
  rpcUrls: {
    default: {
      http: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
    },
    public: {
      http: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
    },
  },
};

// Configure Wagmi for BSC Testnet with explicit RPC
const config = createConfig({
  chains: [bscTestnetCustom],
  connectors: [
    injected({
      shimDisconnect: true,
    }),
  ],
  transports: {
    [bscTestnetCustom.id]: http('https://data-seed-prebsc-1-s1.binance.org:8545/', {
      batch: false, // Disable batching for better error handling
      retryCount: 3,
      retryDelay: 1000,
    }),
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: 1000,
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
