import type { CMSAuthAdapter } from "../auth/adapter";
import type { CMSConfig } from "./config";
import { CMSEventEmitter } from "./events";
import type { CMSContext, CMSInfer, ElysiaLike } from "./plugin";

/**
 * Route-mount queue satisfying `ElysiaLike`. Core has no dependency on the
 * `elysia` package — plugins (pagesPlugin, mediaPlugin) queue their Elysia
 * route plugins here via `ctx.elysiaApp.use()`, and `toElysiaPlugin`
 * (`@modlog/better-cms/elysia`) is the only place that ever imports the real
 * `elysia` package and applies these queued mounts to a real instance.
 */
export interface ElysiaMountQueue extends ElysiaLike {
	readonly mounts: readonly unknown[];
}

function createElysiaMountQueue(): ElysiaMountQueue {
	const mounts: unknown[] = [];
	return {
		mounts,
		use(plugin) {
			mounts.push(plugin);
			return this;
		},
	};
}

export interface CMSInstance {
	adapter: CMSConfig["database"];
	namespaces: CMSConfig["namespaces"];
	auth: CMSAuthAdapter;
	events: CMSEventEmitter;
	elysiaApp: ElysiaMountQueue;
	$Infer: CMSInfer;
}

export function createCMS(config: CMSConfig): CMSInstance {
	if (config.namespaces.length === 0) {
		throw new Error("createCMS: namespaces must not be empty");
	}

	if (config.initialLocales) {
		const defaults = config.initialLocales.filter((l) => l.isDefault);
		if (defaults.length > 1) {
			throw new Error("createCMS: only one locale can be set as default");
		}

		for (const locale of config.initialLocales) {
			void config.database
				.upsertLocale({
					code: locale.code,
					name: locale.name,
					isDefault: locale.isDefault,
				})
				.catch((err) => {
					console.error(
						`[cms] Failed to upsert initial locale ${locale.code}:`,
						err,
					);
				});
		}
	}

	if (config.initialAdminUser) {
		if (!config.auth.upsertAdminUser) {
			console.warn(
				"[cms] initialAdminUser is set but the auth adapter does not implement upsertAdminUser — skipping.",
			);
		} else {
			const adminUser = config.initialAdminUser;
			void config.auth.upsertAdminUser(adminUser).catch((err) => {
				console.error("[cms] Failed to upsert initial admin user:", err);
			});
		}
	}

	const events = new CMSEventEmitter();
	const elysiaApp = createElysiaMountQueue();

	const ctx: CMSContext = {
		namespaces: config.namespaces,
		adapter: config.database,
		auth: config.auth,
		events,
		elysiaApp,
	};

	let infer: CMSInfer = {
		Namespaces: Object.fromEntries(
			config.namespaces.map((ns) => [ns.name, ns]),
		),
		PageBlocks: undefined,
	};

	for (const plugin of config.plugins ?? []) {
		plugin.init(ctx);
		if (plugin.extendInfer) {
			infer = plugin.extendInfer(infer);
		}
	}

	return {
		adapter: config.database,
		namespaces: config.namespaces,
		auth: config.auth,
		events,
		elysiaApp,
		$Infer: infer,
	};
}

export type {
	CMSAdapter,
	NamespaceLocaleMeta,
	Page,
	PageSummary,
	RawBlock,
} from "./adapter";
export type { CMSConfig } from "./config";
export { CMSEventEmitter } from "./events";
export type { CMSContext, CMSInfer, CMSPlugin, ElysiaLike } from "./plugin";
export type { CMSStorageAdapter } from "./storage";
