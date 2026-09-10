import type { SortParam } from "../core/adapter";

/** Parses the JSON-encoded `sort` query param shared by list routes into `SortParam[]`. */
export function parseSort(raw: string | undefined): SortParam[] | undefined {
	if (!raw) return undefined;
	try {
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return undefined;
		return parsed.filter(
			(s): s is SortParam =>
				typeof s?.id === "string" && typeof s?.desc === "boolean",
		);
	} catch {
		return undefined;
	}
}
