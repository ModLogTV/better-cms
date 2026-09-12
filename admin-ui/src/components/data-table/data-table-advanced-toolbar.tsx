"use client";

import type { Table } from "@tanstack/react-table";
import type * as React from "react";

import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { cn } from "@/lib/utils";

interface DataTableAdvancedToolbarProps<TData>
	extends React.ComponentProps<"div"> {
	table: Table<TData>;
	/** Rendered on the right side, just before the "View" column-visibility popover. */
	endActions?: React.ReactNode;
}

export function DataTableAdvancedToolbar<TData>({
	table,
	children,
	className,
	endActions,
	...props
}: DataTableAdvancedToolbarProps<TData>) {
	return (
		<div
			role="toolbar"
			aria-orientation="horizontal"
			className={cn(
				"flex w-full items-start justify-between gap-2 p-1",
				className,
			)}
			{...props}
		>
			<div className="flex flex-1 flex-wrap items-center gap-2">{children}</div>
			<div className="flex items-center gap-2">
				{endActions}
				<DataTableViewOptions table={table} align="end" />
			</div>
		</div>
	);
}
