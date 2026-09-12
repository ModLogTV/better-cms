import { IconPlus, IconTag } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export function MediaTagsPopover({
	assetId,
	tagIds,
	triggerClassName,
}: {
	assetId: string;
	tagIds: string[];
	/** Overrides the trigger button's default `size-7` square styling. */
	triggerClassName?: string;
}) {
	const qc = useQueryClient();
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");

	const { data: tags = [] } = useQuery({
		queryKey: ["cms", "media", "tags"],
		queryFn: () => api.media.tags.list(),
		enabled: open,
	});

	const setTags = useMutation({
		mutationFn: (next: string[]) => api.media.setTags(assetId, next),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["cms", "media"] }),
		onError: () => toast.error("Couldn't update tags"),
	});

	const createAndAssign = useMutation({
		mutationFn: async (name: string) => {
			const tag = await api.media.tags.create(name);
			await api.media.setTags(assetId, [...tagIds, tag.id]);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["cms", "media", "tags"] });
			qc.invalidateQueries({ queryKey: ["cms", "media"] });
			setQuery("");
		},
		onError: (e) =>
			toast.error(e instanceof Error ? e.message : "Couldn't create tag"),
	});

	function toggle(tagId: string) {
		const next = tagIds.includes(tagId)
			? tagIds.filter((t) => t !== tagId)
			: [...tagIds, tagId];
		setTags.mutate(next);
	}

	const trimmed = query.trim();
	const exactMatch = tags.some(
		(t) => t.name.toLowerCase() === trimmed.toLowerCase(),
	);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<Tooltip>
				<TooltipTrigger asChild>
					<PopoverTrigger asChild>
						<Button
							size="icon"
							variant="outline"
							className={cn("size-7", triggerClassName)}
						>
							<IconTag className="size-3.5" />
						</Button>
					</PopoverTrigger>
				</TooltipTrigger>
				<TooltipContent>Tags</TooltipContent>
			</Tooltip>
			<PopoverContent className="w-64 p-0">
				<Command>
					<CommandInput
						value={query}
						onValueChange={setQuery}
						placeholder="Search or create tag…"
					/>
					<CommandList>
						<CommandEmpty>
							<div className="flex flex-col items-center gap-1.5 px-2 py-6 text-center">
								<IconTag className="size-6 text-muted-foreground/50" />
								<p className="font-medium text-xs">No tags yet</p>
								<p className="text-[11px] text-muted-foreground">
									Type a name above to create one.
								</p>
							</div>
						</CommandEmpty>
						<CommandGroup>
							{tags.map((tag) => (
								<CommandItem
									key={tag.id}
									value={tag.name}
									data-checked={tagIds.includes(tag.id)}
									onSelect={() => toggle(tag.id)}
								>
									{tag.name}
								</CommandItem>
							))}
							{trimmed && !exactMatch && (
								<CommandItem
									value={`create ${trimmed}`}
									disabled={createAndAssign.isPending}
									onSelect={() => createAndAssign.mutate(trimmed)}
								>
									<IconPlus className="size-3.5" />
									Create "{trimmed}"
								</CommandItem>
							)}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
