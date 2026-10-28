import { render } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/** Create a fresh QueryClient for each test (no cross-test cache leaks). */
export function createTestQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: { retry: false, gcTime: 0 },
            mutations: { retry: false },
        },
    });
}

/** Render a component with the providers it needs (Router + QueryClient). */
export function renderWithProviders(ui, { queryClient, ...opts } = {}) {
    const qc = queryClient || createTestQueryClient();
    function Wrapper({ children }) {
        return (
            <QueryClientProvider client={qc}>
                <BrowserRouter>{children}</BrowserRouter>
            </QueryClientProvider>
        );
    }
    return { ...render(ui, { wrapper: Wrapper, ...opts }), queryClient: qc };
}
