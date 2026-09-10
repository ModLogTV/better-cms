import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { NuqsAdapter } from "nuqs/adapters/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { initTheme } from "@/lib/theme";
import { router } from "./router";
import "./styles.css";

// Applied before first paint so there's no flash of the wrong theme.
initTheme();

const queryClient = new QueryClient({
	defaultOptions: {
		queries: { staleTime: 30_000, retry: 1 },
	},
});

const rootElement = document.getElementById("root");
if (!rootElement) {
	throw new Error("Root element #root not found");
}

createRoot(rootElement).render(
	<StrictMode>
		<NuqsAdapter>
			<QueryClientProvider client={queryClient}>
				<TooltipProvider>
					<RouterProvider router={router} />
					<Toaster richColors position="top-right" />
				</TooltipProvider>
			</QueryClientProvider>
		</NuqsAdapter>
	</StrictMode>,
);
