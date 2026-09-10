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
import { api, type PageVersionSummary, type RawBlock } from "@/lib/api";
import { diffBlocks } from "@/lib/diff";
import { cn } from "@/lib/utils";

const CURRENT_DRAFT = "__current__";

function formatTimestamp(iso: string) {
	return new Date(iso).toLocaleString();
}

function DiffView({
	blocksA,
	blocksB,
}: {
	blocksA: unknown;
	blocksB: unknown;
}) {
	const lines = useMemo(() => diffBlocks(blocksA, blocksB), [blocksA, blocksB]);
	return (
		<pre className="max-h-80 overflow-auto rounded-md border bg-muted/30 p-2 font-mono text-xs">
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

export function VersionHistoryPanel({
	contentId,
	currentBlocks,
	onRestored,
}: {
	contentId: string;
	currentBlocks: RawBlock[];
	onRestored: () => void;
}) {
	const qc = useQueryClient();
	const [open, setOpen] = useState(false);
	const [fromId, setFromId] = useState<string>("");
	const [toId, setToId] = useState<string>(CURRENT_DRAFT);

	const { data: versions = [], isLoading } = useQuery({
		queryKey: ["cms", "pages", "versions", contentId],
		queryFn: () => api.pages.versions.list(contentId),
		enabled: open,
	});

	const versionOptions = useMemo(
		() =>
			versions.map((v: PageVersionSummary) => ({
				value: v.id,
				label: `${formatTimestamp(v.createdAt)}${v.publishedAt ? " · published" : ""}`,
			})),
		[versions],
	);

	// Default the comparison to "previous saved version" vs "current draft".
	const effectiveFrom = fromId || versions[1]?.id || versions[0]?.id || "";

	const { data: fromVersion } = useQuery({
		queryKey: ["cms", "pages", "version", effectiveFrom],
		queryFn: () => api.pages.versions.get(effectiveFrom),
		enabled: open && !!effectiveFrom,
	});
	const { data: toVersion } = useQuery({
		queryKey: ["cms", "pages", "version", toId],
		queryFn: () => api.pages.versions.get(toId),
		enabled: open && !!toId && toId !== CURRENT_DRAFT,
	});

	const restore = useMutation({
		mutationFn: (versionId: string) => api.pages.restore(contentId, versionId),
		onSuccess: () => {
			toast.success("Version restored into a new draft");
			qc.invalidateQueries({
				queryKey: ["cms", "pages", "versions", contentId],
			});
			qc.invalidateQueries({ queryKey: ["cms", "pages"] });
			onRestored();
		},
		onError: (e) =>
			toast.error(e instanceof Error ? e.message : "Couldn't restore version"),
	});

	const toBlocks = toId === CURRENT_DRAFT ? currentBlocks : toVersion?.blocks;

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm">
					<IconHistory className="size-4" />
					History
				</Button>
			</DialogTrigger>
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
									{versionOptions.map((o) => (
										<SelectItem key={o.value} value={o.value}>
											{o.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Select value={toId} onValueChange={setToId}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="To version" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={CURRENT_DRAFT}>Current draft</SelectItem>
									{versionOptions.map((o) => (
										<SelectItem key={o.value} value={o.value}>
											{o.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{fromVersion && toBlocks !== undefined && (
							<DiffView blocksA={fromVersion.blocks} blocksB={toBlocks} />
						)}

						<div className="space-y-1.5 border-t pt-3">
							<p className="font-medium text-muted-foreground text-xs">
								All versions
							</p>
							{versions.map((v: PageVersionSummary) => (
								<div
									key={v.id}
									className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-sm"
								>
									<span className="text-xs">
										{formatTimestamp(v.createdAt)}
									</span>
									<div className="flex items-center gap-2">
										{v.publishedAt && (
											<Badge variant="success">published</Badge>
										)}
										{v.createdBy && (
											<span className="text-muted-foreground text-xs">
												{v.createdBy}
											</span>
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
