import {
	IconAlertCircle,
	IconBookmark,
	IconFile,
	IconPhoto,
	IconPlus,
	IconRefresh,
	IconRocket,
	IconTrash,
	IconUpload,
	IconX,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { MediaEditForm } from "@/components/shared/MediaEditForm";
import {
	MediaTagsPopover,
	TagChip,
} from "@/components/shared/MediaTagsPopover";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { api, type MediaAsset } from "@/lib/api";
import { formatBytes } from "@/lib/utils";

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

function MediaStatusBadge({ status }: { status: MediaAsset["status"] }) {
	if (status === "modified") {
		return <Badge variant="warning">published · unpublished changes</Badge>;
	}
	return (
		<Badge variant={status === "published" ? "success" : "warning"}>
			{status}
		</Badge>
	);
}

function MediaCard({
	asset,
	tagsById,
}: {
	asset: MediaAsset;
	tagsById: Map<string, string>;
}) {
	const qc = useQueryClient();
	const isImage = asset.mimeType.startsWith("image/");

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
					<div className="flex items-center justify-between gap-2">
						<MediaStatusBadge status={asset.status} />
						<div className="flex items-center gap-1">
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
						</div>
					</div>
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

function MediaPage() {
	const qc = useQueryClient();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [uploads, setUploads] = useState<UploadItem[]>([]);
	const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
	const [tagOperator, setTagOperator] = useState<"AND" | "OR">("AND");
	const [newTagName, setNewTagName] = useState("");

	const { data, isLoading } = useQuery({
		queryKey: ["cms", "media", selectedTagIds, tagOperator],
		queryFn: () => api.media.list({ tagIds: selectedTagIds, tagOperator }),
	});

	const { data: tags = [] } = useQuery({
		queryKey: ["cms", "media", "tags"],
		queryFn: () => api.media.tags.list(),
	});
	const tagsById = new Map(tags.map((t) => [t.id, t.name]));

	const { data: views = [] } = useQuery({
		queryKey: ["cms", "media", "views"],
		queryFn: () => api.media.views.list(),
	});

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

	const createView = useMutation({
		mutationFn: () =>
			api.media.views.create({
				name: window.prompt("Name this view") ?? "",
				operator: tagOperator,
				tagIds: selectedTagIds,
			}),
		onSuccess: (view) => {
			if (!view.name) return;
			toast.success(`Saved view "${view.name}"`);
			qc.invalidateQueries({ queryKey: ["cms", "media", "views"] });
		},
	});

	const deleteView = useMutation({
		mutationFn: (id: string) => api.media.views.delete(id),
		onSuccess: () =>
			qc.invalidateQueries({ queryKey: ["cms", "media", "views"] }),
	});

	function toggleTag(tagId: string) {
		setSelectedTagIds((prev) =>
			prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId],
		);
	}

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
				<div>
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

			<div className="space-y-2 rounded-lg border p-3">
				<div className="flex flex-wrap items-center gap-1.5">
					<span className="text-muted-foreground text-xs">Tags:</span>
					{tags.map((tag) => (
						<div key={tag.id} className="flex items-center gap-0.5">
							<TagChip
								label={tag.name}
								active={selectedTagIds.includes(tag.id)}
								onClick={() => toggleTag(tag.id)}
								onRemove={() => {
									if (window.confirm(`Delete tag "${tag.name}"?`)) {
										deleteTag.mutate(tag.id);
									}
								}}
							/>
							<TagAccessPanel tagId={tag.id} tagName={tag.name} />
						</div>
					))}
					<Input
						value={newTagName}
						onChange={(e) => setNewTagName(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && newTagName.trim()) {
								createTag.mutate(newTagName.trim());
							}
						}}
						placeholder="New tag…"
						className="h-6 w-28 text-xs"
					/>
					<Button
						size="icon"
						variant="ghost"
						className="size-6"
						disabled={!newTagName.trim() || createTag.isPending}
						onClick={() => createTag.mutate(newTagName.trim())}
					>
						<IconPlus className="size-3.5" />
					</Button>
					{selectedTagIds.length > 1 && (
						<Button
							size="sm"
							variant="outline"
							className="ml-2 h-6 text-xs"
							onClick={() =>
								setTagOperator((o) => (o === "AND" ? "OR" : "AND"))
							}
						>
							Match: {tagOperator}
						</Button>
					)}
					{selectedTagIds.length > 0 && (
						<Button
							size="sm"
							variant="ghost"
							className="h-6 gap-1 text-xs"
							onClick={() => createView.mutate()}
						>
							<IconBookmark className="size-3" />
							Save as view
						</Button>
					)}
				</div>
				{views.length > 0 && (
					<div className="flex flex-wrap items-center gap-1.5 border-t pt-2">
						<span className="text-muted-foreground text-xs">Views:</span>
						{views.map((view) => (
							<TagChip
								key={view.id}
								label={view.name}
								active={
									selectedTagIds.length === view.tagIds.length &&
									view.tagIds.every((t) => selectedTagIds.includes(t))
								}
								onClick={() => {
									setSelectedTagIds(view.tagIds);
									setTagOperator(view.operator);
								}}
								onRemove={() => deleteView.mutate(view.id)}
							/>
						))}
					</div>
				)}
			</div>

			{isLoading ? (
				<div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
					{Array.from({ length: 8 }).map((_, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton card count, never reordered
						<Skeleton key={i} className="h-52 rounded-lg" />
					))}
				</div>
			) : data?.length === 0 && uploads.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-muted-foreground">
					<IconPhoto className="mb-3 size-12 opacity-30" />
					<p className="text-sm">
						{selectedTagIds.length > 0
							? "No assets match this tag filter."
							: "No assets yet. Upload your first file."}
					</p>
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
					{data?.map((asset) => (
						<MediaCard key={asset.id} asset={asset} tagsById={tagsById} />
					))}
				</div>
			)}
		</div>
	);
}
