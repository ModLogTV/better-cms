import { IconTag } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { api } from "@/lib/api";

export function MediaTagsPopover({
	assetId,
	tagIds,
}: {
	assetId: string;
	tagIds: string[];
}) {
	const qc = useQueryClient();
	const [open, setOpen] = useState(false);

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

	function toggle(tagId: string, checked: boolean) {
		const next = checked
			? [...tagIds, tagId]
			: tagIds.filter((t) => t !== tagId);
		setTags.mutate(next);
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button size="icon" variant="outline" className="size-7" title="Tags">
					<IconTag className="size-3.5" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-56 space-y-2">
				<p className="font-medium text-muted-foreground text-xs">Tags</p>
				{tags.length === 0 ? (
					<p className="text-muted-foreground text-xs">
						No tags yet - create one from the filter bar.
					</p>
				) : (
					<div className="space-y-1.5">
						{tags.map((tag) => {
							const id = `tag-${assetId}-${tag.id}`;
							return (
								<div key={tag.id} className="flex items-center gap-2">
									<Checkbox
										id={id}
										checked={tagIds.includes(tag.id)}
										onCheckedChange={(checked) =>
											toggle(tag.id, checked === true)
										}
									/>
									<Label htmlFor={id} className="font-normal text-sm">
										{tag.name}
									</Label>
								</div>
							);
						})}
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
}

export function TagChip({
	label,
	active,
	onClick,
	onRemove,
}: {
	label: string;
	active: boolean;
	onClick: () => void;
	onRemove?: () => void;
}) {
	return (
		<Badge
			variant={active ? "default" : "outline"}
			className="group/chip gap-1 p-0 pl-2.5"
		>
			<button type="button" onClick={onClick} className="cursor-pointer py-0.5">
				{label}
			</button>
			{onRemove && (
				<button
					type="button"
					onClick={onRemove}
					className="cursor-pointer px-1.5 py-0.5 opacity-0 hover:text-destructive group-hover/chip:opacity-100"
				>
					×
				</button>
			)}
		</Badge>
	);
}
