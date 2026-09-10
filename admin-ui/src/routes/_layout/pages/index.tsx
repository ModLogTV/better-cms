import {
	IconClock,
	IconFileText,
	IconFlag,
	IconLink,
	IconPencil,
	IconPlus,
	IconRocket,
	IconWorld,
} from "@tabler/icons-react";
import { useForm } from "@tanstack/react-form";
import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableAdvancedToolbar } from "@/components/data-table/data-table-advanced-toolbar";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTableFilterMenu } from "@/components/data-table/data-table-filter-menu";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { DataTableSortList } from "@/components/data-table/data-table-sort-list";
import { SelectionActionBar } from "@/components/shared/SelectionActionBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useDataTable } from "@/hooks/use-data-table";
import { filterValue, useTableQueryState } from "@/hooks/use-table-query-state";
import { api, type PageSummary } from "@/lib/api";

export const Route = createFileRoute("/_layout/pages/")({
	component: PagesPage,
});

function StatusBadge({ status }: { status: PageSummary["status"] }) {
	return (
		<Badge variant={status === "published" ? "success" : "warning"}>
			{status}
		</Badge>
	);
}

interface NewPageValues {
	slug: string;
	locale: string;
}

function NewPageDialog() {
	const qc = useQueryClient();
	const navigate = useNavigate();
	const [open, setOpen] = useState(false);

	const { data: locales = [] } = useQuery({
		queryKey: ["cms", "locales"],
		queryFn: () => api.locales.list(),
	});

	const create = useMutation({
		mutationFn: (values: NewPageValues) =>
			api.pages.create(values.slug, values.locale),
		onSuccess: (page) => {
			toast.success("Page created");
			qc.invalidateQueries({ queryKey: ["cms", "pages"] });
			setOpen(false);
			form.reset();
			navigate({
				to: "/pages/$pageId",
				params: { pageId: page.id },
				search: { slug: page.slug, locale: page.locale },
			});
		},
		onError: (e) =>
			toast.error(e instanceof Error ? e.message : "Couldn't create page"),
	});

	const form = useForm({
		defaultValues: { slug: "", locale: "" } as NewPageValues,
		onSubmit: async ({ value }) => {
			await create.mutateAsync(value);
		},
	});

	return (
		<Dialog
			open={open}
			onOpenChange={(o) => {
				setOpen(o);
				if (!o) form.reset();
			}}
		>
			<DialogTrigger asChild>
				<Button size="lg">
					<IconPlus className="size-4" />
					New page
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>New page</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="contents"
				>
					<div className="space-y-4">
						<form.Field
							name="slug"
							validators={{
								onChange: ({ value }) =>
									!value.trim() ? "Required" : undefined,
							}}
						>
							{(field) => (
								<div className="space-y-1.5">
									<Label htmlFor={field.name}>Slug</Label>
									<Input
										id={field.name}
										placeholder="about-us"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										className="font-mono text-sm"
									/>
								</div>
							)}
						</form.Field>
						<form.Field
							name="locale"
							validators={{
								onChange: ({ value }) =>
									!value.trim() ? "Required" : undefined,
							}}
						>
							{(field) => (
								<div className="space-y-1.5">
									<Label htmlFor={field.name}>Locale</Label>
									<Select
										value={field.state.value}
										onValueChange={field.handleChange}
									>
										<SelectTrigger id={field.name} className="w-full">
											<SelectValue placeholder="Select locale" />
										</SelectTrigger>
										<SelectContent>
											{locales.map((l) => (
												<SelectItem key={l.code} value={l.code}>
													{l.name} ({l.code})
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							)}
						</form.Field>
					</div>
					<DialogFooter>
						<form.Subscribe
							selector={(state) =>
								[state.values.slug, state.values.locale] as const
							}
						>
							{([slug, locale]) => (
								<Button
									type="submit"
									disabled={create.isPending || !slug.trim() || !locale.trim()}
								>
									{create.isPending ? "Creating…" : "Create page"}
								</Button>
							)}
						</form.Subscribe>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

const FILTERABLE_COLUMN_IDS = ["status", "locale"];

function PagesPage() {
	const qc = useQueryClient();

	const { data: locales = [] } = useQuery({
		queryKey: ["cms", "locales"],
		queryFn: () => api.locales.list(),
	});

	const { page, perPage, sorting, filters } = useTableQueryState<PageSummary>({
		filterableColumnIds: FILTERABLE_COLUMN_IDS,
	});
	const status = filterValue(filters, "status") as
		| PageSummary["status"]
		| undefined;
	const locale = filterValue(filters, "locale");

	const { data, isLoading } = useQuery({
		queryKey: ["cms", "pages", page, perPage, sorting, status, locale],
		queryFn: () =>
			api.pages.list({
				page,
				pageSize: perPage,
				sort: sorting,
				status,
				locale,
			}),
		placeholderData: keepPreviousData,
	});

	const publish = useMutation({
		mutationFn: (id: string) => api.pages.publish(id),
		onSuccess: () => {
			toast.success("Page published");
			qc.invalidateQueries({ queryKey: ["cms", "pages"] });
		},
		onError: () => toast.error("Publish failed"),
	});

	const publishSelected = useMutation({
		mutationFn: (ids: string[]) =>
			Promise.all(ids.map((id) => api.pages.publish(id))),
		onSuccess: (_data, ids) => {
			toast.success(
				`${ids.length} page${ids.length === 1 ? "" : "s"} published`,
			);
			qc.invalidateQueries({ queryKey: ["cms", "pages"] });
		},
		onError: () => toast.error("Publish failed"),
	});

	const columns = useMemo<ColumnDef<PageSummary>[]>(
		() => [
			{
				id: "select",
				header: ({ table }) => (
					<Checkbox
						checked={
							table.getIsAllPageRowsSelected()
								? true
								: table.getIsSomePageRowsSelected()
									? "indeterminate"
									: false
						}
						onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
						aria-label="Select all"
					/>
				),
				cell: ({ row }) => (
					<Checkbox
						checked={row.getIsSelected()}
						onCheckedChange={(v) => row.toggleSelected(!!v)}
						aria-label="Select row"
					/>
				),
				enableSorting: false,
				enableHiding: false,
				size: 32,
			},
			{
				id: "slug",
				accessorKey: "slug",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} label="Slug" />
				),
				cell: ({ row }) => (
					<span className="font-mono text-sm">{row.original.slug}</span>
				),
				meta: { label: "Slug", icon: IconLink },
			},
			{
				id: "locale",
				accessorKey: "locale",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} label="Locale" />
				),
				cell: ({ row }) => (
					<Badge variant="outline">{row.original.locale}</Badge>
				),
				enableColumnFilter: true,
				meta: {
					label: "Locale",
					variant: "select",
					icon: IconWorld,
					options: locales.map((l) => ({
						label: `${l.name} (${l.code})`,
						value: l.code,
					})),
				},
			},
			{
				id: "status",
				accessorKey: "status",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} label="Status" />
				),
				cell: ({ row }) => <StatusBadge status={row.original.status} />,
				enableColumnFilter: true,
				meta: {
					label: "Status",
					variant: "select",
					icon: IconFlag,
					options: [
						{ label: "Draft", value: "draft" },
						{ label: "Published", value: "published" },
					],
				},
			},
			{
				id: "updatedAt",
				accessorKey: "updatedAt",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} label="Updated" />
				),
				cell: ({ row }) => (
					<span className="text-muted-foreground text-sm">
						{new Date(row.original.updatedAt).toLocaleDateString()}
					</span>
				),
				meta: { label: "Updated", icon: IconClock },
			},
			{
				id: "actions",
				header: "",
				cell: ({ row }) => {
					const page = row.original;
					return (
						<div className="flex items-center justify-end gap-2">
							{page.status === "draft" && (
								<Button
									size="sm"
									variant="outline"
									className="h-7 gap-1 text-xs"
									onClick={() => publish.mutate(page.id)}
									disabled={publish.isPending}
								>
									<IconRocket className="size-3" />
									Publish
								</Button>
							)}
							<Button
								size="sm"
								variant="outline"
								className="h-7 gap-1 text-xs"
								asChild
							>
								<Link
									to="/pages/$pageId"
									params={{ pageId: page.id }}
									search={{ slug: page.slug, locale: page.locale }}
								>
									<IconPencil className="size-3" />
									Edit
								</Link>
							</Button>
						</div>
					);
				},
				enableSorting: false,
				enableHiding: false,
			},
		],
		[locales, publish],
	);

	const { table } = useDataTable({
		data: data?.items ?? [],
		columns,
		pageCount: data ? Math.max(1, Math.ceil(data.total / perPage)) : -1,
		initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
		getRowId: (row) => row.id,
	});

	return (
		<div className="space-y-4">
			<div className="flex items-start justify-between">
				<div>
					<h2 className="text-2xl font-bold tracking-tight">Pages</h2>
					<p className="text-muted-foreground">
						Manage page content and publish drafts.
					</p>
				</div>
				<NewPageDialog />
			</div>

			{isLoading && !data ? (
				<DataTableSkeleton columnCount={columns.length} filterCount={2} />
			) : data?.total === 0 && !status && !locale ? (
				<div className="rounded-lg border py-10 text-center text-muted-foreground">
					<IconFileText className="mx-auto mb-2 size-8 opacity-40" />
					No pages yet.
				</div>
			) : (
				<DataTable
					table={table}
					actionBar={
						<SelectionActionBar
							table={table}
							actions={(rows) => {
								const draftIds = rows
									.map((r) => r.original)
									.filter((p) => p.status === "draft")
									.map((p) => p.id);
								if (draftIds.length === 0) return null;
								return (
									<Button
										size="sm"
										onClick={() => {
											publishSelected.mutate(draftIds);
											table.toggleAllRowsSelected(false);
										}}
										disabled={publishSelected.isPending}
									>
										<IconRocket className="size-3.5" />
										Publish {draftIds.length}
									</Button>
								);
							}}
						/>
					}
				>
					<DataTableAdvancedToolbar table={table}>
						<DataTableFilterMenu table={table} />
						<DataTableSortList table={table} />
					</DataTableAdvancedToolbar>
				</DataTable>
			)}
		</div>
	);
}
