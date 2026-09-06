import type { AnyElysia, MaybeArray, MaybePromise } from "elysia";

/** Structural minimum of an Elysia instance needed to mount plugins. */
export interface ElysiaLike {
	use(plugin: MaybeArray<MaybePromise<AnyElysia>>): this;
}

import type { CMSAuthAdapter } from "../auth/adapter";
import type { NamespaceDef } from "../i18n/namespace";
import type { NamespaceDefinition } from "../i18n/types";
import type { CMSAdapter } from "./adapter";
import type { CMSEventEmitter } from "./events";
import type { CMSStorageAdapter } from "./storage";

export interface CMSInfer {
	Namespaces: Record<string, NamespaceDef<NamespaceDefinition>>;
	PageBlocks: unknown;
}

export interface CMSContext {
	namespaces: NamespaceDef<NamespaceDefinition>[];
	adapter: CMSAdapter;
	storage?: CMSStorageAdapter;
	auth: CMSAuthAdapter;
	events: CMSEventEmitter;
	/** Route-mount queue — plugins mount routes here via init(). No real Elysia instance exists until `toElysiaPlugin()` (`@modlog/better-cms/elysia`) applies these mounts. */
	elysiaApp: ElysiaLike;
}

export interface CMSPlugin {
	name: string;
	init(ctx: CMSContext): void | Promise<void>;
	extendInfer?: (current: CMSInfer) => CMSInfer;
}
