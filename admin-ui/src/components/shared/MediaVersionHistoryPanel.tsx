import { IconHistory, IconRestore } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { api, type MediaVersionSummary } from "@/lib/api";
import { diffBlocks } from "@/lib/diff";
import { cn } from "@/lib/utils";

function formatTimestamp(iso: string) {
	return new Date(iso).toLocaleString();
}

function DiffView({ a, b }: { a: unknown; b: unknown }) {
	const lines = useMemo(() => diffBlocks(a, b), [a, b]);
	return (
		<pre className="max-h-64 overflow-auto rounded-md border bg-muted/30 p-2 font-mono text-xs">
			{lines.map((line, i) => (
				<div
					// biome-ignore lint/suspicious/noArrayIndexKey: diff lines have no stable identity
					key={i}
					className={cn(
						"whitespace-pre-wrap px-1",
						line.type === "add" &&
							"bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
						line.type === "del" &&
							"bg-red-500/15 text-red-700 dark:text-red-400",
					)}
				>
					{line.type === "add" ? "+ " : line.type === "del" ? "- " : "  "}
					{line.text}
				</div>
			))}
		</pre>
	);
}

function FilePreview({
	label,
	publicUrl,
	mimeType,
}: {
	label: string;
	publicUrl: string;
	mimeType: string;
}) {
	return (
		<div className="space-y-1">
			<p className="text-muted-foreground text-xs">{label}</p>
			<div className="flex h-28 items-center justify-center rounded-md border bg-muted">
				{mimeType.startsWith("image/") ? (
					<img
						src={publicUrl}
						alt={label}
						className="h-full w-full rounded-md object-cover"
					/>
				) : (
					<span className="truncate px-2 text-muted-foreground text-xs">
						{publicUrl.split("/").pop()}
					</span>
				)}
			</div>
		</div>
	);
}

export function MediaVersionHistoryPanel({
	assetId,
	onRestored,
	compact = false,
}: {
	assetId: string;
	onRestored: () => void;
	/** Icon-only trigger, for tight card layouts. */
	compact?: boolean;
}) {
	const qc = useQueryClient();
	const [open, setOpen] = useState(false);
	const [fromId, setFromId] = useState("");
	const [toId, setToId] = useState("");

	const { data: versions = [], isLoading } = useQuery({
		queryKey: ["cms", "media", "versions", assetId],
		queryFn: () => api.media.versions.list(assetId),
		enabled: open,
	});

	const effectiveFrom = fromId || versions[1]?.id || versions[0]?.id || "";
	const effectiveTo = toId || versions[0]?.id || "";

	const { data: fromVersion } = useQuery({
		queryKey: ["cms", "media", "version", effectiveFrom],
		queryFn: () => api.media.versions.get(effectiveFrom),
		enabled: open && !!effectiveFrom,
	});
	const { data: toVersion } = useQuery({
		queryKey: ["cms", "media", "version", effectiveTo],
		queryFn: () => api.media.versions.get(effectiveTo),
		enabled: open && !!effectiveTo,
	});

	const restore = useMutation({
		mutationFn: (versionId: string) => api.media.restore(assetId, versionId),
		onSuccess: () => {
			toast.success("Version restored into a new draft");
			qc.invalidateQueries({ queryKey: ["cms", "media", "versions", assetId] });
			qc.invalidateQueries({ queryKey: ["cms", "media"] });
			onRestored();
		},
		onError: (e) =>
			toast.error(e instanceof Error ? e.message : "Couldn't restore version"),
	});

	const fileChanged =
		fromVersion && toVersion && fromVersion.key !== toVersion.key;

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			{compact ? (
				<Tooltip>
					<TooltipTrigger asChild>
						<DialogTrigger asChild>
							<Button size="icon" variant="outline" className="size-7">
								<IconHistory className="size-3.5" />
							</Button>
						</DialogTrigger>
					</TooltipTrigger>
					<TooltipContent>Version history</TooltipContent>
				</Tooltip>
			) : (
				<DialogTrigger asChild>
					<Button variant="outline" size="sm">
						<IconHistory className="size-4" />
						History
					</Button>
				</DialogTrigger>
			)}
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>Version history</DialogTitle>
				</DialogHeader>

				{isLoading ? (
					<p className="text-muted-foreground text-sm">Loading…</p>
				) : versions.length === 0 ? (
					<p className="text-muted-foreground text-sm">No versions yet.</p>
				) : (
					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-2">
							<Select value={effectiveFrom} onValueChange={setFromId}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="From version" />
								</SelectTrigger>
								<SelectContent>
									{versions.map((v) => (
										<SelectItem key={v.id} value={v.id}>
											{formatTimestamp(v.createdAt)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Select value={effectiveTo} onValueChange={setToId}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="To version" />
								</SelectTrigger>
								<SelectContent>
									{versions.map((v) => (
										<SelectItem key={v.id} value={v.id}>
											{formatTimestamp(v.createdAt)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{fromVersion && toVersion && (
							<div className="space-y-3">
								{fileChanged && (
									<div className="grid grid-cols-2 gap-2">
										<FilePreview
											label="Old file"
											publicUrl={fromVersion.publicUrl}
											mimeType={fromVersion.mimeType}
										/>
										<FilePreview
											label="New file"
											publicUrl={toVersion.publicUrl}
											mimeType={toVersion.mimeType}
										/>
									</div>
								)}
								<div>
									<p className="mb-1 text-muted-foreground text-xs">
										Metadata diff
									</p>
									<DiffView a={fromVersion.metadata} b={toVersion.metadata} />
								</div>
							</div>
						)}

						<div className="space-y-1.5 border-t pt-3">
							<p className="font-medium text-muted-foreground text-xs">
								All versions
							</p>
							{versions.map((v: MediaVersionSummary) => (
								<div
									key={v.id}
									className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-sm"
								>
									<span className="text-xs">
										{formatTimestamp(v.createdAt)}
									</span>
									<div className="flex items-center gap-2">
										{v.fileChanged && (
											<Badge variant="outline">file changed</Badge>
										)}
										{v.publishedAt && (
											<Badge variant="success">published</Badge>
										)}
										<Button
											size="sm"
											variant="ghost"
											className="h-6 gap-1 text-xs"
											onClick={() => restore.mutate(v.id)}
											disabled={restore.isPending}
										>
											<IconRestore className="size-3" />
											Restore
										</Button>
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
