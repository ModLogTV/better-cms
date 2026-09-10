/** Plain string key. No interpolation. */
export type KeyMarker = { _type: "key" };
/** String key with typed interpolation variables. */
export type VarsMarker<T> = { _type: "vars"; _vars: T };
/** String key with count-based plural forms. `T` must include `count: number`. */
export type PluralMarker<T> = { _type: "plural"; _vars: T };
/** Rich-text key with typed JSX tag injection. `Tags` is a union of allowed tag names. */
export type RichMarker<Tags extends string> = { _type: "rich"; _tags: Tags };

/** Plain string key - `t("my.key")` returns a string. */
export const key: KeyMarker = { _type: "key" };

/**
 * Interpolated string key - `t("my.key", vars)` where `vars` matches `T`.
 * Pass the variable names explicitly so the admin UI can display them.
 *
 * @example
 * ```ts
 * greeting: vars<{ name: string }>("name")
 * // t("greeting", { name: "Ada" }) → "Hello, Ada!"
 * ```
 */
export const vars = <T>(...varNames: (keyof T & string)[]): VarsMarker<T> => ({
	_type: "vars",
	// Cast: type says T, runtime stores string[] so describe() can read keys.
	_vars: varNames as unknown as T,
});

/**
 * Plural key - `t("my.key", { count })` selects the correct plural form.
 *
 * @example
 * ```ts
 * items: plural<{ count: number }>()
 * // t("items", { count: 3 }) → "3 items"
 * ```
 */
export const plural = <T>(): PluralMarker<T> => ({
	_type: "plural",
	_vars: {} as T,
});

/**
 * Rich-text key - `tRich("my.key", { b: (chunks) => <b>{chunks}</b> })` returns a `ReactNode`.
 * Pass tag names as rest args; TypeScript infers `Tags` from them automatically.
 *
 * @example
 * ```ts
 * terms: rich("b", "link")
 * // tRich("terms", { b: chunks => <b>{chunks}</b>, link: chunks => <a href="/terms">{chunks}</a> })
 * ```
 */
export const rich = <Tags extends string>(
	...tags: Tags[]
): RichMarker<Tags> => ({
	_type: "rich",
	// Cast: type says Tags (string union), runtime stores Tags[] so describe() can read names.
	_tags: tags as unknown as Tags,
});
