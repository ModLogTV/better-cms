import {
	IconCopy,
	IconDotsVertical,
	IconPlus,
	IconShield,
	IconShieldLock,
	IconUsers,
	IconX,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PermissionPicker } from "@/components/shared/PermissionPicker";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
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

function UsersPage() {
	const [selectedUser, setSelectedUser] = useState<CMSUserSummary | null>(null);

	const { data: users, isLoading } = useQuery({
		queryKey: ["cms", "users"],
		queryFn: () => api.users.list(),
	});
	const { data: groups = [] } = useQuery({
		queryKey: ["cms", "groups"],
		queryFn: () => api.groups.list(),
	});
	const { data: session } = useQuery({
		queryKey: ["cms", "session"],
		queryFn: () => getSession(),
	});

	function copyUserId(id: string) {
		navigator.clipboard.writeText(id).then(
			() => toast.success("User ID copied"),
			() => toast.error("Couldn't copy user ID"),
		);
	}

	return (
		<div className="space-y-4">
			<div>
				<h2 className="text-2xl font-bold tracking-tight">Users</h2>
				<p className="text-muted-foreground">
					Manage CMS user permissions and group memberships.
				</p>
			</div>

			<div className="rounded-lg border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>User</TableHead>
							<TableHead>Groups</TableHead>
							<TableHead>Permissions</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							Array.from({ length: 3 }).map((_, i) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton row count, never reordered
								<TableRow key={i}>
									{Array.from({ length: 4 }).map((_, j) => (
										// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton row count, never reordered
										<TableCell key={j}>
											<Skeleton className="h-5 w-28" />
										</TableCell>
									))}
								</TableRow>
							))
						) : users?.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={4}
									className="py-10 text-center text-muted-foreground"
								>
									<IconUsers className="mx-auto mb-2 size-8 opacity-40" />
									No users found.
								</TableCell>
							</TableRow>
						) : (
							users?.map((user) => {
								const isSelf = session?.user.id === user.id;
								return (
									<TableRow
										key={user.id}
										className="cursor-pointer"
										onClick={() => setSelectedUser(user)}
									>
										<TableCell>
											<div className="flex items-center gap-2">
												<Avatar className="size-7">
													<AvatarFallback className="text-xs">
														{user.name?.[0]?.toUpperCase() ??
															user.email[0].toUpperCase()}
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
														<p className="text-xs text-muted-foreground">
															{user.email}
														</p>
													)}
												</div>
											</div>
										</TableCell>
										<TableCell>
											<div className="flex flex-wrap gap-1">
												{user.groupIds.slice(0, 3).map((gid) => {
													const g = groups.find((g) => g.id === gid);
													return g ? (
														<Badge
															key={gid}
															variant="secondary"
															className="text-xs"
														>
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
										</TableCell>
										<TableCell>
											<span className="flex items-center gap-1 text-sm text-muted-foreground">
												{user.permissions.includes("cms:*") && (
													<IconShieldLock className="size-3.5 text-primary" />
												)}
												{user.permissions.length} direct
											</span>
										</TableCell>
										<TableCell className="text-right">
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
													onClick={(e) => e.stopPropagation()}
												>
													<DropdownMenuItem
														onClick={() => setSelectedUser(user)}
													>
														<IconShield className="size-4" />
														Manage access
													</DropdownMenuItem>
													<DropdownMenuItem onClick={() => copyUserId(user.id)}>
														<IconCopy className="size-4" />
														Copy user ID
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</TableCell>
									</TableRow>
								);
							})
						)}
					</TableBody>
				</Table>
			</div>

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
