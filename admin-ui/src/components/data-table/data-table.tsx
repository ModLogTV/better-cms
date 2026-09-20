import {
	flexRender,
	type Row,
	type Table as TanstackTable,
} from "@tanstack/react-table";
import { Fragment } from "react";
import type * as React from "react";

import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { getColumnPinningStyle } from "@/lib/data-table";
import { cn } from "@/lib/utils";

interface DataTableProps<TData> extends React.ComponentProps<"div"> {
	table: TanstackTable<TData>;
	actionBar?: React.ReactNode;
	onRowClick?: (row: TData) => void;
	/** Overrides the default per-row rendering (flexRender over visible cells) - for rows that need drag handles, tree indentation, or other structure a plain cell grid can't express. Must return a keyed element (or Fragment). */
	renderRow?: (row: Row<TData>) => React.ReactNode;
	/** Extra <TableRow>s rendered before the data rows, e.g. in-progress items that aren't part of the table's row model yet. */
	beforeRows?: React.ReactNode;
	/** Replaces the default <DataTablePagination>. Pass `false` to render no pagination footer at all (e.g. server-driven paging handled by the caller, or a preview table with nothing to page through). */
	pagination?: React.ReactNode | false;
}

export function DataTable<TData>({
	table,
	actionBar,
	onRowClick,
	renderRow,
	beforeRows,
	pagination,
	children,
	className,
	...props
}: DataTableProps<TData>) {
	const rows = table.getRowModel().rows;
	const hasBeforeRows = Array.isArray(beforeRows)
		? beforeRows.length > 0
		: !!beforeRows;

	return (
		<div
			className={cn("flex w-full flex-col gap-2.5 overflow-auto", className)}
			{...props}
		>
			{children}
			<div className="overflow-hidden rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									const Icon = header.column.columnDef.meta?.icon;
									return (
										<TableHead
											key={header.id}
											colSpan={header.colSpan}
											className={header.column.columnDef.meta?.headerClassName}
											// oxlint-disable shadcn/no-inline-styles -- computed column-pinning offsets from a shared helper, not a raw style override
											style={{
												...getColumnPinningStyle({ column: header.column }),
											}}
											// oxlint-enable shadcn/no-inline-styles
										>
											{header.isPlaceholder ? null : Icon ? (
												<span className="inline-flex items-center gap-1.5">
													<Icon className="size-3.5 shrink-0 text-muted-foreground" />
													{flexRender(
														header.column.columnDef.header,
														header.getContext(),
													)}
												</span>
											) : (
												flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)
											)}
										</TableHead>
									);
								})}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{beforeRows}
						{rows.length ? (
							rows.map((row) =>
								renderRow ? (
									<Fragment key={row.id}>{renderRow(row)}</Fragment>
								) : (
									<TableRow
										key={row.id}
										data-state={row.getIsSelected() && "selected"}
										onClick={
											onRowClick ? () => onRowClick(row.original) : undefined
										}
										className={onRowClick ? "cursor-pointer" : undefined}
									>
										{row.getVisibleCells().map((cell) => (
											<TableCell
												key={cell.id}
												// oxlint-disable shadcn/no-inline-styles -- computed column-pinning offsets from a shared helper, not a raw style override
												style={{
													...getColumnPinningStyle({ column: cell.column }),
												}}
												// oxlint-enable shadcn/no-inline-styles
											>
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext(),
												)}
											</TableCell>
										))}
									</TableRow>
								),
							)
						) : !hasBeforeRows ? (
							<TableRow>
								<TableCell
									colSpan={table.getAllColumns().length}
									className="h-24 text-center"
								>
									No results.
								</TableCell>
							</TableRow>
						) : null}
					</TableBody>
				</Table>
			</div>
			<div className="flex flex-col gap-2.5">
				{pagination === false
					? null
					: (pagination ?? <DataTablePagination table={table} />)}
				{actionBar &&
					table.getFilteredSelectedRowModel().rows.length > 0 &&
					actionBar}
			</div>
		</div>
	);
}
