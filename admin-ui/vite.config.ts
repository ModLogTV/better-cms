import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	base: "./",
	plugins: [
		TanStackRouterVite({ target: "react", autoCodeSplitting: true }),
		react(),
		tailwindcss(),
	],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	optimizeDeps: {
		// Without this, Vite's dep pre-bundler splits "nuqs" and
		// "nuqs/adapters/tanstack-router" into separate chunks, each with its own
		// copy of nuqs's internal adapter context - useQueryState then can't find
		// the context NuqsAdapter provides ("Multiple adapter contexts detected",
		// https://nuqs.dev/NUQS-303), crashing every table that reads it.
		exclude: ["nuqs"],
	},
	build: {
		outDir: "../dist/admin-panel",
		emptyOutDir: true,
	},
	server: {
		// In production the built admin panel is served by the CMS API itself
		// (adminPanelPlugin() at /admin), so apiBasePath/authBasePath in
		// src/config.ts are same-origin relative paths. The standalone Vite dev
		// server has no such routes, so proxy them to the demo API.
		proxy: {
			"/cms": "http://localhost:3001",
			"/api/auth": "http://localhost:3001",
		},
	},
});
