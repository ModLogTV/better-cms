import { defineConfig } from "tsup";

const ALL_PEER_DEPS = [
	"elysia",
	"next",
	"@tanstack/start",
	"@prisma/client",
	"@aws-sdk/client-s3",
	"@aws-sdk/s3-request-presigner",
	"react",
	"@tanstack/react-query",
	"zod",
	"better-auth",
];

const shared = {
	format: ["esm", "cjs"] as ("esm" | "cjs")[],
	dts: true,
	splitting: false,
	sourcemap: true,
	treeshake: true,
};

export default defineConfig([
	{
		...shared,
		platform: "neutral",
		external: ALL_PEER_DEPS,
		entry: {
			"auth/index": "src/auth/index.ts",
			"core/index": "src/core/index.ts",
			"i18n/index": "src/i18n/index.ts",
			"client/index": "src/client/index.ts",
			"admin/index": "src/admin/index.ts",
		},
	},

	// Node-only — uses node:fs, node:path, node:events, Elysia, Prisma, AWS SDK
	{
		...shared,
		platform: "node",
		external: ALL_PEER_DEPS,
		entry: {
			"better-auth/index": "src/better-auth/index.ts",
			"elysia/index": "src/elysia/index.ts",
			"prisma/index": "src/prisma/index.ts",
			"drizzle/index": "src/drizzle/index.ts",
			"next/index": "src/next/index.ts",
			"tanstack/index": "src/tanstack/index.ts",
			"storage/hetzner/index": "src/storage/hetzner/index.ts",
			"storage/aws/index": "src/storage/aws/index.ts",
			"storage/r2/index": "src/storage/r2/index.ts",
			"storage/local/index": "src/storage/local/index.ts",
			"plugins/fallback/index": "src/plugins/fallback/index.ts",
			"plugins/fallback-sync/index": "src/plugins/fallback-sync/index.ts",
			"plugins/pages/index": "src/plugins/pages/index.ts",
			"plugins/media/index": "src/plugins/media/index.ts",
		},
	},

	// React — neutral platform (runs in SSR + browser), no "use client"
	{
		...shared,
		platform: "neutral",
		external: ["react", "@tanstack/react-query", "zod"],
		entry: {
			"react/index": "src/react/index.ts",
			"admin-react/index": "src/admin-react/index.ts",
		},
	},

	// next/client — browser only, ESM only, "use client" banner
	// Separate from react/ so RSC never accidentally imports hooks
	{
		...shared,
		format: ["esm"],
		platform: "browser",
		external: ["react", "@tanstack/react-query"],
		banner: { js: '"use client";' },
		entry: {
			"next-client/index": "src/next-client/index.ts",
		},
	},
]);
