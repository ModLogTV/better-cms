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
	auth: {
		/** Token for read-only access (translations, public pages) */
		readToken: string;
		/** Token for administrative access (writes, locales, media) */
		adminToken: string;
	};
}
