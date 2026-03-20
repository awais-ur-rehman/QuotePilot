import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import "./index.css";
import App from "./App.tsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#fff",
            color: "#0F172A",
            border: "1px solid #E2E8F0",
            borderRadius: "6px",
            fontSize: "14px",
            fontFamily: "Plus Jakarta Sans, system-ui, sans-serif",
          },
        }}
      />
    </QueryClientProvider>
  </StrictMode>
);
