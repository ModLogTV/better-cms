import type { ReactNode } from "react";
import type { NamespaceDef } from "./namespace";
import type {
	NamespaceDefinition,
	PlainFlatKeys,
	RichFlatKeys,
	RichTranslatorFn,
	TranslatorFn,
} from "./types";

/**
 * Interpolates a translation string with variables.
 * Replaces `{varName}` tokens with values from `vars`.
 */
function interpolate(opts: {
	value: string;
	vars: Record<string, unknown>;
}): string {
	const { value, vars } = opts;
	return value.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

/**
 * Parses a rich-text string into an array of strings and tag-wrapped segments.
 * Handles `<tagName>content</tagName>` syntax.
 */
function parseRich(opts: {
	value: string;
	tags: Record<string, (chunks: ReactNode) => ReactNode>;
}): ReactNode {
	const { value, tags } = opts;
	const tagNames = Object.keys(tags).join("|");
	if (!tagNames) return value;

	const re = new RegExp(`<(${tagNames})>(.*?)<\\/\\1>`, "gs");
	const parts: ReactNode[] = [];
	let cursor = 0;

	for (const match of value.matchAll(re)) {
		const [full, tag, inner] = match;
		const offset = match.index ?? 0;
		if (offset > cursor) parts.push(value.slice(cursor, offset));
		parts.push(tags[tag]?.(inner) ?? inner);
		cursor = offset + full.length;
	}

	if (cursor < value.length) parts.push(value.slice(cursor));
	return parts.length === 1 ? parts[0] : parts;
}

/**
 * Returns a fully typed `t()` function bound to the given namespace, translations, and locale.
 * - Plain keys: `t("key")` → string
 * - Vars keys: `t("key", { name: "Ada" })` → string
 * - Plural keys: `t("key", { count: 3 })` → string (selects suffix like _one, _other)
 * - Rich keys are excluded - TS error if attempted; use `createRichTranslator` for those.
 *
 * Falls back to the key string itself if a translation is missing.
 */
export function createTranslator<T extends NamespaceDefinition>(opts: {
	ns: NamespaceDef<T>;
	translations: Record<string, string>;
	locale: string;
}): TranslatorFn<T> {
	const { locale, translations } = opts;
	const rules = new Intl.PluralRules(locale);

	return (<K extends PlainFlatKeys<T>>(
		key: K,
		vars?: Record<string, unknown>,
	) => {
		let value: string | undefined;

		// 1. Handle Pluralization if 'count' is present
		if (vars && typeof vars.count === "number") {
			const suffix = rules.select(vars.count);
			value = translations[`${key as string}_${suffix}`];

			// Fallback to _other if specific rule suffix (e.g. _few) is missing
			if (value === undefined && suffix !== "other") {
				value = translations[`${key as string}_other`];
			}
		}

		// 2. Exact match fallback
		if (value === undefined) {
			value = translations[key as string];
		}

		if (value === undefined) return key as string;
		return vars ? interpolate({ value, vars }) : value;
	}) as TranslatorFn<T>;
}

/**
 * Returns a fully typed `tRich()` function for rich-text keys.
 * Accepts a tag-render map and returns a `ReactNode`.
 * Only keys declared with `rich<Tags>()` are accepted - TS error otherwise.
 *
 * @example
 * ```tsx
 * const { tRich } = createRichTranslator({ ns, translations, locale: "en" })
 * tRich("terms", { b: chunks => <b>{chunks}</b> })
 * ```
 */
export function createRichTranslator<T extends NamespaceDefinition>(opts: {
	ns: NamespaceDef<T>;
	translations: Record<string, string>;
	locale: string;
}): RichTranslatorFn<T> {
	const { translations } = opts;
	return (<K extends RichFlatKeys<T>>(
		key: K,
		tags: Record<string, (chunks: ReactNode) => ReactNode>,
	) => {
		const value = translations[key as string];
		if (value === undefined) return key as string;
		return parseRich({ value, tags });
	}) as RichTranslatorFn<T>;
}
