import { createRouter } from "@tanstack/react-router";
import { getConfig } from "@/config";
import { routeTree } from "./routeTree.gen";

export const router = createRouter({
	routeTree,
	basepath: getConfig().basePath,
	defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}
