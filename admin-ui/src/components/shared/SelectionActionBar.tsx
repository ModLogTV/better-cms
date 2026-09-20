import { IconX } from "@tabler/icons-react";
import type { Row, Table } from "@tanstack/react-table";
import type { ReactNode } from "react";
import { useCallback } from "react";

import {
	ActionBar,
	ActionBarClose,
	ActionBarGroup,
	ActionBarSelection,
	ActionBarSeparator,
} from "@/components/ui/action-bar";
import { Button } from "@/components/ui/button";

/** Row-selection action bar shared by server-mode data tables. Pass `actions` to render bulk-action buttons for the current selection. */
export function SelectionActionBar<TData>({
	table,
	actions,
}: {
	table: Table<TData>;
	actions?: (selectedRows: Row<TData>[]) => ReactNode;
}) {
	const rows = table.getFilteredSelectedRowModel().rows;

	const onOpenChange = useCallback(
		(open: boolean) => {
			if (!open) table.toggleAllRowsSelected(false);
		},
		[table],
	);

	return (
		<ActionBar open={rows.length > 0} onOpenChange={onOpenChange}>
			<ActionBarSelection>{rows.length} selected</ActionBarSelection>
			{actions && (
				<>
					<ActionBarSeparator />
					<ActionBarGroup>{actions(rows)}</ActionBarGroup>
				</>
			)}
			<ActionBarSeparator />
			<ActionBarClose asChild>
				<Button variant="ghost" size="icon-sm" aria-label="Clear selection">
					<IconX />
				</Button>
			</ActionBarClose>
		</ActionBar>
	);
}
