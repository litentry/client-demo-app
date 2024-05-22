"use client";
import {QueryClient, QueryClientProvider, setLogger} from 'react-query';
import {ReactNode} from "react";

// Learn more about React Query defaults here:
// https://react-query-v3.tanstack.com/guides/important-defaults
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 6, // 6 minutes
        },
    },
});

setLogger({
    log: console.log,
    warn: console.warn,
    error: (e) => {
        const msg = (e && e.toString()) || 'Unknown error';

        // swallow use-session and vault errors
        if (msg.includes('[session]') || msg.includes('[vault]')) {
            return;
        }
        console.error(e);
    },
});

export const ReactQueryProvider = ({children}: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
        {children}
    </QueryClientProvider>
);
