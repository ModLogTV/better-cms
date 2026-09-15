import {
	IconCategory,
	IconChevronLeft,
	IconChevronRight,
	IconHistory,
	IconLetterCase,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	type ColumnDef,
	type ColumnFiltersState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type Row,
	type SortingState,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";
import { useQueryState } from "nuqs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTableAdvancedToolbar } from "@/components/data-table/data-table-advanced-toolbar";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTableFilterMenu } from "@/components/data-table/data-table-filter-menu";
import { DataTableSortList } from "@/components/data-table/data-table-sort-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { type AuditLogEntry, api } from "@/lib/api";
import { formatAuditAction } from "@/lib/audit";
import { getFiltersStateParser } from "@/lib/parsers";
import type { ExtendedColumnFilter } from "@/types/data-table";

export const Route = createFileRoute("/_layout/audit-log/")({
	component: AuditLogPage,
});

const TARGET_TYPES = [
	{ value: "group", label: "Group" },
	{ value: "user", label: "User" },
	{ value: "pageGrant", label: "Page grant" },
	{ value: "mediaTagGrant", label: "Tag grant" },
];

const PAGE_SIZE = 20;
const FILTERABLE_COLUMN_IDS = ["actor", "action", "targetType"];

/** Client-side evaluation of an `ExtendedColumnFilter` for a text column - mirrors `dataTableConfig.textOperators`. */
function textFilterFn(
	row: Row<AuditLogEntry>,
	columnId: string,
	filterValue: ExtendedColumnFilter<AuditLogEntry>,
) {
	const haystack = String(row.getValue(columnId) ?? "").toLowerCase();
	const needle = String(filterValue.value ?? "").toLowerCase();

	switch (filterValue.operator) {
		case "eq":
			return haystack === needle;
		case "ne":
			return haystack !== needle;
		case "notILike":
			return !haystack.includes(needle);
		case "isEmpty":
			return haystack.length === 0;
		case "isNotEmpty":
			return haystack.length > 0;
		default:
			return haystack.includes(needle);
	}
}

/** Client-side evaluation of an `ExtendedColumnFilter` for the "Target type" select column - mirrors `dataTableConfig.selectOperators`. Also mirrors the `targetType` param already sent to the server, so it's a no-op there and only does real work on the client-only columns. */
function targetTypeFilterFn(
	row: Row<AuditLogEntry>,
	columnId: string,
	filterValue: ExtendedColumnFilter<AuditLogEntry>,
) {
	const value = row.getValue<string>(columnId);
	const needle = Array.isArray(filterValue.value)
		? filterValue.value[0]
		: filterValue.value;

	switch (filterValue.operator) {
		case "ne":
			return value !== needle;
		case "isEmpty":
			return !value;
		case "isNotEmpty":
			return !!value;
		default:
			return value === needle;
	}
}

function buildColumns(
	actorLabel: (actorId: string | null) => string,
): ColumnDef<AuditLogEntry>[] {
	return [
		{
			id: "time",
			accessorFn: (entry) => entry.createdAt,
			header: ({ column }) => (
				<DataTableColumnHeader column={column} label="Time" />
			),
			cell: ({ row }) => (
				<span className="whitespace-nowrap text-muted-foreground text-xs">
					{new Date(row.original.createdAt).toLocaleString()}
				</span>
			),
			enableColumnFilter: false,
		},
		{
			id: "actor",
			accessorFn: (entry) => actorLabel(entry.actorId),
			header: ({ column }) => (
				<DataTableColumnHeader column={column} label="Actor" />
			),
			cell: ({ row }) => (
				<span className="text-sm">{actorLabel(row.original.actorId)}</span>
			),
			enableColumnFilter: true,
			filterFn: textFilterFn,
			meta: {
				label: "Actor",
				placeholder: "Search actor…",
				variant: "text",
				icon: IconLetterCase,
			},
		},
		{
			id: "action",
			accessorFn: (entry) => entry.action,
			header: ({ column }) => (
				<DataTableColumnHeader column={column} label="Action" />
			),
			cell: ({ row }) => (
				<Tooltip>
					<TooltipTrigger asChild>
						<Badge variant="outline">
							{formatAuditAction(row.original.action)}
						</Badge>
					</TooltipTrigger>
					<TooltipContent className="font-mono text-2xs">
						{row.original.action}
					</TooltipContent>
				</Tooltip>
			),
			enableColumnFilter: true,
			filterFn: textFilterFn,
			meta: {
				label: "Action",
				placeholder: "Search action…",
				variant: "text",
				icon: IconLetterCase,
			},
		},
		{
			id: "targetType",
			accessorFn: (entry) => entry.targetType,
			header: ({ column }) => (
				<DataTableColumnHeader column={column} label="Target" />
			),
			cell: ({ row }) => (
				<span className="font-mono text-xs">
					{row.original.targetType} · {row.original.targetId}
				</span>
			),
			enableColumnFilter: true,
			filterFn: targetTypeFilterFn,
			meta: {
				label: "Target type",
				variant: "select",
				icon: IconCategory,
				options: TARGET_TYPES,
			},
		},
		{
			id: "detail",
			header: "Detail",
			enableSorting: false,
			enableColumnFilter: false,
			cell: ({ row }) => (
				<Tooltip>
					<TooltipTrigger asChild>
						<span className="block max-w-64 truncate font-mono text-2xs text-muted-foreground">
							{JSON.stringify(row.original.detail)}
						</span>
					</TooltipTrigger>
					<TooltipContent className="max-w-sm">
						<pre className="whitespace-pre-wrap text-2xs">
							{JSON.stringify(row.original.detail, null, 2)}
						</pre>
					</TooltipContent>
				</Tooltip>
			),
		},
	];
}

function AuditLogPage() {
	const [page, setPage] = useState(1);

	// No dedicated user-lookup-by-id endpoint - fetch generously (admin-scale)
	// and resolve actor names client-side, same idiom used on the group
	// detail page for its members list.
	const { data: usersPage } = useQuery({
		queryKey: ["cms", "users", "all"],
		queryFn: () => api.users.list({ page: 1, pageSize: 1000 }),
	});
	const actorLabel = useCallback(
		(actorId: string | null) => {
			if (!actorId) return "System";
			const user = usersPage?.items.find((u) => u.id === actorId);
			return user ? user.name || user.email : actorId;
		},
		[usersPage],
	);

	const [sorting, setSorting] = useState<SortingState>([
		{ id: "time", desc: true },
	]);
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

	const filtersParser = useMemo(
		() =>
			getFiltersStateParser<AuditLogEntry>(FILTERABLE_COLUMN_IDS).withDefault(
				[],
			),
		[],
	);
	const [filters] = useQueryState("filters", filtersParser);
	const columnFilters: ColumnFiltersState = useMemo(
		() => filters.map((f) => ({ id: f.id, value: f })),
		[filters],
	);
	const hasActiveFilters = filters.length > 0;

	// The server only knows how to filter by `targetType` - everything else
	// (actor, action) is filtered client-side over the currently loaded page.
	const targetTypeFilter = filters.find((f) => f.id === "targetType");
	const targetType = targetTypeFilter
		? Array.isArray(targetTypeFilter.value)
			? targetTypeFilter.value[0]
			: targetTypeFilter.value
		: undefined;

	// biome-ignore lint/correctness/useExhaustiveDependencies: resetting to page 1 whenever the server-side filter changes, not on every filters change
	useEffect(() => {
		setPage(1);
	}, [targetType]);

	const { data, isLoading } = useQuery({
		queryKey: ["cms", "audit-log", page, targetType],
		queryFn: () => api.auditLog.list({ page, pageSize: PAGE_SIZE, targetType }),
	});

	const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

	const columns = useMemo(() => buildColumns(actorLabel), [actorLabel]);

	const table = useReactTable({
		data: data?.items ?? [],
		columns,
		state: { sorting, columnVisibility, columnFilters },
		onSortingChange: setSorting,
		onColumnVisibilityChange: setColumnVisibility,
		onColumnFiltersChange: () => {},
		getRowId: (entry) => entry.id,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getSortedRowModel: getSortedRowModel(),
	});

	const rows = table.getRowModel().rows;

	return (
		<div className="space-y-4">
			<div>
				<h2 className="text-2xl font-bold tracking-tight">Audit Log</h2>
				<p className="text-muted-foreground">
					Every change to groups, nesting, grants and permissions - who, what,
					when.
				</p>
			</div>

			<DataTableAdvancedToolbar table={table}>
				<DataTableFilterMenu table={table} />
				<DataTableSortList table={table} />
			</DataTableAdvancedToolbar>

			{isLoading ? (
				<div className="space-y-2">
					{Array.from({ length: 6 }).map((_, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton row count, never reordered
						<Skeleton key={i} className="h-10 rounded-md" />
					))}
				</div>
			) : !data || data.items.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-muted-foreground">
					<IconHistory className="mb-3 size-12 opacity-30" />
					<p className="text-sm">No activity recorded yet.</p>
				</div>
			) : rows.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-muted-foreground">
					<IconHistory className="mb-3 size-12 opacity-30" />
					<p className="text-sm">
						{hasActiveFilters
							? "No entries on this page match these filters."
							: "No activity recorded yet."}
					</p>
				</div>
			) : (
				<>
					<div className="overflow-hidden rounded-md border">
						<Table>
							<TableHeader>
								{table.getHeaderGroups().map((headerGroup) => (
									<TableRow
										key={headerGroup.id}
										className="hover:bg-transparent"
									>
										{headerGroup.headers.map((header) => (
											<TableHead key={header.id}>
												{header.isPlaceholder
													? null
													: flexRender(
															header.column.columnDef.header,
															header.getContext(),
														)}
											</TableHead>
										))}
									</TableRow>
								))}
							</TableHeader>
							<TableBody>
								{rows.map((row) => (
									<TableRow key={row.id}>
										{row.getVisibleCells().map((cell) => (
											<TableCell key={cell.id}>
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext(),
												)}
											</TableCell>
										))}
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>

					<div className="flex items-center justify-between">
						<p className="text-muted-foreground text-xs">
							Page {page} of {totalPages} · {data.total} entries
						</p>
						<div className="flex gap-1">
							<Button
								size="icon"
								variant="outline"
								className="size-7"
								disabled={page <= 1}
								onClick={() => setPage((p) => Math.max(1, p - 1))}
							>
								<IconChevronLeft className="size-3.5" />
							</Button>
							<Button
								size="icon"
								variant="outline"
								className="size-7"
								disabled={page >= totalPages}
								onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
							>
								<IconChevronRight className="size-3.5" />
							</Button>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
