import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

export function ConfirmPopover({
	trigger,
	title,
	description,
	confirmLabel = "Confirm",
	variant = "default",
	loading,
	onConfirm,
	align = "end",
}: {
	trigger: React.ReactNode;
	title: string;
	description?: string;
	confirmLabel?: string;
	variant?: "default" | "destructive";
	loading?: boolean;
	onConfirm: () => void;
	align?: "start" | "center" | "end";
}) {
	const [open, setOpen] = useState(false);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>{trigger}</PopoverTrigger>
			<PopoverContent align={align} className="w-64 space-y-3">
				<div className="space-y-1">
					<p className="text-sm font-medium">{title}</p>
					{description && (
						<p className="text-xs text-muted-foreground">{description}</p>
					)}
				</div>
				<div className="flex justify-end gap-2">
					<Button size="sm" variant="outline" onClick={() => setOpen(false)}>
						Cancel
					</Button>
					<Button
						size="sm"
						variant={variant}
						disabled={loading}
						onClick={() => {
							onConfirm();
							setOpen(false);
						}}
					>
						{confirmLabel}
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
}
