import { IconSelector } from "@tabler/icons-react";
import * as Flags from "country-flag-icons/react/3x2";
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
import { CURATED_LOCALES } from "@/lib/locales";
import { cn } from "@/lib/utils";

function Flag({ country, className }: { country: string; className?: string }) {
	const FlagIcon = (
		Flags as Record<string, React.ComponentType<{ className?: string }>>
	)[country];
	if (!FlagIcon) return null;
	return (
		<FlagIcon className={cn("h-3.5 w-5 shrink-0 rounded-[2px]", className)} />
	);
}

export function LocaleCombobox({
	onSelect,
}: {
	onSelect: (locale: { code: string; name: string }) => void;
}) {
	const [open, setOpen] = useState(false);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className="w-full justify-between font-normal"
				>
					<span className="text-muted-foreground">Search common locales…</span>
					<IconSelector className="size-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-(--radix-popover-trigger-width) p-0">
				<Command>
					<CommandInput placeholder="Search language or country…" />
					<CommandList>
						<CommandEmpty>
							No match - you can still type a custom code below.
						</CommandEmpty>
						<CommandGroup>
							{CURATED_LOCALES.map((locale) => (
								<CommandItem
									key={locale.code}
									value={`${locale.name} ${locale.code}`}
									onSelect={() => {
										onSelect({ code: locale.code, name: locale.name });
										setOpen(false);
									}}
								>
									<Flag country={locale.country} />
									<span className="flex-1">{locale.name}</span>
									<code className="text-xs text-muted-foreground">
										{locale.code}
									</code>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

export { Flag as LocaleFlag };
