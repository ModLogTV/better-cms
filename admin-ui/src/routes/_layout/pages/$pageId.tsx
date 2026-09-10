import {
	IconChevronLeft,
	IconDeviceFloppy,
	IconRocket,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { BlockEditor } from "@/components/shared/BlockEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type RawBlock } from "@/lib/api";

const searchSchema = z.object({
	path: z.string(),
	locale: z.string(),
});

export const Route = createFileRoute("/_layout/pages/$pageId")({
	validateSearch: searchSchema,
	component: PageEditorPage,
});

function PageEditorPage() {
	const { pageId } = Route.useParams();
	const { path, locale } = Route.useSearch();
	const qc = useQueryClient();
	const navigate = useNavigate();

	const { data: fetchedBlocks, isLoading } = useQuery({
		queryKey: ["cms", "page", path, locale, true],
		queryFn: () => api.pages.get(path, locale, true),
	});
	// Only fetching this for the status badge below - there's no by-id lookup on
	// the paginated endpoint, so filter to the locale and fetch generously.
	const { data: pageSummaries } = useQuery({
		queryKey: ["cms", "pages", "byLocale", locale],
		queryFn: () => api.pages.list({ page: 1, pageSize: 1000, locale }),
	});
	const pageSummary = pageSummaries?.items.find((p) => p.id === pageId);

	const [blocks, setBlocks] = useState<RawBlock[]>([]);

	useEffect(() => {
		if (fetchedBlocks) setBlocks(fetchedBlocks);
	}, [fetchedBlocks]);

	const save = useMutation({
		mutationFn: () => api.pages.update(pageId, blocks),
		onSuccess: () => {
			toast.success("Blocks saved");
			qc.invalidateQueries({ queryKey: ["cms", "pages"] });
		},
		onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
	});

	const publish = useMutation({
		mutationFn: () => api.pages.publish(pageId),
		onSuccess: () => {
			toast.success("Page published");
			qc.invalidateQueries({ queryKey: ["cms", "pages"] });
			navigate({ to: "/pages" });
		},
		onError: () => toast.error("Publish failed"),
	});

	return (
		<div className="flex h-full flex-col gap-4">
			<div className="flex items-center gap-2">
				<Link
					to="/pages"
					className="text-muted-foreground hover:text-foreground"
				>
					<IconChevronLeft className="size-4" />
				</Link>
				<div className="flex flex-1 items-center gap-3">
					<div>
						<h2 className="text-xl font-bold font-mono">{path}</h2>
						<div className="flex items-center gap-2 mt-0.5">
							<Badge variant="outline">{locale}</Badge>
							{pageSummary && (
								<Badge
									variant={
										pageSummary.status === "published" ? "success" : "warning"
									}
								>
									{pageSummary.status}
								</Badge>
							)}
						</div>
					</div>
				</div>
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => save.mutate()}
						disabled={save.isPending}
					>
						<IconDeviceFloppy className="size-4" />
						Save
					</Button>
					<Button
						size="sm"
						onClick={() => publish.mutate()}
						disabled={publish.isPending}
					>
						<IconRocket className="size-4" />
						Publish
					</Button>
				</div>
			</div>

			{isLoading ? (
				<div className="space-y-3">
					<Skeleton className="h-32 w-full" />
					<Skeleton className="h-32 w-full" />
				</div>
			) : (
				<BlockEditor blocks={fetchedBlocks ?? []} onChange={setBlocks} />
			)}
		</div>
	);
}
