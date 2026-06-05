import type { CMSAdminUser, CMSAuthAdapter } from "../auth/adapter";
import type { NamespaceDef } from "../i18n/namespace";
import type { NamespaceDefinition } from "../i18n/types";
import type { CMSAdapter } from "./adapter";
import type { CMSPlugin } from "./plugin";

export interface CMSConfig {
	database: CMSAdapter;
	namespaces: NamespaceDef<NamespaceDefinition>[];
	/** Optional: Locales to automatically upsert on startup. */
	initialLocales?: { code: string; name: string; isDefault?: boolean }[];
	plugins?: CMSPlugin[];
	/**
	 * Auth adapter that verifies requests and resolves permissions.
	 * Use `tokenAuthAdapter` for simple token-based auth or
	 * `betterAuthCMSAdapter` for full user auth via better-auth.
	 */
	auth: CMSAuthAdapter;
	/**
	 * If set, this user is upserted on CMS startup with wildcard permissions.
	 * Requires the auth adapter to implement `upsertAdminUser`.
	 */
	initialAdminUser?: CMSAdminUser;
}
