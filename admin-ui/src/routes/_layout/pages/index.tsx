import {
	DndContext,
	type DragEndEvent,
	PointerSensor,
	useDraggable,
	useDroppable,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	IconAlertTriangle,
	IconChevronRight,
	IconChevronsDown,
	IconChevronsUp,
	IconExternalLink,
	IconFileText,
	IconFolder,
	IconGripVertical,
	IconLetterCase,
	IconPencil,
	IconPlus,
	IconRocket,
	IconWorld,
} from "@tabler/icons-react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	type ColumnDef,
	type ColumnFiltersState,
	type ExpandedState,
	flexRender,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type Row,
	type SortingState,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";
import { useQueryState } from "nuqs";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DataTableAdvancedToolbar } from "@/components/data-table/data-table-advanced-toolbar";
import { DataTableFilterMenu } from "@/components/data-table/data-table-filter-menu";
import { DataTableSortList } from "@/components/data-table/data-table-sort-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { getConfig } from "@/config";
import {
	ApiError,
	api,
	type Locale,
	type PageNodeLocale,
	type PageTreeNode,
} from "@/lib/api";
import { getFiltersStateParser } from "@/lib/parsers";
import { useTransientError } from "@/lib/use-transient-error";
import { cn } from "@/lib/utils";
import type { ExtendedColumnFilter } from "@/types/data-table";

export const Route = createFileRoute("/_layout/pages/")({
	component: PagesPage,
});

const ROOT_DROP_ID = "__root__";

function findNode(nodes: PageTreeNode[], id: string): PageTreeNode | undefined {
	for (const node of nodes) {
		if (node.id === id) return node;
		const found = findNode(node.children, id);
		if (found) return found;
	}
	return undefined;
}

function collectIds(node: PageTreeNode, into: Set<string>) {
	into.add(node.id);
	for (const child of node.children) collectIds(child, into);
}

interface NewPageValues {
	slug: string;
	locale: string;
}

function NewPageDialog({
	parentId,
	parentPath,
	locales,
	trigger,
}: {
	parentId: string | null;
	parentPath?: string;
	locales: Locale[];
	trigger: React.ReactNode;
}) {
	const qc = useQueryClient();
	const navigate = useNavigate();
	const [open, setOpen] = useState(false);

	const create = useMutation({
		mutationFn: (values: NewPageValues) =>
			api.pages.create(values.slug, values.locale, parentId),
		onSuccess: (page) => {
			toast.success("Page created");
			qc.invalidateQueries({ queryKey: ["cms", "pages"] });
			setOpen(false);
			form.reset();
			navigate({
				to: "/pages/$pageId",
				params: { pageId: page.id },
				search: { path: page.path, locale: page.locale },
			});
		},
		onError: (e) =>
			toast.error(e instanceof Error ? e.message : "Couldn't create page"),
	});

	const defaultLocale = locales.find((l) => l.isDefault)?.code ?? "";
	const form = useForm({
		defaultValues: { slug: "", locale: defaultLocale } as NewPageValues,
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
			<DialogTrigger asChild>{trigger}</DialogTrigger>
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
						<p className="text-muted-foreground text-sm">
							{parentPath ? (
								<>
									Creating under{" "}
									<span className="font-mono text-foreground">
										{parentPath}
									</span>
								</>
							) : (
								"Creating at the root"
							)}
						</p>
						<form.Field
							name="slug"
							validators={{
								onChange: ({ value }) =>
									!value.trim()
										? "Required"
										: /[/\s]/.test(value)
											? "Slug can't contain spaces or slashes"
											: undefined,
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
									{field.state.meta.errors.length > 0 && (
										<p className="text-destructive text-xs">
											{field.state.meta.errors.join(", ")}
										</p>
									)}
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
									<Label htmlFor={field.name}>Starting locale</Label>
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
									<p className="text-muted-foreground text-xs">
										Other locales can be added to this page afterwards.
									</p>
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

function AddLocaleDialog({
	nodeId,
	path,
	locale,
	existingLocales,
	trigger,
}: {
	nodeId: string;
	path: string;
	locale: string;
	existingLocales: PageNodeLocale[];
	trigger: React.ReactNode;
}) {
	const qc = useQueryClient();
	const navigate = useNavigate();
	const [open, setOpen] = useState(false);
	const [cloneFrom, setCloneFrom] = useState<string>("__blank__");

	const addLocale = useMutation({
		mutationFn: () =>
			api.pages.addLocale(
				nodeId,
				locale,
				cloneFrom === "__blank__" ? undefined : cloneFrom,
			),
		onSuccess: (page) => {
			toast.success(`Added ${locale} to "${path}"`);
			qc.invalidateQueries({ queryKey: ["cms", "pages"] });
			setOpen(false);
			navigate({
				to: "/pages/$pageId",
				params: { pageId: page.id },
				search: { path: page.path, locale: page.locale },
			});
		},
		onError: (e) =>
			toast.error(e instanceof Error ? e.message : "Couldn't add locale"),
	});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>
						Add <span className="font-mono">{locale}</span> to{" "}
						<span className="font-mono">{path}</span>
					</DialogTitle>
				</DialogHeader>
				<div className="space-y-1.5">
					<Label>Start from</Label>
					<Select value={cloneFrom} onValueChange={setCloneFrom}>
						<SelectTrigger className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="__blank__">Blank page</SelectItem>
							{existingLocales.map((l) => (
								<SelectItem key={l.locale} value={l.locale}>
									Copy of {l.locale} (draft)
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<DialogFooter>
					<Button
						onClick={() => addLocale.mutate()}
						disabled={addLocale.isPending}
					>
						{addLocale.isPending ? "Adding…" : "Add locale"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function LocaleBadge({ node, locale }: { node: PageTreeNode; locale: Locale }) {
	const content = node.locales.find((l) => l.locale === locale.code);

	if (!content) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<span>
						<AddLocaleDialog
							nodeId={node.id}
							path={node.path}
							locale={locale.code}
							existingLocales={node.locales}
							trigger={
								<button
									type="button"
									className="cursor-pointer rounded-full border border-dashed px-1.5 py-0.5 text-[0.625rem] text-muted-foreground uppercase tracking-wide hover:border-foreground hover:text-foreground"
								>
									+{locale.code}
								</button>
							}
						/>
					</span>
				</TooltipTrigger>
				<TooltipContent>Add {locale.code}</TooltipContent>
			</Tooltip>
		);
	}

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Link
					to="/pages/$pageId"
					params={{ pageId: content.contentId }}
					search={{ path: node.path, locale: locale.code }}
				>
					<Badge
						variant={
							content.status === "published"
								? "success"
								: content.status === "modified"
									? "warning"
									: "secondary"
						}
						className="uppercase"
					>
						{locale.code}
					</Badge>
				</Link>
			</TooltipTrigger>
			<TooltipContent>{content.status}</TooltipContent>
		</Tooltip>
	);
}

interface PagesTableMeta {
	onPublish: (contentId: string) => void;
	publishingId: string | undefined;
	locales: Locale[];
	moveError: { id: string; message: string } | null;
	/** Node ids that can't be a drop target for the page currently being dragged (itself and its own descendants). */
	disabledDropIds: Set<string>;
}

const FILTERABLE_COLUMN_IDS = ["name", "locales"];

/** Client-side evaluation of an `ExtendedColumnFilter` for the "Page name" text column - mirrors `dataTableConfig.textOperators`. */
function nameFilterFn(
	row: Row<PageTreeNode>,
	columnId: string,
	filterValue: ExtendedColumnFilter<PageTreeNode>,
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

/** Client-side evaluation of an `ExtendedColumnFilter` for the "Locales" multiSelect column - mirrors `dataTableConfig.multiSelectOperators`. */
function localesFilterFn(
	row: Row<PageTreeNode>,
	columnId: string,
	filterValue: ExtendedColumnFilter<PageTreeNode>,
) {
	const values = row.getValue<string[]>(columnId);
	const selected = Array.isArray(filterValue.value)
		? filterValue.value
		: [filterValue.value].filter(Boolean);

	switch (filterValue.operator) {
		case "notInArray":
			return !selected.some((v) => values.includes(v));
		case "isEmpty":
			return values.length === 0;
		case "isNotEmpty":
			return values.length > 0;
		default:
			return selected.some((v) => values.includes(v));
	}
}

function buildColumns(locales: Locale[]): ColumnDef<PageTreeNode>[] {
	return [
		{
			id: "name",
			accessorFn: (node) => node.slug,
			header: "Page name",
			enableHiding: false,
			enableColumnFilter: true,
			filterFn: nameFilterFn,
			meta: {
				label: "Page name",
				placeholder: "Search slug…",
				variant: "text",
				icon: IconLetterCase,
			},
		},
		{
			id: "locales",
			accessorFn: (node) => node.locales.map((l) => l.locale),
			header: "Locales",
			sortingFn: (a, b, columnId) =>
				a.getValue<string[]>(columnId).length -
				b.getValue<string[]>(columnId).length,
			enableColumnFilter: true,
			filterFn: localesFilterFn,
			meta: {
				label: "Locales",
				variant: "multiSelect",
				icon: IconWorld,
				options: locales.map((l) => ({
					label: `${l.name} (${l.code})`,
					value: l.code,
				})),
			},
		},
		{
			id: "actions",
			header: "Actions",
			enableHiding: false,
			enableSorting: false,
		},
	];
}

function PageRow({
	row,
	onPublish,
	publishingId,
	locales,
	moveError,
	disabledDropIds,
}: { row: Row<PageTreeNode> } & PagesTableMeta) {
	const node = row.original;
	const hasChildren = node.children.length > 0;
	const isExpanded = row.getIsExpanded();
	const publishableContent = node.locales.find((l) => l.status !== "published");
	const isMoveError = moveError?.id === node.id;
	const dropDisabled = disabledDropIds.has(node.id);
	const siteUrl = getConfig().siteUrl;

	const {
		attributes,
		listeners,
		setNodeRef: setDragRef,
		isDragging,
	} = useDraggable({ id: node.id });
	const { setNodeRef: setDropRef, isOver } = useDroppable({
		id: node.id,
		disabled: dropDisabled,
	});

	return (
		<Tooltip open={isOver}>
			<TooltipTrigger asChild>
				<TableRow
					ref={setDropRef}
					className={cn(
						"group",
						isOver && "bg-accent ring-1 ring-inset ring-primary",
						isDragging && "opacity-40",
						dropDisabled && "opacity-40",
					)}
				>
					{row.getVisibleCells().map((cell) => {
						if (cell.column.id === "name") {
							return (
								<TableCell key={cell.id}>
									<div
										className="flex items-center gap-1.5"
										style={{ paddingLeft: row.depth * 20 + 4 }}
									>
										<Tooltip open={isMoveError}>
											<TooltipTrigger asChild>
												<button
													type="button"
													ref={setDragRef}
													{...listeners}
													{...attributes}
													className={cn(
														"opacity-0 group-hover:opacity-100",
														isMoveError
															? "cursor-default text-destructive opacity-100"
															: "cursor-grab text-muted-foreground active:cursor-grabbing",
													)}
													aria-label={
														isMoveError ? "Move failed" : "Drag to move"
													}
												>
													{isMoveError ? (
														<IconAlertTriangle className="size-3.5" />
													) : (
														<IconGripVertical className="size-3.5" />
													)}
												</button>
											</TooltipTrigger>
											<TooltipContent variant="destructive" side="right">
												{moveError?.message}
											</TooltipContent>
										</Tooltip>
										<button
											type="button"
											onClick={() => hasChildren && row.toggleExpanded()}
											className={cn(
												"flex size-4 items-center justify-center text-muted-foreground",
												hasChildren ? "cursor-pointer" : "invisible",
											)}
											aria-label={isExpanded ? "Collapse" : "Expand"}
										>
											<IconChevronRight
												className={cn(
													"size-3.5 transition-transform",
													isExpanded && "rotate-90",
												)}
											/>
										</button>
										{hasChildren ? (
											node.locales.some((l) => l.hasBlocks) ? (
												<span className="flex shrink-0 items-center">
													<IconFolder className="size-4 text-muted-foreground" />
													<IconFileText className="-ml-1 size-4 rounded-[2px] bg-background text-muted-foreground" />
												</span>
											) : (
												<IconFolder className="size-4 text-muted-foreground" />
											)
										) : (
											<IconFileText className="size-4 text-muted-foreground" />
										)}
										<span className="font-mono text-sm">{node.slug}</span>
									</div>
								</TableCell>
							);
						}

						if (cell.column.id === "locales") {
							return (
								<TableCell key={cell.id}>
									<span className="flex items-center gap-1">
										{locales.map((l) => (
											<LocaleBadge key={l.code} node={node} locale={l} />
										))}
									</span>
								</TableCell>
							);
						}

						return (
							<TableCell key={cell.id}>
								<span className="flex items-center justify-end gap-2">
									<Tooltip>
										<TooltipTrigger asChild>
											<span>
												<NewPageDialog
													parentId={node.id}
													parentPath={node.path}
													locales={locales}
													trigger={
														<Button
															size="icon"
															variant="ghost"
															className="size-6 opacity-0 group-hover:opacity-100"
														>
															<IconPlus className="size-3.5" />
														</Button>
													}
												/>
											</span>
										</TooltipTrigger>
										<TooltipContent>Add child page</TooltipContent>
									</Tooltip>
									{siteUrl && (
										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													size="icon"
													variant="ghost"
													className="size-6 opacity-0 group-hover:opacity-100"
													asChild
												>
													<a
														href={`${siteUrl.replace(/\/$/, "")}/${node.path}`}
														target="_blank"
														rel="noopener noreferrer"
													>
														<IconExternalLink className="size-3.5" />
													</a>
												</Button>
											</TooltipTrigger>
											<TooltipContent>Open page in new tab</TooltipContent>
										</Tooltip>
									)}
									{publishableContent && (
										<Button
											size="sm"
											variant="outline"
											className="h-6 gap-1 text-xs"
											onClick={() => onPublish(publishableContent.contentId)}
											disabled={publishingId === publishableContent.contentId}
										>
											<IconRocket className="size-3" />
											Publish {publishableContent.locale}
										</Button>
									)}
									{node.locales[0] && (
										<Button
											size="sm"
											variant="outline"
											className="h-6 gap-1 text-xs"
											asChild
										>
											<Link
												to="/pages/$pageId"
												params={{ pageId: node.locales[0].contentId }}
												search={{
													path: node.path,
													locale: node.locales[0].locale,
												}}
											>
												<IconPencil className="size-3" />
												Edit
											</Link>
										</Button>
									)}
								</span>
							</TableCell>
						);
					})}
				</TableRow>
			</TooltipTrigger>
			<TooltipContent side="bottom">
				Drop to nest under <span className="font-mono">{node.slug}</span>
			</TooltipContent>
		</Tooltip>
	);
}

function RootDropZone({ children }: { children: React.ReactNode }) {
	const { setNodeRef, isOver } = useDroppable({ id: ROOT_DROP_ID });
	return (
		<div
			ref={setNodeRef}
			className={cn("min-h-full rounded-md", isOver && "ring-1 ring-primary")}
		>
			{children}
		</div>
	);
}

function PagesPage() {
	const qc = useQueryClient();

	const { data: locales = [] } = useQuery({
		queryKey: ["cms", "locales"],
		queryFn: () => api.locales.list(),
	});

	const { data: tree, isLoading } = useQuery({
		queryKey: ["cms", "pages", "tree"],
		queryFn: () => api.pages.tree(),
	});

	const [expanded, setExpanded] = useState<ExpandedState>({});
	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

	const filtersParser = useMemo(
		() =>
			getFiltersStateParser<PageTreeNode>(FILTERABLE_COLUMN_IDS).withDefault(
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

	const columns = useMemo(() => buildColumns(locales), [locales]);

	const publish = useMutation({
		mutationFn: (contentId: string) => api.pages.publish(contentId),
		onSuccess: () => {
			toast.success("Page published");
			qc.invalidateQueries({ queryKey: ["cms", "pages"] });
		},
		onError: () => toast.error("Publish failed"),
	});

	const { error: moveError, flash: flashMoveError } = useTransientError();
	const move = useMutation({
		mutationFn: ({ id, parentId }: { id: string; parentId: string | null }) =>
			api.pages.move(id, parentId),
		onSuccess: () => {
			toast.success("Page moved");
			qc.invalidateQueries({ queryKey: ["cms", "pages"] });
		},
		onError: (e, variables) =>
			flashMoveError(
				variables.id,
				e instanceof ApiError ? e.message : "Couldn't move page",
			),
	});

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
	);

	const [draggingId, setDraggingId] = useState<string | null>(null);
	// Itself and its own descendants can't be a valid drop target - dropping
	// a page onto its own subtree can't be nesting it anywhere new, and the
	// API rejects it anyway. Disabling it here (vs. only handling the 409)
	// stops the drop from ever registering as a candidate in the first place.
	const disabledDropIds = useMemo(() => {
		if (!draggingId || !tree) return new Set<string>();
		const dragged = findNode(tree, draggingId);
		const ids = new Set<string>();
		if (dragged) collectIds(dragged, ids);
		else ids.add(draggingId);
		return ids;
	}, [draggingId, tree]);

	const handleDragEnd = (event: DragEndEvent) => {
		setDraggingId(null);
		const { active, over } = event;
		if (!over || active.id === over.id) return;
		const parentId = over.id === ROOT_DROP_ID ? null : String(over.id);
		move.mutate({ id: String(active.id), parentId });
	};

	const table = useReactTable({
		data: tree ?? [],
		columns,
		state: {
			expanded: hasActiveFilters ? true : expanded,
			sorting,
			columnVisibility,
			columnFilters,
		},
		onExpandedChange: setExpanded,
		onSortingChange: setSorting,
		onColumnVisibilityChange: setColumnVisibility,
		onColumnFiltersChange: () => {},
		filterFromLeafRows: true,
		getRowId: (node) => node.id,
		getSubRows: (node) => node.children,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
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
				<NewPageDialog
					parentId={null}
					locales={locales}
					trigger={
						<Button size="lg" disabled={locales.length === 0}>
							<IconPlus className="size-4" />
							New page
						</Button>
					}
				/>
			</div>

			{isLoading ? (
				<div className="space-y-2">
					{Array.from({ length: 4 }).map((_, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rows
						<div key={i} className="h-9 animate-pulse rounded-md bg-muted" />
					))}
				</div>
			) : !tree || tree.length === 0 ? (
				<div className="rounded-lg border py-10 text-center text-muted-foreground">
					<IconFileText className="mx-auto mb-2 size-8 opacity-40" />
					No pages yet.
				</div>
			) : (
				<div className="space-y-2">
					<DataTableAdvancedToolbar
						table={table}
						endActions={
							<Button
								variant="outline"
								size="sm"
								className="h-8 font-normal"
								disabled={hasActiveFilters}
								onClick={() =>
									table.toggleAllRowsExpanded(!table.getIsAllRowsExpanded())
								}
							>
								{table.getIsAllRowsExpanded() ? (
									<IconChevronsUp className="text-muted-foreground" />
								) : (
									<IconChevronsDown className="text-muted-foreground" />
								)}
								{table.getIsAllRowsExpanded() ? "Collapse all" : "Expand all"}
							</Button>
						}
					>
						<DataTableFilterMenu table={table} />
						<DataTableSortList table={table} />
					</DataTableAdvancedToolbar>
					<DndContext
						sensors={sensors}
						onDragStart={(e) => setDraggingId(String(e.active.id))}
						onDragEnd={handleDragEnd}
						onDragCancel={() => setDraggingId(null)}
					>
						<RootDropZone>
							<div className="overflow-hidden rounded-md border">
								<Table>
									<TableHeader>
										{table.getHeaderGroups().map((headerGroup) => (
											<TableRow
												key={headerGroup.id}
												className="hover:bg-transparent"
											>
												{headerGroup.headers.map((header) => (
													<TableHead
														key={header.id}
														className={
															header.column.id === "actions"
																? "text-right"
																: undefined
														}
													>
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
										{table.getRowModel().rows.map((row) => (
											<PageRow
												key={row.id}
												row={row}
												onPublish={(id) => publish.mutate(id)}
												publishingId={
													publish.isPending ? publish.variables : undefined
												}
												locales={locales}
												moveError={moveError}
												disabledDropIds={disabledDropIds}
											/>
										))}
									</TableBody>
								</Table>
							</div>
						</RootDropZone>
					</DndContext>
				</div>
			)}
		</div>
	);
}
