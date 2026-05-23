import type { NamespaceDef } from "../i18n/namespace";
import type { NamespaceDefinition } from "../i18n/types";
import type { CMSAdapter } from "./adapter";
import type { CMSPlugin } from "./plugin";

export interface CMSConfig {
	database: CMSAdapter;
	namespaces: NamespaceDef<NamespaceDefinition>[];
	plugins?: CMSPlugin[];
	auth: { internalToken: string };
}
