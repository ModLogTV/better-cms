import type { CSSProperties } from "react";

export { cn } from "cn";

/**
 * Passes CSS custom properties (`--foo`) through React's `style` prop.
 * `CSSProperties` doesn't declare arbitrary `--*` keys, so this is the one
 * place that casts - callers get a typed record instead of an inline
 * `as CSSProperties` at every call site.
 */
export function toCssProperties(
	vars: Record<`--${string}`, string | number>,
): CSSProperties {
	return vars as CSSProperties;
}

export function formatBytes(bytes: number) {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
