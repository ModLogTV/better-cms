import type { NamespaceDef } from "../i18n/namespace";
import type { NamespaceDefinition } from "../i18n/types";
import type { InputHint, KeyMetadata, KeyType } from "./types";

/** Recursively flattens a namespace definition tree into a list of key metadata. */
function walk(
	def: NamespaceDefinition,
	prefix: string,
	out: KeyMetadata[],
): void {
	for (const [k, v] of Object.entries(def)) {
		const flatKey = prefix ? `${prefix}.${k}` : k;
		if (typeof v !== "object" || v === null) continue;

		if ("_type" in v) {
			const marker = v as { _type: string; _vars?: unknown; _tags?: unknown };
			let type: KeyType;
			let inputHint: InputHint;
			let vars: string[] | undefined;
			let tags: string[] | undefined;

			switch (marker._type) {
				case "key":
					type = "key";
					inputHint = "text";
					break;
				case "vars":
					type = "vars";
					inputHint = "text+vars";
					vars = marker._vars
						? Object.keys(marker._vars as Record<string, unknown>)
						: [];
					break;
				case "plural":
					type = "plural";
					inputHint = "text+count";
					vars = ["count"];
					break;
				case "rich":
					type = "rich";
					inputHint = "rich-text";
					tags =
						typeof marker._tags === "string"
							? [marker._tags]
							: Object.keys((marker._tags ?? {}) as Record<string, unknown>);
					break;
				default:
					continue;
			}

			out.push({
				key: flatKey,
				type,
				inputHint,
				...(vars ? { vars } : {}),
				...(tags ? { tags } : {}),
			});
		} else {
			walk(v as NamespaceDefinition, flatKey, out);
		}
	}
}

/**
 * Returns all translation keys in a namespace as a flat list with type metadata.
 *
 * @example
 * ```ts
 * describeNamespace(ns)
 * // [
 * //   { key: "nav.home",    type: "key",    inputHint: "text" },
 * //   { key: "nav.welcome", type: "vars",   inputHint: "text+vars", vars: ["name"] },
 * //   { key: "items.count", type: "plural", inputHint: "text+count", vars: ["count"] },
 * //   { key: "hero.body",   type: "rich",   inputHint: "rich-text",  tags: ["b", "a"] },
 * // ]
 * ```
 */
export function describeNamespace(
	ns: NamespaceDef<NamespaceDefinition>,
): KeyMetadata[] {
	const out: KeyMetadata[] = [];
	walk(ns.definition, "", out);
	return out;
}
