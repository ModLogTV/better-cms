import { IconPlus, IconShield } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	type ColumnDef,
	getCoreRowModel,
	getPaginationRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { ConfirmPopover } from "@/components/shared/ConfirmPopover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, type CMSGroup } from "@/lib/api";
import { expandImpliedPermissions } from "@/lib/permissions";

export const Route = createFileRoute("/_layout/groups/")({
	component: GroupsPage,
});

/**
 * Nesting, permissions, page/tag access and members all reference an
 * already-existing group id, so none of them can be set before the group is
 * created. Rather than duplicate the whole detail page into a dialog (which
 * couldn't do anything with those fields yet anyway), creation only ever
 * asks for a name, then jumps straight to the real detail page where
 * everything is actually usable.
 */
function NewGroupDialog() {
	const qc = useQueryClient();
	const navigate = useNavigate();
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");

	const create = useMutation({
		mutationFn: () => api.groups.create(name.trim(), []),
		onSuccess: (group) => {
			qc.invalidateQueries({ queryKey: ["cms", "groups"] });
			setOpen(false);
			setName("");
			navigate({ to: "/groups/$groupId", params: { groupId: group.id } });
		},
		onError: () => toast.error("Couldn't create group"),
	});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="lg">
					<IconPlus className="size-4" />
					New group
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>Create group</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						if (name.trim()) create.mutate();
					}}
					className="space-y-4"
				>
					<div className="space-y-1.5">
						<Label htmlFor="new-group-name">Name</Label>
						<Input
							id="new-group-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Editors"
							autoFocus
						/>
						<p className="text-muted-foreground text-xs">
							Permissions, nesting, page/tag access and members are all
							configured next, on the group's own page.
						</p>
					</div>
					<DialogFooter>
						<Button type="submit" disabled={create.isPending || !name.trim()}>
							{create.isPending ? "Creating…" : "Create"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function GroupsPage() {
	const qc = useQueryClient();
	const navigate = useNavigate();
	const { data, isLoading } = useQuery({
		queryKey: ["cms", "groups"],
		queryFn: () => api.groups.list(),
	});
	const { data: memberships = [] } = useQuery({
		queryKey: ["cms", "group-memberships"],
		queryFn: () => api.groups.listMemberships(),
	});

	const parentCounts = useMemo(() => {
		const counts = new Map<string, number>();
		for (const edge of memberships) {
			counts.set(edge.childGroupId, (counts.get(edge.childGroupId) ?? 0) + 1);
		}
		return counts;
	}, [memberships]);
	const childCounts = useMemo(() => {
		const counts = new Map<string, number>();
		for (const edge of memberships) {
			counts.set(edge.parentGroupId, (counts.get(edge.parentGroupId) ?? 0) + 1);
		}
		return counts;
	}, [memberships]);

	const remove = useMutation({
		mutationFn: (id: string) => api.groups.delete(id),
		onSuccess: () => {
			toast.success("Group deleted");
			qc.invalidateQueries({ queryKey: ["cms", "groups"] });
			qc.invalidateQueries({ queryKey: ["cms", "users"] });
			qc.invalidateQueries({ queryKey: ["cms", "group-memberships"] });
		},
		onError: () => toast.error("Delete failed"),
	});

	const columns = useMemo<ColumnDef<CMSGroup>[]>(
		() => [
			{
				id: "name",
				accessorKey: "name",
				header: "Name",
				cell: ({ row }) => (
					<span className="font-medium">{row.original.name}</span>
				),
			},
			{
				id: "permissions",
				header: "Permissions",
				cell: ({ row }) => {
					// Includes what's stored plus anything it implies (write ->
					// read, publish -> write -> read), so e.g. a write-only group
					// visibly shows read too.
					const perms = expandImpliedPermissions(row.original.permissions);
					return (
						<div className="flex flex-wrap gap-1">
							{perms.slice(0, 4).map((p) => (
								<Badge
									key={p}
									variant="outline"
									className="font-mono text-[10px]"
								>
									{p}
								</Badge>
							))}
							{perms.length > 4 && (
								<Badge variant="outline" className="text-xs">
									+{perms.length - 4}
								</Badge>
							)}
						</div>
					);
				},
			},
			{
				id: "nesting",
				header: "Nesting",
				cell: ({ row }) => {
					const parents = parentCounts.get(row.original.id) ?? 0;
					const children = childCounts.get(row.original.id) ?? 0;
					if (parents === 0 && children === 0) {
						return <span className="text-muted-foreground text-xs">—</span>;
					}
					return (
						<div className="flex flex-wrap gap-1">
							{parents > 0 && (
								<Badge variant="secondary" className="text-[10px]">
									belongs to {parents}
								</Badge>
							)}
							{children > 0 && (
								<Badge variant="secondary" className="text-[10px]">
									contains {children}
								</Badge>
							)}
						</div>
					);
				},
			},
			{
				id: "actions",
				header: "",
				cell: ({ row }) => {
					const group = row.original;
					return (
						<div className="text-right">
							<ConfirmPopover
								trigger={
									<Button
										size="sm"
										variant="outline"
										className="h-7 text-destructive hover:bg-destructive/10"
										disabled={remove.isPending}
										onClick={(e) => e.stopPropagation()}
									>
										Delete
									</Button>
								}
								title={`Delete "${group.name}"?`}
								description="Members lose these permissions immediately. This cannot be undone."
								confirmLabel="Delete"
								variant="destructive"
								loading={remove.isPending}
								onConfirm={() => remove.mutate(group.id)}
							/>
						</div>
					);
				},
			},
		],
		[remove, parentCounts, childCounts],
	);

	const table = useReactTable({
		data: data ?? [],
		columns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
	});

	return (
		<div className="space-y-4">
			<div className="flex items-start justify-between">
				<div>
					<h2 className="text-2xl font-bold tracking-tight">Groups</h2>
					<p className="text-muted-foreground">
						Define permission groups, nesting and access delegation.
					</p>
				</div>
				<NewGroupDialog />
			</div>

			{isLoading ? (
				<DataTableSkeleton
					columnCount={columns.length}
					withViewOptions={false}
					rowCount={3}
				/>
			) : data?.length === 0 ? (
				<div className="rounded-lg border py-10 text-center text-muted-foreground">
					<IconShield className="mx-auto mb-2 size-8 opacity-40" />
					No groups yet.
				</div>
			) : (
				<DataTable
					table={table}
					onRowClick={(group) =>
						navigate({
							to: "/groups/$groupId",
							params: { groupId: group.id },
						})
					}
				/>
			)}
		</div>
	);
}
