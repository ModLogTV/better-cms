import type { ReactNode } from "react";
import type {
	KeyMarker,
	PluralMarker,
	RichMarker,
	VarsMarker,
} from "./markers";

export type LeafMarker =
	| KeyMarker
	| VarsMarker<unknown>
	| PluralMarker<unknown>
	| RichMarker<string>;

export type NamespaceDefinition = {
	[k: string]: LeafMarker | NamespaceDefinition;
};

// --- key traversal ---

/** Resolves a dot-path string to the leaf marker at that path. */
type GetLeaf<T, K extends string> = K extends `${infer Head}.${infer Tail}`
	? Head extends keyof T
		? GetLeaf<T[Head], Tail>
		: never
	: K extends keyof T
		? T[K]
		: never;

/** All flat dot-keys in T, excluding rich() leaves (those belong to tRich). */
export type PlainFlatKeys<T, Prefix extends string = ""> = {
	[K in keyof T & string]: T[K] extends RichMarker<string>
		? never
		: T[K] extends LeafMarker
			? `${Prefix}${K}`
			: T[K] extends NamespaceDefinition
				? PlainFlatKeys<T[K], `${Prefix}${K}.`>
				: never;
}[keyof T & string];

/** All flat dot-keys in T that are rich() leaves. */
export type RichFlatKeys<T, Prefix extends string = ""> = {
	[K in keyof T & string]: T[K] extends RichMarker<string>
		? `${Prefix}${K}`
		: T[K] extends NamespaceDefinition
			? RichFlatKeys<T[K], `${Prefix}${K}.`>
			: never;
}[keyof T & string];

/** @deprecated Use PlainFlatKeys or RichFlatKeys. Kept for internal use. */
export type FlatKeys<T, Prefix extends string = ""> = {
	[K in keyof T & string]: T[K] extends LeafMarker
		? `${Prefix}${K}`
		: T[K] extends NamespaceDefinition
			? FlatKeys<T[K], `${Prefix}${K}.`>
			: never;
}[keyof T & string];

// --- arg mapping ---

/** Maps a leaf marker to the extra call arguments t() requires. */
type LeafArgs<L> = L extends KeyMarker
	? []
	: L extends VarsMarker<infer V>
		? [vars: V]
		: L extends PluralMarker<infer V>
			? [vars: V]
			: never;

/** Extracts the tag-name union from a RichMarker at a given dot-path. */
type RichTagsAt<T, K extends string> =
	GetLeaf<T, K> extends RichMarker<infer Tags> ? Tags : never;

// --- translator function types ---

/**
 * Typed translator for plain and interpolated keys.
 * - `t("plain.key")` — no extra args
 * - `t("vars.key", { name: "Ada" })` — vars object required
 * - `t("plural.key", { count: 3 })` — count object required
 * - Rich keys are excluded — use `tRich()` for those.
 */
export type TranslatorFn<T extends NamespaceDefinition> = <
	K extends PlainFlatKeys<T>,
>(
	key: K,
	...args: LeafArgs<GetLeaf<T, K>>
) => string;

/**
 * Typed translator for rich-text keys with JSX tag injection.
 * `tags` must cover every tag name declared in the `rich<Tags>()` marker — no more, no less.
 *
 * @example
 * ```tsx
 * tRich("terms", {
 *   b:    chunks => <b>{chunks}</b>,
 *   link: chunks => <a href="/terms">{chunks}</a>,
 * })
 * ```
 */
export type RichTranslatorFn<T extends NamespaceDefinition> = <
	K extends RichFlatKeys<T>,
>(
	key: K,
	tags: Record<RichTagsAt<T, K>, (chunks: ReactNode) => ReactNode>,
) => ReactNode;
