import { Elysia } from "elysia";

interface WithAuth {
	auth: { internalToken: string };
}

export const requireReadToken = (cms: WithAuth) =>
	new Elysia({ name: "cms-auth-read" }).derive(
		{ as: "scoped" },
		({ headers, set }) => {
			const token = headers["x-internal-token"];
			if (!token || token !== cms.auth.internalToken) {
				set.status = 401;
				return { error: "Unauthorized" };
			}
		},
	);

export const requireFullToken = (cms: WithAuth) =>
	new Elysia({ name: "cms-auth-full" }).derive(
		{ as: "scoped" },
		({ headers, set }) => {
			const token = headers["x-internal-token"];
			if (!token || token !== cms.auth.internalToken) {
				set.status = 401;
				return { error: "Unauthorized" };
			}
		},
	);
