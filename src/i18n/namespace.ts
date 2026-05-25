import type { NamespaceDefinition } from "./types";

export interface NamespaceDef<T extends NamespaceDefinition> {
	name: string;
	definition: T;
}

/**
 * Defines a translation namespace. Keys are declared here in code; values live in the DB.
 * The return type carries the full definition shape for downstream type inference.
 *
 * @example
 * ```ts
 * export const nav = defineNamespace({
 *   name: "nav",
 *   definition: {
 *     topNav: {
 *       aboutUs: key,
 *       greeting: vars<{ name: string }>("name"),
 *     },
 *   }
 * })
 * ```
 */
export const defineNamespace = <T extends NamespaceDefinition>(opts: {
	name: string;
	definition: T;
}): NamespaceDef<T> => ({ name: opts.name, definition: opts.definition });
