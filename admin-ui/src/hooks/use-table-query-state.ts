import { parseAsInteger, useQueryState } from "nuqs";
import { useMemo } from "react";
import { getFiltersStateParser, getSortingStateParser } from "@/lib/parsers";

/**
 * Reads the same nuqs-backed `page`/`perPage`/`sort`/`filters` URL state that
 * `useDataTable` manages internally, so a server-mode table's data-fetching
 * query can be built from the current table state without waiting on the
 * `Table` instance (which itself needs the fetched page to exist).
 *
 * The sort/filter parsers (and their `[]` defaults) must stay referentially
 * stable across renders - a fresh parser instance every render made nuqs
 * treat each render as a distinct subscription, which raced with (and
 * reverted) updates written by the sort list / filter menu.
 */
export function useTableQueryState<TData>(opts: {
	filterableColumnIds: string[];
	defaultPageSize?: number;
}) {
	const { filterableColumnIds, defaultPageSize = 10 } = opts;
	const [page] = useQueryState("page", parseAsInteger.withDefault(1));
	const [perPage] = useQueryState(
		"perPage",
		parseAsInteger.withDefault(defaultPageSize),
	);

	const sortingParser = useMemo(
		() => getSortingStateParser<TData>().withDefault([]),
		[],
	);
	const [sorting] = useQueryState("sort", sortingParser);

	// biome-ignore lint/correctness/useExhaustiveDependencies: filterableColumnIds is expected to be a stable module-level constant per table
	const filtersParser = useMemo(
		() => getFiltersStateParser<TData>(filterableColumnIds).withDefault([]),
		[],
	);
	const [filters] = useQueryState("filters", filtersParser);

	return { page, perPage, sorting, filters };
}

/** First value of a matching column filter, if any - our server filters only support single values. */
export function filterValue(
	filters: { id: string; value: string | string[] }[],
	id: string,
): string | undefined {
	const match = filters.find((f) => f.id === id);
	if (!match) return undefined;
	return Array.isArray(match.value) ? match.value[0] : match.value;
}
