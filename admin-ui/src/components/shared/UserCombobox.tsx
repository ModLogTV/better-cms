import { IconUserCircle } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { api, type CMSUserSummary } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Searchable user picker (name/email, server-side search) - the interactive
 * replacement for a raw "paste a user ID" text field, used anywhere a grant
 * or membership needs a specific user as its subject.
 */
export function UserCombobox({
	value,
	onChange,
	placeholder = "Search user…",
	className,
}: {
	value: string | null;
	onChange: (user: CMSUserSummary) => void;
	placeholder?: string;
	className?: string;
}) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [debounced, setDebounced] = useState("");
	const [selected, setSelected] = useState<CMSUserSummary | null>(null);
	const debouncedSetDebounced = useDebouncedCallback(setDebounced, 300);

	const { data, isLoading } = useQuery({
		queryKey: ["cms", "users", "search", debounced],
		queryFn: () => api.users.list({ page: 1, pageSize: 20, search: debounced }),
		enabled: open,
	});
	const users = data?.items ?? [];

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					className={cn("w-full justify-start font-normal", className)}
				>
					<IconUserCircle className="size-3.5 shrink-0 text-muted-foreground" />
					<span className="truncate">
						{value ? (selected?.name ?? selected?.email ?? value) : placeholder}
					</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-72 p-0" align="start">
				<Command shouldFilter={false}>
					<CommandInput
						value={query}
						onValueChange={(v) => {
							setQuery(v);
							debouncedSetDebounced(v);
						}}
						placeholder="Search name or email…"
					/>
					<CommandList>
						{isLoading ? (
							<div className="p-4 text-center text-muted-foreground text-xs">
								Searching…
							</div>
						) : (
							<>
								<CommandEmpty>No users found.</CommandEmpty>
								<CommandGroup>
									{users.map((u) => (
										<CommandItem
											key={u.id}
											value={u.id}
											data-checked={value === u.id}
											onSelect={() => {
												onChange(u);
												setSelected(u);
												setOpen(false);
											}}
										>
											<Avatar className="size-5">
												<AvatarFallback className="text-[10px]">
													{(u.name || u.email)[0]?.toUpperCase()}
												</AvatarFallback>
											</Avatar>
											<div className="flex flex-col overflow-hidden">
												<span className="truncate text-xs">
													{u.name || u.email}
												</span>
												{u.name && (
													<span className="truncate text-[10px] text-muted-foreground">
														{u.email}
													</span>
												)}
											</div>
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
