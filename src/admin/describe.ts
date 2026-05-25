import type { NamespaceDef } from "../i18n/namespace";
import type { NamespaceDefinition } from "../i18n/types";
import type { InputHint, KeyMetadata, KeyType } from "./types";

/** Recursively flattens a namespace definition tree into a list of key metadata. */
function walk(opts: {
	def: NamespaceDefinition;
	prefix: string;
	out: KeyMetadata[];
}): void {
	const { def, prefix, out } = opts;
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
					// _vars is string[] at runtime (var names passed to vars())
					vars = Array.isArray(marker._vars)
						? (marker._vars as string[])
						: Object.keys(marker._vars as Record<string, unknown>);
					break;
				case "plural":
					type = "plural";
					inputHint = "text+count";
					vars = ["count"];
					break;
				case "rich":
					type = "rich";
					inputHint = "rich-text";
					// _tags is Tags[] at runtime (tag names passed to rich())
					tags = Array.isArray(marker._tags)
						? (marker._tags as string[])
						: typeof marker._tags === "string"
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
			walk({ def: v as NamespaceDefinition, prefix: flatKey, out });
		}
	}
}

/**
 * Returns all translation keys in a namespace as a flat list with type metadata.
 *
 * @example
 * ```ts
 * describeNamespace({ ns })
 * // [
 * //   { key: "nav.home",    type: "key",    inputHint: "text" },
 * //   { key: "nav.welcome", type: "vars",   inputHint: "text+vars", vars: ["name"] },
 * //   { key: "items.count", type: "plural", inputHint: "text+count", vars: ["count"] },
 * //   { key: "hero.body",   type: "rich",   inputHint: "rich-text",  tags: ["b", "a"] },
 * // ]
 * ```
 */
export function describeNamespace(opts: {
	ns: NamespaceDef<NamespaceDefinition>;
}): KeyMetadata[] {
	const out: KeyMetadata[] = [];
	walk({ def: opts.ns.definition, prefix: "", out });
	return out;
}
