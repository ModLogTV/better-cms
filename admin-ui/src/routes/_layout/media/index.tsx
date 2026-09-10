import {
	IconFile,
	IconPhoto,
	IconTrash,
	IconUpload,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
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

function MediaPage() {
	const qc = useQueryClient();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const { data, isLoading } = useQuery({
		queryKey: ["cms", "media"],
		queryFn: () => api.media.list(),
	});

	const upload = useMutation({
		mutationFn: (file: File) => api.media.upload(file),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["cms", "media"] });
		},
	});

	async function handleFiles(files: FileList | null) {
		if (!files || files.length === 0) return;
		let succeeded = 0;
		for (const file of Array.from(files)) {
			try {
				await upload.mutateAsync(file);
				succeeded++;
			} catch (e) {
				toast.error(
					e instanceof Error ? e.message : `Couldn't upload "${file.name}".`,
				);
			}
		}
		if (succeeded > 0) {
			toast.success(
				succeeded === 1 ? "Upload complete" : `${succeeded} files uploaded`,
			);
		}
		// Reset so selecting the same file again (e.g. to retry) fires onChange.
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
					<Button
						onClick={() => fileInputRef.current?.click()}
						disabled={upload.isPending}
					>
						<IconUpload className="size-4" />
						{upload.isPending ? "Uploading…" : "Upload"}
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
			) : data?.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-muted-foreground">
					<IconPhoto className="mb-3 size-12 opacity-30" />
					<p className="text-sm">No assets yet. Upload your first file.</p>
				</div>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
					{data?.map((asset) => (
						<MediaCard key={asset.id} asset={asset} />
					))}
				</div>
			)}
		</div>
	);
}
