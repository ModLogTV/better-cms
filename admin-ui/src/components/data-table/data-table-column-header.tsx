"use client";

import {
	IconChevronDown,
	IconChevronUp,
	IconEyeOff,
	IconSelector,
	IconX,
} from "@tabler/icons-react";
import type { Column } from "@tanstack/react-table";

import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface DataTableColumnHeaderProps<TData, TValue>
	extends React.ComponentProps<typeof DropdownMenuTrigger> {
	column: Column<TData, TValue>;
	label: string;
}

export function DataTableColumnHeader<TData, TValue>({
	column,
	label,
	className,
	...props
}: DataTableColumnHeaderProps<TData, TValue>) {
	if (!column.getCanSort() && !column.getCanHide()) {
		return <div className={cn(className)}>{label}</div>;
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				className={cn(
					"-ml-1.5 flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 hover:bg-accent focus:outline-none focus:ring-1 focus:ring-ring data-[state=open]:bg-accent [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
					className,
				)}
				{...props}
			>
				{label}
				{column.getCanSort() &&
					(column.getIsSorted() === "desc" ? (
						<IconChevronDown />
					) : column.getIsSorted() === "asc" ? (
						<IconChevronUp />
					) : (
						<IconSelector />
					))}
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-28">
				{column.getCanSort() && (
					<>
						<DropdownMenuCheckboxItem
							className="relative pr-8 pl-2 [&>span:first-child]:right-2 [&>span:first-child]:left-auto [&_svg]:text-muted-foreground"
							checked={column.getIsSorted() === "asc"}
							onClick={() => column.toggleSorting(false)}
						>
							<IconChevronUp />
							Asc
						</DropdownMenuCheckboxItem>
						<DropdownMenuCheckboxItem
							className="relative pr-8 pl-2 [&>span:first-child]:right-2 [&>span:first-child]:left-auto [&_svg]:text-muted-foreground"
							checked={column.getIsSorted() === "desc"}
							onClick={() => column.toggleSorting(true)}
						>
							<IconChevronDown />
							Desc
						</DropdownMenuCheckboxItem>
						{column.getIsSorted() && (
							<DropdownMenuItem
								className="pl-2 [&_svg]:text-muted-foreground"
								onClick={() => column.clearSorting()}
							>
								<IconX />
								Reset
							</DropdownMenuItem>
						)}
					</>
				)}
				{column.getCanHide() && (
					<DropdownMenuCheckboxItem
						className="relative pr-8 pl-2 [&>span:first-child]:right-2 [&>span:first-child]:left-auto [&_svg]:text-muted-foreground"
						checked={!column.getIsVisible()}
						onClick={() => column.toggleVisibility(false)}
					>
						<IconEyeOff />
						Hide
					</DropdownMenuCheckboxItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
