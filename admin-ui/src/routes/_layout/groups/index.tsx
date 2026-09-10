import {
	IconPencil,
	IconPlus,
	IconShield,
	IconTrash,
} from "@tabler/icons-react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
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
import { PermissionPicker } from "@/components/shared/PermissionPicker";
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

export const Route = createFileRoute("/_layout/groups/")({
	component: GroupsPage,
});

interface GroupFormValues {
	name: string;
	permissions: string[];
}

function GroupDialog({
	group,
	onClose,
}: {
	group?: CMSGroup;
	onClose?: () => void;
}) {
	const qc = useQueryClient();
	const [open, setOpen] = useState(false);
	const isEdit = !!group;

	const save = useMutation({
		mutationFn: (values: GroupFormValues) =>
			isEdit
				? api.groups.update(group.id, values)
				: api.groups.create(values.name, values.permissions),
		onSuccess: () => {
			toast.success(isEdit ? "Group updated" : "Group created");
			qc.invalidateQueries({ queryKey: ["cms", "groups"] });
			setOpen(false);
			if (!isEdit) form.reset();
			onClose?.();
		},
		onError: () => toast.error("Save failed"),
	});

	const form = useForm({
		defaultValues: {
			name: group?.name ?? "",
			permissions: group?.permissions ?? [],
		} as GroupFormValues,
		onSubmit: async ({ value }) => {
			await save.mutateAsync(value);
		},
	});

	return (
		<Dialog
			open={open}
			onOpenChange={(o) => {
				setOpen(o);
				if (!o) onClose?.();
			}}
		>
			<DialogTrigger asChild>
				{isEdit ? (
					<Button size="sm" variant="outline" className="h-7">
						<IconPencil className="size-3.5" />
					</Button>
				) : (
					<Button size="sm">
						<IconPlus className="size-4" />
						New group
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{isEdit ? "Edit group" : "Create group"}</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="contents"
				>
					<div className="space-y-4">
						<form.Field
							name="name"
							validators={{
								onChange: ({ value }) =>
									!value.trim() ? "Required" : undefined,
							}}
						>
							{(field) => (
								<div className="space-y-1.5">
									<Label htmlFor={field.name}>Name</Label>
									<Input
										id={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="Editors"
									/>
								</div>
							)}
						</form.Field>
						<form.Field name="permissions">
							{(field) => (
								<div className="space-y-1.5">
									<Label>Permissions</Label>
									<PermissionPicker
										value={field.state.value}
										onChange={field.handleChange}
									/>
								</div>
							)}
						</form.Field>
					</div>
					<DialogFooter>
						<form.Subscribe selector={(state) => state.values.name}>
							{(name) => (
								<Button type="submit" disabled={save.isPending || !name.trim()}>
									{save.isPending ? "Saving…" : "Save"}
								</Button>
							)}
						</form.Subscribe>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function GroupsPage() {
	const qc = useQueryClient();
	const { data, isLoading } = useQuery({
		queryKey: ["cms", "groups"],
		queryFn: () => api.groups.list(),
	});

	const remove = useMutation({
		mutationFn: (id: string) => api.groups.delete(id),
		onSuccess: () => {
			toast.success("Group deleted");
			qc.invalidateQueries({ queryKey: ["cms", "groups"] });
			qc.invalidateQueries({ queryKey: ["cms", "users"] });
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
				cell: ({ row }) => (
					<div className="flex flex-wrap gap-1">
						{row.original.permissions.slice(0, 4).map((p) => (
							<Badge
								key={p}
								variant="outline"
								className="font-mono text-[10px]"
							>
								{p}
							</Badge>
						))}
						{row.original.permissions.length > 4 && (
							<Badge variant="outline" className="text-xs">
								+{row.original.permissions.length - 4}
							</Badge>
						)}
					</div>
				),
			},
			{
				id: "actions",
				header: "",
				cell: ({ row }) => {
					const group = row.original;
					return (
						<div className="text-right">
							<GroupDialog group={group} />
							<ConfirmPopover
								trigger={
									<Button
										size="sm"
										variant="outline"
										className="ml-2 h-7 text-destructive hover:bg-destructive/10"
										disabled={remove.isPending}
									>
										<IconTrash className="size-3.5" />
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
		[remove],
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
						Define permission groups for your CMS users.
					</p>
				</div>
				<GroupDialog />
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
				<DataTable table={table} />
			)}
		</div>
	);
}
