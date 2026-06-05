import { useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Image, Trash2, Upload, File } from "lucide-react";
import { toast } from "sonner";
import { api, type MediaAsset } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_layout/media/")({
  component: MediaPage,
});

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
          <File className="size-10 text-muted-foreground" />
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
            {formatSize(asset.size)}
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
            <Trash2 className="size-3.5" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete asset?</DialogTitle>
            <DialogDescription>
              Permanently removes <strong>{asset.filename}</strong> from storage.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {}}>
              Cancel
            </Button>
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
      toast.success("Upload complete");
      qc.invalidateQueries({ queryKey: ["cms", "media"] });
    },
    onError: () => toast.error("Upload failed"),
  });

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    for (const file of files) {
      await upload.mutateAsync(file);
    }
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
            <Upload className="size-4" />
            {upload.isPending ? "Uploading…" : "Upload"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-lg" />
          ))}
        </div>
      ) : data?.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-muted-foreground">
          <Image className="mb-3 size-12 opacity-30" />
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
