import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./app/App.tsx";
import "./styles/index.css";
import "./i18n";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,       // Consider data fresh for 30 seconds
      gcTime: 1000 * 60 * 5,      // Keep unused data in cache for 5 minutes
      retry: 1,                    // Retry failed requests once
      refetchOnWindowFocus: true,  // Refresh when the user comes back to the tab
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </QueryClientProvider>
);
