import {
	IconCopy,
	IconDotsVertical,
	IconLetterCase,
	IconPlus,
	IconShield,
	IconShieldLock,
	IconX,
} from "@tabler/icons-react";
import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableAdvancedToolbar } from "@/components/data-table/data-table-advanced-toolbar";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTableFilterMenu } from "@/components/data-table/data-table-filter-menu";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { DataTableSortList } from "@/components/data-table/data-table-sort-list";
import { PermissionPicker } from "@/components/shared/PermissionPicker";
import { SelectionActionBar } from "@/components/shared/SelectionActionBar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useDataTable } from "@/hooks/use-data-table";
import { filterValue, useTableQueryState } from "@/hooks/use-table-query-state";
import { api, type CMSGroup, type CMSUserSummary } from "@/lib/api";
import { getSession } from "@/lib/auth";

export const Route = createFileRoute("/_layout/users/")({
	component: UsersPage,
});

function UserDetailDialog({
	user,
	allGroups,
	isSelf,
	open,
	onClose,
}: {
	user: CMSUserSummary;
	allGroups: CMSGroup[];
	isSelf: boolean;
	open: boolean;
	onClose: () => void;
}) {
	const qc = useQueryClient();

	const { data: perms } = useQuery({
		queryKey: ["cms", "users", user.id, "permissions"],
		queryFn: () => api.users.getPermissions(user.id),
		enabled: open,
	});
	const { data: groups } = useQuery({
		queryKey: ["cms", "users", user.id, "groups"],
		queryFn: () => api.users.getGroups(user.id),
		enabled: open,
	});

	const setPerms = useMutation({
		mutationFn: (permissions: string[]) =>
			api.users.setPermissions(user.id, permissions),
		onSuccess: () => {
			toast.success("Permissions updated");
			qc.invalidateQueries({ queryKey: ["cms", "users", user.id] });
		},
	});

	const addGroup = useMutation({
		mutationFn: (groupId: string) => api.users.addToGroup(user.id, groupId),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["cms", "users", user.id, "groups"] });
		},
	});
	const removeGroup = useMutation({
		mutationFn: (groupId: string) =>
			api.users.removeFromGroup(user.id, groupId),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["cms", "users", user.id, "groups"] });
		},
	});

	const memberGroupIds = new Set(groups?.map((g) => g.id) ?? []);
	const availableGroups = allGroups.filter((g) => !memberGroupIds.has(g.id));

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Avatar className="size-7">
							<AvatarFallback className="text-xs">
								{user.name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
							</AvatarFallback>
						</Avatar>
						{user.name || user.email}
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-5">
					<div>
						<p className="mb-2 text-sm font-medium">Direct Permissions</p>
						<PermissionPicker
							value={perms ?? []}
							onChange={(next) => setPerms.mutate(next)}
							preventWildcardRevoke={isSelf}
						/>
					</div>

					<Separator />

					<div>
						<p className="mb-2 text-sm font-medium">Group Memberships</p>
						<div className="space-y-1.5">
							{groups?.map((g) => (
								<div
									key={g.id}
									className="flex items-center justify-between rounded-md border px-3 py-2"
								>
									<div className="flex items-center gap-2">
										<IconShield className="size-3.5 text-muted-foreground" />
										<span className="text-sm">{g.name}</span>
									</div>
									<Button
										size="sm"
										variant="ghost"
										className="h-6 text-muted-foreground hover:text-destructive"
										onClick={() => removeGroup.mutate(g.id)}
									>
										<IconX className="size-3" />
									</Button>
								</div>
							))}
							{availableGroups.length > 0 && (
								<div className="flex flex-wrap gap-1.5 pt-1">
									{availableGroups.map((g) => (
										<Button
											key={g.id}
											size="sm"
											variant="outline"
											className="h-7 gap-1 text-xs"
											onClick={() => addGroup.mutate(g.id)}
										>
											<IconPlus className="size-3" />
											{g.name}
										</Button>
									))}
								</div>
							)}
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

const FILTERABLE_COLUMN_IDS = ["name", "permission"];

function copyUserId(id: string) {
	navigator.clipboard.writeText(id).then(
		() => toast.success("User ID copied"),
		() => toast.error("Couldn't copy user ID"),
	);
}

function UsersPage() {
	const qc = useQueryClient();
	const [selectedUser, setSelectedUser] = useState<CMSUserSummary | null>(null);

	const { data: groups = [] } = useQuery({
		queryKey: ["cms", "groups"],
		queryFn: () => api.groups.list(),
	});
	const { data: session } = useQuery({
		queryKey: ["cms", "session"],
		queryFn: () => getSession(),
	});
	const { data: permissionCatalog = [] } = useQuery({
		queryKey: ["cms", "permissions"],
		queryFn: () => api.permissions.list(),
	});

	const { page, perPage, sorting, filters } =
		useTableQueryState<CMSUserSummary>({
			filterableColumnIds: FILTERABLE_COLUMN_IDS,
		});
	const search = filterValue(filters, "name");
	const permissionFilter = filterValue(filters, "permission");

	const { data, isLoading } = useQuery({
		queryKey: [
			"cms",
			"users",
			page,
			perPage,
			sorting,
			search,
			permissionFilter,
		],
		queryFn: () =>
			api.users.list({
				page,
				pageSize: perPage,
				sort: sorting,
				search,
				permission: permissionFilter,
			}),
		placeholderData: keepPreviousData,
	});

	const addSelectedToGroup = useMutation({
		mutationFn: ({
			userIds,
			groupId,
		}: {
			userIds: string[];
			groupId: string;
		}) =>
			Promise.all(
				userIds.map((userId) => api.users.addToGroup(userId, groupId)),
			),
		onSuccess: (_data, { userIds }) => {
			toast.success(
				`Added ${userIds.length} user${userIds.length === 1 ? "" : "s"} to group`,
			);
			qc.invalidateQueries({ queryKey: ["cms", "users"] });
		},
		onError: () => toast.error("Couldn't add users to group"),
	});

	const columns = useMemo<ColumnDef<CMSUserSummary>[]>(
		() => [
			{
				id: "select",
				header: ({ table }) => (
					<Checkbox
						checked={
							table.getIsAllPageRowsSelected()
								? true
								: table.getIsSomePageRowsSelected()
									? "indeterminate"
									: false
						}
						onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
						onClick={(e) => e.stopPropagation()}
						aria-label="Select all"
					/>
				),
				cell: ({ row }) => (
					<Checkbox
						checked={row.getIsSelected()}
						onCheckedChange={(v) => row.toggleSelected(!!v)}
						onClick={(e) => e.stopPropagation()}
						aria-label="Select row"
					/>
				),
				enableSorting: false,
				enableHiding: false,
				size: 32,
			},
			{
				id: "name",
				accessorKey: "name",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} label="User" />
				),
				cell: ({ row }) => {
					const user = row.original;
					const isSelf = session?.user.id === user.id;
					return (
						<div className="flex items-center gap-2">
							<Avatar className="size-7">
								<AvatarFallback className="text-xs">
									{user.name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
								</AvatarFallback>
							</Avatar>
							<div>
								<p className="flex items-center gap-1.5 text-sm font-medium">
									{user.name || user.email}
									{isSelf && (
										<Badge variant="outline" className="text-[10px]">
											you
										</Badge>
									)}
								</p>
								{user.name && (
									<p className="text-xs text-muted-foreground">{user.email}</p>
								)}
							</div>
						</div>
					);
				},
				enableColumnFilter: true,
				meta: {
					label: "Search",
					placeholder: "Search name, email or user ID",
					variant: "text",
					icon: IconLetterCase,
				},
			},
			{
				id: "groups",
				header: "Groups",
				cell: ({ row }) => {
					const user = row.original;
					return (
						<div className="flex flex-wrap gap-1">
							{user.groupIds.slice(0, 3).map((gid) => {
								const g = groups.find((g) => g.id === gid);
								return g ? (
									<Badge key={gid} variant="secondary" className="text-xs">
										{g.name}
									</Badge>
								) : null;
							})}
							{user.groupIds.length > 3 && (
								<Badge variant="outline" className="text-xs">
									+{user.groupIds.length - 3}
								</Badge>
							)}
						</div>
					);
				},
				enableSorting: false,
			},
			{
				id: "permission",
				accessorFn: (row) => row.permissions.length,
				header: ({ column }) => (
					<DataTableColumnHeader column={column} label="Permissions" />
				),
				cell: ({ row }) => {
					const user = row.original;
					return (
						<span className="flex items-center gap-1 text-sm text-muted-foreground">
							{user.permissions.includes("cms:*") && (
								<IconShieldLock className="size-3.5 text-primary" />
							)}
							{user.permissions.length} direct
						</span>
					);
				},
				enableSorting: false,
				enableColumnFilter: true,
				meta: {
					label: "Permission",
					variant: "select",
					icon: IconShield,
					options: permissionCatalog.map((p) => ({
						label: p.description,
						value: p.value,
					})),
				},
			},
			{
				id: "actions",
				header: "",
				cell: ({ row }) => {
					const user = row.original;
					return (
						<div className="text-right">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										size="icon-sm"
										variant="ghost"
										onClick={(e) => e.stopPropagation()}
									>
										<IconDotsVertical className="size-4" />
										<span className="sr-only">Actions</span>
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent
									align="end"
									className="w-44"
									onClick={(e) => e.stopPropagation()}
								>
									<DropdownMenuItem onClick={() => setSelectedUser(user)}>
										<IconShield className="size-4" />
										Manage access
									</DropdownMenuItem>
									<DropdownMenuItem onClick={() => copyUserId(user.id)}>
										<IconCopy className="size-4" />
										Copy user ID
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					);
				},
				enableSorting: false,
				enableHiding: false,
			},
		],
		[groups, permissionCatalog, session],
	);

	const { table } = useDataTable({
		data: data?.items ?? [],
		columns,
		pageCount: data ? Math.max(1, Math.ceil(data.total / perPage)) : -1,
		initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
		getRowId: (row) => row.id,
	});

	return (
		<div className="space-y-4">
			<div>
				<h2 className="text-2xl font-bold tracking-tight">Users</h2>
				<p className="text-muted-foreground">
					Manage CMS user permissions and group memberships.
				</p>
			</div>

			{isLoading && !data ? (
				<DataTableSkeleton columnCount={columns.length} filterCount={2} />
			) : (
				<DataTable
					table={table}
					onRowClick={(user) => setSelectedUser(user)}
					actionBar={
						<SelectionActionBar
							table={table}
							actions={(rows) => {
								if (groups.length === 0) return null;
								const userIds = rows.map((r) => r.original.id);
								return (
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button size="sm" disabled={addSelectedToGroup.isPending}>
												<IconShield className="size-3.5" />
												Add to group
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											{groups.map((g) => (
												<DropdownMenuItem
													key={g.id}
													onClick={() => {
														addSelectedToGroup.mutate({
															userIds,
															groupId: g.id,
														});
														table.toggleAllRowsSelected(false);
													}}
												>
													{g.name}
												</DropdownMenuItem>
											))}
										</DropdownMenuContent>
									</DropdownMenu>
								);
							}}
						/>
					}
				>
					<DataTableAdvancedToolbar table={table}>
						<DataTableFilterMenu table={table} />
						<DataTableSortList table={table} />
					</DataTableAdvancedToolbar>
				</DataTable>
			)}

			{selectedUser && (
				<UserDetailDialog
					user={selectedUser}
					allGroups={groups}
					isSelf={session?.user.id === selectedUser.id}
					open
					onClose={() => setSelectedUser(null)}
				/>
			)}
		</div>
	);
}
