import { IconChevronLeft, IconSearch } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	type ColumnDef,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";

import { DataTable } from "@/components/data-table/data-table";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import {
	TranslationKeyCell,
	TranslationValueCell,
} from "@/components/shared/TranslationCells";
import { Badge } from "@/components/ui/badge";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, type KeyMetadata } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_layout/translations/$namespace")({
	component: TranslationEditorPage,
});

function coverageVariant(pct: number): "success" | "warning" | "destructive" {
	if (pct >= 100) return "success";
	if (pct >= 50) return "warning";
	return "destructive";
}

function NamespaceRail({ current }: { current: string }) {
	const navigate = useNavigate();
	const { data } = useQuery({
		queryKey: ["cms", "namespaces"],
		queryFn: () => api.namespaces.list(),
	});

	return (
		<div className="hidden w-48 shrink-0 space-y-0.5 rounded-lg border p-2 sm:block">
			<p className="px-2 py-1 text-xs font-medium text-muted-foreground">
				Namespaces
			</p>
			{data?.map((ns) => (
				<button
					key={ns.name}
					type="button"
					onClick={() =>
						navigate({
							to: "/translations/$namespace",
							params: { namespace: ns.name },
						})
					}
					className={cn(
						"block w-full truncate rounded-md px-2 py-1.5 text-left font-mono text-xs transition-colors",
						ns.name === current
							? "bg-primary/10 text-primary"
							: "text-muted-foreground hover:bg-muted hover:text-foreground",
					)}
				>
					{ns.name}
				</button>
			))}
		</div>
	);
}

function TranslationEditorPage() {
	const { namespace } = Route.useParams();
	const [locale, setLocale] = useState("");
	const [search, setSearch] = useState("");

	const locales = useQuery({
		queryKey: ["cms", "locales"],
		queryFn: () => api.locales.list(),
	});

	// Default to the CMS's default locale once locales load, unless the user
	// has already picked one (e.g. after switching namespaces).
	useEffect(() => {
		if (locale || !locales.data || locales.data.length === 0) return;
		setLocale(
			locales.data.find((l) => l.isDefault)?.code ?? locales.data[0].code,
		);
	}, [locales.data, locale]);

	const namespaceSummary = useQuery({
		queryKey: ["cms", "namespaces"],
		queryFn: () => api.namespaces.list(),
	});
	const coverage =
		namespaceSummary.data?.find((ns) => ns.name === namespace)?.coverage ?? {};

	const metadata = useQuery({
		queryKey: ["cms", "namespace", namespace, "describe"],
		queryFn: () => api.namespaces.describe(namespace),
	});

	const translations = useQuery({
		queryKey: ["cms", "translations", namespace, locale],
		queryFn: () => api.namespaces.getTranslations(namespace, locale),
		enabled: !!locale,
	});

	const isLoading = metadata.isLoading || translations.isLoading || !locale;

	const columns = useMemo<ColumnDef<KeyMetadata>[]>(
		() => [
			{
				id: "key",
				accessorKey: "key",
				header: "Key",
				cell: ({ row }) => <TranslationKeyCell meta={row.original} />,
			},
			{
				id: "value",
				header: `Value (${locale || "…"})`,
				cell: ({ row }) => (
					<TranslationValueCell
						meta={row.original}
						value={translations.data?.[row.original.key] ?? ""}
						namespace={namespace}
						locale={locale}
					/>
				),
			},
		],
		[locale, namespace, translations.data],
	);

	const table = useReactTable({
		data: metadata.data ?? [],
		columns,
		getRowId: (row) => row.key,
		state: { globalFilter: search },
		onGlobalFilterChange: setSearch,
		globalFilterFn: (row, _columnId, filterValue) =>
			row.original.key
				.toLowerCase()
				.includes(String(filterValue).toLowerCase()),
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		initialState: { pagination: { pageSize: 25 } },
	});

	return (
		<div className="flex gap-4">
			<NamespaceRail current={namespace} />

			<div className="min-w-0 flex-1 space-y-4">
				<div className="flex items-center gap-2">
					<Link
						to="/translations"
						className="text-muted-foreground hover:text-foreground"
					>
						<IconChevronLeft className="size-4" />
					</Link>
					<div className="flex-1">
						<h2 className="font-mono text-2xl font-bold tracking-tight">
							{namespace}
						</h2>
						<p className="text-sm text-muted-foreground">
							{metadata.data?.length ?? 0} keys
						</p>
					</div>
				</div>

				<div className="flex flex-wrap items-center justify-between gap-2">
					<Tabs value={locale} onValueChange={setLocale}>
						<TabsList>
							{locales.data?.map((l) => (
								<TabsTrigger key={l.code} value={l.code} className="gap-1.5">
									{l.code}
									{coverage[l.code] !== undefined && (
										<Badge
											variant={coverageVariant(coverage[l.code])}
											className="text-2xs"
										>
											{coverage[l.code]}%
										</Badge>
									)}
								</TabsTrigger>
							))}
						</TabsList>
					</Tabs>

					<InputGroup className="w-56">
						<InputGroupInput
							placeholder="Filter keys"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
						<InputGroupAddon>
							<IconSearch className="size-3.5 shrink-0 opacity-50" />
						</InputGroupAddon>
					</InputGroup>
				</div>

				{isLoading ? (
					<DataTableSkeleton
						columnCount={columns.length}
						withViewOptions={false}
						rowCount={6}
					/>
				) : (
					<DataTable table={table} />
				)}
			</div>
		</div>
	);
}
