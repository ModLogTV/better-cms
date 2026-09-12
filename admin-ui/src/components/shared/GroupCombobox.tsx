import { IconPlus, IconShield } from "@tabler/icons-react";
import { useState } from "react";
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
import type { CMSGroup } from "@/lib/api";

/**
 * Picker over the already-fetched (admin-scale, small) group list - used to
 * add a nesting edge from either side ("belongs to" or "contains") on a
 * group's own detail page.
 */
export function GroupCombobox({
	groups,
	exclude = [],
	onSelect,
	triggerLabel = "Add",
}: {
	groups: CMSGroup[];
	exclude?: string[];
	onSelect: (groupId: string) => void;
	triggerLabel?: string;
}) {
	const [open, setOpen] = useState(false);
	const available = groups.filter((g) => !exclude.includes(g.id));

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
					<IconPlus className="size-3.5" />
					{triggerLabel}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-64 p-0" align="start">
				<Command>
					<CommandInput placeholder="Search groups…" />
					<CommandList>
						<CommandEmpty>
							{groups.length === 0 ? "No other groups yet." : "No matches."}
						</CommandEmpty>
						<CommandGroup>
							{available.map((g) => (
								<CommandItem
									key={g.id}
									value={g.name}
									onSelect={() => {
										onSelect(g.id);
										setOpen(false);
									}}
								>
									<IconShield className="size-3.5 text-muted-foreground" />
									{g.name}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
