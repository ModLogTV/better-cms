import {
	IconAlertCircle,
	IconFile,
	IconPhoto,
	IconRefresh,
	IconTrash,
	IconUpload,
	IconX,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
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
import { Skeleton } from "@/components/ui/skeleton";
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

function MediaCard({ asset }: { asset: MediaAsset }) {
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
				<p className="truncate text-sm font-medium" title={asset.filename}>
					{asset.filename}
				</p>
				<div className="flex items-center gap-2">
					<Badge variant="outline" className="text-[10px]">
						{asset.mimeType}
					</Badge>
					<span className="text-xs text-muted-foreground">
						{formatBytes(asset.size)}
					</span>
				</div>
				{!asset.confirmedAt && (
					<Badge variant="warning" className="w-fit text-[10px]">
						pending
					</Badge>
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
				<p className="truncate text-sm font-medium" title={item.file.name}>
					{item.file.name}
				</p>
				{item.error ? (
					<div className="flex items-center gap-1 text-destructive text-xs">
						<IconAlertCircle className="size-3.5 shrink-0" />
						<span className="truncate" title={item.error}>
							{item.error}
						</span>
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
						<Button
							size="icon"
							variant="outline"
							className="size-7 bg-background"
							onClick={onRetry}
							title="Retry"
						>
							<IconRefresh className="size-3.5" />
						</Button>
						<Button
							size="icon"
							variant="outline"
							className="size-7 bg-background"
							onClick={onDismiss}
							title="Dismiss"
						>
							<IconX className="size-3.5" />
						</Button>
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

	const { data, isLoading } = useQuery({
		queryKey: ["cms", "media"],
		queryFn: () => api.media.list(),
	});

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
					<Button onClick={() => fileInputRef.current?.click()}>
						<IconUpload className="size-4" />
						Upload
					</Button>
				</div>
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
					<p className="text-sm">No assets yet. Upload your first file.</p>
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
						<MediaCard key={asset.id} asset={asset} />
					))}
				</div>
			)}
		</div>
	);
}
