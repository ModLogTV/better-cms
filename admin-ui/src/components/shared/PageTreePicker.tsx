import { IconFileText, IconFolder } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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
import { api, type PageTreeNode } from "@/lib/api";

interface FlatPageNode {
	id: string;
	path: string;
	slug: string;
	depth: number;
	hasChildren: boolean;
}

function flattenTree(nodes: PageTreeNode[], depth = 0): FlatPageNode[] {
	return nodes.flatMap((n) => [
		{
			id: n.id,
			path: n.path,
			slug: n.slug,
			depth,
			hasChildren: n.children.length > 0,
		},
		...flattenTree(n.children, depth + 1),
	]);
}

/**
 * Picker over the real page tree (indented, matching how Pages itself
 * renders it) - scoping a grant to a page should feel like pointing at a
 * branch of the actual site, not choosing from an abstract dropdown.
 */
export function PageTreePicker({
	value,
	onChange,
}: {
	/** Selected node id, or null. */
	value: string | null;
	onChange: (nodeId: string, path: string) => void;
}) {
	const [open, setOpen] = useState(false);
	const { data: tree = [], isLoading } = useQuery({
		queryKey: ["cms", "pages", "tree"],
		queryFn: () => api.pages.tree(),
		enabled: open,
	});
	const flat = useMemo(() => flattenTree(tree), [tree]);
	const selected = flat.find((n) => n.id === value);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					className="w-full justify-start font-mono text-xs"
				>
					<span className="truncate">
						{selected ? selected.path : "Select page…"}
					</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-80 p-0" align="start">
				<Command>
					<CommandInput placeholder="Search pages…" />
					<CommandList>
						{isLoading ? (
							<div className="p-4 text-center text-muted-foreground text-xs">
								Loading…
							</div>
						) : (
							<>
								<CommandEmpty>No pages found.</CommandEmpty>
								<CommandGroup>
									{flat.map((n) => (
										<CommandItem
											key={n.id}
											value={n.path}
											data-checked={value === n.id}
											onSelect={() => {
												onChange(n.id, n.path);
												setOpen(false);
											}}
										>
											<span
												style={{ paddingLeft: n.depth * 12 }}
												className="flex min-w-0 items-center gap-1.5"
											>
												{n.hasChildren ? (
													<IconFolder className="size-3.5 shrink-0 text-muted-foreground" />
												) : (
													<IconFileText className="size-3.5 shrink-0 text-muted-foreground" />
												)}
												<span className="truncate">{n.slug}</span>
											</span>
										</CommandItem>
									))}
								</CommandGroup>
							</>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
