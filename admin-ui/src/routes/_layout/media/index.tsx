import {
	IconAlertCircle,
	IconFile,
	IconLayoutGrid,
	IconLayoutList,
	IconPhoto,
	IconPlus,
	IconRefresh,
	IconRocket,
	IconTag,
	IconTrash,
	IconUpload,
	IconX,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	type ColumnDef,
	type ColumnFiltersState,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type Row,
	type SortingState,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";
import { useQueryState } from "nuqs";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DataTableFilterMenu } from "@/components/data-table/data-table-filter-menu";
import { DataTableSortList } from "@/components/data-table/data-table-sort-list";
import { MediaEditForm } from "@/components/shared/MediaEditForm";
import { MediaTagsPopover } from "@/components/shared/MediaTagsPopover";
import { MediaVersionHistoryPanel } from "@/components/shared/MediaVersionHistoryPanel";
import { TagAccessPanel } from "@/components/shared/TagAccessPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
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
import { api, type MediaAsset, type Tag } from "@/lib/api";
import { getFiltersStateParser } from "@/lib/parsers";
import { formatBytes } from "@/lib/utils";
import type { ExtendedColumnFilter } from "@/types/data-table";

export const Route = createFileRoute("/_layout/media/")({
	component: MediaPage,
});

interface UploadItem {
	id: string;
	file: File;
	/** Created once at selection time (not per render) to avoid leaking object URLs. */
	previewUrl: string | null;
	progress: number;
	error: string | null;
}

type MediaKind = "image" | "video" | "document" | "other";

function kindOf(mimeType: string): MediaKind {
	if (mimeType.startsWith("image/")) return "image";
	if (mimeType.startsWith("video/")) return "video";
	if (mimeType.startsWith("application/") || mimeType.startsWith("text/")) {
		return "document";
	}
	return "other";
}

const MEDIA_TYPE_OPTIONS: { label: string; value: MediaKind }[] = [
	{ label: "Image", value: "image" },
	{ label: "Video", value: "video" },
	{ label: "Document", value: "document" },
	{ label: "Other", value: "other" },
];

const MEDIA_STATUS_OPTIONS: { label: string; value: MediaAsset["status"] }[] = [
	{ label: "Draft", value: "draft" },
	{ label: "Published", value: "published" },
	{ label: "Modified", value: "modified" },
];

const FILTERABLE_COLUMN_IDS = ["tags", "status", "type"];

/** Client-side evaluation of an `ExtendedColumnFilter` for an array-valued multiSelect column (Tags). */
function tagsFilterFn(
	row: Row<MediaAsset>,
	columnId: string,
	filterValue: ExtendedColumnFilter<MediaAsset>,
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

/** Client-side evaluation of an `ExtendedColumnFilter` for a scalar-valued multiSelect column (Status, Type). */
function inSetFilterFn(
	row: Row<MediaAsset>,
	columnId: string,
	filterValue: ExtendedColumnFilter<MediaAsset>,
) {
	const value = row.getValue<string>(columnId);
	const selected = Array.isArray(filterValue.value)
		? filterValue.value
		: [filterValue.value].filter(Boolean);

	switch (filterValue.operator) {
		case "notInArray":
			return !selected.includes(value);
		case "isEmpty":
			return !value;
		case "isNotEmpty":
			return !!value;
		default:
			return selected.includes(value);
	}
}

function buildColumns(tags: Tag[]): ColumnDef<MediaAsset>[] {
	return [
		{
			id: "tags",
			accessorFn: (asset) => asset.tagIds,
			header: "Tags",
			enableSorting: false,
			enableColumnFilter: true,
			filterFn: tagsFilterFn,
			meta: {
				label: "Tags",
				variant: "multiSelect",
				icon: IconTag,
				options: tags.map((t) => ({ label: t.name, value: t.id })),
			},
		},
		{
			id: "status",
			accessorFn: (asset) => asset.status,
			header: "Status",
			enableSorting: false,
			enableColumnFilter: true,
			filterFn: inSetFilterFn,
			meta: {
				label: "Status",
				variant: "multiSelect",
				icon: IconRocket,
				options: MEDIA_STATUS_OPTIONS,
			},
		},
		{
			id: "type",
			accessorFn: (asset) => kindOf(asset.mimeType),
			header: "Type",
			enableSorting: false,
			enableColumnFilter: true,
			filterFn: inSetFilterFn,
			meta: {
				label: "Type",
				variant: "multiSelect",
				icon: IconFile,
				options: MEDIA_TYPE_OPTIONS,
			},
		},
		{
			id: "filename",
			accessorFn: (asset) => asset.filename,
			header: "Filename",
			enableColumnFilter: false,
			meta: { label: "Filename" },
		},
		{
			id: "size",
			accessorFn: (asset) => asset.size,
			header: "Size",
			enableColumnFilter: false,
			meta: { label: "Size" },
		},
		{
			id: "createdAt",
			accessorFn: (asset) => asset.createdAt,
			header: "Uploaded",
			enableColumnFilter: false,
			meta: { label: "Uploaded" },
		},
	];
}

function MediaStatusBadge({ status }: { status: MediaAsset["status"] }) {
	if (status === "modified") {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<Badge variant="warning" className="truncate">
						modified
					</Badge>
				</TooltipTrigger>
				<TooltipContent>published · unpublished changes</TooltipContent>
			</Tooltip>
		);
	}
	return (
		<Badge variant={status === "published" ? "success" : "warning"}>
			{status}
		</Badge>
	);
}

function ManageTagsPopover({ tags }: { tags: Tag[] }) {
	const qc = useQueryClient();
	const [open, setOpen] = useState(false);
	const [newTagName, setNewTagName] = useState("");

	const createTag = useMutation({
		mutationFn: (name: string) => api.media.tags.create(name),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["cms", "media", "tags"] });
			setNewTagName("");
		},
		onError: (e) =>
			toast.error(e instanceof Error ? e.message : "Couldn't create tag"),
	});

	const deleteTag = useMutation({
		mutationFn: (id: string) => api.media.tags.delete(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["cms", "media", "tags"] });
			qc.invalidateQueries({ queryKey: ["cms", "media"] });
		},
		onError: () => toast.error("Couldn't delete tag"),
	});

	function submitNewTag() {
		const name = newTagName.trim();
		if (name) createTag.mutate(name);
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button variant="outline" size="sm">
					<IconTag className="size-4" />
					Manage tags
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-72 space-y-1">
				<div className="flex items-center gap-1.5 pb-1.5">
					<Input
						value={newTagName}
						onChange={(e) => setNewTagName(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") submitNewTag();
						}}
						placeholder="New tag…"
						className="h-7 text-xs"
					/>
					<Button
						size="icon"
						variant="outline"
						className="size-7 shrink-0"
						disabled={!newTagName.trim() || createTag.isPending}
						onClick={submitNewTag}
					>
						<IconPlus className="size-3.5" />
					</Button>
				</div>
				{tags.length === 0 ? (
					<p className="text-muted-foreground text-xs">No tags yet.</p>
				) : (
					tags.map((tag) => (
						<div
							key={tag.id}
							className="flex items-center justify-between gap-1 rounded-md px-1.5 py-1 hover:bg-muted"
						>
							<span className="truncate text-sm">{tag.name}</span>
							<div className="flex shrink-0 items-center gap-1">
								<TagAccessPanel tagId={tag.id} tagName={tag.name} />
								<Button
									size="icon"
									variant="ghost"
									className="size-6 text-muted-foreground hover:text-destructive"
									onClick={() => {
										if (window.confirm(`Delete tag "${tag.name}"?`)) {
											deleteTag.mutate(tag.id);
										}
									}}
								>
									<IconTrash className="size-3.5" />
								</Button>
							</div>
						</div>
					))
				)}
			</PopoverContent>
		</Popover>
	);
}

function useMediaAssetMutations(asset: MediaAsset) {
	const qc = useQueryClient();

	const remove = useMutation({
		mutationFn: () => api.media.delete(asset.key),
		onSuccess: () => {
			toast.success("Asset deleted");
			qc.invalidateQueries({ queryKey: ["cms", "media"] });
		},
		onError: () => toast.error("Delete failed"),
	});

	const publish = useMutation({
		mutationFn: () => api.media.publish(asset.id),
		onSuccess: () => {
			toast.success("Asset published");
			qc.invalidateQueries({ queryKey: ["cms", "media"] });
		},
		onError: (e) =>
			toast.error(e instanceof Error ? e.message : "Publish failed"),
	});

	return { qc, remove, publish };
}

function MediaCard({
	asset,
	tagsById,
}: {
	asset: MediaAsset;
	tagsById: Map<string, string>;
}) {
	const isImage = asset.mimeType.startsWith("image/");
	const { qc, remove, publish } = useMediaAssetMutations(asset);

	return (
		<div className="group relative flex flex-col overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md">
			<div className="flex h-36 items-center justify-center bg-muted">
				{isImage ? (
					<img
						src={asset.publicUrl}
						alt={asset.filename}
						className="h-full w-full object-cover"
					/>
				) : (
					<IconFile className="size-10 text-muted-foreground" />
				)}
			</div>
			<div className="flex flex-1 flex-col gap-1 p-3">
				<Tooltip>
					<TooltipTrigger asChild>
						<p className="truncate text-sm font-medium">{asset.filename}</p>
					</TooltipTrigger>
					<TooltipContent>{asset.filename}</TooltipContent>
				</Tooltip>
				<div className="flex items-center gap-2">
					<Badge variant="outline" className="text-[10px]">
						{asset.mimeType}
					</Badge>
					<span className="text-xs text-muted-foreground">
						{formatBytes(asset.size)}
					</span>
				</div>
				{asset.tagIds.length > 0 && (
					<div className="flex flex-wrap gap-1">
						{asset.tagIds.map((tagId) => (
							<Badge key={tagId} variant="secondary" className="text-[10px]">
								{tagsById.get(tagId) ?? tagId}
							</Badge>
						))}
					</div>
				)}
				{!asset.confirmedAt ? (
					<Badge variant="warning" className="w-fit text-[10px]">
						pending
					</Badge>
				) : (
					<>
						<div className="min-w-0">
							<MediaStatusBadge status={asset.status} />
						</div>
						<div className="mt-1 grid grid-cols-4 gap-1">
							<MediaEditForm asset={asset} triggerClassName="h-7 w-full" />
							<MediaTagsPopover
								assetId={asset.id}
								tagIds={asset.tagIds}
								triggerClassName="h-7 w-full"
							/>
							<MediaVersionHistoryPanel
								assetId={asset.id}
								compact
								triggerClassName="h-7 w-full"
								onRestored={() =>
									qc.invalidateQueries({ queryKey: ["cms", "media"] })
								}
							/>
							{asset.status !== "published" && (
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											size="icon"
											variant="outline"
											className="h-7 w-full"
											onClick={() => publish.mutate()}
											disabled={publish.isPending}
										>
											<IconRocket className="size-3.5" />
										</Button>
									</TooltipTrigger>
									<TooltipContent>Publish</TooltipContent>
								</Tooltip>
							)}
						</div>
					</>
				)}
			</div>
			<Dialog>
				<DialogTrigger asChild>
					<Button
						size="icon"
						variant="destructive"
						className="absolute right-2 top-2 size-7 opacity-0 transition-opacity group-hover:opacity-100"
					>
						<IconTrash className="size-3.5" />
					</Button>
				</DialogTrigger>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete asset?</DialogTitle>
						<DialogDescription>
							Permanently removes <strong>{asset.filename}</strong> from
							storage. This cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="outline">Cancel</Button>
						</DialogClose>
						<Button
							variant="destructive"
							onClick={() => remove.mutate()}
							disabled={remove.isPending}
						>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

function UploadingCard({
	item,
	onRetry,
	onDismiss,
}: {
	item: UploadItem;
	onRetry: () => void;
	onDismiss: () => void;
}) {
	return (
		<div className="relative flex flex-col overflow-hidden rounded-lg border bg-card">
			<div className="flex h-36 items-center justify-center bg-muted">
				{item.previewUrl ? (
					<img
						src={item.previewUrl}
						alt=""
						className="h-full w-full object-cover opacity-60"
					/>
				) : (
					<IconFile className="size-10 text-muted-foreground opacity-60" />
				)}
			</div>
			<div className="flex flex-1 flex-col gap-1.5 p-3">
				<Tooltip>
					<TooltipTrigger asChild>
						<p className="truncate text-sm font-medium">{item.file.name}</p>
					</TooltipTrigger>
					<TooltipContent>{item.file.name}</TooltipContent>
				</Tooltip>
				{item.error ? (
					<div className="flex items-center gap-1 text-destructive text-xs">
						<IconAlertCircle className="size-3.5 shrink-0" />
						<Tooltip>
							<TooltipTrigger asChild>
								<span className="truncate">{item.error}</span>
							</TooltipTrigger>
							<TooltipContent>{item.error}</TooltipContent>
						</Tooltip>
					</div>
				) : (
					<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
						<div
							className="h-full rounded-full bg-primary transition-all"
							style={{ width: `${item.progress}%` }}
						/>
					</div>
				)}
			</div>
			<div className="absolute right-2 top-2 flex gap-1">
				{item.error ? (
					<>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									size="icon"
									variant="outline"
									className="size-7 bg-background"
									onClick={onRetry}
								>
									<IconRefresh className="size-3.5" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Retry</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									size="icon"
									variant="outline"
									className="size-7 bg-background"
									onClick={onDismiss}
								>
									<IconX className="size-3.5" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Dismiss</TooltipContent>
						</Tooltip>
					</>
				) : (
					<Badge variant="outline" className="bg-background">
						{item.progress}%
					</Badge>
				)}
			</div>
		</div>
	);
}

const LIST_COLUMN_COUNT = 6;

function MediaListRow({
	asset,
	tagsById,
}: {
	asset: MediaAsset;
	tagsById: Map<string, string>;
}) {
	const isImage = asset.mimeType.startsWith("image/");
	const { qc, remove, publish } = useMediaAssetMutations(asset);

	return (
		<TableRow>
			<TableCell>
				<div className="flex min-w-0 items-center gap-3">
					<div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
						{isImage ? (
							<img
								src={asset.publicUrl}
								alt={asset.filename}
								className="size-full object-cover"
							/>
						) : (
							<IconFile className="size-5 text-muted-foreground" />
						)}
					</div>
					<Tooltip>
						<TooltipTrigger asChild>
							<span className="truncate text-sm font-medium">
								{asset.filename}
							</span>
						</TooltipTrigger>
						<TooltipContent>{asset.filename}</TooltipContent>
					</Tooltip>
				</div>
			</TableCell>
			<TableCell>
				<Badge variant="outline" className="text-[10px]">
					{asset.mimeType}
				</Badge>
			</TableCell>
			<TableCell className="text-muted-foreground text-xs">
				{formatBytes(asset.size)}
			</TableCell>
			<TableCell>
				{asset.tagIds.length > 0 ? (
					<div className="flex flex-wrap gap-1">
						{asset.tagIds.map((tagId) => (
							<Badge key={tagId} variant="secondary" className="text-[10px]">
								{tagsById.get(tagId) ?? tagId}
							</Badge>
						))}
					</div>
				) : (
					<span className="text-muted-foreground text-xs">—</span>
				)}
			</TableCell>
			<TableCell>
				{!asset.confirmedAt ? (
					<Badge variant="warning" className="text-[10px]">
						pending
					</Badge>
				) : (
					<MediaStatusBadge status={asset.status} />
				)}
			</TableCell>
			<TableCell>
				{asset.confirmedAt && (
					<div className="flex items-center justify-end gap-1">
						<MediaEditForm asset={asset} />
						<MediaTagsPopover assetId={asset.id} tagIds={asset.tagIds} />
						<MediaVersionHistoryPanel
							assetId={asset.id}
							compact
							onRestored={() =>
								qc.invalidateQueries({ queryKey: ["cms", "media"] })
							}
						/>
						{asset.status !== "published" && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										size="icon"
										variant="outline"
										className="size-7"
										onClick={() => publish.mutate()}
										disabled={publish.isPending}
									>
										<IconRocket className="size-3.5" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Publish</TooltipContent>
							</Tooltip>
						)}
						<Dialog>
							<DialogTrigger asChild>
								<Button
									size="icon"
									variant="ghost"
									className="size-7 text-muted-foreground hover:text-destructive"
								>
									<IconTrash className="size-3.5" />
								</Button>
							</DialogTrigger>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Delete asset?</DialogTitle>
									<DialogDescription>
										Permanently removes <strong>{asset.filename}</strong> from
										storage. This cannot be undone.
									</DialogDescription>
								</DialogHeader>
								<DialogFooter>
									<DialogClose asChild>
										<Button variant="outline">Cancel</Button>
									</DialogClose>
									<Button
										variant="destructive"
										onClick={() => remove.mutate()}
										disabled={remove.isPending}
									>
										Delete
									</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>
					</div>
				)}
			</TableCell>
		</TableRow>
	);
}

function UploadingRow({
	item,
	onRetry,
	onDismiss,
}: {
	item: UploadItem;
	onRetry: () => void;
	onDismiss: () => void;
}) {
	return (
		<TableRow>
			<TableCell colSpan={LIST_COLUMN_COUNT}>
				<div className="flex items-center gap-3">
					<div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
						{item.previewUrl ? (
							<img
								src={item.previewUrl}
								alt=""
								className="size-full object-cover opacity-60"
							/>
						) : (
							<IconFile className="size-5 text-muted-foreground opacity-60" />
						)}
					</div>
					<div className="min-w-0 flex-1">
						<Tooltip>
							<TooltipTrigger asChild>
								<p className="truncate text-sm font-medium">{item.file.name}</p>
							</TooltipTrigger>
							<TooltipContent>{item.file.name}</TooltipContent>
						</Tooltip>
						{item.error ? (
							<div className="flex items-center gap-1 text-destructive text-xs">
								<IconAlertCircle className="size-3.5 shrink-0" />
								<span className="truncate">{item.error}</span>
							</div>
						) : (
							<div className="mt-1 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted">
								<div
									className="h-full rounded-full bg-primary transition-all"
									style={{ width: `${item.progress}%` }}
								/>
							</div>
						)}
					</div>
					{item.error ? (
						<div className="flex shrink-0 gap-1">
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										size="icon"
										variant="outline"
										className="size-7"
										onClick={onRetry}
									>
										<IconRefresh className="size-3.5" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Retry</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										size="icon"
										variant="outline"
										className="size-7"
										onClick={onDismiss}
									>
										<IconX className="size-3.5" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Dismiss</TooltipContent>
							</Tooltip>
						</div>
					) : (
						<Badge variant="outline" className="shrink-0">
							{item.progress}%
						</Badge>
					)}
				</div>
			</TableCell>
		</TableRow>
	);
}

type MediaView = "card" | "list";
const MEDIA_VIEW_STORAGE_KEY = "cms:media:view";

function readStoredView(): MediaView {
	try {
		const stored = localStorage.getItem(MEDIA_VIEW_STORAGE_KEY);
		return stored === "list" ? "list" : "card";
	} catch {
		return "card";
	}
}

function MediaPage() {
	const qc = useQueryClient();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [uploads, setUploads] = useState<UploadItem[]>([]);
	const [view, setView] = useState<MediaView>(readStoredView);

	function setViewPersisted(next: MediaView) {
		setView(next);
		try {
			localStorage.setItem(MEDIA_VIEW_STORAGE_KEY, next);
		} catch {
			// Best-effort only - view still switches for this session.
		}
	}

	const { data, isLoading } = useQuery({
		queryKey: ["cms", "media"],
		queryFn: () => api.media.list(),
	});

	const { data: tags = [] } = useQuery({
		queryKey: ["cms", "media", "tags"],
		queryFn: () => api.media.tags.list(),
	});
	const tagsById = new Map(tags.map((t) => [t.id, t.name]));

	const [sorting, setSorting] = useState<SortingState>([
		{ id: "createdAt", desc: true },
	]);
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

	const filtersParser = useMemo(
		() =>
			getFiltersStateParser<MediaAsset>(FILTERABLE_COLUMN_IDS).withDefault([]),
		[],
	);
	const [filters] = useQueryState("filters", filtersParser);
	const columnFilters: ColumnFiltersState = useMemo(
		() => filters.map((f) => ({ id: f.id, value: f })),
		[filters],
	);
	const hasActiveFilters = filters.length > 0;

	const columns = useMemo(() => buildColumns(tags), [tags]);

	const table = useReactTable({
		data: data ?? [],
		columns,
		state: { sorting, columnVisibility, columnFilters },
		onSortingChange: setSorting,
		onColumnVisibilityChange: setColumnVisibility,
		onColumnFiltersChange: () => {},
		getRowId: (asset) => asset.id,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getSortedRowModel: getSortedRowModel(),
	});

	const assets = table.getRowModel().rows.map((row) => row.original);

	function updateUpload(id: string, patch: Partial<UploadItem>) {
		setUploads((prev) =>
			prev.map((u) => (u.id === id ? { ...u, ...patch } : u)),
		);
	}

	function removeUpload(id: string) {
		setUploads((prev) => {
			const item = prev.find((u) => u.id === id);
			if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
			return prev.filter((u) => u.id !== id);
		});
	}

	function runUpload(item: UploadItem) {
		updateUpload(item.id, { progress: 0, error: null });
		api.media
			.upload(item.file, (progress) => updateUpload(item.id, { progress }))
			.then(() => {
				removeUpload(item.id);
				qc.invalidateQueries({ queryKey: ["cms", "media"] });
			})
			.catch((e) => {
				updateUpload(item.id, {
					error: e instanceof Error ? e.message : "Upload failed",
				});
			});
	}

	function handleFiles(files: FileList | null) {
		if (!files || files.length === 0) return;
		const items: UploadItem[] = Array.from(files).map((file) => ({
			id: crypto.randomUUID(),
			file,
			previewUrl: file.type.startsWith("image/")
				? URL.createObjectURL(file)
				: null,
			progress: 0,
			error: null,
		}));
		setUploads((prev) => [...items, ...prev]);
		// Each file uploads independently and concurrently - selecting more
		// files (or starting a new batch) never waits on these.
		for (const item of items) runUpload(item);
		// Reset immediately so a new batch (even of the same files) can start
		// right away without waiting for these to finish.
		if (fileInputRef.current) fileInputRef.current.value = "";
	}

	return (
		<div className="space-y-4">
			<div className="flex items-start justify-between">
				<div>
					<h2 className="text-2xl font-bold tracking-tight">Media</h2>
					<p className="text-muted-foreground">
						{data?.length ?? 0} assets in your storage.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<ManageTagsPopover tags={tags} />
					<input
						ref={fileInputRef}
						type="file"
						multiple
						className="hidden"
						onChange={(e) => handleFiles(e.target.files)}
					/>
					<Button size="lg" onClick={() => fileInputRef.current?.click()}>
						<IconUpload className="size-4" />
						Upload
					</Button>
				</div>
			</div>

			<div className="flex flex-wrap items-center gap-2">
				<DataTableFilterMenu table={table} />
				<DataTableSortList table={table} />
				<div className="ml-auto flex items-center gap-0.5 rounded-md border p-0.5">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								size="icon"
								variant={view === "card" ? "secondary" : "ghost"}
								className="size-7"
								onClick={() => setViewPersisted("card")}
							>
								<IconLayoutGrid className="size-3.5" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Card view</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								size="icon"
								variant={view === "list" ? "secondary" : "ghost"}
								className="size-7"
								onClick={() => setViewPersisted("list")}
							>
								<IconLayoutList className="size-3.5" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>List view</TooltipContent>
					</Tooltip>
				</div>
			</div>

			{isLoading ? (
				view === "list" ? (
					<div className="space-y-2">
						{Array.from({ length: 6 }).map((_, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton row count, never reordered
							<Skeleton key={i} className="h-12 rounded-md" />
						))}
					</div>
				) : (
					<div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
						{Array.from({ length: 8 }).map((_, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton card count, never reordered
							<Skeleton key={i} className="h-52 rounded-lg" />
						))}
					</div>
				)
			) : assets.length === 0 && uploads.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-muted-foreground">
					<IconPhoto className="mb-3 size-12 opacity-30" />
					<p className="text-sm">
						{hasActiveFilters
							? "No assets match these filters."
							: "No assets yet. Upload your first file."}
					</p>
				</div>
			) : view === "list" ? (
				<div className="overflow-hidden rounded-md border">
					<Table>
						<TableHeader>
							<TableRow className="hover:bg-transparent">
								<TableHead>Name</TableHead>
								<TableHead>Type</TableHead>
								<TableHead>Size</TableHead>
								<TableHead>Tags</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{uploads.map((item) => (
								<UploadingRow
									key={item.id}
									item={item}
									onRetry={() => runUpload(item)}
									onDismiss={() => removeUpload(item.id)}
								/>
							))}
							{assets.map((asset) => (
								<MediaListRow
									key={asset.id}
									asset={asset}
									tagsById={tagsById}
								/>
							))}
						</TableBody>
					</Table>
				</div>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
					{uploads.map((item) => (
						<UploadingCard
							key={item.id}
							item={item}
							onRetry={() => runUpload(item)}
							onDismiss={() => removeUpload(item.id)}
						/>
					))}
					{assets.map((asset) => (
						<MediaCard key={asset.id} asset={asset} tagsById={tagsById} />
					))}
				</div>
			)}
		</div>
	);
}
