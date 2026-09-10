/** Shared server-side pagination contract for adapter `list*` methods that support it. */
export interface PaginationParams {
	/** 1-indexed page number. */
	page: number;
	pageSize: number;
}

/** A single column sort instruction. Adapters receive an ordered array to support multi-column sort. */
export interface SortParam {
	id: string;
	desc: boolean;
}

export interface PaginatedResult<T> {
	items: T[];
	total: number;
}
