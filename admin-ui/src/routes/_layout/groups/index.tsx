import {
	IconPencil,
	IconPlus,
	IconShield,
	IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { api, type CMSGroup } from "@/lib/api";

export const Route = createFileRoute("/_layout/groups/")({
	component: GroupsPage,
});

function GroupDialog({
	group,
	onClose,
}: {
	group?: CMSGroup;
	onClose?: () => void;
}) {
	const qc = useQueryClient();
	const [open, setOpen] = useState(false);
	const [name, setName] = useState(group?.name ?? "");
	const [permissions, setPermissions] = useState<string[]>(
		group?.permissions ?? [],
	);

	const isEdit = !!group;

	const save = useMutation({
		mutationFn: () =>
			isEdit
				? api.groups.update(group.id, { name, permissions })
				: api.groups.create(name, permissions),
		onSuccess: () => {
			toast.success(isEdit ? "Group updated" : "Group created");
			qc.invalidateQueries({ queryKey: ["cms", "groups"] });
			setOpen(false);
			if (!isEdit) {
				setName("");
				setPermissions([]);
			}
			onClose?.();
		},
		onError: () => toast.error("Save failed"),
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
				<div className="space-y-4">
					<div className="space-y-1.5">
						<Label htmlFor="group-name">Name</Label>
						<Input
							id="group-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Editors"
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Permissions</Label>
						<PermissionPicker value={permissions} onChange={setPermissions} />
					</div>
				</div>
				<DialogFooter>
					<Button
						onClick={() => save.mutate()}
						disabled={save.isPending || !name.trim()}
					>
						{save.isPending ? "Saving…" : "Save"}
					</Button>
				</DialogFooter>
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

			<div className="rounded-lg border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Permissions</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							Array.from({ length: 3 }).map((_, i) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton row count, never reordered
								<TableRow key={i}>
									{Array.from({ length: 3 }).map((_, j) => (
										// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton row count, never reordered
										<TableCell key={j}>
											<Skeleton className="h-5 w-32" />
										</TableCell>
									))}
								</TableRow>
							))
						) : data?.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={3}
									className="py-10 text-center text-muted-foreground"
								>
									<IconShield className="mx-auto mb-2 size-8 opacity-40" />
									No groups yet.
								</TableCell>
							</TableRow>
						) : (
							data?.map((group) => (
								<TableRow key={group.id}>
									<TableCell className="font-medium">{group.name}</TableCell>
									<TableCell>
										<div className="flex flex-wrap gap-1">
											{group.permissions.slice(0, 4).map((p) => (
												<Badge
													key={p}
													variant="outline"
													className="font-mono text-[10px]"
												>
													{p}
												</Badge>
											))}
											{group.permissions.length > 4 && (
												<Badge variant="outline" className="text-xs">
													+{group.permissions.length - 4}
												</Badge>
											)}
										</div>
									</TableCell>
									<TableCell className="text-right">
										<GroupDialog group={group} />
										<Button
											size="sm"
											variant="outline"
											className="ml-2 h-7 text-destructive hover:bg-destructive/10"
											onClick={() => remove.mutate(group.id)}
											disabled={remove.isPending}
										>
											<IconTrash className="size-3.5" />
										</Button>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
